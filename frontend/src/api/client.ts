// ============================================================
// API CLIENT - Wrapper REST allineato ai DTO del backend
// ============================================================

import type { DashboardData, CalendarEvent } from '../types';

const BASE_URL = '/api';

function getAuthHeader(): string {
  return localStorage.getItem('budgetAuthHeader') ?? '';
}

function authHeaders(): HeadersInit {
  return {
    Authorization: getAuthHeader(),
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function deleteRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<T>(res);
}

// ---- AUTH ----
export async function loginCheck(email: string, password: string): Promise<boolean> {
  const encoded = btoa(`${email}:${password}`);
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
export interface SavingsGoalTransaction {
  id: string;
  savingsGoalId: string;
  username: string;
  amount: number;
  note?: string;
  eventId?: string;
  createdAt: string;
}

export const fetchSavingsGoals = () => getJson<any[]>('/budget/savings-goals');
export const createSavingsGoal = (name: string, targetAmount: number, targetDate?: string, icon?: string) =>
  postJson('/budget/savings-goals', { name, targetAmount, targetDate, icon });
export const updateSavingsGoal = (id: string, name: string, targetAmount: number, targetDate?: string, icon?: string) =>
  putJson(`/budget/savings-goals/${id}`, { name, targetAmount, targetDate, icon });
export const deleteSavingsGoal = (id: string) => deleteRequest(`/budget/savings-goals/${id}`);
export const depositSavingsGoal = (id: string, amount: number) =>
  postJson(`/budget/savings-goals/${id}/deposit`, { amount });

export const fetchSavingsGoalTransactions = (goalId: string) =>
  getJson<SavingsGoalTransaction[]>(`/budget/savings-goals/${goalId}/transactions`);
export const deleteSavingsGoalTransaction = (goalId: string, txId: string) =>
  deleteRequest(`/budget/savings-goals/${goalId}/transactions/${txId}`);
export const updateSavingsGoalTransaction = (goalId: string, txId: string, amount: number, note?: string) =>
  putJson(`/budget/savings-goals/${goalId}/transactions/${txId}`, { amount, note });

// ---- CATEGORY LIMITS & SUMMARY ----
export const fetchCategoryLimits = () => getJson<any[]>('/budget/category-limits');
export const setCategoryLimit = (category: string, monthlyLimit: number) =>
  postJson('/budget/category-limits', { category, monthlyLimit });
export const fetchCategorySummary = () => getJson<any>('/budget/categories/summary');

// ---- CASHFLOW FORECAST ----
export const fetchForecast = () => getJson<any>('/budget/forecast');

// ---- DEBTS ----
// DebtRequest: { label, totalAmount, startMonth, durationMonths }
// Il backend vuole l'importo TOTALE del debito (la rata = totalAmount / durationMonths)
export const createDebt = (
  label: string,
  totalAmount: number,
  startMonth: string,
  durationMonths: number,
) => postJson('/budget/debts', { label, totalAmount, startMonth, durationMonths });
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
