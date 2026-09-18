// Centralized Financial Calculation Engine for Yug Finance Manager 2.0
// Strict financial accuracy, zero double-counting, robust handling of zero/negatives

import { DatabaseSchema, Goal } from '../types/finance';

export interface FinancialSummary {
  netWorth: number;
  availableMoney: number;
  cashBalance: number;
  bankBalance: number;
  previousBalance: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
  monthlyNetChange: number;
  savingsRate: number;
  totalActiveLend: number;
  totalActiveDebt: number;
  totalInvested: number;
  totalInvestmentValue: number;
  accountBalances: Record<string, number>;
}

export function calculateSummary(db: DatabaseSchema, currentMonthStr?: string): FinancialSummary {
  const defaultSummary: FinancialSummary = {
    netWorth: 0,
    availableMoney: 0,
    cashBalance: 0,
    bankBalance: 0,
    previousBalance: 0,
    currentMonthIncome: 0,
    currentMonthExpense: 0,
    monthlyNetChange: 0,
    savingsRate: 0,
    totalActiveLend: 0,
    totalActiveDebt: 0,
    totalInvested: 0,
    totalInvestmentValue: 0,
    accountBalances: { Cash: 0 }
  };

  if (!db || typeof db !== 'object') return defaultSummary;

  const month = currentMonthStr || new Date().toISOString().slice(0, 7); // YYYY-MM

  // 1. Calculate Account Balances
  const accountBalances: Record<string, number> = {};
  const accounts = Array.isArray(db.accounts) && db.accounts.length > 0 ? db.accounts : ['Cash'];
  const bankAccounts = Array.isArray(db.bankAccounts) ? db.bankAccounts : [];

  accounts.forEach((acc) => {
    const accStr = String(acc || 'Cash').trim();
    // Find opening balance if exists in bankAccounts
    const bankAcc = bankAccounts.find((b) => b && String(b.name || '').toLowerCase() === accStr.toLowerCase());
    accountBalances[accStr] = bankAcc ? Number(bankAcc.openingBalance) || 0 : 0;
  });

  // Calculate from mm_transactions
  const transactions = Array.isArray(db.mm_transactions) ? db.mm_transactions : [];
  transactions.forEach((tx) => {
    if (!tx) return;
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      const acc = String(tx.paymentMethod || 'Cash');
      accountBalances[acc] = (accountBalances[acc] || 0) + amount;
    } else if (tx.type === 'expense') {
      const acc = String(tx.paymentMethod || 'Cash');
      accountBalances[acc] = (accountBalances[acc] || 0) - amount;
    } else if (tx.type === 'transfer') {
      if (tx.fromAccount) {
        const fromAcc = String(tx.fromAccount);
        accountBalances[fromAcc] = (accountBalances[fromAcc] || 0) - amount;
      }
      if (tx.toAccount) {
        const toAcc = String(tx.toAccount);
        accountBalances[toAcc] = (accountBalances[toAcc] || 0) + amount;
      }
    }
  });

  // 2. Cash and Bank Balances
  let cashBalance = 0;
  let bankBalance = 0;

  Object.entries(accountBalances).forEach(([accName, balance]) => {
    const b = Number(balance) || 0;
    if (String(accName).toLowerCase() === 'cash') {
      cashBalance += b;
    } else {
      bankBalance += b;
    }
  });

  const availableMoney = cashBalance + bankBalance;

  // 3. Previous Balance (Transactions prior to current month)
  let prevBalance = 0;
  let currentMonthIncome = 0;
  let currentMonthExpense = 0;

  transactions.forEach((tx) => {
    if (!tx) return;
    const amount = Number(tx.amount) || 0;
    const txDateStr = typeof tx.date === 'string' ? tx.date : (tx.date ? String(tx.date) : '');
    const txMonth = txDateStr.slice(0, 7);

    if (txMonth && txMonth < month) {
      if (tx.type === 'income') prevBalance += amount;
      else if (tx.type === 'expense') prevBalance -= amount;
    }

    if (txMonth && txMonth === month) {
      if (tx.type === 'income') currentMonthIncome += amount;
      else if (tx.type === 'expense') currentMonthExpense += amount;
    }
  });

  const monthlyNetChange = currentMonthIncome - currentMonthExpense;
  const rawSavingsRate = currentMonthIncome > 0 ? (monthlyNetChange / currentMonthIncome) * 100 : 0;
  const savingsRate = isNaN(rawSavingsRate) ? 0 : Math.max(0, Math.min(100, rawSavingsRate));

  // 5. Total Active Lend (Asset)
  let totalActiveLend = 0;
  const lendTransactions = Array.isArray(db.lendTransactions) ? db.lendTransactions : [];
  const lendAdditions = Array.isArray(db.lendAdditions) ? db.lendAdditions : [];
  const repayments = Array.isArray(db.repayments) ? db.repayments : [];

  lendTransactions
    .filter((l) => l && l.status === 'pending')
    .forEach((l) => {
      const initial = Number(l.amount) || 0;
      const additions = lendAdditions
        .filter((a) => a && a.loanId === l.id)
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const rep = repayments
        .filter((r) => r && r.loanId === l.id)
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const remaining = Math.max(0, initial + additions - rep);
      totalActiveLend += remaining;
    });

  // 6. Total Active Debt / Borrow (Liability)
  let totalActiveDebt = 0;
  const borrowTransactions = Array.isArray(db.borrowTransactions) ? db.borrowTransactions : [];
  const borrowRepayments = Array.isArray(db.borrowRepayments) ? db.borrowRepayments : [];

  borrowTransactions
    .filter((b) => b && b.status === 'active')
    .forEach((b) => {
      const initial = Number(b.amount) || 0;
      const repaid = borrowRepayments
        .filter((r) => r && r.borrowId === b.id)
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const remaining = Math.max(0, initial - (Number(b.paidAmount) || repaid));
      totalActiveDebt += remaining;
    });

  // 7. Total Investments (Asset)
  let totalInvested = 0;
  let totalInvestmentValue = 0;
  const portfolios = Array.isArray(db.portfolios) ? db.portfolios : [];
  const investments = Array.isArray(db.investments) ? db.investments : [];
  const withdrawals = Array.isArray(db.withdrawals) ? db.withdrawals : [];

  portfolios
    .filter((p) => p && p.status === 'active')
    .forEach((p) => {
      const invested = investments
        .filter((i) => i && i.portfolioId === p.id)
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const withdrawn = withdrawals
        .filter((w) => w && w.portfolioId === p.id)
        .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
      const net = Math.max(0, invested - withdrawn);
      totalInvested += net;

      if (typeof p.currentValue === 'number' && !isNaN(p.currentValue) && p.currentValue >= 0) {
        totalInvestmentValue += p.currentValue;
      } else {
        totalInvestmentValue += net;
      }
    });

  // 8. Core Conceptual Calculation:
  // NET WORTH = Cash + Bank Balances + Outstanding Lend + Current Investment Value - Liabilities (Total Debt)
  const netWorth = availableMoney + totalActiveLend + totalInvestmentValue - totalActiveDebt;

  return {
    netWorth: isNaN(netWorth) ? 0 : netWorth,
    availableMoney: isNaN(availableMoney) ? 0 : availableMoney,
    cashBalance: isNaN(cashBalance) ? 0 : cashBalance,
    bankBalance: isNaN(bankBalance) ? 0 : bankBalance,
    previousBalance: isNaN(prevBalance) ? 0 : prevBalance,
    currentMonthIncome: isNaN(currentMonthIncome) ? 0 : currentMonthIncome,
    currentMonthExpense: isNaN(currentMonthExpense) ? 0 : currentMonthExpense,
    monthlyNetChange: isNaN(monthlyNetChange) ? 0 : monthlyNetChange,
    savingsRate,
    totalActiveLend: isNaN(totalActiveLend) ? 0 : totalActiveLend,
    totalActiveDebt: isNaN(totalActiveDebt) ? 0 : totalActiveDebt,
    totalInvested: isNaN(totalInvested) ? 0 : totalInvested,
    totalInvestmentValue: isNaN(totalInvestmentValue) ? 0 : totalInvestmentValue,
    accountBalances
  };
}

export const calculateFinancialSummary = calculateSummary;

// Goal calculations
export function calculateGoalMetrics(goal: Goal, netWorth: number) {
  const current = goal.type === 'Net Worth' ? netWorth : goal.currentAmount || 0;
  const target = Math.max(0, goal.targetAmount || 0);
  const remaining = Math.max(0, target - current);
  const percentage = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;

  let daysRemaining = 0;
  let isPast = false;
  if (goal.targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(goal.targetDate);
    targetDate.setHours(0, 0, 0, 0);
    const diff = targetDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    isPast = daysRemaining < 0;
  }

  return {
    current,
    target,
    remaining,
    percentage: Math.round(percentage * 10) / 10,
    daysRemaining: Math.abs(daysRemaining),
    isPast,
    isCompleted: current >= target && target > 0
  };
}

// Format Currency Utility in INR
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}
