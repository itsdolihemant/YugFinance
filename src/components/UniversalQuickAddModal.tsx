import React from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  ShoppingCart,
  Milk,
  Droplets,
  Target
} from 'lucide-react';
import { sound } from '../services/soundEngine';

export type QuickAddType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'lend'
  | 'borrow'
  | 'investment'
  | 'grocery'
  | 'milk'
  | 'water'
  | 'goal';

interface UniversalQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickAddType) => void;
  t: (key: string) => string;
}

export const UniversalQuickAddModal: React.FC<UniversalQuickAddModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  t
}) => {
  if (!isOpen) return null;

  const actions: { id: QuickAddType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
    {
      id: 'income',
      label: t('income'),
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20'
    },
    {
      id: 'expense',
      label: t('expense'),
      icon: TrendingDown,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20 hover:bg-rose-500/20'
    },
    {
      id: 'transfer',
      label: t('transfer'),
      icon: ArrowRightLeft,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/20'
    },
    {
      id: 'lend',
      label: t('addLend'),
      icon: ArrowUpRight,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20'
    },
    {
      id: 'borrow',
      label: t('addBorrow'),
      icon: ArrowDownLeft,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10 dark:bg-orange-500/20 hover:bg-orange-500/20'
    },
    {
      id: 'investment',
      label: t('addInvestment'),
      icon: Coins,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/20'
    },
    {
      id: 'grocery',
      label: t('grocery'),
      icon: ShoppingCart,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10 dark:bg-teal-500/20 hover:bg-teal-500/20'
    },
    {
      id: 'milk',
      label: t('milk'),
      icon: Milk,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20 hover:bg-cyan-500/20'
    },
    {
      id: 'water',
      label: t('water'),
      icon: Droplets,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10 dark:bg-sky-500/20 hover:bg-sky-500/20'
    },
    {
      id: 'goal',
      label: t('addGoal'),
      icon: Target,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        id="modal-overlay"
        onClick={() => {
          sound.play('button');
          onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div
        id="master-add-modal"
        className="relative w-full max-w-md glass-card bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('quickAdd')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select what you would like to log
            </p>
          </div>
          <button
            onClick={() => {
              sound.play('button');
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4 max-h-[65vh] overflow-y-auto p-1">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  sound.play('button');
                  onSelectAction(act.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/60 dark:border-slate-700/50 ${act.bg} transition-all active:scale-95 text-left group`}
              >
                <div className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm ${act.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:translate-x-0.5 transition-transform">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
