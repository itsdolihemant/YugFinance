import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Minus,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { DatabaseSchema, InventoryItem } from '../../types/finance';
import { formatINR } from '../../services/calculations';
import { generateId } from '../../services/storage';
import { sound } from '../../services/soundEngine';

interface InventoryModuleProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  t: (key: string) => string;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  db,
  onUpdateDb,
  t
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const filteredItems = useMemo(() => {
    return db.inventoryItems
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        return (
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
      .filter((item) => {
        if (!onlyLowStock) return true;
        return typeof item.minStockAlert === 'number' && item.quantity <= item.minStockAlert;
      });
  }, [db.inventoryItems, searchQuery, categoryFilter, onlyLowStock]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    db.inventoryItems.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [db.inventoryItems]);

  const handleAdjustQuantity = (item: InventoryItem, delta: number) => {
    sound.play('button');
    const newQty = Math.max(0, item.quantity + delta);
    const newDb = {
      ...db,
      inventoryItems: db.inventoryItems.map((i) =>
        i.id === item.id ? { ...i, quantity: newQty } : i
      )
    };
    onUpdateDb(newDb);
  };

  const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get('name') as string).trim();
    const category = (formData.get('category') as string).trim() || 'General';
    const quantity = parseFloat(formData.get('quantity') as string) || 0;
    const unit = (formData.get('unit') as string) || 'pcs';
    const minStockAlert = parseFloat(formData.get('minStockAlert') as string) || 0;
    const purchasePrice = parseFloat(formData.get('purchasePrice') as string) || 0;
    const purchaseDate = (formData.get('purchaseDate') as string) || null;
    const expiryDate = (formData.get('expiryDate') as string) || null;
    const location = (formData.get('location') as string) || '';

    if (!name) return;

    const newDb = { ...db };

    if (editingItem) {
      newDb.inventoryItems = newDb.inventoryItems.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              name,
              category,
              quantity,
              unit,
              minStockAlert,
              purchasePrice,
              purchaseDate,
              expiryDate,
              location
            }
          : i
      );
    } else {
      const newItem: InventoryItem = {
        id: generateId('inv_item'),
        name,
        category,
        quantity,
        unit,
        minStockAlert,
        purchasePrice,
        purchaseDate,
        expiryDate,
        location
      };
      newDb.inventoryItems.push(newItem);
    }

    sound.play('save');
    onUpdateDb(newDb);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (!window.confirm('Delete this inventory item?')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      inventoryItems: db.inventoryItems.filter((i) => i.id !== id)
    };
    onUpdateDb(newDb);
  };

  return (
    <div id="page-inventory" className="space-y-5 animate-in fade-in duration-300">
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t('inventorySection')}
          </h3>
          <p className="text-xs text-slate-400">
            Household stock tracking & low-stock alerts
          </p>
        </div>

        <button
          onClick={() => {
            sound.play('button');
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('addStockItem')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search items or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            sound.play('button');
            setOnlyLowStock(!onlyLowStock);
          }}
          className={`px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
            onlyLowStock
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock Only</span>
        </button>
      </div>

      {/* Grid of Inventory Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.length === 0 ? (
          <div className="col-span-full glass-card p-8 text-center text-slate-400 text-sm">
            {t('noInventoryItems')}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isLow =
              typeof item.minStockAlert === 'number' &&
              item.minStockAlert > 0 &&
              item.quantity <= item.minStockAlert;

            return (
              <div
                key={item.id}
                className={`glass-card p-4 space-y-3 border-l-4 transition-all ${
                  isLow ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-blue-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {isLow && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {t('lowStock')}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.category} {item.location ? `• Shelf: ${item.location}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        sound.play('button');
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stock Quantity Counter Bar */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 block">{t('currentQuantity')}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {item.quantity} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAdjustQuantity(item, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAdjustQuantity(item, 1)}
                      className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white active:scale-95 transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Min: {item.minStockAlert || 0} {item.unit}</span>
                  {item.expiryDate && <span>Exp: {item.expiryDate}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {editingItem ? t('editStockItem') : t('addStockItem')}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingItem?.name}
                  placeholder="e.g. Cooking Oil, Soap, Toothpaste"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingItem?.category || 'Pantry'}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit</label>
                  <select
                    name="unit"
                    defaultValue={editingItem?.unit || 'pcs'}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="packet">packet</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.1"
                    defaultValue={editingItem?.quantity ?? 1}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    name="minStockAlert"
                    step="0.1"
                    defaultValue={editingItem?.minStockAlert ?? 1}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    defaultValue={editingItem?.expiryDate || ''}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Storage Location</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingItem?.location || ''}
                    placeholder="e.g. Kitchen Shelf 2"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
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
