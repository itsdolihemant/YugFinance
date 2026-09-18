// Storage and Data Migration Engine for Yug Finance Manager 2.0
// 100% Offline with localStorage, version migration, and automatic recurring processing

import {
  DatabaseSchema,
  AppSettings,
  BankAccount,
  MmTransaction,
  LendTransaction,
  LendStatus,
  BorrowTransaction,
  BorrowStatus,
  Portfolio,
  PortfolioStatus,
  GroceryItem,
  MilkRecord,
  WaterRecord,
  HouseholdExpense,
  HouseholdCategory,
  InventoryItem,
  Goal,
  Budget,
  RecurringItem,
  RecurringFrequency
} from '../types/finance';

const CURRENT_DATA_VERSION = 2;
export const V1_STORAGE_KEY = 'ultimateManagerData';
export const V2_STORAGE_KEY = 'yug_finance_v2_data';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  language: 'hi',
  passcode: null,
  securityQuestion: null,
  securityAnswer: null,
  soundEnabled: true,
  volume: 0.5,
  autoLockMinutes: 0,
  modules: {
    goals: true,
    budget: true,
    recurring: true,
    inventory: true,
    household: true,
    lend: true,
    borrow: true,
    invest: true
  }
};

export const DEFAULT_DATABASE: DatabaseSchema = {
  version: CURRENT_DATA_VERSION,
  appName: 'Yug Finance Manager 2.0',
  lastBackupDate: undefined,
  mm_transactions: [],
  accounts: ['Cash'],
  bankAccounts: [
    {
      id: 'acc_cash',
      name: 'Cash',
      type: 'Cash',
      openingBalance: 0,
      status: 'active',
      note: 'Primary physical cash'
    }
  ],
  lendTransactions: [],
  repayments: [],
  lendAdditions: [],
  borrowTransactions: [],
  borrowRepayments: [],
  portfolios: [],
  investments: [],
  withdrawals: [],
  household: {
    grocery: [],
    milk: [],
    water: [],
    entries: []
  },
  groceryItems: [],
  milkRecords: [],
  waterRecords: [],
  householdExpenses: [],
  inventory: [],
  inventoryItems: [],
  goals: [],
  budgets: [],
  recurring: [],
  recurringItems: [],
  settings: DEFAULT_SETTINGS
};

