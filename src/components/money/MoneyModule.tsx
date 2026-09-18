import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle,
  RotateCcw,
  Eye,
  Percent
} from 'lucide-react';
import {
  DatabaseSchema,
  MmTransaction,
  LendTransaction,
  BorrowTransaction,
  Portfolio,
  BankAccount,
  LendStatus,
  BorrowStatus
} from '../../types/finance';
import { FinancialSummary, formatINR } from '../../services/calculations';
import { generateId } from '../../services/storage';
import { sound } from '../../services/soundEngine';

interface MoneyModuleProps {
  db: DatabaseSchema;
  summary: FinancialSummary;
  isBalanceHidden: boolean;
  onUpdateDb: (updated: DatabaseSchema) => void;
  t: (key: string) => string;
}

export const MoneyModule: React.FC<MoneyModuleProps> = ({
  db,
  summary,
  isBalanceHidden,
  onUpdateDb,
  t
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'accounts' | 'lend' | 'borrow' | 'invest'>('transactions');

  // Filters for transactions
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Modals state
  const [editingTx, setEditingTx] = useState<MmTransaction | null>(null);
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);
  const [txFormType, setTxFormType] = useState<'income' | 'expense' | 'transfer'>('expense');

  // Account Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Lend & Repayment Modals
  const [isLendModalOpen, setIsLendModalOpen] = useState<boolean>(false);
  const [isLendRepayModalOpen, setIsLendRepayModalOpen] = useState<boolean>(false);
  const [isLendAddMoreModalOpen, setIsLendAddMoreModalOpen] = useState<boolean>(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [viewHistoryLoanId, setViewHistoryLoanId] = useState<string | null>(null);

  // Borrow & Debt Modals
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState<boolean>(false);
  const [isBorrowRepayModalOpen, setIsBorrowRepayModalOpen] = useState<boolean>(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState<string | null>(null);

  // Investment Modals
  const [isInvestModalOpen, setIsInvestModalOpen] = useState<boolean>(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [isValuationModalOpen, setIsValuationModalOpen] = useState<boolean>(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [viewHistoryPortfolioId, setViewHistoryPortfolioId] = useState<string | null>(null);

  // Helper for amounts
  const displayAmount = (amt: number) => {
    if (isBalanceHidden) return '••••••';
    return formatINR(amt);
  };

  // Filtered transactions list
  const filteredTransactions = React.useMemo(() => {
    return (db.mm_transactions || [])
      .filter((tx) => {
        if (!tx) return false;
        const desc = String(tx.description || '');
        const cat = String(tx.category || '');
        const txDate = String(tx.date || '');

        if (searchFilter.trim()) {
          const s = searchFilter.toLowerCase();
          return desc.toLowerCase().includes(s) || cat.toLowerCase().includes(s);
        }
        return txDate.startsWith(monthFilter);
      })
      .filter((tx) => typeFilter === 'all' || tx.type === typeFilter)
      .filter((tx) => {
        if (accountFilter === 'all') return true;
        if (tx.type === 'transfer') {
          return tx.fromAccount === accountFilter || tx.toAccount === accountFilter;
        }
        return tx.paymentMethod === accountFilter;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [db.mm_transactions, monthFilter, typeFilter, accountFilter, searchFilter]);

  // Transaction Save/Update
  const handleSaveTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const description = (formData.get('description') as string).trim();
    const category = (formData.get('category') as string) || '';
    const note = (formData.get('note') as string) || '';

    if (!amount || isNaN(amount) || !date || !description) return;

    const newDb = { ...db };

    if (editingTx) {
      const idx = newDb.mm_transactions.findIndex((t) => t.id === editingTx.id);
      if (idx !== -1) {
        newDb.mm_transactions[idx] = {
          ...newDb.mm_transactions[idx],
          amount,
          date,
          description,
          category,
          note,
          paymentMethod: txFormType !== 'transfer' ? (formData.get('account') as string) : undefined,
          fromAccount: txFormType === 'transfer' ? (formData.get('fromAccount') as string) : undefined,
          toAccount: txFormType === 'transfer' ? (formData.get('toAccount') as string) : undefined,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      const newTx: MmTransaction = {
        id: generateId('tx'),
        type: txFormType,
        amount,
        date,
        description,
        category,
        note,
        paymentMethod: txFormType !== 'transfer' ? (formData.get('account') as string) : undefined,
        fromAccount: txFormType === 'transfer' ? (formData.get('fromAccount') as string) : undefined,
        toAccount: txFormType === 'transfer' ? (formData.get('toAccount') as string) : undefined,
        createdAt: new Date().toISOString()
      };
      newDb.mm_transactions.push(newTx);
    }

    sound.play('save');
    onUpdateDb(newDb);
    setIsAddTxOpen(false);
    setEditingTx(null);
  };

  const handleDeleteTransaction = (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      mm_transactions: db.mm_transactions.filter((t) => t.id !== id)
    };
    onUpdateDb(newDb);
  };

  // Account Management
  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get('name') as string).trim();
    const type = formData.get('type') as BankAccount['type'];
    const openingBalance = parseFloat(formData.get('openingBalance') as string) || 0;
    const note = (formData.get('note') as string) || '';

    if (!name) return;

    const newDb = { ...db };

    if (editingAccount) {
      const idx = newDb.bankAccounts.findIndex((a) => a.id === editingAccount.id);
      if (idx !== -1) {
        const oldName = newDb.bankAccounts[idx].name;
        newDb.bankAccounts[idx] = {
          ...newDb.bankAccounts[idx],
          name,
          type,
          openingBalance,
          note
        };
        // Update accounts array string
        const accIdx = newDb.accounts.indexOf(oldName);
        if (accIdx !== -1) newDb.accounts[accIdx] = name;
      }
    } else {
      const newAcc: BankAccount = {
        id: generateId('acc'),
        name,
        type,
        openingBalance,
        status: 'active',
        note
      };
      newDb.bankAccounts.push(newAcc);
      if (!newDb.accounts.includes(name)) {
        newDb.accounts.push(name);
      }
    }

    sound.play('save');
    onUpdateDb(newDb);
    setIsAccountModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (acc: BankAccount) => {
    // Check if transactions exist for this account
    const hasTx = db.mm_transactions.some(
      (t) => t.paymentMethod === acc.name || t.fromAccount === acc.name || t.toAccount === acc.name
    );
    if (hasTx) {
      alert(t('cannotDeleteAccountWithTx'));
      return;
    }
    if (!window.confirm(`Delete account "${acc.name}"?`)) return;

    sound.play('delete');
    const newDb = {
      ...db,
      bankAccounts: db.bankAccounts.filter((b) => b.id !== acc.id),
      accounts: db.accounts.filter((a) => a !== acc.name)
    };
    onUpdateDb(newDb);
  };

  // Lend Handling
  const handleSaveLend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get('name') as string).trim();
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const returnDate = (formData.get('returnDate') as string) || null;
    const interest = parseFloat(formData.get('interest') as string) || 0;
    const emiTerm = parseInt(formData.get('emiTerm') as string) || 0;
    const fromAccount = formData.get('fromAccount') as string;
    const notes = (formData.get('notes') as string) || '';

    if (!name || !amount || !date || !fromAccount) return;

    const lendId = generateId('lend');
    const newLend: LendTransaction = {
      id: lendId,
      type: 'lend',
      name,
      amount,
      interest,
      date,
      returnDate,
      emiTerm,
      notes,
      status: 'pending'
    };

    // Mirror as expense transaction
    const newTx: MmTransaction = {
      id: generateId('tx_lend'),
      type: 'expense',
      amount,
      date,
      description: `${t('lendTo') || 'Lent to'} ${name}`,
      category: 'Lend',
      paymentMethod: fromAccount,
      linkedLendId: lendId
    };

    const newDb = {
      ...db,
      lendTransactions: [newLend, ...db.lendTransactions],
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsLendModalOpen(false);
  };

  const handleSaveLendRepayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLoanId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const toAccount = formData.get('toAccount') as string;

    if (!amount || !date || !toAccount) return;

    const loan = db.lendTransactions.find((l) => l.id === selectedLoanId);
    if (!loan) return;

    const repayId = generateId('repay');
    const newRepayment = {
      id: repayId,
      loanId: selectedLoanId,
      amount,
      date,
      account: toAccount
    };

    const newTx: MmTransaction = {
      id: generateId('tx_repay'),
      type: 'income',
      amount,
      date,
      description: `Repayment from ${loan.name}`,
      category: 'Lend Repayment',
      paymentMethod: toAccount,
      linkedLendId: repayId
    };

    const newDb = {
      ...db,
      repayments: [...db.repayments, newRepayment],
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsLendRepayModalOpen(false);
    setSelectedLoanId(null);
  };

  const handleToggleLoanStatus = (loanId: string) => {
    sound.play('button');
    const newDb = {
      ...db,
      lendTransactions: db.lendTransactions.map((l) =>
        l.id === loanId
          ? { ...l, status: (l.status === 'pending' ? 'completed' : 'pending') as LendStatus }
          : l
      )
    };
    onUpdateDb(newDb);
  };

  // Borrow / Debt Handling
  const handleSaveBorrow = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const person = (formData.get('person') as string).trim();
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const dueDate = (formData.get('dueDate') as string) || null;
    const interest = parseFloat(formData.get('interest') as string) || 0;
    const account = formData.get('account') as string;
    const notes = (formData.get('notes') as string) || '';

    if (!person || !amount || !date || !account) return;

    const borrowId = generateId('borrow');
    const newBorrow: BorrowTransaction = {
      id: borrowId,
      person,
      amount,
      date,
      dueDate,
      paidAmount: 0,
      interest,
      notes,
      status: 'active',
      account
    };

    // Receiving borrowed money increases account balance as income/deposit
    const newTx: MmTransaction = {
      id: generateId('tx_borrow'),
      type: 'income',
      amount,
      date,
      description: `Borrowed from ${person}`,
      category: 'Borrow / Debt',
      paymentMethod: account,
      linkedBorrowId: borrowId
    };

    const newDb = {
      ...db,
      borrowTransactions: [newBorrow, ...db.borrowTransactions],
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsBorrowModalOpen(false);
  };

  const handleSaveBorrowRepayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBorrowId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const fromAccount = formData.get('fromAccount') as string;

    if (!amount || !date || !fromAccount) return;

    const borrow = db.borrowTransactions.find((b) => b.id === selectedBorrowId);
    if (!borrow) return;

    const repayId = generateId('brepay');
    const newRepayment = {
      id: repayId,
      borrowId: selectedBorrowId,
      amount,
      date,
      fromAccount
    };

    const newTx: MmTransaction = {
      id: generateId('tx_brepay'),
      type: 'expense',
      amount,
      date,
      description: `Debt repayment to ${borrow.person}`,
      category: 'Debt Repayment',
      paymentMethod: fromAccount,
      linkedBorrowId: repayId
    };

    const newPaidAmount = (borrow.paidAmount || 0) + amount;
    const newStatus: BorrowStatus = newPaidAmount >= borrow.amount ? 'repaid' : 'active';

    const newDb = {
      ...db,
      borrowRepayments: [...db.borrowRepayments, newRepayment],
      borrowTransactions: db.borrowTransactions.map((b) =>
        b.id === selectedBorrowId ? { ...b, paidAmount: newPaidAmount, status: newStatus } : b
      ),
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsBorrowRepayModalOpen(false);
    setSelectedBorrowId(null);
  };

  // Investment Handling
  const handleSaveInvestment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    let portfolioId = formData.get('portfolioId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const fromAccount = formData.get('fromAccount') as string;
    const notes = (formData.get('notes') as string) || '';

    if (!amount || !date || !fromAccount) return;

    const newDb = { ...db };

    if (portfolioId === 'NEW') {
      const name = (formData.get('newPortfolioName') as string).trim();
      const type = formData.get('newPortfolioType') as Portfolio['type'];
      if (!name) return;

      const newP: Portfolio = {
        id: generateId('port'),
        name,
        type,
        status: 'active',
        currentValue: amount
      };
      newDb.portfolios.push(newP);
      portfolioId = newP.id;
    }

    const invId = generateId('inv');
    const newInv = {
      id: invId,
      portfolioId,
      amount,
      date,
      notes,
      fromAccount
    };
    newDb.investments.push(newInv);

    // Mirror as expense
    const pObj = newDb.portfolios.find((p) => p.id === portfolioId);
    const newTx: MmTransaction = {
      id: generateId('tx_inv'),
      type: 'expense',
      amount,
      date,
      description: `Invested in ${pObj?.name || 'Portfolio'}`,
      category: 'Investment',
      paymentMethod: fromAccount,
      linkedInvestId: invId
    };
    newDb.mm_transactions.push(newTx);

    sound.play('save');
    onUpdateDb(newDb);
    setIsInvestModalOpen(false);
  };

  const handleSaveWithdrawal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPortfolioId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const toAccount = formData.get('toAccount') as string;

    if (!amount || !date || !toAccount) return;

    const portfolio = db.portfolios.find((p) => p.id === selectedPortfolioId);
    if (!portfolio) return;

    const wId = generateId('wd');
    const newWd = {
      id: wId,
      portfolioId: selectedPortfolioId,
      amount,
      date,
      toAccount
    };

    const newTx: MmTransaction = {
      id: generateId('tx_wd'),
      type: 'income',
      amount,
      date,
      description: `Withdraw from ${portfolio.name}`,
      category: 'Investment Return',
      paymentMethod: toAccount,
      linkedInvestId: wId
    };

    const newDb = {
      ...db,
      withdrawals: [...db.withdrawals, newWd],
      mm_transactions: [newTx, ...db.mm_transactions]
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsWithdrawModalOpen(false);
    setSelectedPortfolioId(null);
  };

  const handleUpdateValuation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPortfolioId) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const currentVal = parseFloat(formData.get('currentValue') as string);

    if (isNaN(currentVal) || currentVal < 0) return;

    const newDb = {
      ...db,
      portfolios: db.portfolios.map((p) =>
        p.id === selectedPortfolioId
          ? { ...p, currentValue: currentVal, updatedAt: new Date().toISOString() }
          : p
      )
    };

    sound.play('save');
    onUpdateDb(newDb);
    setIsValuationModalOpen(false);
    setSelectedPortfolioId(null);
  };

  return (
    <div id="page-money" className="space-y-5 animate-in fade-in duration-300">
      {/* Sub navigation bar */}
      <div className="flex items-center gap-1.5 p-1.5 glass-card overflow-x-auto no-scrollbar">
        {[
          { id: 'transactions', label: t('transactions') },
          { id: 'accounts', label: t('bankAccounts') },
          { id: 'lend', label: t('lend') },
          { id: 'borrow', label: t('borrow') },
          { id: 'invest', label: t('investments') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sound.play('tab');
              setActiveSubTab(tab.id as any);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. TRANSACTIONS TAB */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('transactions')} Filters
              </h3>
              <button
                onClick={() => {
                  sound.play('button');
                  setEditingTx(null);
                  setTxFormType('expense');
                  setIsAddTxOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('newTransaction')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">{t('monthFilter')}</label>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">{t('type')}</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Types</option>
                  <option value="income">{t('income')}</option>
                  <option value="expense">{t('expense')}</option>
                  <option value="transfer">{t('transfer')}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">{t('account')}</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Accounts</option>
                  {db.accounts.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">{t('search')}</label>
                <input
                  type="text"
                  placeholder="Search description..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                No transactions found for current filter.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const isExpense = tx.type === 'expense';
                return (
                  <div
                    key={tx.id}
                    className="glass-card p-3.5 flex items-center justify-between group hover:border-blue-400/40 transition-all"
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
                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                          {tx.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {tx.date} • {tx.paymentMethod || `${tx.fromAccount} → ${tx.toAccount}`}{' '}
                          {tx.category && <span className="text-blue-500 font-medium">• {tx.category}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-bold ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isExpense
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isIncome ? '+' : isExpense ? '-' : ''}
                        {displayAmount(tx.amount)}
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            sound.play('button');
                            setEditingTx(tx);
                            setTxFormType(tx.type);
                            setIsAddTxOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. ACCOUNTS MANAGER TAB */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('bankAccounts')}
              </h3>
              <p className="text-xs text-slate-400">
                Manage bank accounts, wallets, and cash reserves
              </p>
            </div>
            <button
              onClick={() => {
                sound.play('button');
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addAccount')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {db.bankAccounts.map((acc) => {
              const balance = summary.accountBalances[acc.name] || 0;
              return (
                <div key={acc.id} className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {acc.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                          {acc.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          sound.play('button');
                          setEditingAccount(acc);
                          setIsAccountModalOpen(true);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {acc.name.toLowerCase() !== 'cash' && (
                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('currentBalance')}</span>
                    <span
                      className={`text-base font-bold ${
                        balance >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {displayAmount(balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. LEND TAB */}
      {activeSubTab === 'lend' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('lendSection')}
              </h3>
              <p className="text-xs text-slate-400">
                Total Lent (Outstanding): <strong>{displayAmount(summary.totalActiveLend)}</strong>
              </p>
            </div>
            <button
              onClick={() => {
                sound.play('button');
                setIsLendModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addLend')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {db.lendTransactions.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                {t('noActiveLend')}
              </div>
            ) : (
              db.lendTransactions.map((loan) => {
                const isCompleted = loan.status === 'completed';
                const initial = loan.amount || 0;
                const additions = db.lendAdditions
                  .filter((a) => a.loanId === loan.id)
                  .reduce((sum, a) => sum + a.amount, 0);
                const repayments = db.repayments
                  .filter((r) => r.loanId === loan.id)
                  .reduce((sum, r) => sum + r.amount, 0);
                const totalLoan = initial + additions;
                const remaining = Math.max(0, totalLoan - repayments);
                const progress = totalLoan > 0 ? (repayments / totalLoan) * 100 : 0;

                return (
                  <div
                    key={loan.id}
                    className={`glass-card p-4 space-y-3 border-l-4 ${
                      isCompleted ? 'border-l-slate-400 opacity-70' : 'border-l-amber-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{loan.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {isCompleted ? 'Closed' : 'Active'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Lent on {loan.date} {loan.returnDate ? `• Due by ${loan.returnDate}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                          {displayAmount(remaining)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          of {displayAmount(totalLoan)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Repaid: {displayAmount(repayments)} ({Math.round(progress)}%)
                      </span>

                      <div className="flex items-center gap-1.5">
                        {!isCompleted && (
                          <>
                            <button
                              onClick={() => {
                                sound.play('button');
                                setSelectedLoanId(loan.id);
                                setIsLendRepayModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-medium"
                            >
                              + Repay
                            </button>
                            <button
                              onClick={() => {
                                sound.play('button');
                                setSelectedLoanId(loan.id);
                                setIsLendAddMoreModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 font-medium"
                            >
                              + Add Loan
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleToggleLoanStatus(loan.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          title={isCompleted ? 'Reopen' : 'Close loan'}
                        >
                          {isCompleted ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. BORROW / DEBT TAB */}
      {activeSubTab === 'borrow' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('debtSection')}
              </h3>
              <p className="text-xs text-slate-400">
                Total Debt / Liabilities: <strong className="text-rose-500">{displayAmount(summary.totalActiveDebt)}</strong>
              </p>
            </div>
            <button
              onClick={() => {
                sound.play('button');
                setIsBorrowModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addBorrow')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {db.borrowTransactions.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400 text-sm">
                {t('noActiveDebt')}
              </div>
            ) : (
              db.borrowTransactions.map((debt) => {
                const isRepaid = debt.status === 'repaid';
                const paid = debt.paidAmount || 0;
                const remaining = Math.max(0, debt.amount - paid);
                const progress = debt.amount > 0 ? (paid / debt.amount) * 100 : 0;

                return (
                  <div
                    key={debt.id}
                    className={`glass-card p-4 space-y-3 border-l-4 ${
                      isRepaid ? 'border-l-slate-400 opacity-70' : 'border-l-rose-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{debt.person}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isRepaid
                                ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}
                          >
                            {isRepaid ? 'Repaid' : 'Active Debt'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Borrowed {debt.date} {debt.dueDate ? `• Due by ${debt.dueDate}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                          {displayAmount(remaining)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          of {displayAmount(debt.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500">
                        Paid: {displayAmount(paid)} ({Math.round(progress)}%)
                      </span>

                      {!isRepaid && (
                        <button
                          onClick={() => {
                            sound.play('button');
                            setSelectedBorrowId(debt.id);
                            setIsBorrowRepayModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium"
                        >
                          + Repay Debt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. INVESTMENTS TAB */}
      {activeSubTab === 'invest' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('investSection')}
              </h3>
              <p className="text-xs text-slate-400">
                Total Portfolio Valuation: <strong>{displayAmount(summary.totalInvestmentValue)}</strong>
              </p>
            </div>
            <button
              onClick={() => {
                sound.play('button');
                setIsInvestModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addInvestment')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {db.portfolios.length === 0 ? (
              <div className="col-span-full glass-card p-8 text-center text-slate-400 text-sm">
                {t('noActiveInvestments')}
              </div>
            ) : (
              db.portfolios.map((port) => {
                const invested = db.investments
                  .filter((i) => i.portfolioId === port.id)
                  .reduce((sum, i) => sum + i.amount, 0);
                const withdrawn = db.withdrawals
                  .filter((w) => w.portfolioId === port.id)
                  .reduce((sum, w) => sum + w.amount, 0);
                const net = Math.max(0, invested - withdrawn);
                const currentVal = typeof port.currentValue === 'number' ? port.currentValue : net;
                const profitLoss = currentVal - net;

                return (
                  <div key={port.id} className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {port.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold">
                          {port.type}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                          {displayAmount(currentVal)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold block ${
                            profitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {profitLoss >= 0 ? '+' : ''}
                          {displayAmount(profitLoss)} P/L
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{t('totalInvested')}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {displayAmount(invested)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{t('withdrawnAmount')}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {displayAmount(withdrawn)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          sound.play('button');
                          setSelectedPortfolioId(port.id);
                          setIsWithdrawModalOpen(true);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {t('withdrawAmount')}
                      </button>
                      <button
                        onClick={() => {
                          sound.play('button');
                          setSelectedPortfolioId(port.id);
                          setIsValuationModalOpen(true);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-xs font-semibold text-indigo-600 dark:text-indigo-300"
                      >
                        Edit Value
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddTxOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {editingTx ? t('editTransaction') : t('newTransaction')}
            </h3>

            {/* Type selector if not editing */}
            {!editingTx && (
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                {(['expense', 'income', 'transfer'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTxFormType(type)}
                    className={`py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
                      txFormType === type ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t('amount')}</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  defaultValue={editingTx?.amount}
                  placeholder="0.00"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('description')}</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingTx?.description}
                  placeholder="e.g. Salary, Rent, Grocery, Coffee..."
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">{t('date')}</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingTx?.date || new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {txFormType !== 'transfer' ? (
                  <div>
                    <label className="text-slate-400 block mb-1">{t('account')}</label>
                    <select
                      name="account"
                      defaultValue={editingTx?.paymentMethod || 'Cash'}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {db.accounts.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-slate-400 block mb-1">{t('fromAccount')}</label>
                    <select
                      name="fromAccount"
                      defaultValue={editingTx?.fromAccount || 'Cash'}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {db.accounts.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {txFormType === 'transfer' ? (
                <div>
                  <label className="text-slate-400 block mb-1">{t('toAccount')}</label>
                  <select
                    name="toAccount"
                    defaultValue={editingTx?.toAccount || db.accounts[1] || 'Cash'}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-slate-400 block mb-1">{t('category')}</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingTx?.category}
                    placeholder="e.g. Food, Utilities, Shopping..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/20"
                >
                  {t('saveTransaction')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAccountModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {editingAccount ? t('editAccount') : t('addAccount')}
            </h3>
            <form onSubmit={handleSaveAccount} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t('accountName')}</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingAccount?.name}
                  placeholder="e.g. HDFC Bank, SBI, Paytm Wallet"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('accountType')}</label>
                <select
                  name="type"
                  defaultValue={editingAccount?.type || 'Savings'}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Savings">{t('accountSavings')}</option>
                  <option value="Current">{t('accountCurrent')}</option>
                  <option value="Wallet">{t('accountWallet')}</option>
                  <option value="Cash">{t('accountCash')}</option>
                  <option value="Other">{t('accountOther')}</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('openingBalance')}</label>
                <input
                  type="number"
                  name="openingBalance"
                  step="0.01"
                  defaultValue={editingAccount?.openingBalance || 0}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  {t('saveAccount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lend Modal */}
      {isLendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsLendModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('newLend') || 'New Lend'}
            </h3>
            <form onSubmit={handleSaveLend} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t('personName')}</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Ramesh Sharma"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">{t('amountGiven')}</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t('fromAccount')}</label>
                  <select
                    name="fromAccount"
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
                  <label className="text-slate-400 block mb-1">{t('date')}</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t('returnDate')}</label>
                  <input
                    type="date"
                    name="returnDate"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">{t('interestRate')}</label>
                  <input
                    type="number"
                    name="interest"
                    defaultValue="0"
                    step="0.1"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t('emiTerm')}</label>
                  <input
                    type="number"
                    name="emiTerm"
                    placeholder="0 (optional)"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsLendModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lend Repayment Modal */}
      {isLendRepayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsLendRepayModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addRepayment')}
            </h3>
            <form onSubmit={handleSaveLendRepayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Repayment Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('toAccount')}</label>
                <select
                  name="toAccount"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {db.accounts.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('date')}</label>
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
                  onClick={() => setIsLendRepayModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Save Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrow Modal */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsBorrowModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('addBorrow')}
            </h3>
            <form onSubmit={handleSaveBorrow} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t('borrowFrom')}</label>
                <input
                  type="text"
                  name="person"
                  placeholder="e.g. Bank Loan, Friend, Relative"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">{t('amountBorrowed')}</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t('toAccount')}</label>
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
                  <label className="text-slate-400 block mb-1">{t('date')}</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t('dueDate')}</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrow Repayment Modal */}
      {isBorrowRepayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsBorrowRepayModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('payDebt')}
            </h3>
            <form onSubmit={handleSaveBorrowRepayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Repayment Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('fromAccount')}</label>
                <select
                  name="fromAccount"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {db.accounts.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('date')}</label>
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
                  onClick={() => setIsBorrowRepayModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Investment Modal */}
      {isInvestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsInvestModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('newInvest')}
            </h3>
            <form onSubmit={handleSaveInvestment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t('portfolio')}</label>
                <select
                  name="portfolioId"
                  id="tx-portfolio-id"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  onChange={(e) => {
                    const newFields = document.getElementById('new-portfolio-section');
                    if (newFields) {
                      newFields.style.display = e.target.value === 'NEW' ? 'block' : 'none';
                    }
                  }}
                >
                  <option value="NEW">+ [ Create New Portfolio ]</option>
                  {db.portfolios
                    .filter((p) => p.status === 'active')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              </div>

              <div id="new-portfolio-section" className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-slate-400 block mb-1">{t('portfolioName')}</label>
                  <input
                    type="text"
                    name="newPortfolioName"
                    placeholder="e.g. Parag Parikh Flexi Cap, Gold ETF..."
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t('investmentType')}</label>
                  <select
                    name="newPortfolioType"
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Mutual Fund">Mutual Fund</option>
                    <option value="Stock Market">Stock Market</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="FD">Fixed Deposit (FD)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">{t('amountInvest')}</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t('fromAccount')}</label>
                  <select
                    name="fromAccount"
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
                <label className="text-slate-400 block mb-1">{t('date')}</label>
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
                  onClick={() => setIsInvestModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsWithdrawModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">
              {t('withdrawAmount')}
            </h3>
            <form onSubmit={handleSaveWithdrawal} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Withdraw Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('toAccount')}</label>
                <select
                  name="toAccount"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {db.accounts.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t('date')}</label>
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
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Valuation Modal */}
      {isValuationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsValuationModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold mb-1 text-slate-900 dark:text-white">
              {t('updateCurrentValue')}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {t('manualValuationNotice')}
            </p>
            <form onSubmit={handleUpdateValuation} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Current Valuation (₹)</label>
                <input
                  type="number"
                  name="currentValue"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsValuationModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Update Value
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
