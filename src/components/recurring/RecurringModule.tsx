import React, { useState } from 'react';
import {
  Repeat,
  Plus,
  Trash2,
  Calendar,
  Play,
  TrendingUp,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { DatabaseSchema, RecurringItem } from '../../types/finance';
import { formatINR } from '../../services/calculations';
import { generateId, processRecurringTransactions } from '../../services/storage';
import { sound } from '../../services/soundEngine';

interface RecurringModuleProps {
  db: DatabaseSchema;
  isBalanceHidden: boolean;
  onUpdateDb: (updated: DatabaseSchema) => void;
  t: (key: string) => string;
}

export const RecurringModule: React.FC<RecurringModuleProps> = ({
  db,
  isBalanceHidden,
  onUpdateDb,
  t
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const displayAmount = (amt: number) => {
    if (isBalanceHidden) return '••••••';
    return formatINR(amt);
  };

  const handleProcessDueNow = () => {
    sound.play('button');
    const updated = processRecurringTransactions(db);
    const addedCount = updated.mm_transactions.length - db.mm_transactions.length;
    onUpdateDb(updated);
    if (addedCount > 0) {
      sound.play('success');
      alert(`Successfully processed and added ${addedCount} due transaction(s)!`);
    } else {
      alert('No recurring transactions are due today.');
    }
  };

  const handleSaveRecurring = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = (formData.get('title') as string).trim();
    const type = formData.get('type') as 'income' | 'expense';
    const amount = parseFloat(formData.get('amount') as string);
    const frequency = formData.get('frequency') as RecurringItem['frequency'];
    const category = (formData.get('category') as string) || '';
    const account = formData.get('account') as string;
    const nextDueDate = formData.get('nextDueDate') as string;
    const autoAdd = formData.get('autoAdd') === 'on';

    if (!title || !amount || !nextDueDate || !account) return;

    const newItem: RecurringItem = {
      id: generateId('rec'),
      title,
      type,
      amount,
      frequency,
      category,
      account,
      nextDueDate,
      autoAdd
    };

    const newDb = {
      ...db,
      recurringItems: [...db.recurringItems, newItem]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsModalOpen(false);
  };

  const handleDeleteRecurring = (id: string) => {
    if (!window.confirm('Delete this recurring schedule?')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      recurringItems: db.recurringItems.filter((r) => r.id !== id)
    };
    onUpdateDb(newDb);
  };

  const handleToggleAutoAdd = (id: string) => {
    sound.play('button');
    const newDb = {
      ...db,
      recurringItems: db.recurringItems.map((r) =>
        r.id === id ? { ...r, autoAdd: !r.autoAdd } : r
      )
    };
    onUpdateDb(newDb);
  };

  return (
    <div id="page-recurring" className="space-y-5 animate-in fade-in duration-300">
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t('recurringSection')}
          </h3>
          <p className="text-xs text-slate-400">
            Offline scheduled recurring incomes, bills, EMIs & subscriptions
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleProcessDueNow}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Process Due</span>
          </button>

          <button
            onClick={() => {
              sound.play('button');
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addRecurring')}</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {db.recurringItems.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-400 text-sm">
            No recurring schedules added.
          </div>
        ) : (
          db.recurringItems.map((item) => {
            const isIncome = item.type === 'income';
            const today = new Date().toISOString().split('T')[0];
            const isDue = item.nextDueDate <= today;

            return (
              <div
                key={item.id}
                className={`glass-card p-4 flex items-center justify-between border-l-4 ${
                  isDue ? 'border-l-amber-500' : isIncome ? 'border-l-emerald-500' : 'border-l-blue-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{item.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                        {item.frequency}
                      </span>
                      {isDue && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                          Due Now
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Next Due: {item.nextDueDate} • Account: {item.account}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{displayAmount(item.amount)}
                    </span>
                    <button
                      onClick={() => handleToggleAutoAdd(item.id)}
                      className={`block text-[10px] text-right font-medium ${
                        item.autoAdd ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    >
                      {item.autoAdd ? '● Auto Add ON' : '○ Manual'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteRecurring(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addRecurring')}
            </h3>
            <form onSubmit={handleSaveRecurring} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Monthly Salary, House Rent, Netflix"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Type</label>
                  <select
                    name="type"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Frequency</label>
                  <select
                    name="frequency"
                    defaultValue="monthly"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
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

              <div>
                <label className="text-slate-400 block mb-1">Next Due Date</label>
                <input
                  type="date"
                  name="nextDueDate"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="autoAdd" name="autoAdd" defaultChecked className="rounded text-blue-600" />
                <label htmlFor="autoAdd" className="text-slate-600 dark:text-slate-300 select-none">
                  Automatically add transaction when app opens on or after due date
                </label>
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