export function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function loadDatabase(): DatabaseSchema {
  try {
    // 1. Check for V2 storage first
    const v2Raw = localStorage.getItem(V2_STORAGE_KEY);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      return migrateData(parsed);
    }

    // 2. Check for V1 storage (ultimateManagerData)
    const v1Raw = localStorage.getItem(V1_STORAGE_KEY);
    if (v1Raw) {
      const parsed = JSON.parse(v1Raw);
      const migrated = migrateData(parsed);
      saveDatabase(migrated);
      return migrated;
    }
  } catch (err) {
    console.error('Error loading Yug Finance database:', err);
  }

  // 3. Fallback to initial default database
  const initialDb = { ...DEFAULT_DATABASE };
  saveDatabase(initialDb);
  return initialDb;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateData(raw: any): DatabaseSchema {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }

  // 1. Sanitize Accounts
  let rawAccounts: string[] = [];
  if (Array.isArray(raw.accounts)) {
    rawAccounts = raw.accounts
      .map((a: unknown) => (typeof a === 'string' ? a.trim() : (a as { name?: string })?.name || ''))
      .filter((a: string) => Boolean(a));
  }
  if (rawAccounts.length === 0) {
    rawAccounts = ['Cash'];
  }

  // 2. Sanitize Bank Accounts
  const rawBankAccounts: any[] = Array.isArray(raw.bankAccounts) ? raw.bankAccounts : [];
  const bankAccounts: BankAccount[] = rawBankAccounts.map((b: any) => ({
    id: b?.id || generateId('bank'),
    name: String(b?.name || 'Account'),
    type: b?.type || 'Savings',
    openingBalance: Number(b?.openingBalance) || 0,
    status: (b?.status === 'archived' ? 'archived' : 'active') as 'active' | 'archived',
    accountNumber: String(b?.accountNumber || ''),
    bankName: String(b?.bankName || ''),
    note: String(b?.note || '')
  }));

  // Ensure all account names exist in bankAccounts
  rawAccounts.forEach((accName) => {
    const exists = bankAccounts.some((b) => b.name.toLowerCase() === accName.toLowerCase());
    if (!exists) {
      bankAccounts.push({
        id: generateId('acc'),
        name: accName,
        type: accName.toLowerCase() === 'cash' ? 'Cash' : 'Savings',
        openingBalance: 0,
        status: 'active' as const,
        note: ''
      });
    }
  });

  // 3. Sanitize Transactions
  const rawTx: any[] = Array.isArray(raw.mm_transactions) ? raw.mm_transactions : [];
  const mm_transactions: MmTransaction[] = rawTx.map((tx: any) => {
    const type = tx?.type === 'income' || tx?.type === 'transfer' ? tx.type : 'expense';
    return {
      id: tx?.id || generateId('tx'),
      type,
      amount: Math.abs(Number(tx?.amount) || 0),
      description: String(tx?.description || tx?.desc || tx?.title || 'Transaction'),
      date: typeof tx?.date === 'string' && tx.date ? tx.date : new Date().toISOString().split('T')[0],
      category: String(tx?.category || 'General'),
      paymentMethod: String(tx?.paymentMethod || tx?.account || 'Cash'),
      fromAccount: tx?.fromAccount ? String(tx.fromAccount) : undefined,
      toAccount: tx?.toAccount ? String(tx.toAccount) : undefined,
      note: tx?.note ? String(tx.note) : undefined,
      createdAt: tx?.createdAt ? String(tx.createdAt) : new Date().toISOString()
    };
  });

  // 4. Sanitize Lend
  const rawLend: any[] = Array.isArray(raw.lendTransactions) ? raw.lendTransactions : [];
  const lendTransactions: LendTransaction[] = rawLend.map((l: any) => ({
    id: l?.id || generateId('lend'),
    type: 'lend' as const,
    name: String(l?.name || l?.borrower || l?.person || 'Unknown'),
    amount: Math.abs(Number(l?.amount) || 0),
    interest: Number(l?.interest ?? l?.interestRate) || 0,
    date: typeof l?.date === 'string' && l.date ? l.date : new Date().toISOString().split('T')[0],
    returnDate: l?.dueDate || l?.returnDate ? String(l.dueDate || l.returnDate) : undefined,
    notes: l?.note || l?.notes ? String(l.note || l.notes) : undefined,
    status: (l?.status === 'completed' || l?.status === 'settled' ? 'completed' : 'pending') as LendStatus
  }));

  const rawRepayments: any[] = Array.isArray(raw.repayments) ? raw.repayments : [];
  const repayments = rawRepayments.map((r: any) => ({
    id: r?.id || generateId('rep'),
    loanId: String(r?.loanId || ''),
    amount: Math.abs(Number(r?.amount) || 0),
    date: typeof r?.date === 'string' && r.date ? r.date : new Date().toISOString().split('T')[0],
    paymentMethod: String(r?.paymentMethod || 'Cash'),
    note: r?.note ? String(r.note) : undefined
  }));

  const rawLendAdditions: any[] = Array.isArray(raw.lendAdditions) ? raw.lendAdditions : [];
  const lendAdditions = rawLendAdditions.map((a: any) => ({
    id: a?.id || generateId('add'),
    loanId: String(a?.loanId || ''),
    amount: Math.abs(Number(a?.amount) || 0),
    date: typeof a?.date === 'string' && a.date ? a.date : new Date().toISOString().split('T')[0],
    note: a?.note ? String(a.note) : undefined
  }));

  // 5. Sanitize Borrow
  const rawBorrow: any[] = Array.isArray(raw.borrowTransactions) ? raw.borrowTransactions : [];
  const borrowTransactions: BorrowTransaction[] = rawBorrow.map((b: any) => ({
    id: b?.id || generateId('borrow'),
    person: String(b?.person || b?.lender || b?.name || 'Unknown'),
    amount: Math.abs(Number(b?.amount) || 0),
    date: typeof b?.date === 'string' && b.date ? b.date : new Date().toISOString().split('T')[0],
    dueDate: b?.dueDate ? String(b.dueDate) : undefined,
    status: (b?.status === 'repaid' || b?.status === 'paid' ? 'repaid' : 'active') as BorrowStatus,
    paidAmount: Number(b?.paidAmount) || 0,
    notes: b?.note || b?.notes ? String(b.note || b.notes) : undefined,
    account: String(b?.account || 'Cash')
  }));

  const rawBorrowRepayments: any[] = Array.isArray(raw.borrowRepayments) ? raw.borrowRepayments : [];
  const borrowRepayments = rawBorrowRepayments.map((r: any) => ({
    id: r?.id || generateId('brp'),
    borrowId: String(r?.borrowId || ''),
    amount: Math.abs(Number(r?.amount) || 0),
    date: typeof r?.date === 'string' && r.date ? r.date : new Date().toISOString().split('T')[0],
    paymentMethod: String(r?.paymentMethod || 'Cash'),
    note: r?.note ? String(r.note) : undefined
  }));

  // 6. Sanitize Portfolios & Investments
  const rawPortfolios: any[] = Array.isArray(raw.portfolios) ? raw.portfolios : [];
  const portfolios: Portfolio[] = rawPortfolios.map((p: any) => ({
    id: p?.id || generateId('port'),
    name: String(p?.name || 'Portfolio'),
    type: p?.type || 'Mutual Funds',
    status: (p?.status === 'closed' ? 'closed' : 'active') as PortfolioStatus,
    currentValue: typeof p?.currentValue === 'number' ? p.currentValue : undefined,
    notes: p?.notes ? String(p.notes) : undefined
  }));

  const rawInvestments: any[] = Array.isArray(raw.investments) ? raw.investments : [];
  const investments = rawInvestments.map((i: any) => ({
    id: i?.id || generateId('inv_tx'),
    portfolioId: String(i?.portfolioId || ''),
    amount: Math.abs(Number(i?.amount) || 0),
    date: typeof i?.date === 'string' && i.date ? i.date : new Date().toISOString().split('T')[0],
    account: String(i?.account || 'Cash'),
    note: i?.note ? String(i.note) : undefined
  }));

  const rawWithdrawals: any[] = Array.isArray(raw.withdrawals) ? raw.withdrawals : [];
  const withdrawals = rawWithdrawals.map((w: any) => ({
    id: w?.id || generateId('with'),
    portfolioId: String(w?.portfolioId || ''),
    amount: Math.abs(Number(w?.amount) || 0),
    date: typeof w?.date === 'string' && w.date ? w.date : new Date().toISOString().split('T')[0],
    account: String(w?.account || 'Cash'),
    note: w?.note ? String(w.note) : undefined
  }));

  // 7. Sanitize Household (Groceries, Milk, Water, Expenses)
  const rawGroceries: any[] = Array.isArray(raw.groceryItems)
    ? raw.groceryItems
    : Array.isArray(raw.household?.grocery)
    ? raw.household.grocery
    : [];
  const groceryItems: GroceryItem[] = rawGroceries.map((g: any) => ({
    id: g?.id || generateId('groc'),
    name: String(g?.name || g?.item || 'Grocery Item'),
    item: String(g?.item || g?.name || 'Grocery Item'),
    quantity: Number(g?.quantity) || 1,
    unit: String(g?.unit || 'kg'),
    price: Math.abs(Number(g?.price || g?.estimatedCost || g?.cost) || 0),
    category: String(g?.category || 'General'),
    date: typeof g?.date === 'string' && g.date ? g.date : new Date().toISOString().split('T')[0],
    status: g?.status === 'bought' ? 'bought' : 'pending',
    shop: g?.shop ? String(g.shop) : undefined
  }));

  const rawMilk: any[] = Array.isArray(raw.milkRecords)
    ? raw.milkRecords
    : Array.isArray(raw.household?.milk)
    ? raw.household.milk
    : [];
  const milkRecords: MilkRecord[] = rawMilk.map((m: any) => {
    const qty = Math.abs(Number(m?.quantity || m?.litres) || 0);
    const rate = Math.abs(Number(m?.rate || m?.pricePerLitre) || 0);
    const total = typeof m?.totalAmount === 'number' ? m.totalAmount : (typeof m?.total === 'number' ? m.total : qty * rate);
    return {
      id: m?.id || generateId('milk'),
      date: typeof m?.date === 'string' && m.date ? m.date : new Date().toISOString().split('T')[0],
      quantity: qty,
      rate,
      totalAmount: total,
      vendor: m?.vendor ? String(m.vendor) : undefined,
      note: m?.note ? String(m.note) : undefined
    };
  });

  const rawWater: any[] = Array.isArray(raw.waterRecords)
    ? raw.waterRecords
    : Array.isArray(raw.household?.water)
    ? raw.household.water
    : [];
  const waterRecords: WaterRecord[] = rawWater.map((w: any) => {
    const qty = Math.abs(Number(w?.quantity || w?.cans) || 1);
    const rate = Math.abs(Number(w?.rate) || 0);
    const total = typeof w?.totalAmount === 'number' ? w.totalAmount : (typeof w?.cost === 'number' ? w.cost : (typeof w?.total === 'number' ? w.total : (Number(w?.amount) || 0)));
    return {
      id: w?.id || generateId('water'),
      date: typeof w?.date === 'string' && w.date ? w.date : new Date().toISOString().split('T')[0],
      quantity: qty,
      rate,
      totalAmount: total,
      vendor: w?.vendor ? String(w.vendor) : undefined,
      note: w?.note ? String(w.note) : undefined
    };
  });

  const rawExpenses: any[] = Array.isArray(raw.householdExpenses)
    ? raw.householdExpenses
    : Array.isArray(raw.household?.entries)
    ? raw.household.entries
    : [];
  const householdExpenses: HouseholdExpense[] = rawExpenses.map((e: any) => ({
    id: e?.id || generateId('hh_exp'),
    item: String(e?.item || e?.name || 'Expense'),
    category: (e?.category || 'other') as HouseholdCategory,
    amount: Math.abs(Number(e?.amount || e?.cost) || 0),
    date: typeof e?.date === 'string' && e.date ? e.date : new Date().toISOString().split('T')[0],
    paidBy: e?.paidBy ? String(e.paidBy) : undefined,
    note: e?.note ? String(e.note) : undefined
  }));

  // 8. Sanitize Inventory
  const rawInventory: any[] = Array.isArray(raw.inventoryItems)
    ? raw.inventoryItems
    : Array.isArray(raw.inventory)
    ? raw.inventory
    : [];
  const inventoryItems: InventoryItem[] = rawInventory.map((i: any) => ({
    id: i?.id || generateId('inv'),
    name: String(i?.name || i?.item || 'Item'),
    category: String(i?.category || 'General'),
    quantity: Math.abs(Number(i?.quantity) || 0),
    unit: String(i?.unit || 'pcs'),
    minStockAlert: typeof i?.minStockAlert === 'number' ? i.minStockAlert : 0,
    purchasePrice: Number(i?.purchasePrice) || 0,
    purchaseDate: i?.purchaseDate ? String(i.purchaseDate) : undefined,
    expiryDate: i?.expiryDate ? String(i.expiryDate) : undefined,
    location: String(i?.location || '')
  }));

  // 9. Sanitize Goals
  const rawGoals: any[] = Array.isArray(raw.goals) ? raw.goals : [];
  const goals: Goal[] = rawGoals.map((g: any) => ({
    id: g?.id || generateId('goal'),
    title: String(g?.title || g?.name || 'Financial Goal'),
    category: g?.category || 'Savings',
    targetAmount: Math.abs(Number(g?.targetAmount) || 0),
    currentAmount: Math.abs(Number(g?.currentAmount) || 0),
    targetDate: typeof g?.targetDate === 'string' && g.targetDate ? g.targetDate : new Date().toISOString().split('T')[0],
    enabled: g?.enabled !== false,
    notes: g?.notes ? String(g.notes) : ''
  }));

  // 10. Sanitize Budgets
  const rawBudgets: any[] = Array.isArray(raw.budgets) ? raw.budgets : [];
  const budgets: Budget[] = rawBudgets.map((b: any) => ({
    id: b?.id || generateId('bgt'),
    category: String(b?.category || 'General'),
    limit: Math.abs(Number(b?.limit) || 0),
    month: b?.month ? String(b.month) : undefined
  }));

  // 11. Sanitize Recurring
  const rawRecurring: any[] = Array.isArray(raw.recurringItems)
    ? raw.recurringItems
    : Array.isArray(raw.recurring)
    ? raw.recurring
    : [];
  const recurringItems: RecurringItem[] = rawRecurring.map((r: any) => ({
    id: r?.id || generateId('rec'),
    title: String(r?.title || r?.name || 'Recurring Schedule'),
    name: String(r?.name || r?.title || 'Recurring Schedule'),
    type: (r?.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
    amount: Math.abs(Number(r?.amount) || 0),
    frequency: (r?.frequency || 'monthly') as RecurringFrequency,
    category: String(r?.category || 'General'),
    account: String(r?.account || 'Cash'),
    nextDueDate: typeof r?.nextDueDate === 'string' && r.nextDueDate ? r.nextDueDate : new Date().toISOString().split('T')[0],
    autoAdd: r?.autoAdd ?? r?.autoEntry ?? true,
    autoEntry: r?.autoEntry ?? r?.autoAdd ?? true,
    lastProcessed: r?.lastProcessed ? String(r.lastProcessed) : undefined
  }));

  // 12. Sanitize Settings
  const settings: AppSettings = {
    theme: raw.settings?.theme === 'dark' ? 'dark' : 'light',
    language: raw.settings?.language === 'en' ? 'en' : 'hi',
    passcode: raw.settings?.passcode ? String(raw.settings.passcode) : null,
    securityQuestion: raw.settings?.securityQuestion ? String(raw.settings.securityQuestion) : null,
    securityAnswer: raw.settings?.securityAnswer ? String(raw.settings.securityAnswer) : null,
    soundEnabled: raw.settings?.soundEnabled ?? true,
    volume: typeof raw.settings?.volume === 'number' ? raw.settings.volume : 0.5,
    soundVolume: typeof raw.settings?.soundVolume === 'number' ? raw.settings.soundVolume : (typeof raw.settings?.volume === 'number' ? raw.settings.volume : 0.5),
    autoLockMinutes: Number(raw.settings?.autoLockMinutes) || 0,
    modules: {
      goals: raw.settings?.modules?.goals ?? true,
      budget: raw.settings?.modules?.budget ?? true,
      recurring: raw.settings?.modules?.recurring ?? true,
      inventory: raw.settings?.modules?.inventory ?? true,
      household: raw.settings?.modules?.household ?? true,
      lend: raw.settings?.modules?.lend ?? true,
      borrow: raw.settings?.modules?.borrow ?? true,
      invest: raw.settings?.modules?.invest ?? true
    }
  };

  const db: DatabaseSchema = {
    version: CURRENT_DATA_VERSION,
    appName: raw.appName || 'Yug Finance Manager 2.0',
    lastBackupDate: raw.lastBackupDate,
    mm_transactions,
    accounts: rawAccounts,
    bankAccounts,
    lendTransactions,
    repayments,
    lendAdditions,
    borrowTransactions,
    borrowRepayments,
    portfolios,
    investments,
    withdrawals,
    household: {
      grocery: groceryItems,
      milk: milkRecords,
      water: waterRecords,
      entries: householdExpenses
    },
    groceryItems,
    milkRecords,
    waterRecords,
    householdExpenses,
    inventory: inventoryItems,
    inventoryItems,
    goals,
    budgets,
    recurring: recurringItems,
    recurringItems,
    settings
  };

  return db;
}

