export type {
  DashboardData,
  CalendarEvent,
  SavingsGoal,
  SavingsGoalTransaction,
  CategoryLimit,
  CategorySummary,
  CashflowForecast,
};

import type {
  DashboardData,
  CalendarEvent,
  SavingsGoal,
  SavingsGoalTransaction,
  CategoryLimit,
  CategorySummary,
  CashflowForecast,
} from '../types';

const customApiUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('spideyApiUrl') : null;
const envApiUrl = (import.meta as any).env?.VITE_API_BASE_URL;
const isFileOrCapacitor = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  (window as any).Capacitor?.isNativePlatform?.() === true
);

const BASE_URL = customApiUrl || envApiUrl || (isFileOrCapacitor ? 'https://calendaronline.onrender.com/api' : '/api');

function getAuthHeader(): string {
  return localStorage.getItem('budgetAuthHeader') ?? '';
}

function authHeaders(): HeadersInit {
  return {
    Authorization: getAuthHeader(),
    'Content-Type': 'application/json',
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Connessione al server in timeout. Verifica che il backend sia attivo.');
    }
    throw err;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return {} as T;
  }
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const jsonErr = JSON.parse(text);
          errorMsg = jsonErr.error || jsonErr.message || text;
        } catch {
          errorMsg = text.length < 150 ? text : `HTTP ${res.status}`;
        }
      }
    } catch {}
    throw new Error(errorMsg);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const text = await res.text();
    if (!text || !text.trim()) return {} as T;
    return JSON.parse(text) as T;
  }
  return res.text() as unknown as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function deleteRequest<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<T>(res);
}

