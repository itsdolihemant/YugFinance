import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Milk,
  Droplets,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Filter,
  Package,
  TrendingUp,
  Tag
} from 'lucide-react';
import {
  DatabaseSchema,
  GroceryItem,
  MilkRecord,
  WaterRecord,
  HouseholdExpense,
  HouseholdCategory,
  MmTransaction
} from '../../types/finance';
import { formatINR } from '../../services/calculations';
import { generateId } from '../../services/storage';
import { sound } from '../../services/soundEngine';

interface HouseholdModuleProps {
  db: DatabaseSchema;
  isBalanceHidden: boolean;
  onUpdateDb: (updated: DatabaseSchema) => void;
  t: (key: string) => string;
}

export const HouseholdModule: React.FC<HouseholdModuleProps> = ({
  db,
  isBalanceHidden,
  onUpdateDb,
  t
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'grocery' | 'milk' | 'water' | 'expenses'>('grocery');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));

  // Modals
  const [isAddGroceryOpen, setIsAddGroceryOpen] = useState<boolean>(false);
  const [isAddMilkOpen, setIsAddMilkOpen] = useState<boolean>(false);
  const [isAddWaterOpen, setIsAddWaterOpen] = useState<boolean>(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);

  // Milk calc live helper
  const [milkQty, setMilkQty] = useState<number>(1);
  const [milkRate, setMilkRate] = useState<number>(60);

  // Water calc live helper
  const [waterQty, setWaterQty] = useState<number>(1);
  const [waterRate, setWaterRate] = useState<number>(25);

  const displayAmount = (amt: number) => {
    if (isBalanceHidden) return '••••••';
    return formatINR(amt);
  };

  // 1. Filtered Grocery Items
  const filteredGrocery = useMemo(() => {
    return (db.groceryItems || [])
      .filter((g) => g && String(g.date || '').startsWith(monthFilter))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [db.groceryItems, monthFilter]);

  const groceryTotal = useMemo(() => {
    return filteredGrocery.reduce((sum, g) => sum + (Number(g.price) || 0), 0);
  }, [filteredGrocery]);

  // 2. Filtered Milk Records
  const filteredMilk = useMemo(() => {
    return (db.milkRecords || [])
      .filter((m) => m && String(m.date || '').startsWith(monthFilter))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [db.milkRecords, monthFilter]);

  const milkTotalAmount = useMemo(() => {
    return filteredMilk.reduce((sum, m) => {
      const amt = typeof m.totalAmount === 'number' ? m.totalAmount : (Number(m.quantity || 0) * Number(m.rate || 0));
      return sum + (amt || 0);
    }, 0);
  }, [filteredMilk]);

  const milkTotalLitres = useMemo(() => {
    return filteredMilk.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  }, [filteredMilk]);

  const milkAvgRate = milkTotalLitres > 0 ? milkTotalAmount / milkTotalLitres : 0;

  // 3. Filtered Water Records
  const filteredWater = useMemo(() => {
    return (db.waterRecords || [])
      .filter((w) => w && String(w.date || '').startsWith(monthFilter))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [db.waterRecords, monthFilter]);

  const waterTotalAmount = useMemo(() => {
    return filteredWater.reduce((sum, w) => {
      const amt = typeof w.totalAmount === 'number' ? w.totalAmount : (Number(w.quantity || 0) * Number(w.rate || 0));
      return sum + (amt || 0);
    }, 0);
  }, [filteredWater]);

  const waterTotalBottles = useMemo(() => {
    return filteredWater.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);
  }, [filteredWater]);

  // 4. Filtered Other Household Expenses
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const filteredExpenses = useMemo(() => {
    return (db.householdExpenses || [])
      .filter((e) => e && String(e.date || '').startsWith(monthFilter))
      .filter((e) => expenseCategoryFilter === 'all' || e.category === expenseCategoryFilter)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [db.householdExpenses, monthFilter, expenseCategoryFilter]);

  const expensesTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Combined Household Monthly Total
  const totalCombinedHousehold = groceryTotal + milkTotalAmount + waterTotalAmount + expensesTotal;

  // Handlers
  const handleSaveGrocery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get('name') as string).trim();
    const quantity = parseFloat(formData.get('quantity') as string) || 1;
    const unit = (formData.get('unit') as string) || 'kg';
    const price = parseFloat(formData.get('price') as string);
    const date = formData.get('date') as string;
    const shop = (formData.get('shop') as string) || '';
    const category = (formData.get('category') as string) || 'General';
    const account = formData.get('account') as string;

    if (!name || isNaN(price) || !date || !account) return;

    const gId = generateId('groc');
    const newGrocery: GroceryItem = {
      id: gId,
      name,
      quantity,
      unit,
      price,
      date,
      shop,
      category,
      account
    };

    // Mirror to mm_transactions
    const newTx: MmTransaction = {
      id: generateId('tx_groc'),
      type: 'expense',
      amount: price,
      date,
      description: `Grocery: ${name} (${quantity} ${unit})`,
      category: 'Grocery',
      paymentMethod: account,
      linkedGroceryId: gId
    };

    const newDb = {
      ...db,
      groceryItems: [newGrocery, ...db.groceryItems],
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsAddGroceryOpen(false);
  };

  const handleDeleteGrocery = (item: GroceryItem) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    sound.play('delete');
    const newDb = {
      ...db,
      groceryItems: db.groceryItems.filter((g) => g.id !== item.id),
      mm_transactions: db.mm_transactions.filter((t) => t.linkedGroceryId !== item.id)
    };
    onUpdateDb(newDb);
  };

  const handleSaveMilk = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const quantity = parseFloat(formData.get('quantity') as string);
    const rate = parseFloat(formData.get('rate') as string);
    const totalAmount = quantity * rate;
    const date = formData.get('date') as string;
    const status = formData.get('status') as 'paid' | 'unpaid';
    const account = formData.get('account') as string;
    const vendor = (formData.get('vendor') as string) || '';

    if (!quantity || !rate || !date || !account) return;

    const mId = generateId('milk');
    const newMilk: MilkRecord = {
      id: mId,
      date,
      quantity,
      rate,
      totalAmount,
      status,
      vendor,
      account
    };

    const newDb = { ...db, milkRecords: [newMilk, ...db.milkRecords] };

    // If paid, log as expense transaction
    if (status === 'paid') {
      const newTx: MmTransaction = {
        id: generateId('tx_milk'),
        type: 'expense',
        amount: totalAmount,
        date,
        description: `Milk (${quantity} L @ ₹${rate})`,
        category: 'Milk',
        paymentMethod: account,
        linkedMilkId: mId
      };
      newDb.mm_transactions.unshift(newTx);
    }

    sound.play('save');
    onUpdateDb(newDb);
    setIsAddMilkOpen(false);
  };

  const handleDeleteMilk = (m: MilkRecord) => {
    if (!window.confirm('Delete this milk record?')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      milkRecords: db.milkRecords.filter((rec) => rec.id !== m.id),
      mm_transactions: db.mm_transactions.filter((t) => t.linkedMilkId !== m.id)
    };
    onUpdateDb(newDb);
  };

  const handleSaveWater = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const quantity = parseFloat(formData.get('quantity') as string);
    const rate = parseFloat(formData.get('rate') as string);
    const totalAmount = quantity * rate;
    const date = formData.get('date') as string;
    const account = formData.get('account') as string;
    const supplier = (formData.get('supplier') as string) || '';

    if (!quantity || !rate || !date || !account) return;

    const wId = generateId('water');
    const newWater: WaterRecord = {
      id: wId,
      date,
      quantity,
      rate,
      totalAmount,
      supplier,
      account
    };

    const newTx: MmTransaction = {
      id: generateId('tx_water'),
      type: 'expense',
      amount: totalAmount,
      date,
      description: `Water Cans (${quantity} @ ₹${rate})`,
      category: 'Water',
      paymentMethod: account,
      linkedWaterId: wId
    };

    const newDb = {
      ...db,
      waterRecords: [newWater, ...db.waterRecords],
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsAddWaterOpen(false);
  };

  const handleDeleteWater = (w: WaterRecord) => {
    if (!window.confirm('Delete this water record?')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      waterRecords: db.waterRecords.filter((rec) => rec.id !== w.id),
      mm_transactions: db.mm_transactions.filter((t) => t.linkedWaterId !== w.id)
    };
    onUpdateDb(newDb);
  };

  const handleSaveExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const category = formData.get('category') as HouseholdCategory;
    const item = (formData.get('item') as string).trim();
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const account = formData.get('account') as string;
    const notes = (formData.get('notes') as string) || '';

    if (!category || !item || isNaN(amount) || !date || !account) return;

    const heId = generateId('hexp');
    const newHExp: HouseholdExpense = {
      id: heId,
      category,
      item,
      amount,
      date,
      notes,
      account
    };

    const newTx: MmTransaction = {
      id: generateId('tx_hexp'),
      type: 'expense',
      amount,
      date,
      description: `${category}: ${item}`,
      category,
      paymentMethod: account,
      linkedExpenseId: heId
    };

    const newDb = {
      ...db,
      householdExpenses: [newHExp, ...db.householdExpenses],
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsAddExpenseOpen(false);
  };

  const handleDeleteExpense = (exp: HouseholdExpense) => {
    if (!window.confirm(`Delete ${exp.item}?`)) return;
    sound.play('delete');
    const newDb = {
      ...db,
      householdExpenses: db.householdExpenses.filter((h) => h.id !== exp.id),
      mm_transactions: db.mm_transactions.filter((t) => t.linkedExpenseId !== exp.id)
    };
    onUpdateDb(newDb);
  };

  const householdCategories: HouseholdCategory[] = [
    'Vegetables',
    'Fruits',
    'Meat',
    'Fish',
    'Food',
    'Household',
    'Fuel',
    'Medicine',
    'Bills',
    'Shopping',
    'Other'
  ];

  return (
    <div id="page-household" className="space-y-5 animate-in fade-in duration-300">
      {/* Month Filter and Top Metric Banner */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs text-slate-400 block">{t('thisMonth')} Household Total</span>
          <span className="text-2xl font-extrabold text-blue-600 dark:text-sky-400">
            {displayAmount(totalCombinedHousehold)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="p-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1.5 glass-card overflow-x-auto no-scrollbar">
        {[
          { id: 'grocery', label: t('grocery'), icon: ShoppingCart },
          { id: 'milk', label: t('milk'), icon: Milk },
          { id: 'water', label: t('water'), icon: Droplets },
          { id: 'expenses', label: t('otherExpenses'), icon: Receipt }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.play('tab');
                setActiveSubTab(tab.id as any);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. GROCERY TAB */}
      {activeSubTab === 'grocery' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('groceryList')}
              </h3>
              <p className="text-xs text-slate-400">
                Monthly Grocery Spend: <strong>{displayAmount(groceryTotal)}</strong>
              </p>
            </div>
            <button
              onClick={() => {
                sound.play('button');
                setIsAddGroceryOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addGrocery')}</span>
            </button>
          </div>

          <div className="space-y-2">
            {filteredGrocery.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                No grocery items recorded for this month.
              </div>
            ) : (
              filteredGrocery.map((item: GroceryItem) => (
                <div
                  key={item.id}
                  className="glass-card p-3 flex items-center justify-between hover:border-teal-400/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.quantity} {item.unit} • {item.date} {item.shop ? `• ${item.shop}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {displayAmount(item.price)}
                    </span>
                    <button
                      onClick={() => handleDeleteGrocery(item)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. MILK CALCULATOR TAB */}
      {activeSubTab === 'milk' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3.5">
              <span className="text-[10px] text-slate-400 block">{t('totalLitres')}</span>
              <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {milkTotalLitres.toFixed(1)} L
              </span>
            </div>
            <div className="glass-card p-3.5">
              <span className="text-[10px] text-slate-400 block">{t('monthlyAmount')}</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {displayAmount(milkTotalAmount)}
              </span>
            </div>
            <div className="glass-card p-3.5">
              <span className="text-[10px] text-slate-400 block">{t('avgRate')}</span>
              <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
                ₹{milkAvgRate.toFixed(1)}/L
              </span>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('milkRecords')}
              </h3>
              <p className="text-xs text-slate-400">Calculated milk logs</p>
            </div>
            <button
              onClick={() => {
                sound.play('button');
                setIsAddMilkOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addMilk')}</span>
            </button>
          </div>

          <div className="space-y-2">
            {filteredMilk.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                No milk records logged for this month.
              </div>
            ) : (
              filteredMilk.map((rec: MilkRecord) => (
                <div
                  key={rec.id}
                  className="glass-card p-3 flex items-center justify-between hover:border-cyan-400/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600">
                      <Milk className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                        {rec.quantity} Litres @ ₹{rec.rate}/L
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {rec.date} {rec.status ? `• ${rec.status.toUpperCase()}` : ''} {rec.vendor ? `• ${rec.vendor}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {displayAmount(rec.totalAmount)}
                    </span>
                    <button
                      onClick={() => handleDeleteMilk(rec)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. WATER CALCULATOR TAB */}
      {activeSubTab === 'water' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3.5">
              <span className="text-[10px] text-slate-400 block">{t('totalBottles')}</span>
              <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                {waterTotalBottles} Cans
              </span>
            </div>
            <div className="glass-card p-3.5">
              <span className="text-[10px] text-slate-400 block">{t('monthlyAmount')}</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {displayAmount(waterTotalAmount)}
              </span>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('waterRecords')}
              </h3>
              <p className="text-xs text-slate-400">Drinking water delivery & jars</p>
            </div>
            <button
              onClick={() => {
                sound.play('button');
                setIsAddWaterOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addWater')}</span>
            </button>
          </div>

          <div className="space-y-2">
            {filteredWater.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                No water deliveries recorded for this month.
              </div>
            ) : (
              filteredWater.map((rec: WaterRecord) => (
                <div
                  key={rec.id}
                  className="glass-card p-3 flex items-center justify-between hover:border-sky-400/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                        {rec.quantity} Cans @ ₹{rec.rate}/can
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {rec.date} {rec.supplier ? `• ${rec.supplier}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {displayAmount(rec.totalAmount)}
                    </span>
                    <button
                      onClick={() => handleDeleteWater(rec)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. OTHER HOUSEHOLD EXPENSES TAB */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('otherExpenses')}
              </h3>
              <p className="text-xs text-slate-400">
                Total: <strong>{displayAmount(expensesTotal)}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="p-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Categories</option>
                {householdCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  sound.play('button');
                  setIsAddExpenseOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredExpenses.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                No household expenses logged for this filter.
              </div>
            ) : (
              filteredExpenses.map((exp: HouseholdExpense) => (
                <div
                  key={exp.id}
                  className="glass-card p-3 flex items-center justify-between hover:border-blue-400/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                        {exp.item}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="text-blue-500 font-medium">{exp.category}</span> • {exp.date} • {exp.account}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {displayAmount(exp.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Grocery Modal */}
      {isAddGroceryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddGroceryOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addGrocery')}
            </h3>
            <form onSubmit={handleSaveGrocery} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Atta (Flour), Rice, Sugar..."
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.1"
                    defaultValue="1"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit</label>
                  <select
                    name="unit"
                    defaultValue="kg"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="litre">litre</option>
                    <option value="ml">ml</option>
                    <option value="packet">packet</option>
                    <option value="box">box</option>
                    <option value="pcs">pcs</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Total Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Account</label>
                  <select
                    name="account"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Shop/Store</label>
                  <input
                    type="text"
                    name="shop"
                    placeholder="e.g. DMart, Kirana"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddGroceryOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milk Modal */}
      {isAddMilkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddMilkOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addMilk')}
            </h3>
            <form onSubmit={handleSaveMilk} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Quantity (Litres)</label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.1"
                    value={milkQty}
                    onChange={(e) => setMilkQty(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Rate per Litre (₹)</label>
                  <input
                    type="number"
                    name="rate"
                    step="0.5"
                    value={milkRate}
                    onChange={(e) => setMilkRate(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Calculated live total */}
              <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-center">
                <span className="text-[10px] text-cyan-700 dark:text-cyan-300 block">Total Amount</span>
                <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {formatINR(milkQty * milkRate)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue="paid"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="paid">Paid (Deduct Now)</option>
                    <option value="unpaid">Unpaid (Log only)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Payment Account</label>
                  <select
                    name="account"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Vendor/Dairy</label>
                  <input
                    type="text"
                    name="vendor"
                    placeholder="e.g. Amul, Mother Dairy"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddMilkOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Water Modal */}
      {isAddWaterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddWaterOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addWater')}
            </h3>
            <form onSubmit={handleSaveWater} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Quantity (Cans/Jars)</label>
                  <input
                    type="number"
                    name="quantity"
                    step="1"
                    value={waterQty}
                    onChange={(e) => setWaterQty(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Rate per Can (₹)</label>
                  <input
                    type="number"
                    name="rate"
                    step="1"
                    value={waterRate}
                    onChange={(e) => setWaterRate(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Calculated live total */}
              <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 text-center">
                <span className="text-[10px] text-sky-700 dark:text-sky-300 block">Total Amount</span>
                <span className="text-xl font-bold text-sky-600 dark:text-sky-400">
                  {formatINR(waterQty * waterRate)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Payment Account</label>
                  <select
                    name="account"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Supplier/Brand</label>
                <input
                  type="text"
                  name="supplier"
                  placeholder="e.g. Bisleri, Local RO Supply"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddWaterOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Other Household Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddExpenseOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              Add Household Expense
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Category</label>
                <select
                  name="category"
                  defaultValue="Vegetables"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {householdCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Item Description</label>
                <input
                  type="text"
                  name="item"
                  placeholder="e.g. Potato & Onions, Petrol, Electricity bill..."
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Payment Account</label>
                  <select
                    name="account"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
