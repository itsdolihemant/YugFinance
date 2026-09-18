import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  PieChart,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DatabaseSchema, MmTransaction } from '../../types/finance';
import { FinancialSummary, formatINR } from '../../services/calculations';
import { sound } from '../../services/soundEngine';

interface ReportsModuleProps {
  db: DatabaseSchema;
  summary: FinancialSummary;
  isBalanceHidden: boolean;
  t: (key: string) => string;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  db,
  summary,
  isBalanceHidden,
  t
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'prevMonth' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const displayAmount = (amt: number) => {
    if (isBalanceHidden) return '••••••';
    return formatINR(amt);
  };

  // Filter transactions by period
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return db.mm_transactions.filter((tx) => {
      const txDate = tx.date;
      if (period === 'today') {
        return txDate === todayStr;
      }
      if (period === 'week') {
        const d = new Date(txDate);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 7;
      }
      if (period === 'month') {
        const currentMonth = now.toISOString().slice(0, 7);
        return txDate.startsWith(currentMonth);
      }
      if (period === 'prevMonth') {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prev.toISOString().slice(0, 7);
        return txDate.startsWith(prevMonth);
      }
      if (period === 'year') {
        const currentYear = now.getFullYear().toString();
        return txDate.startsWith(currentYear);
      }
      if (period === 'custom') {
        if (customStart && txDate < customStart) return false;
        if (customEnd && txDate > customEnd) return false;
        return true;
      }
      return true;
    });
  }, [db.mm_transactions, period, customStart, customEnd]);

  // Aggregate metrics
  const totalIncome = filteredData
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredData
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netSavings / totalIncome) * 100) : 0;

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'General';
        map[cat] = (map[cat] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredData]);

  // Account distribution for income/expense
  const accountBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    filteredData.forEach((t) => {
      const acc = t.paymentMethod || t.fromAccount || 'Cash';
      if (!map[acc]) map[acc] = { income: 0, expense: 0 };
      if (t.type === 'income') map[acc].income += t.amount;
      if (t.type === 'expense') map[acc].expense += t.amount;
    });
    return Object.entries(map).map(([name, val]) => ({ name, ...val }));
  }, [filteredData]);

  // Export CSV
  const handleExportCSV = () => {
    sound.play('button');
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Description', 'Category', 'Account'];
    const rows = filteredData.map((t) => [
      t.id,
      t.date,
      t.type,
      t.amount,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.paymentMethod || `${t.fromAccount} -> ${t.toAccount}` || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `YugFinance_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    sound.play('button');
    window.print();
  };

  return (
    <div id="page-reports" className="space-y-5 animate-in fade-in duration-300">
      {/* Period Filter Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'prevMonth', label: 'Prev Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                sound.play('tab');
                setPeriod(p.id as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                period === p.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            title="Print report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Custom Date Selector if 'custom' is active */}
      {period === 'custom' && (
        <div className="glass-card p-3 flex items-center gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Period Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
            <span>{t('totalIncome')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {displayAmount(totalIncome)}
          </span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
            <span>{t('totalExpense')}</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {displayAmount(totalExpense)}
          </span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
            <span>{t('netSavings')}</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <span
            className={`text-xl font-bold ${
              netSavings >= 0 ? 'text-blue-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {displayAmount(netSavings)}
          </span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
            <span>{t('savingsRate')}</span>
            <PieChart className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {savingsRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Comparison Visualizer (Pure responsive CSS/SVG - 100% offline, zero external dependency) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income vs Expense Bar Comparison */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span>Income vs Expense</span>
          </h3>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1 font-medium">
                <span className="text-emerald-600 dark:text-emerald-400">{t('totalIncome')}</span>
                <span>{displayAmount(totalIncome)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${totalIncome + totalExpense > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1 font-medium">
                <span className="text-rose-600 dark:text-rose-400">{t('totalExpense')}</span>
                <span>{displayAmount(totalExpense)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{
                    width: `${totalIncome + totalExpense > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            <span>Top Expense Categories</span>
          </h3>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No expenses in this period.</p>
            ) : (
              categoryBreakdown.slice(0, 6).map((cat) => {
                const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {cat.name}
                      </span>
                      <span className="text-slate-500">
                        {displayAmount(cat.amount)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Account Inflow / Outflow Table */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Account Activity Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2">Account</th>
                <th className="pb-2 text-emerald-600">Inflow (+)</th>
                <th className="pb-2 text-rose-600">Outflow (-)</th>
                <th className="pb-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {accountBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    No account records for this period.
                  </td>
                </tr>
              ) : (
                accountBreakdown.map((acc) => (
                  <tr key={acc.name} className="py-2">
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-100">{acc.name}</td>
                    <td className="py-2.5 text-emerald-600 font-semibold">{displayAmount(acc.income)}</td>
                    <td className="py-2.5 text-rose-600 font-semibold">{displayAmount(acc.expense)}</td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        acc.income - acc.expense >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
                      }`}
                    >
                      {displayAmount(acc.income - acc.expense)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
