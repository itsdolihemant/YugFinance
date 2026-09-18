import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Plus,
  Trash2,
  AlertCircle,
  TrendingDown,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { DatabaseSchema, Budget } from '../../types/finance';
import { formatINR } from '../../services/calculations';
import { generateId } from '../../services/storage';
import { sound } from '../../services/soundEngine';

interface BudgetModuleProps {
  db: DatabaseSchema;
  isBalanceHidden: boolean;
  onUpdateDb: (updated: DatabaseSchema) => void;
  t: (key: string) => string;
}

export const BudgetModule: React.FC<BudgetModuleProps> = ({
  db,
  isBalanceHidden,
  onUpdateDb,
  t
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const displayAmount = (amt: number) => {
    if (isBalanceHidden) return '••••••';
    return formatINR(amt);
  };

  // Compute spend for each category in selectedMonth
  const categorySpends = useMemo(() => {
    const map: Record<string, number> = {};
    (db.mm_transactions || [])
      .filter((t) => t && t.type === 'expense' && String(t.date || '').startsWith(selectedMonth))
      .forEach((t) => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
      });
    return map;
  }, [db.mm_transactions, selectedMonth]);

  const monthBudgets = useMemo(() => {
    return (db.budgets || []).filter((b) => b && (!b.month || b.month === selectedMonth));
  }, [db.budgets, selectedMonth]);

  const totalBudgetLimit = monthBudgets.reduce((sum, b) => sum + (Number(b.limit) || 0), 0);
  const totalBudgetSpent = monthBudgets.reduce((sum, b) => sum + (categorySpends[b.category] || 0), 0);

  const handleSaveBudget = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const category = (formData.get('category') as string).trim();
    const limit = parseFloat(formData.get('limit') as string);
    const month = (formData.get('month') as string) || selectedMonth;

    if (!category || !limit) return;

    const newBudget: Budget = {
      id: generateId('bgt'),
      category,
      limit,
      month
    };

    const newDb = {
      ...db,
      budgets: [...db.budgets.filter((b) => !(b.category === category && b.month === month)), newBudget]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsModalOpen(false);
  };

  const handleDeleteBudget = (id: string) => {
    if (!window.confirm('Delete this budget?')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      budgets: db.budgets.filter((b) => b.id !== id)
    };
    onUpdateDb(newDb);
  };

  return (
    <div id="page-budget" className="space-y-5 animate-in fade-in duration-300">
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t('budgetSection')}
          </h3>
          <p className="text-xs text-slate-400">
            Set monthly category spending limits & prevent overspending
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          />

          <button
            onClick={() => {
              sound.play('button');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addBudget')}</span>
          </button>
        </div>
      </div>

      {/* Month Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <span className="text-[10px] text-slate-400 block">{t('totalBudget')}</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            {displayAmount(totalBudgetLimit)}
          </span>
        </div>
        <div className="glass-card p-4">
          <span className="text-[10px] text-slate-400 block">{t('spentAmount')}</span>
          <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {displayAmount(totalBudgetSpent)}
          </span>
        </div>
        <div className="glass-card p-4 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-400 block">{t('remainingBudget')}</span>
          <span
            className={`text-xl font-bold ${
              totalBudgetLimit - totalBudgetSpent >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {displayAmount(totalBudgetLimit - totalBudgetSpent)}
          </span>
        </div>
      </div>

      {/* Budgets List */}
      <div className="space-y-3">
        {monthBudgets.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-400 text-sm">
            No budgets configured for this month.
          </div>
        ) : (
          monthBudgets.map((budget) => {
            const spent = categorySpends[budget.category] || 0;
            const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
            const isOver = spent > budget.limit;
            const remaining = budget.limit - spent;

            return (
              <div
                key={budget.id}
                className={`glass-card p-4 space-y-3 border-l-4 transition-all ${
                  isOver ? 'border-l-rose-500 bg-rose-500/5' : 'border-l-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{budget.category}</span>
                      {isOver && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Over Budget!
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Spent: {displayAmount(spent)} of {displayAmount(budget.limit)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-bold ${
                        isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {remaining >= 0 ? `${displayAmount(remaining)} left` : `${displayAmount(Math.abs(remaining))} over`}
                    </span>

                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isOver ? 'bg-rose-500' : progress > 80 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addBudget')}
            </h3>
            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  placeholder="e.g. Grocery, Dining, Fuel, Entertainment"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Monthly Limit (₹)</label>
                <input
                  type="number"
                  name="limit"
                  step="100"
                  placeholder="0.00"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Month</label>
                <input
                  type="month"
                  name="month"
                  defaultValue={selectedMonth}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
