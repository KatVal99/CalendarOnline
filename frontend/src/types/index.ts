// ============================================================
// TIPI CONDIVISI - allineati ai record Java del backend
// ============================================================

/** GET /api/budget/dashboard → DashboardSnapshot */
export interface DashboardData {
  currentBalance: number;
  monthlySubscriptionsTotal: number;
  subscriptions: Subscription[];
  debts: DebtView[];
  flexiaByMonth: Record<string, number>;        // Map<String, BigDecimal>
  monthlyIncomes: Record<string, number>;        // Map<String, BigDecimal>
  monthlyExpenses: Record<string, number>;       // Map<String, BigDecimal>
  latestEntries: LedgerEntry[];
  currentMonthClosed: boolean;
}

/** LedgerEntry record */
export interface LedgerEntry {
  eventId: string;
  date: string;
  description: string;
  delta: number;          // importo (positivo = entrata, negativo = uscita)
  balanceAfter: number;
  source: BudgetEventType;
}

export type BudgetEventType =
  | 'INCOME'
  | 'EXPENSE'
  | 'DEBT_CREATED'
  | 'DEBT_REMOVED'
  | 'FLEXIA_SET'
  | 'FLEXIA_REMOVED'
  | 'SUBSCRIPTION_ADDED'
  | 'SUBSCRIPTION_REMOVED'
  | 'MONTHLY_CLOSE'
  | 'BALANCE_CARRYOVER';

/** Subscription record */
export interface Subscription {
  label: string;
  amount: number;         // costo mensile
}

/** DebtView record */
export interface DebtView {
  label: string;
  startMonth: string;
  endMonth: string;
  monthlyInstallment: number;
  remaining: number;
  durationMonths?: number;
}

/** SavingsGoalEntity record */
export interface SavingsGoal {
  id: string;
  username: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon?: string;
  createdAt: string;
}

/** SavingsGoalTransactionEntity record */
export interface SavingsGoalTransaction {
  id: string;
  savingsGoalId: string;
  username: string;
  amount: number;
  note?: string;
  eventId?: string;
  createdAt: string;
}

/** CategoryLimitEntity record */
export interface CategoryLimit {
  id: string;
  username: string;
  category: string;
  monthlyLimit: number;
  updatedAt?: string;
}

/** Category Summary response */
export interface CategorySummary {
  currentMonth: string;
  expensesByCategory: Record<string, number>;
  limitsByCategory: Record<string, number>;
}

/** Forecast response */
export interface CashflowForecast {
  currentBalance: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  subscriptionsTotal: number;
  netMonthlyChange: number;
  forecast3Months: number;
  forecast6Months: number;
  forecast12Months: number;
}

/** CalendarEventDto record */
export interface CalendarEvent {
  id: number;
  date: string;
  time: string | null;
  eventType: CalendarEventType;
  reminderMinutes: number | null;
  title: string;
}

export type CalendarEventType =
  | 'WORK'
  | 'PERSONAL'
  | 'HEALTH'
  | 'FINANCE'
  | 'STUDY'
  | 'FUN';

/** Calcolato da monthlyIncomes + monthlyExpenses */
export interface MonthlyTrend {
  month: string;
  incomes: number;
  expenses: number;
}

export interface AuthState {
  authHeader: string;
  email: string;
}