// ---- AUTH ----
export async function loginCheck(email: string, password: string): Promise<boolean> {
  const encoded = btoa(unescape(encodeURIComponent(`${email}:${password}`)));
  const authHeader = `Basic ${encoded}`;
  const res = await fetch(`${BASE_URL}/budget/dashboard`, {
    method: 'GET',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
  });
  if (res.ok) {
    localStorage.setItem('budgetAuthHeader', authHeader);
    localStorage.setItem('budgetEmail', email);
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem('budgetAuthHeader');
  localStorage.removeItem('budgetEmail');
}

// ---- DASHBOARD ----
export const fetchDashboard = () => getJson<DashboardData>('/budget/dashboard');

// ---- INCOMES ----
// MoneyRequest: { amount, description, date, category }
export const createIncome = (description: string, amount: number, category?: string) =>
  postJson('/budget/incomes', {
    description,
    amount,
    date: new Date().toISOString().substring(0, 10),
    category: category || 'Stipendio',
  });
export const deleteIncome = (id: string) => deleteRequest(`/budget/incomes/${id}`);

// ---- EXPENSES ----
// MoneyRequest: { amount, description, date, category }
export const createExpense = (description: string, amount: number, category?: string) =>
  postJson('/budget/expenses', {
    description,
    amount,
    date: new Date().toISOString().substring(0, 10),
    category: category || 'Altro',
  });
export const deleteExpense = (id: string) => deleteRequest(`/budget/expenses/${id}`);

// ---- SAVINGS GOALS ----
export const fetchSavingsGoals = () => getJson<SavingsGoal[]>('/budget/savings-goals');
export const createSavingsGoal = (name: string, targetAmount: number, targetDate?: string, icon?: string) =>
  postJson<SavingsGoal>('/budget/savings-goals', { name, targetAmount, targetDate, icon });
export const updateSavingsGoal = (id: string, name: string, targetAmount: number, targetDate?: string, icon?: string) =>
  putJson<SavingsGoal>(`/budget/savings-goals/${id}`, { name, targetAmount, targetDate, icon });
export const deleteSavingsGoal = (id: string) => deleteRequest<{ status: string }>(`/budget/savings-goals/${id}`);
export const depositSavingsGoal = (id: string, amount: number) =>
  postJson<SavingsGoal>(`/budget/savings-goals/${id}/deposit`, { amount });

export const fetchSavingsGoalTransactions = (goalId: string) =>
  getJson<SavingsGoalTransaction[]>(`/budget/savings-goals/${goalId}/transactions`);
export const deleteSavingsGoalTransaction = (goalId: string, txId: string) =>
  deleteRequest<{ status: string }>(`/budget/savings-goals/${goalId}/transactions/${txId}`);
export const updateSavingsGoalTransaction = (goalId: string, txId: string, amount: number, note?: string) =>
  putJson<SavingsGoalTransaction>(`/budget/savings-goals/${goalId}/transactions/${txId}`, { amount, note });

// ---- CATEGORY LIMITS & SUMMARY ----
export const fetchCategoryLimits = () => getJson<CategoryLimit[]>('/budget/category-limits');
export const setCategoryLimit = (category: string, monthlyLimit: number) =>
  postJson<CategoryLimit>('/budget/category-limits', { category, monthlyLimit });
export const fetchCategorySummary = () => getJson<CategorySummary>('/budget/categories/summary');

// ---- CASHFLOW FORECAST ----
export const fetchForecast = () => getJson<CashflowForecast>('/budget/forecast');

// ---- DEBTS ----
// DebtRequest: { label, totalAmount, startMonth, durationMonths }
// Il backend vuole l'importo TOTALE del debito (la rata = totalAmount / durationMonths)
export const createDebt = (
  label: string,
  totalAmount: number,
  startMonth: string,
  durationMonths: number,
) => postJson('/budget/debts', { label, totalAmount, startMonth, durationMonths });
export const updateDebt = (
  oldLabel: string,
  label: string,
  totalAmount: number,
  startMonth: string,
  durationMonths: number,
) => putJson(`/budget/debts/${encodeURIComponent(oldLabel)}`, { label, totalAmount, startMonth, durationMonths });
export const deleteDebt = (label: string) =>
  deleteRequest(`/budget/debts/${encodeURIComponent(label)}`);

// ---- FLEXIA ----
// FlexiaRequest: { yearMonth, amount }
export const createFlexia = (yearMonth: string, amount: number) =>
  postJson('/budget/flexia', { yearMonth, amount });
export const deleteFlexia = (yearMonth: string) =>
  deleteRequest(`/budget/flexia/${encodeURIComponent(yearMonth)}`);

// ---- SUBSCRIPTIONS ----
// SubscriptionRequest: { label, amount }
export const createSubscription = (label: string, amount: number) =>
  postJson('/budget/subscriptions', { label, amount });
export const deleteSubscription = (label: string) =>
  deleteRequest(`/budget/subscriptions/${encodeURIComponent(label)}`);

// ---- MONTHLY CLOSE ----
export const deleteMonthlyClose = () => deleteRequest('/budget/monthly-close');

// ---- CALENDAR EVENTS ----
// CalendarEventDto: { id: Long, date, time, title }   ← "title" non "description"
export const fetchCalendarEvents = (year: number, month: number) =>
  getJson<CalendarEvent[]>(`/calendar/events?year=${year}&month=${month}`);
export const fetchNextAppointment = () =>
  getJson<CalendarEvent | null>('/calendar/events/next');
export const fetchUpcomingAppointments = (limit = 5) =>
  getJson<CalendarEvent[]>(`/calendar/events/upcoming?limit=${limit}`);
// CalendarEventRequest: { date, time, title, eventType, reminderMinutes }
export const createCalendarEvent = (
  date: string,
  time: string,
  title: string,
  eventType: string,
  reminderMinutes: number | null,
) => postJson('/calendar/events', { date, time, title, eventType, reminderMinutes });
export const updateCalendarEvent = (
  eventId: number,
  date: string,
  time: string,
  title: string,
  eventType: string,
  reminderMinutes: number | null,
) => putJson(`/calendar/events/${eventId}`, { date, time, title, eventType, reminderMinutes })
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('HTTP 405')) {
      throw error;
    }
    return postJson(`/calendar/events/${eventId}`, { date, time, title, eventType, reminderMinutes });
  });
export const deleteCalendarEvent = (eventId: number) =>
  deleteRequest(`/calendar/events/${eventId}`);

// ---- USERS ----
export const registerUser = (username: string, password: string, email: string) =>
  postJson('/operator/users', { username, password, email });

// ---- RESET PASSWORD ----
export const requestPasswordReset = (email: string) =>
  postJson('/auth/reset-password', { email });
export const confirmPasswordReset = (token: string, newPassword: string) =>
  postJson('/auth/reset-password/confirm', { token, newPassword });
