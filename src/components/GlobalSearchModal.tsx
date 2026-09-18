import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight
} from 'lucide-react';
import {
  DatabaseSchema,
  MmTransaction,
  GroceryItem,
  InventoryItem,
  LendTransaction,
  BorrowTransaction
} from '../types/finance';
import { formatINR } from '../services/calculations';
import { sound } from '../services/soundEngine';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseSchema;
  onNavigate: (section: string) => void;
  t: (key: string) => string;
}

interface SearchResultItem {
  type: string;
  module: string;
  title: string;
  subtitle: string;
  amount: number | null;
  isIncome: boolean;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  db,
  onNavigate
}) => {
  const [query, setQuery] = useState<string>('');

  // Search across transactions, grocery, inventory, lend, borrow
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchResultItem[] = [];

    // Transactions
    (db.mm_transactions || []).forEach((tx: MmTransaction) => {
      if (!tx) return;
      const desc = String(tx.description || '');
      const cat = String(tx.category || '');
      const typeStr = String(tx.type || 'expense');
      if (desc.toLowerCase().includes(q) || cat.toLowerCase().includes(q)) {
        results.push({
          type: 'Transaction',
          module: 'money',
          title: desc || 'Transaction',
          subtitle: `${tx.date || ''} • ${typeStr.toUpperCase()}`,
          amount: Number(tx.amount) || 0,
          isIncome: tx.type === 'income'
        });
      }
    });

    // Grocery
    const groceries = Array.isArray(db.groceryItems) ? db.groceryItems : (Array.isArray(db.household?.grocery) ? db.household.grocery : []);
    groceries.forEach((g: GroceryItem) => {
      if (!g) return;
      const gName = String(g.name || g.item || '');
      const shop = String(g.shop || '');
      if (gName.toLowerCase().includes(q) || shop.toLowerCase().includes(q)) {
        results.push({
          type: 'Grocery',
          module: 'household',
          title: gName || 'Grocery Item',
          subtitle: `${g.quantity || 1} ${g.unit || 'kg'} • ${g.date || ''}`,
          amount: Number(g.price) || 0,
          isIncome: false
        });
      }
    });

    // Inventory
    const inventories = Array.isArray(db.inventoryItems) ? db.inventoryItems : (Array.isArray(db.inventory) ? db.inventory : []);
    inventories.forEach((inv: InventoryItem) => {
      if (!inv) return;
      const invName = String(inv.name || inv.item || '');
      const invCat = String(inv.category || '');
      if (invName.toLowerCase().includes(q) || invCat.toLowerCase().includes(q)) {
        results.push({
          type: 'Inventory',
          module: 'inventory',
          title: invName || 'Inventory Item',
          subtitle: `${inv.quantity || 0} ${inv.unit || 'pcs'} in stock • Shelf: ${inv.location || 'N/A'}`,
          amount: null,
          isIncome: false
        });
      }
    });

    // Lend
    (db.lendTransactions || []).forEach((loan: LendTransaction) => {
      if (!loan) return;
      const loanName = String(loan.name || '');
      if (loanName.toLowerCase().includes(q)) {
        results.push({
          type: 'Lend',
          module: 'money',
          title: `Lent to ${loanName}`,
          subtitle: `Date: ${loan.date || ''} • Status: ${loan.status || 'pending'}`,
          amount: Number(loan.amount) || 0,
          isIncome: false
        });
      }
    });

    // Borrow
    (db.borrowTransactions || []).forEach((b: BorrowTransaction) => {
      if (!b) return;
      const person = String(b.person || '');
      if (person.toLowerCase().includes(q)) {
        results.push({
          type: 'Borrow',
          module: 'money',
          title: `Borrowed from ${person}`,
          subtitle: `Date: ${b.date || ''} • Status: ${b.status || 'active'}`,
          amount: Number(b.amount) || 0,
          isIncome: true
        });
      }
    });

    return results.slice(0, 20);
  }, [db, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      <div
        onClick={() => {
          sound.play('button');
          onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      <div className="relative w-full max-w-xl glass-card bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl z-10 animate-in zoom-in-95">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-blue-500" />
          <input
            type="text"
            placeholder="Search transactions, groceries, inventory, loans..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white focus:outline-none"
          />
          <button
            onClick={() => {
              sound.play('button');
              onClose();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-3 p-1">
          {query.trim() && searchResults.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-8">
              No results found for "{query}".
            </p>
          )}

          {!query.trim() && (
            <p className="text-center text-xs text-slate-400 py-8">
              Type anything to search all your offline records.
            </p>
          )}

          {searchResults.map((res, i) => (
            <div
              key={i}
              onClick={() => {
                sound.play('button');
                onNavigate(res.module);
                onClose();
              }}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between cursor-pointer transition-all"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold uppercase">
                    {res.type}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {res.title}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{res.subtitle}</p>
              </div>

              <div className="flex items-center gap-2">
                {res.amount !== null && (
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {formatINR(res.amount)}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
