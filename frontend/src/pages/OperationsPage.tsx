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
  const [incomeCat, setIncomeCat] = useState('Stipendio');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmt, setExpenseAmt] = useState('');
  const [expenseCat, setExpenseCat] = useState('Alimentari');
  const [debtLabel, setDebtLabel] = useState('');
  const [debtTotalAmt, setDebtTotalAmt] = useState('');  // totalAmount (non rata!)
  const [debtStart, setDebtStart] = useState('');
  const [debtDuration, setDebtDuration] = useState('');
  const [flexiaMonth, setFlexiaMonth] = useState('');    // yearMonth (YYYY-MM)
  const [flexiaAmt, setFlexiaAmt] = useState('');
  const [subLabel, setSubLabel] = useState('');
  const [subCost, setSubCost] = useState('');

  const CATEGORIES = ['Alimentari', 'Svago', 'Bollette', 'Casa', 'Trasporti', 'Salute', 'Stipendio', 'Abbonamenti', 'Altro'];

  // Loading states per form
  const [submittingIncome, setSubmittingIncome] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [submittingDebt, setSubmittingDebt] = useState(false);
  const [submittingFlexia, setSubmittingFlexia] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const showError = (msg: string) => setError({ title: 'Errore', message: msg });

  const load = useCallback(async () => {
    try { setData(await fetchDashboard()); }
    catch (e) { showError((e as Error).message); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Flexia: converti Map<String,BigDecimal> in array ordinato
  const flexiaArray = data
    ? Object.entries(data.flexiaByMonth)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
    : [];

  // Handlers
  const addIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIncome(true);
    try {
      await createIncome(incomeDesc, parseFloat(incomeAmt), incomeCat);
      showToast('Entrata aggiunta ✅');
      setIncomeDesc('');
      setIncomeAmt('');
      await load();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSubmittingIncome(false);
    }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExpense(true);
    try {
      await createExpense(expenseDesc, parseFloat(expenseAmt), expenseCat);
      showToast('Spesa aggiunta ✅');
      setExpenseDesc('');
      setExpenseAmt('');
      await load();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSubmittingExpense(false);
    }
  };

  const addDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDebt(true);
    try {
      await createDebt(debtLabel, parseFloat(debtTotalAmt), debtStart, parseInt(debtDuration));
      showToast('Debito aggiunto ✅');
      setDebtLabel('');
      setDebtTotalAmt('');
      setDebtStart('');
      setDebtDuration('');
      await load();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSubmittingDebt(false);
    }
  };

  const addFlexia = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFlexia(true);
    try {
      await createFlexia(flexiaMonth, parseFloat(flexiaAmt));
      showToast('Flexia impostata ✅');
      setFlexiaMonth('');
      setFlexiaAmt('');
      await load();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSubmittingFlexia(false);
    }
  };

  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSub(true);
    try {
      await createSubscription(subLabel, parseFloat(subCost));
      showToast('Abbonamento aggiunto ✅');
      setSubLabel('');
      setSubCost('');
      await load();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSubmittingSub(false);
    }
  };

  return (
    <div className="page operations-page">
      <div className="page-header"><h1>💳 Operazioni & Movimenti Spidey</h1></div>

      {data && (
        <div className="totals-grid">
          <div className="neon-panel neon-magenta total-card">
            <div className="total-label">🕷️ Saldo Spidey</div>
            <div className={`total-value ${data.currentBalance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(data.currentBalance)}
            </div>
          </div>
          <div className="neon-panel neon-cyan total-card">
            <div className="total-label">🔄 Abbonamenti</div>
            <div className="total-value" style={{ color: 'var(--cyan)' }}>{formatCurrency(data.monthlySubscriptionsTotal)}</div>
          </div>
          <div className="neon-panel neon-yellow total-card">
            <div className="total-label">⚡ Rate Debiti</div>
            <div className="total-value" style={{ color: 'var(--yellow)' }}>{formatCurrency(data.debts.reduce((s, d) => s + d.monthlyInstallment, 0))}</div>
          </div>
        </div>
      )}

      <div className="ops-forms-grid">
        <section className="neon-panel neon-green form-card">
          <h2>🟢 + Entrata Spidey</h2>
          <form onSubmit={addIncome}>
            <input type="text" placeholder="Descrizione" value={incomeDesc} onChange={e => setIncomeDesc(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Importo €" value={incomeAmt} onChange={e => setIncomeAmt(e.target.value)} required />
            <select value={incomeCat} onChange={e => setIncomeCat(e.target.value)}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button className="btn btn-green" type="submit" disabled={submittingIncome}>
              {submittingIncome ? '⏳ Salvataggio...' : '+ Aggiungi Entrata'}
            </button>
          </form>
        </section>

        <section className="neon-panel neon-magenta form-card">
          <h2>🔴 + Spesa Spidey</h2>
          <form onSubmit={addExpense}>
            <input type="text" placeholder="Descrizione" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Importo €" value={expenseAmt} onChange={e => setExpenseAmt(e.target.value)} required />
            <select value={expenseCat} onChange={e => setExpenseCat(e.target.value)}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button className="btn btn-red" type="submit" disabled={submittingExpense}>
              {submittingExpense ? '⏳ Salvataggio...' : '+ Aggiungi Spesa'}
            </button>
          </form>
        </section>

        <section className="neon-panel neon-yellow form-card">
          <h2>⚡ Nuovo Debito / Impegno</h2>
          <form onSubmit={addDebt}>
            <input type="text" placeholder="Etichetta (es. Unicredit, Volo)" value={debtLabel} onChange={e => setDebtLabel(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Importo TOTALE €" value={debtTotalAmt} onChange={e => setDebtTotalAmt(e.target.value)} required />
            <input type="text" placeholder="Mese inizio (YYYY-MM, es. 2026-08)" value={debtStart} onChange={e => setDebtStart(e.target.value)} required pattern="\d{4}-\d{2}" />
            <input type="number" placeholder="Durata (mesi)" value={debtDuration} onChange={e => setDebtDuration(e.target.value)} required />
            <button className="btn btn-yellow" type="submit" disabled={submittingDebt}>
              {submittingDebt ? '⏳ Salvataggio...' : '+ Aggiungi Debito'}
            </button>
          </form>
        </section>

        <section className="neon-panel neon-yellow form-card">
          <h2>🟠 Valore Flexia</h2>
          <form onSubmit={addFlexia}>
            <input type="text" placeholder="Mese (YYYY-MM, es. 2026-08)" value={flexiaMonth} onChange={e => setFlexiaMonth(e.target.value)} required pattern="\d{4}-\d{2}" />
            <input type="number" step="0.01" placeholder="Importo €" value={flexiaAmt} onChange={e => setFlexiaAmt(e.target.value)} required />
            <button className="btn btn-orange" type="submit" disabled={submittingFlexia}>
              {submittingFlexia ? '⏳ Salvataggio...' : '+ Imposta Flexia'}
            </button>
          </form>
        </section>

        <section className="neon-panel neon-cyan form-card">
          <h2>🔵 Abbonamento</h2>
          <form onSubmit={addSubscription}>
            <input type="text" placeholder="Etichetta (es. Netflix, Gym)" value={subLabel} onChange={e => setSubLabel(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Costo mensile €" value={subCost} onChange={e => setSubCost(e.target.value)} required />
            <button className="btn btn-blue" type="submit" disabled={submittingSub}>
              {submittingSub ? '⏳ Salvataggio...' : '+ Aggiungi Abbonamento'}
            </button>
          </form>
        </section>
      </div>

      <div className="ops-tables-grid">
        <section className="neon-panel neon-green">
          <h2>🕸️ Registro Movimenti Recenti</h2>
          <PaginatedTable
            data={data?.latestEntries ?? []}
            keyFn={(r: LedgerEntry) => r.eventId}
            columns={[
              { header: 'Data', render: (r: LedgerEntry) => <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{r.date}</span> },
              { header: '', render: (r: LedgerEntry) => sourceLabel(r.source) },
              { header: 'Descrizione', render: (r: LedgerEntry) => <strong style={{ color: '#fff' }}>{r.description}</strong> },
              { header: 'Importo', render: (r: LedgerEntry) => <span className={r.delta >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 'bold' }}>{formatCurrency(r.delta)}</span> },
              { header: '', render: (r: LedgerEntry) => (r.source === 'INCOME' || r.source === 'EXPENSE') ? <button className="btn btn-small btn-danger" onClick={() => (r.source === 'INCOME' ? deleteIncome(r.eventId) : deleteExpense(r.eventId)).then(load).catch(e => showError((e as Error).message))}>✕</button> : null },
            ]}
          />
        </section>

        <section className="neon-panel neon-yellow">
          <h2>🟡 Debiti Attivi</h2>
          <PaginatedTable
            data={data?.debts ?? []}
            keyFn={(r: DebtView) => r.label}
            columns={[
              { header: 'Etichetta', render: (r: DebtView) => <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{r.label}</strong> },
              { header: 'Rata/mese', render: (r: DebtView) => <span style={{ color: 'var(--yellow)', fontWeight: 'bold' }}>{formatCurrency(r.monthlyInstallment)}</span> },
              { header: 'Inizio', render: (r: DebtView) => <span style={{ fontSize: '0.85rem', color: '#bbb' }}>{r.startMonth}</span> },
              { header: 'Fine', render: (r: DebtView) => <span style={{ fontSize: '0.85rem', color: '#bbb' }}>{r.endMonth}</span> },
              { header: 'Residuo', render: (r: DebtView) => <span style={{ color: '#fff', fontWeight: 'bold' }}>{formatCurrency(r.remaining)}</span> },
              { header: '', render: (r: DebtView) => <button className="btn btn-small btn-danger" onClick={() => deleteDebt(r.label).then(load).catch(e => showError((e as Error).message))}>✕</button> },
            ]}
          />
        </section>

        <section className="neon-panel neon-cyan">
          <h2>🔵 Abbonamenti Attivi</h2>
          <PaginatedTable
            data={data?.subscriptions ?? []}
            keyFn={(r: Subscription) => r.label}
            columns={[
              { header: 'Etichetta', render: (r: Subscription) => <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{r.label}</strong> },
              { header: 'Costo/mese', render: (r: Subscription) => <span style={{ color: 'var(--cyan)', fontWeight: 'bold' }}>{formatCurrency(r.amount)}</span> },
              { header: '', render: (r: Subscription) => <button className="btn btn-small btn-danger" onClick={() => deleteSubscription(r.label).then(load).catch(e => showError((e as Error).message))}>✕</button> },
            ]}
          />
        </section>

        <section className="neon-panel neon-yellow">
          <h2>🟠 Flexia</h2>
          <PaginatedTable
            data={flexiaArray}
            keyFn={r => r.month}
            columns={[
              { header: 'Mese', render: r => <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{r.month}</strong> },
              { header: 'Importo', render: r => <span style={{ color: 'var(--orange)', fontWeight: 'bold' }}>{formatCurrency(r.amount)}</span> },
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
