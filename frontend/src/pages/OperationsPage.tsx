import React, { useEffect, useState, useCallback } from 'react';
import { DashboardData, LedgerEntry, Subscription, DebtView } from '../types';
import {
  fetchDashboard,
  createIncome, deleteIncome,
  createExpense, deleteExpense,
  createDebt, deleteDebt,
  createFlexia, deleteFlexia,
  createSubscription, deleteSubscription,
} from '../api/client';
import PaginatedTable from '../components/PaginatedTable';
import Toast from '../components/Toast';
import ErrorModal from '../components/ErrorModal';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    INCOME: '🟢', EXPENSE: '🔴', DEBT_CREATED: '🟡', DEBT_REMOVED: '🟡',
    FLEXIA_SET: '🟠', FLEXIA_REMOVED: '🟠', SUBSCRIPTION_ADDED: '🔵',
    SUBSCRIPTION_REMOVED: '🔵', MONTHLY_CLOSE: '⚪', BALANCE_CARRYOVER: '⚪',
  };
  return map[source] ?? source;
}

export default function OperationsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Form state
  const [incomeDesc, setIncomeDesc] = useState('');
  const [incomeAmt, setIncomeAmt] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmt, setExpenseAmt] = useState('');
  const [debtLabel, setDebtLabel] = useState('');
  const [debtTotalAmt, setDebtTotalAmt] = useState('');  // totalAmount (non rata!)
  const [debtStart, setDebtStart] = useState('');
  const [debtDuration, setDebtDuration] = useState('');
  const [flexiaMonth, setFlexiaMonth] = useState('');    // yearMonth (YYYY-MM)
  const [flexiaAmt, setFlexiaAmt] = useState('');
  const [subLabel, setSubLabel] = useState('');
  const [subCost, setSubCost] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const showError = (msg: string) => setError({ title: 'Errore', message: msg });

  const load = useCallback(async () => {
    try { setData(await fetchDashboard()); }
    catch (e) { showError((e as Error).message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Flexia: converti Map<String,BigDecimal> in array ordinato
  const flexiaArray = data
    ? Object.entries(data.flexiaByMonth)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
    : [];

  // Handlers
  const addIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createIncome(incomeDesc, parseFloat(incomeAmt)); showToast('Entrata aggiunta ✅'); setIncomeDesc(''); setIncomeAmt(''); load(); }
    catch (err) { showError((err as Error).message); }
  };
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createExpense(expenseDesc, parseFloat(expenseAmt)); showToast('Spesa aggiunta ✅'); setExpenseDesc(''); setExpenseAmt(''); load(); }
    catch (err) { showError((err as Error).message); }
  };
  const addDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDebt(debtLabel, parseFloat(debtTotalAmt), debtStart, parseInt(debtDuration));
      showToast('Debito aggiunto ✅'); setDebtLabel(''); setDebtTotalAmt(''); setDebtStart(''); setDebtDuration(''); load();
    } catch (err) { showError((err as Error).message); }
  };
  const addFlexia = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createFlexia(flexiaMonth, parseFloat(flexiaAmt)); showToast('Flexia impostata ✅'); setFlexiaMonth(''); setFlexiaAmt(''); load(); }
    catch (err) { showError((err as Error).message); }
  };
  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createSubscription(subLabel, parseFloat(subCost)); showToast('Abbonamento aggiunto ✅'); setSubLabel(''); setSubCost(''); load(); }
    catch (err) { showError((err as Error).message); }
  };

  return (
    <div className="page operations-page">
      <div className="page-header"><h1>💳 Operazioni</h1></div>

      {data && (
        <div className="totals-grid">
          <div className="total-card"><div className="total-label">💰 Saldo</div><div className={`total-value ${data.currentBalance >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(data.currentBalance)}</div></div>
          <div className="total-card"><div className="total-label">🔵 Abbonamenti</div><div className="total-value">{formatCurrency(data.monthlySubscriptionsTotal)}</div></div>
          <div className="total-card"><div className="total-label">🟡 Rate</div><div className="total-value">{formatCurrency(data.debts.reduce((s, d) => s + d.monthlyInstallment, 0))}</div></div>
        </div>
      )}

      <div className="ops-forms-grid">
        <section className="card form-card">
          <h2>🟢 Aggiungi Entrata</h2>
          <form onSubmit={addIncome}>
            <input placeholder="Descrizione" value={incomeDesc} onChange={e => setIncomeDesc(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Importo €" value={incomeAmt} onChange={e => setIncomeAmt(e.target.value)} required />
            <button className="btn btn-green" type="submit">+ Aggiungi</button>
          </form>
        </section>

        <section className="card form-card">
          <h2>🔴 Aggiungi Spesa</h2>
          <form onSubmit={addExpense}>
            <input placeholder="Descrizione" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Importo €" value={expenseAmt} onChange={e => setExpenseAmt(e.target.value)} required />
            <button className="btn btn-red" type="submit">+ Aggiungi</button>
          </form>
        </section>

        <section className="card form-card">
          <h2>🟡 Nuovo Debito</h2>
          <form onSubmit={addDebt}>
            <input placeholder="Etichetta" value={debtLabel} onChange={e => setDebtLabel(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Importo TOTALE €" value={debtTotalAmt} onChange={e => setDebtTotalAmt(e.target.value)} required />
            <input type="month" placeholder="Mese inizio (YYYY-MM)" value={debtStart} onChange={e => setDebtStart(e.target.value)} required />
            <input type="number" placeholder="Durata (mesi)" value={debtDuration} onChange={e => setDebtDuration(e.target.value)} required />
            <button className="btn btn-yellow" type="submit">+ Aggiungi</button>
          </form>
        </section>

        <section className="card form-card">
          <h2>🟠 Valore Flexia</h2>
          <form onSubmit={addFlexia}>
            <input type="month" value={flexiaMonth} onChange={e => setFlexiaMonth(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Importo €" value={flexiaAmt} onChange={e => setFlexiaAmt(e.target.value)} required />
            <button className="btn btn-orange" type="submit">+ Imposta</button>
          </form>
        </section>

        <section className="card form-card">
          <h2>🔵 Abbonamento</h2>
          <form onSubmit={addSubscription}>
            <input placeholder="Etichetta" value={subLabel} onChange={e => setSubLabel(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Costo mensile €" value={subCost} onChange={e => setSubCost(e.target.value)} required />
            <button className="btn btn-blue" type="submit">+ Aggiungi</button>
          </form>
        </section>
      </div>

      <div className="ops-tables-grid">
        <section className="card">
          <h2>📋 Movimenti Recenti</h2>
          <PaginatedTable
            data={data?.latestEntries ?? []}
            keyFn={(r: LedgerEntry) => r.eventId}
            columns={[
              { header: 'Data', render: (r: LedgerEntry) => r.date },
              { header: '', render: (r: LedgerEntry) => sourceLabel(r.source) },
              { header: 'Descrizione', render: (r: LedgerEntry) => r.description },
              { header: 'Importo', render: (r: LedgerEntry) => <span className={r.delta >= 0 ? 'positive' : 'negative'}>{formatCurrency(r.delta)}</span> },
              { header: '', render: (r: LedgerEntry) => (r.source === 'INCOME' || r.source === 'EXPENSE') ? <button className="btn btn-small btn-danger" onClick={() => (r.source === 'INCOME' ? deleteIncome(r.eventId) : deleteExpense(r.eventId)).then(load).catch(e => showError((e as Error).message))}>✕</button> : null },
            ]}
          />
        </section>

        <section className="card">
          <h2>🟡 Debiti Attivi</h2>
          <PaginatedTable
            data={data?.debts ?? []}
            keyFn={(r: DebtView) => r.label}
            columns={[
              { header: 'Etichetta', render: (r: DebtView) => r.label },
              { header: 'Rata/mese', render: (r: DebtView) => formatCurrency(r.monthlyInstallment) },
              { header: 'Inizio', render: (r: DebtView) => r.startMonth },
              { header: 'Fine', render: (r: DebtView) => r.endMonth },
              { header: 'Residuo', render: (r: DebtView) => formatCurrency(r.remaining) },
              { header: '', render: (r: DebtView) => <button className="btn btn-small btn-danger" onClick={() => deleteDebt(r.label).then(load).catch(e => showError((e as Error).message))}>✕</button> },
            ]}
          />
        </section>

        <section className="card">
          <h2>🔵 Abbonamenti Attivi</h2>
          <PaginatedTable
            data={data?.subscriptions ?? []}
            keyFn={(r: Subscription) => r.label}
            columns={[
              { header: 'Etichetta', render: (r: Subscription) => r.label },
              { header: 'Costo/mese', render: (r: Subscription) => formatCurrency(r.amount) },
              { header: '', render: (r: Subscription) => <button className="btn btn-small btn-danger" onClick={() => deleteSubscription(r.label).then(load).catch(e => showError((e as Error).message))}>✕</button> },
            ]}
          />
        </section>

        <section className="card">
          <h2>🟠 Flexia</h2>
          <PaginatedTable
            data={flexiaArray}
            keyFn={r => r.month}
            columns={[
              { header: 'Mese', render: r => r.month },
              { header: 'Importo', render: r => formatCurrency(r.amount) },
              { header: '', render: r => <button className="btn btn-small btn-danger" onClick={() => deleteFlexia(r.month).then(load).catch(e => showError((e as Error).message))}>✕</button> },
            ]}
          />
        </section>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
      {error && <ErrorModal title={error.title} message={error.message} onClose={() => setError(null)} />}
    </div>
  );
}
