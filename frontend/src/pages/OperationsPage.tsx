import React, { useEffect, useState, useCallback } from 'react';
import { DashboardData, LedgerEntry, Subscription, DebtView } from '../types';
import {
  fetchDashboard,
  createIncome, deleteIncome,
  createExpense, deleteExpense,
  createDebt, updateDebt, deleteDebt,
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
  const [debtInstallment, setDebtInstallment] = useState(''); // Rata mensile (€/mese)
  const [debtTotalAmt, setDebtTotalAmt] = useState('');       // Importo totale (€)
  const [debtStart, setDebtStart] = useState(() => new Date().toISOString().substring(0, 7));
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

  // Edit Debt State
  interface EditDebtState {
    oldLabel: string;
    label: string;
    installment: string;
    totalAmt: string;
    duration: string;
    startMonth: string;
  }
  const [editingDebt, setEditingDebt] = useState<EditDebtState | null>(null);
  const [savingEditDebt, setSavingEditDebt] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const showError = (msg: string) => setError({ title: 'Errore', message: msg });

  const load = useCallback(async () => {
    try { setData(await fetchDashboard()); }
    catch (e) { showError((e as Error).message); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Gestione calcolo bidirezionale Rata <-> Totale per Debito
  const handleInstallmentChange = (val: string) => {
    setDebtInstallment(val);
    const inst = parseFloat(val);
    const dur = parseInt(debtDuration, 10);
    if (!isNaN(inst) && inst > 0 && !isNaN(dur) && dur > 0) {
      setDebtTotalAmt((inst * dur).toFixed(2));
    }
  };

  const handleTotalAmtChange = (val: string) => {
    setDebtTotalAmt(val);
    const tot = parseFloat(val);
    const dur = parseInt(debtDuration, 10);
    if (!isNaN(tot) && tot > 0 && !isNaN(dur) && dur > 0) {
      setDebtInstallment((tot / dur).toFixed(2));
    }
  };

  const handleDurationChange = (val: string) => {
    setDebtDuration(val);
    const dur = parseInt(val, 10);
    if (!isNaN(dur) && dur > 0) {
      const inst = parseFloat(debtInstallment);
      const tot = parseFloat(debtTotalAmt);
      if (!isNaN(inst) && inst > 0) {
        setDebtTotalAmt((inst * dur).toFixed(2));
      } else if (!isNaN(tot) && tot > 0) {
        setDebtInstallment((tot / dur).toFixed(2));
      }
    }
  };

  // Handlers per Modifica Debito
  const handleOpenEditDebt = (d: DebtView) => {
    const dur = d.durationMonths || 1;
    const inst = d.monthlyInstallment || 0;
    const tot = d.remaining || (inst * dur);
    setEditingDebt({
      oldLabel: d.label,
      label: d.label,
      installment: inst.toString(),
      totalAmt: tot.toString(),
      duration: dur.toString(),
      startMonth: d.startMonth || new Date().toISOString().substring(0, 7)
    });
  };

  const handleEditDebtInstallmentChange = (val: string) => {
    if (!editingDebt) return;
    const inst = parseFloat(val);
    const dur = parseInt(editingDebt.duration, 10);
    let newTot = editingDebt.totalAmt;
    if (!isNaN(inst) && inst > 0 && !isNaN(dur) && dur > 0) {
      newTot = (inst * dur).toFixed(2);
    }
    setEditingDebt({ ...editingDebt, installment: val, totalAmt: newTot });
  };

  const handleEditDebtTotalChange = (val: string) => {
    if (!editingDebt) return;
    const tot = parseFloat(val);
    const dur = parseInt(editingDebt.duration, 10);
    let newInst = editingDebt.installment;
    if (!isNaN(tot) && tot > 0 && !isNaN(dur) && dur > 0) {
      newInst = (tot / dur).toFixed(2);
    }
    setEditingDebt({ ...editingDebt, totalAmt: val, installment: newInst });
  };

  const handleEditDebtDurationChange = (val: string) => {
    if (!editingDebt) return;
    const dur = parseInt(val, 10);
    let newTot = editingDebt.totalAmt;
    let newInst = editingDebt.installment;
    if (!isNaN(dur) && dur > 0) {
      const inst = parseFloat(editingDebt.installment);
      const tot = parseFloat(editingDebt.totalAmt);
      if (!isNaN(inst) && inst > 0) {
        newTot = (inst * dur).toFixed(2);
      } else if (!isNaN(tot) && tot > 0) {
        newInst = (tot / dur).toFixed(2);
      }
    }
    setEditingDebt({ ...editingDebt, duration: val, totalAmt: newTot, installment: newInst });
  };

  const handleSaveEditDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    setSavingEditDebt(true);
    try {
      const dur = parseInt(editingDebt.duration, 10) || 1;
      let finalTotal = parseFloat(editingDebt.totalAmt);
      if (isNaN(finalTotal) || finalTotal <= 0) {
        const inst = parseFloat(editingDebt.installment);
        if (!isNaN(inst) && inst > 0) {
          finalTotal = inst * dur;
        } else {
          throw new Error('Inserisci una rata o un totale valido.');
        }
      }
      await updateDebt(
        editingDebt.oldLabel,
        editingDebt.label,
        finalTotal,
        editingDebt.startMonth,
        dur
      );
      showToast('Debito modificato con successo ✅');
      setEditingDebt(null);
      await load();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSavingEditDebt(false);
    }
  };

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
      let finalTotal = parseFloat(debtTotalAmt);
      const dur = parseInt(debtDuration, 10) || 1;
      if (isNaN(finalTotal) || finalTotal <= 0) {
        const inst = parseFloat(debtInstallment);
        if (!isNaN(inst) && inst > 0) {
          finalTotal = inst * dur;
        } else {
          throw new Error('Inserisci la rata mensile o il totale del debito.');
        }
      }
      const start = debtStart || new Date().toISOString().substring(0, 7);
      await createDebt(debtLabel, finalTotal, start, dur);
      showToast('Debito aggiunto ✅');
      setDebtLabel('');
      setDebtInstallment('');
      setDebtTotalAmt('');
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
          <form onSubmit={addDebt} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <input
              type="text"
              placeholder="Etichetta (es. Unicredit, Volo)"
              value={debtLabel}
              onChange={e => setDebtLabel(e.target.value)}
              required
              style={{ width: '100%' }}
            />

            {/* Riga 1: Rata + Totale */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--yellow)', fontWeight: 700, letterSpacing: '0.3px' }}>
                  💵 Rata mensile (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="117.30"
                  value={debtInstallment}
                  onChange={e => handleInstallmentChange(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--yellow)', fontWeight: 700, letterSpacing: '0.3px' }}>
                  💰 Importo Totale (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="10439.70"
                  value={debtTotalAmt}
                  onChange={e => handleTotalAmtChange(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Hint per calcolo automatico */}
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '-0.5rem', fontStyle: 'italic', textAlign: 'center' }}>
              Compila Rata o Totale + Durata → l'altro si calcola automaticamente
            </div>

            {/* Riga 2: Durata + Mese inizio */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 600 }}>
                  📅 Durata (mesi)
                </label>
                <input
                  type="number"
                  placeholder="89"
                  value={debtDuration}
                  onChange={e => handleDurationChange(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 600 }}>
                  🗓️ Mese inizio
                </label>
                <input
                  type="text"
                  placeholder="2026-06"
                  value={debtStart}
                  onChange={e => setDebtStart(e.target.value)}
                  required
                  pattern="\d{4}-\d{2}"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button className="btn btn-yellow" type="submit" disabled={submittingDebt} style={{ marginTop: '0.3rem' }}>
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
              {
                header: 'Azioni',
                render: (r: DebtView) => (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-small btn-yellow"
                      title="Modifica debito"
                      onClick={() => handleOpenEditDebt(r)}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      title="Elimina debito"
                      onClick={() => {
                        if (confirm(`Eliminare il debito "${r.label}"?`)) {
                          deleteDebt(r.label).then(load).catch(e => showError((e as Error).message));
                        }
                      }}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                )
              },
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

      {/* MODAL MODIFICA DEBITO */}
      {editingDebt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="neon-panel neon-yellow" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', background: '#181828', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.15rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.6rem' }}>
              ✏️ Modifica Debito: <span style={{ color: 'var(--yellow)' }}>{editingDebt.oldLabel}</span>
            </h3>
            <form onSubmit={handleSaveEditDebt} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 600 }}>
                  🏷️ Etichetta
                </label>
                <input
                  type="text"
                  value={editingDebt.label}
                  onChange={e => setEditingDebt({ ...editingDebt, label: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s ease, box-shadow 0.25s ease' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--yellow)', fontWeight: 700, letterSpacing: '0.3px' }}>
                    💵 Rata mensile (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingDebt.installment}
                    onChange={e => handleEditDebtInstallmentChange(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,215,0,0.35)', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s ease, box-shadow 0.25s ease' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--yellow)', fontWeight: 700, letterSpacing: '0.3px' }}>
                    💰 Importo Totale (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingDebt.totalAmt}
                    onChange={e => handleEditDebtTotalChange(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,215,0,0.35)', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s ease, box-shadow 0.25s ease' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '-0.4rem', fontStyle: 'italic', textAlign: 'center' }}>
                Compila Rata o Totale + Durata → l'altro si calcola automaticamente
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 600 }}>
                    📅 Durata (mesi)
                  </label>
                  <input
                    type="number"
                    value={editingDebt.duration}
                    onChange={e => handleEditDebtDurationChange(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s ease, box-shadow 0.25s ease' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 600 }}>
                    🗓️ Mese inizio
                  </label>
                  <input
                    type="text"
                    value={editingDebt.startMonth}
                    onChange={e => setEditingDebt({ ...editingDebt, startMonth: e.target.value })}
                    required
                    pattern="\d{4}-\d{2}"
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s ease, box-shadow 0.25s ease' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditingDebt(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px' }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn btn-yellow"
                  disabled={savingEditDebt}
                  style={{ borderRadius: '10px' }}
                >
                  {savingEditDebt ? 'Salvataggio...' : '💾 Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
      {error && <ErrorModal title={error.title} message={error.message} onClose={() => setError(null)} />}
    </div>
  );
}
