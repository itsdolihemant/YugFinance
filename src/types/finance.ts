// Type definitions for Yug Finance Manager 2.0

export type TransactionType = 'income' | 'expense' | 'transfer';
export type LendStatus = 'pending' | 'completed';
export type PortfolioStatus = 'active' | 'closed';
export type BorrowStatus = 'active' | 'repaid';

export interface MmTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  category?: string;
  paymentMethod?: string; // e.g. "Cash", "SBI Bank"
  fromAccount?: string;
  toAccount?: string;
  linkedLendId?: string;
  linkedInvestId?: string;
  linkedBorrowId?: string;
  linkedExpenseId?: string;
  linkedHouseholdId?: string;
  linkedGroceryId?: string;
  linkedMilkId?: string;
  linkedWaterId?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'Cash' | 'Savings' | 'Current' | 'Wallet' | 'Other';
  openingBalance: number;
  currentBalance?: number;
  status: 'active' | 'archived';
  note?: string;
}

export interface LendTransaction {
  id: string;
  type: 'lend';
  name: string;
  amount: number;
  interest: number; // % p.a.
  date: string;
  returnDate?: string | null;
  notes?: string;
  status: LendStatus;
  emiTerm?: number; // months
}

export interface LendRepayment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  account?: string;
}

export interface LendAddition {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  notes?: string;
  account?: string;
}

export interface BorrowTransaction {
  id: string;
  person: string;
  amount: number;
  date: string;
  dueDate?: string | null;
  paidAmount: number;
  interest?: number;
  notes?: string;
  status: BorrowStatus;
  account?: string;
}

export interface BorrowRepayment {
  id: string;
  borrowId: string;
  amount: number;
  date: string;
  fromAccount?: string;
  notes?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  type: 'Mutual Fund' | 'Stock Market' | 'Gold' | 'Silver' | 'FD' | 'Crypto' | 'Other';
  status: PortfolioStatus;
  currentValue?: number; // manual entered current value
  updatedAt?: string;
}

export interface Investment {
  id: string;
  portfolioId: string;
  amount: number;
  date: string;
  notes?: string;
  fromAccount?: string;
}

export interface Withdrawal {
  id: string;
  portfolioId: string;
  amount: number;
  date: string;
  toAccount?: string;
  notes?: string;
}

export type HouseholdCategory =
  | 'grocery'
  | 'milk'
  | 'water'
  | 'vegetables'
  | 'fruits'
  | 'meat'
  | 'fish'
  | 'food'
  | 'household'
  | 'fuel'
  | 'medicine'
  | 'bills'
  | 'shopping'
  | 'other'
  | 'Vegetables'
  | 'Fruits'
  | 'Meat'
  | 'Fish'
  | 'Food'
  | 'Household'
  | 'Fuel'
  | 'Medicine'
  | 'Bills'
  | 'Shopping'
  | 'Other';

export interface GroceryItem {
  id: string;
  item?: string;
  name?: string;
  quantity: number;
  unit: string; // kg, g, l, packet, piece
  price: number;
  shop?: string;
  date: string;
  category: string;
  note?: string;
  account?: string;
}

export interface MilkRecord {
  id: string;
  date: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  total?: number;
  status?: 'paid' | 'unpaid';
  unit?: string; // Liter, Packet, etc.
  vendor?: string;
  note?: string;
  account?: string;
}
export type MilkEntry = MilkRecord;

export interface WaterRecord {
  id: string;
  date: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  total?: number;
  unit?: string; // Can, Jar, Tanker, Liters
  supplier?: string;
  note?: string;
  account?: string;
}
export type WaterEntry = WaterRecord;

export interface HouseholdExpense {
  id: string;
  category: HouseholdCategory;
  item: string;
  name?: string;
  title?: string;
  amount: number;
  date: string;
  shop?: string;
  note?: string;
  notes?: string;
  account?: string;
}
export type GeneralHouseholdEntry = HouseholdExpense;

export interface InventoryItem {
  id: string;
  item?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock?: number;
  minStockAlert?: number;
  purchasePrice: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  location?: string;
  note?: string;
}

export type GoalType =
  | 'Net Worth'
  | 'Savings'
  | 'Investment'
  | 'House'
  | 'Vehicle'
  | 'Travel'
  | 'Emergency Fund'
  | 'Custom';

export interface Goal {
  id: string;
  name?: string;
  title: string;
  type?: GoalType;
  category: GoalType;
  targetAmount: number;
  currentAmount: number;
  startingAmount?: number;
  targetDate: string;
  note?: string;
  notes?: string;
  enabled: boolean;
}
export type FinancialGoal = Goal;

export interface Budget {
  id: string;
  month?: string; // YYYY-MM
  category: string;
  amount?: number;
  limit: number;
  type?: 'monthly' | 'category' | 'household';
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringItem {
  id: string;
  name?: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  account: string;
  frequency: RecurringFrequency;
  startDate?: string;
  nextDueDate: string;
  autoEntry?: boolean;
  autoAdd?: boolean;
  reminderMode?: boolean;
  note?: string;
  lastProcessed?: string;
}

export interface ModuleToggles {
  goals: boolean;
  budget: boolean;
  recurring: boolean;
  inventory: boolean;
  household: boolean;
  lend: boolean;
  borrow: boolean;
  invest: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'hi' | 'en';
  passcode: string | null;
  securityQuestion: string | null;
  securityAnswer: string | null;
  soundEnabled: boolean;
  volume: number; // 0 to 1
  soundVolume?: number;
  autoLockMinutes: number; // 0 for off
  modules: ModuleToggles;
}

export interface DatabaseSchema {
  version: number;
  appName: string;
  lastBackupDate?: string;
  mm_transactions: MmTransaction[];
  accounts: string[]; // backward compatible
  bankAccounts: BankAccount[]; // v2 detailed accounts
  lendTransactions: LendTransaction[];
  repayments: LendRepayment[];
  lendAdditions: LendAddition[];
  borrowTransactions: BorrowTransaction[];
  borrowRepayments: BorrowRepayment[];
  portfolios: Portfolio[];
  investments: Investment[];
  withdrawals: Withdrawal[];
  household: {
    grocery: GroceryItem[];
    milk: MilkRecord[];
    water: WaterRecord[];
    entries: HouseholdExpense[];
  };
  groceryItems: GroceryItem[];
  milkRecords: MilkRecord[];
  waterRecords: WaterRecord[];
  householdExpenses: HouseholdExpense[];
  inventory: InventoryItem[];
  inventoryItems: InventoryItem[];
  goals: Goal[];
  budgets: Budget[];
  recurring: RecurringItem[];
  recurringItems: RecurringItem[];
  settings: AppSettings;
}

export type SoundType =
  | 'nav'
  | 'tab'
  | 'button'
  | 'save'
  | 'success'
  | 'delete'
  | 'warning'
  | 'error'
  | 'backup'
  | 'pin';