export function saveDatabase(db: DatabaseSchema): void {
  try {
    const serialized = JSON.stringify(db);
    localStorage.setItem(V2_STORAGE_KEY, serialized);

    // Keep V1 backward compatible format updated in parallel
    const v1CompatibilityPayload = {
      mm_transactions: db.mm_transactions,
      accounts: db.accounts,
      lendTransactions: db.lendTransactions,
      repayments: db.repayments,
      lendAdditions: db.lendAdditions,
      portfolios: db.portfolios,
      investments: db.investments,
      withdrawals: db.withdrawals,
      settings: {
        theme: db.settings.theme,
        language: db.settings.language,
        passcode: db.settings.passcode,
        securityQuestion: db.settings.securityQuestion,
        securityAnswer: db.settings.securityAnswer
      },
      borrowTransactions: db.borrowTransactions,
      household: db.household,
      inventory: db.inventory,
      goals: db.goals,
      budgets: db.budgets,
      recurring: db.recurring
    };
    localStorage.setItem(V1_STORAGE_KEY, JSON.stringify(v1CompatibilityPayload));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

// Auto-process due recurring items on app open without duplicate transactions
export function processRecurringRules(db: DatabaseSchema): { updated: boolean; count: number } {
  if (!db || !db.settings?.modules?.recurring) return { updated: false, count: 0 };

  const todayStr = new Date().toISOString().split('T')[0];
  let processedCount = 0;

  const items = Array.isArray(db.recurringItems) && db.recurringItems.length > 0 ? db.recurringItems : (db.recurring || []);

  items.forEach((item) => {
    if (!item || (!item.autoAdd && !item.autoEntry)) return;
    const due = item.nextDueDate || todayStr;

    if (due <= todayStr) {
      const itemTitle = item.title || item.name || 'Recurring Schedule';
      // Check if already processed for this due date to prevent duplicates
      const alreadyProcessed = (db.mm_transactions || []).some(
        (t) => t.date === due && (t.description === itemTitle || t.description === `${itemTitle} (Recurring)`) && t.amount === item.amount
      );

      if (!alreadyProcessed) {
        // Create new transaction
        db.mm_transactions.push({
          id: generateId('tx_rec'),
          type: item.type === 'income' ? 'income' : 'expense',
          amount: item.amount,
          description: `${itemTitle} (Recurring)`,
          date: due,
          category: item.category || 'Recurring',
          paymentMethod: item.account || 'Cash',
          createdAt: new Date().toISOString()
        });
        processedCount++;
      }

      // Compute next due date based on frequency
      const nextDate = calculateNextDueDate(due, item.frequency);
      item.nextDueDate = nextDate;
      item.lastProcessed = todayStr;
    }
  });

  if (processedCount > 0) {
    saveDatabase(db);
    return { updated: true, count: processedCount };
  }

  return { updated: false, count: 0 };
}


export function calculateNextDueDate(currentDateStr: string, frequency: string): string {
  const d = new Date(currentDateStr);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 1);
    return fallback.toISOString().split('T')[0];
  }

  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }

  return d.toISOString().split('T')[0];
}

export function defaultDatabase(): DatabaseSchema {
  return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
}

export function processRecurringTransactions(db: DatabaseSchema): DatabaseSchema {
  const clone: DatabaseSchema = JSON.parse(JSON.stringify(db));
  processRecurringRules(clone);
  return clone;
}

export function exportToJsonFile(db: DatabaseSchema): void {
  const payload = JSON.stringify(db, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `YugFinance_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAndValidateBackup(rawText: string): DatabaseSchema | null {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') return null;
    return migrateData(parsed);
  } catch (err) {
    console.error('Failed to parse backup JSON:', err);
    return null;
  }
}
