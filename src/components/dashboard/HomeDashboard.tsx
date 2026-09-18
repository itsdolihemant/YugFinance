import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  ArrowRightLeft,
  ShoppingCart,
  Milk,
  Droplets,
  Target,
  Percent,
  X,
  CreditCard
} from 'lucide-react';
import { DatabaseSchema } from '../../types/finance';
import { FinancialSummary, formatINR } from '../../services/calculations';
import { sound } from '../../services/soundEngine';
import { QuickAddType } from '../UniversalQuickAddModal';

interface HomeDashboardProps {
  db: DatabaseSchema;
  summary: FinancialSummary;
  isBalanceHidden: boolean;
  onOpenQuickAddAction: (type: QuickAddType) => void;
  onNavigate: (section: string) => void;
  t: (key: string) => string;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  db,
  summary,
  isBalanceHidden,
  onOpenQuickAddAction,
  onNavigate,
  t
}) => {
  const [showAccountsModal, setShowAccountsModal] = useState<boolean>(false);

  const displayAmount = (amt: number, fallbackSign: string = '') => {
    if (isBalanceHidden) return '••••••';
    return `${fallbackSign}${formatINR(amt)}`;
  };

  // Compile unified recent activities from transactions, lend, invest, borrow, household
  const recentActivities = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = [];

    // Transactions
    (db.mm_transactions || []).forEach((tx) => {
      if (!tx) return;
      const typeStr = tx.type || 'expense';
      const transferInfo = tx.fromAccount || tx.toAccount ? `${tx.fromAccount || ''} → ${tx.toAccount || ''}` : '';
      list.push({
        id: tx.id,
        date: tx.date || '',
        title: tx.description || 'Transaction',
        subtitle: `${tx.paymentMethod || transferInfo || 'Cash'}${tx.category ? ` • ${tx.category}` : ''}`,
        amount: Number(tx.amount) || 0,
        type: typeStr, // income, expense, transfer
        badge: String(typeStr).toUpperCase()
      });
    });

    // Sort by date descending safely
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list.slice(0, 10);
  }, [db.mm_transactions]);

  return (
    <div id="page-dashboard" className="space-y-5 animate-in fade-in duration-300">
      {/* Date Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 shadow-sm text-slate-600 dark:text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span id="mm_currentDateTime">
            {new Date().toLocaleDateString(db.settings.language === 'hi' ? 'hi-IN' : 'en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>

        <button
          onClick={() => {
            sound.play('button');
            setShowAccountsModal(true);
          }}
          className="text-xs font-medium text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{t('checkAccountBalances')}</span>
        </button>
      </div>

      {/* Net Worth Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 text-white shadow-xl shadow-blue-500/20 border border-blue-400/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 opacity-90">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t('netWorth')}
              </span>
            </div>
            <div
              className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                isBalanceHidden ? 'blur-balance' : ''
              }`}
            >
              {displayAmount(summary.netWorth)}
            </div>
            <p className="text-xs text-blue-100/80 mt-1">
              {t('availableMoney')}: <strong className="text-white">{displayAmount(summary.availableMoney)}</strong>
            </p>
          </div>

          {/* Quick Stats Pills in Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 md:pt-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] text-blue-100 block">{t('cashBalance')}</span>
              <span className="text-sm font-bold text-white block">
                {displayAmount(summary.cashBalance)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] text-blue-100 block">{t('bankBalance')}</span>
              <span className="text-sm font-bold text-white block">
                {displayAmount(summary.bankBalance)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] text-blue-100 block">{t('totalLend')}</span>
              <span className="text-sm font-bold text-amber-300 block">
                {displayAmount(summary.totalActiveLend)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] text-blue-100 block">{t('totalDebt')}</span>
              <span className="text-sm font-bold text-rose-300 block">
                {displayAmount(summary.totalActiveDebt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Month Performance Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Previous Balance */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('previousBalance')}</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200 ${isBalanceHidden ? 'blur-balance' : ''}`}>
            {displayAmount(summary.previousBalance)}
          </div>
          <span className="text-[10px] text-slate-400">{t('startOfMonth')}</span>
        </div>

        {/* Current Month Income */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('totalIncome')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 ${isBalanceHidden ? 'blur-balance' : ''}`}>
            {displayAmount(summary.currentMonthIncome, '+')}
          </div>
          <span className="text-[10px] text-slate-400">{t('thisMonth')}</span>
        </div>

        {/* Current Month Expense */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('totalExpense')}</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 ${isBalanceHidden ? 'blur-balance' : ''}`}>
            {displayAmount(summary.currentMonthExpense, '-')}
          </div>
          <span className="text-[10px] text-slate-400">{t('thisMonth')}</span>
        </div>

        {/* Savings Rate / Net Change */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('savingsRate')}</span>
            <Percent className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400">
            {summary.savingsRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400">
            {t('monthlyNetChange')}: {displayAmount(summary.monthlyNetChange)}
          </span>
        </div>
      </div>

      {/* Quick Actions Grid (10 quick direct entry buttons) */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          {t('quickActions')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => onOpenQuickAddAction('income')}
            className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>{t('addIncome')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('expense')}
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span>{t('addExpense')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('transfer')}
            className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-500" />
            <span>{t('transfer')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('lend')}
            className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
            <span>{t('addLend')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('borrow')}
            className="p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4 text-orange-500" />
            <span>{t('addBorrow')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('investment')}
            className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <Coins className="w-4 h-4 text-indigo-500" />
            <span>{t('addInvestment')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('milk')}
            className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <Milk className="w-4 h-4 text-cyan-500" />
            <span>{t('addMilk')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('water')}
            className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <Droplets className="w-4 h-4 text-sky-500" />
            <span>{t('addWater')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('grocery')}
            className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 text-teal-500" />
            <span>{t('addGrocery')}</span>
          </button>

          <button
            onClick={() => onOpenQuickAddAction('goal')}
            className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <Target className="w-4 h-4 text-purple-500" />
            <span>{t('addGoal')}</span>
          </button>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            {t('recentActivities')}
          </h3>
          <button
            onClick={() => onNavigate('money')}
            className="text-xs text-blue-600 dark:text-sky-400 hover:underline font-medium"
          >
            View all →
          </button>
        </div>

        <div id="recent-transactions-list" className="space-y-2.5">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-6">
              {t('noRecentActivities')}
            </p>
          ) : (
            recentActivities.map((act) => {
              const isIncome = act.type === 'income';
              const isExpense = act.type === 'expense';
              return (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 hover:bg-white/80 dark:hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : isExpense
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : isExpense ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <ArrowRightLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {act.date} • {act.subtitle}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`text-sm font-bold ${
                      isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isExpense
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-blue-600 dark:text-blue-400'
                    } ${isBalanceHidden ? 'blur-balance' : ''}`}
                  >
                    {isIncome ? '+' : isExpense ? '-' : ''}
                    {displayAmount(act.amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Account Balances Modal */}
      {showAccountsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowAccountsModal(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          />
          <div
            id="mm_balancePopup"
            className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {t('checkAccountBalances')}
                </h3>
              </div>
              <button
                onClick={() => setShowAccountsModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div id="mm_accountBalanceList" className="space-y-2 max-h-[60vh] overflow-y-auto">
              {Object.entries(summary.accountBalances).map(([name, bal]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {name}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    } ${isBalanceHidden ? 'blur-balance' : ''}`}
                  >
                    {displayAmount(bal)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
