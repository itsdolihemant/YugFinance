import React, { useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { DatabaseSchema, FinancialGoal } from '../../types/finance';
import { FinancialSummary, formatINR } from '../../services/calculations';
import { generateId } from '../../services/storage';
import { sound } from '../../services/soundEngine';

interface GoalsModuleProps {
  db: DatabaseSchema;
  summary: FinancialSummary;
  isBalanceHidden: boolean;
  onUpdateDb: (updated: DatabaseSchema) => void;
  t: (key: string) => string;
}

export const GoalsModule: React.FC<GoalsModuleProps> = ({
  db,
  summary,
  isBalanceHidden,
  onUpdateDb,
  t
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const displayAmount = (amt: number) => {
    if (isBalanceHidden) return '••••••';
    return formatINR(amt);
  };

  const handleSaveGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = (formData.get('title') as string).trim();
    const category = formData.get('category') as FinancialGoal['category'];
    const targetAmount = parseFloat(formData.get('targetAmount') as string);
    const targetDate = formData.get('targetDate') as string;
    const notes = (formData.get('notes') as string) || '';

    if (!title || !targetAmount || !targetDate) return;

    // Initial current amount can default to net worth or savings if requested
    let initialCurrent = 0;
    if (category === 'Net Worth') initialCurrent = Math.max(0, summary.netWorth);
    else if (category === 'Savings') initialCurrent = Math.max(0, summary.availableMoney);
    else if (category === 'Investment') initialCurrent = Math.max(0, summary.totalInvestmentValue);

    const newGoal: FinancialGoal = {
      id: generateId('goal'),
      title,
      category,
      targetAmount,
      currentAmount: initialCurrent,
      targetDate,
      enabled: true,
      notes
    };

    const newDb = {
      ...db,
      goals: [...db.goals, newGoal]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsModalOpen(false);
  };

  const handleDeleteGoal = (id: string) => {
    if (!window.confirm('Delete this goal?')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      goals: db.goals.filter((g) => g.id !== id)
    };
    onUpdateDb(newDb);
  };

  const handleToggleGoal = (id: string) => {
    sound.play('button');
    const newDb = {
      ...db,
      goals: db.goals.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    };
    onUpdateDb(newDb);
  };

  return (
    <div id="page-goals" className="space-y-5 animate-in fade-in duration-300">
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t('goalsSection')}
          </h3>
          <p className="text-xs text-slate-400">
            Track milestones for Net Worth, Savings, Travel, and Assets
          </p>
        </div>

        <button
          onClick={() => {
            sound.play('button');
            setIsModalOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('addGoal')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {db.goals.length === 0 ? (
          <div className="col-span-full glass-card p-8 text-center text-slate-400 text-sm">
            {t('noGoalsYet')}
          </div>
        ) : (
          (db.goals || []).map((goal) => {
            // Auto calculate current amount if linked to system metrics
            let current = Number(goal.currentAmount) || 0;
            if (goal.category === 'Net Worth') current = Math.max(0, summary.netWorth);
            if (goal.category === 'Savings') current = Math.max(0, summary.availableMoney);
            if (goal.category === 'Investment') current = Math.max(0, summary.totalInvestmentValue);

            const targetAmt = Number(goal.targetAmount) || 1;
            const rawProg = (current / targetAmt) * 100;
            const progress = isNaN(rawProg) ? 0 : Math.min(100, Math.max(0, rawProg));
            const remaining = Math.max(0, targetAmt - current);
            const isCompleted = progress >= 100;

            // Days remaining calculation
            const today = new Date();
            const target = new Date(goal.targetDate || '');
            const diffDays = isNaN(target.getTime()) ? 0 : Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const goalTitle = goal.title || (goal as unknown as { name?: string }).name || 'Financial Goal';

            return (
              <div
                key={goal.id}
                className={`glass-card p-5 space-y-4 border-l-4 transition-all ${
                  !goal.enabled
                    ? 'border-l-slate-400 opacity-60'
                    : isCompleted
                    ? 'border-l-emerald-500'
                    : 'border-l-purple-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                      {goal.category}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {goalTitle}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Target: {goal.targetDate || 'No date'}{' '}
                      <span className={diffDays < 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                        ({diffDays >= 0 ? `${diffDays} days left` : 'Overdue'})
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleGoal(goal.id)}
                      className={`p-1.5 rounded-lg text-xs font-semibold ${
                        goal.enabled ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400'
                      }`}
                      title={goal.enabled ? 'Disable' : 'Enable'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {displayAmount(current)}
                    </span>
                    <span className="text-slate-400">
                      Target: <strong>{displayAmount(goal.targetAmount)}</strong>
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{progress.toFixed(1)}% Achieved</span>
                    <span>Remaining: {displayAmount(remaining)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Goal Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addGoal')}
            </h3>
            <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Goal Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Dream House, Emergency Corpus, Europe Trip"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Goal Category</label>
                <select
                  name="category"
                  defaultValue="Net Worth"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Net Worth">Net Worth Milestone</option>
                  <option value="Savings">Savings Target</option>
                  <option value="Investment">Investment Portfolio</option>
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="House">House / Property</option>
                  <option value="Vehicle">Vehicle / Car</option>
                  <option value="Travel">Vacation / Travel</option>
                  <option value="Custom">Custom Target</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  name="targetAmount"
                  step="1000"
                  placeholder="0.00"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Date</label>
                <input
                  type="date"
                  name="targetDate"
                  required
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
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold"
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
