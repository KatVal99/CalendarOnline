import React, { useState, useEffect, useMemo } from 'react';

interface PlannedExpense {
  id: string;
  yearMonth: string; // YYYY-MM
  amount: number;    // Importo spesa (positivo, verrà sottratto)
  label: string;
}

interface Props {
  currentBalance: number;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function formatMonthName(yearMonth: string): string {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

export default function FutureSavingsSimulator({ currentBalance }: Props) {
  const nextYearMonth = useMemo(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Mese di destinazione (target month) fino al quale calcolare la proiezione
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const saved = localStorage.getItem('sim_target_month');
    if (saved && saved >= nextYearMonth) return saved;
    // Default: Dicembre dell'anno corrente o Dicembre dell'anno successivo
    const now = new Date();
    const dec = `${now.getFullYear()}-12`;
    if (dec >= nextYearMonth) return dec;
    const nextDec = `${now.getFullYear() + 1}-12`;
    return nextDec;
  });

  // Quota mensile fissa da mettere da parte (default 1000 o salvato)
  const [monthlySavings, setMonthlySavings] = useState<number>(() => {
    const saved = localStorage.getItem('sim_monthly_savings');
    return saved !== null ? parseFloat(saved) : 1000;
  });

  // Lista spese / uscite straordinarie pianificate (inizia VUOTA, nessun dato finto)
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>(() => {
    const saved = localStorage.getItem('sim_planned_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  // Form state per aggiungere spesa programmata
  const [newMonth, setNewMonth] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newLabel, setNewLabel] = useState('');

  // Salva preferenze in localStorage
  useEffect(() => {
    localStorage.setItem('sim_monthly_savings', monthlySavings.toString());
  }, [monthlySavings]);

  useEffect(() => {
    localStorage.setItem('sim_target_month', targetMonth);
  }, [targetMonth]);

  useEffect(() => {
    localStorage.setItem('sim_planned_expenses', JSON.stringify(plannedExpenses));
  }, [plannedExpenses]);

  // Genera elenco opzioni mesi futuri selezionabili (da mese successivo a +24 mesi)
  const availableTargetMonths = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return list;
  }, []);

  // Genera tutti i mesi compresi tra il mese successivo e il mese target
  const projectionMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    const [tYear, tMonth] = targetMonth.split('-').map(Number);
    const targetDate = new Date(tYear, tMonth - 1, 1);

    let iter = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    while (iter <= targetDate) {
      const ym = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}`;
      months.push(ym);
      iter = new Date(iter.getFullYear(), iter.getMonth() + 1, 1);
    }

    if (months.length === 0) {
      months.push(nextYearMonth);
    }
    return months;
  }, [targetMonth, nextYearMonth]);

  // Imposta mese default per il form di aggiunta spesa
  useEffect(() => {
    if ((!newMonth || !projectionMonths.includes(newMonth)) && projectionMonths.length > 0) {
      setNewMonth(projectionMonths[0]);
    }
  }, [projectionMonths, newMonth]);

  // Calcolo mese per mese
  const monthCalculations = useMemo(() => {
    let accumulatedSavings = 0;
    let runningBalance = currentBalance;

    return projectionMonths.map((ym) => {
      // Spese pianificate per questo mese
      const expensesInMonth = plannedExpenses.filter((p) => p.yearMonth === ym);
      const totalExpensesInMonth = expensesInMonth.reduce((sum, p) => sum + p.amount, 0);

      // Risparmio netto del mese = Quota base - spese pianificate
      const netMonthSavings = monthlySavings - totalExpensesInMonth;

      // Progressivo accumulato
      accumulatedSavings += netMonthSavings;
      runningBalance += netMonthSavings;

      return {
        yearMonth: ym,
        monthLabel: formatMonthName(ym),
        baseQuota: monthlySavings,
        expenses: expensesInMonth,
        totalExpenses: totalExpensesInMonth,
        netMonthSavings,
        accumulatedSavings,
        runningBalance
      };
    });
  }, [projectionMonths, plannedExpenses, monthlySavings, currentBalance]);

  const totalFinalSavings = monthCalculations.length > 0
    ? monthCalculations[monthCalculations.length - 1].accumulatedSavings
    : 0;

  const totalFinalBalance = monthCalculations.length > 0
    ? monthCalculations[monthCalculations.length - 1].runningBalance
    : currentBalance;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonth || !newAmount || !newLabel.trim()) return;
    const item: PlannedExpense = {
      id: Date.now().toString(),
      yearMonth: newMonth,
      amount: Math.abs(parseFloat(newAmount)),
      label: newLabel.trim()
    };
    setPlannedExpenses(prev => [...prev, item]);
    setNewAmount('');
    setNewLabel('');
  };

  const handleRemoveExpense = (id: string) => {
    setPlannedExpenses(prev => prev.filter(p => p.id !== id));
  };

  return (
    <section className="neon-panel neon-green" style={{ padding: '1.75rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.35rem', fontWeight: 700 }}>
            🔮 Calcolatore Risparmio & Spese Future
          </h3>
          <p style={{ margin: '0.3rem 0 0 0', color: '#a0a0c0', fontSize: '0.9rem' }}>
            Simula quanto denaro metterai da parte fino al mese scelto togliendo le spese straordinarie.
          </p>
        </div>

        {/* SELETTORE MESE DI DESTINAZIONE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(0,0,0,0.4)', padding: '0.5rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.3)' }}>
          <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>🎯 Calcola fino a:</span>
          <select
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              background: '#1c1c2e',
              border: '1px solid var(--green)',
              borderRadius: '6px',
              color: 'var(--green)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {availableTargetMonths.map(ym => (
              <option key={ym} value={ym}>
                {formatMonthName(ym)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RIEPILOGO TOTALI IN EVIDENZA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: 'rgba(0, 255, 136, 0.12)',
          border: '1px solid rgba(0, 255, 136, 0.4)',
          borderRadius: '12px',
          padding: '1.2rem',
          boxShadow: '0 0 15px rgba(0, 255, 136, 0.15)'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#a0ffcc', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            💰 Totale Messo da Parte a {formatMonthName(targetMonth)}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#00ff88', marginTop: '0.4rem' }}>
            {formatCurrency(totalFinalSavings)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.3rem' }}>
            Risparmio netto complessivo accumulato entro fine {formatMonthName(targetMonth)} ({projectionMonths.length} mesi)
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 255, 255, 0.12)',
          border: '1px solid rgba(0, 255, 255, 0.4)',
          borderRadius: '12px',
          padding: '1.2rem',
          boxShadow: '0 0 15px rgba(0, 255, 255, 0.15)'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#a0ffff', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            🕷️ Saldo Totale Previsto a {formatMonthName(targetMonth)}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#00ffff', marginTop: '0.4rem' }}>
            {formatCurrency(totalFinalBalance)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.3rem' }}>
            Saldo attuale ({formatCurrency(currentBalance)}) + Risparmi accumulati
          </div>
        </div>
      </div>

      {/* PARAMETRI E INSERIMENTO SPESE PROGRAMMATE */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
          {/* Quota Fissa Mensile */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', fontWeight: 700, marginBottom: '0.4rem' }}>
              💵 Quota Base che intendi mettere da parte ogni mese:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                step="50"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(parseFloat(e.target.value) || 0)}
                style={{
                  padding: '0.65rem 0.85rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid var(--green)',
                  borderRadius: '8px',
                  color: '#fff',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--green)' }}>€/mese</span>
            </div>
          </div>
        </div>

        {/* Form Aggiungi Spesa / Prelievo Futuro */}
        <form onSubmit={handleAddExpense} style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.9rem', color: '#ffdd00', fontWeight: 700, marginBottom: '0.6rem' }}>
            ⚡ Aggiungi una spesa o prelievo programmato in un mese futuro:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <select
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
              style={{
                flex: '1 1 160px',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontWeight: 600
              }}
            >
              {projectionMonths.map(ym => (
                <option key={ym} value={ym} style={{ background: '#1c1c2e', color: '#fff' }}>
                  {formatMonthName(ym)}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Descrizione (es. Tagliando, Regali)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{
                flex: '2 1 200px',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff'
              }}
              required
            />

            <input
              type="number"
              step="10"
              placeholder="Importo da togliere (€)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              style={{
                flex: '1 1 140px',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff'
              }}
              required
            />

            <button
              type="submit"
              className="btn btn-yellow"
              style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
            >
              + Inserisci Spesa
            </button>
          </div>
        </form>
      </div>

      {/* TABELLA DETTAGLIATA MESE PER MESE */}
      <div>
        <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          🗓️ Tabella di Proiezione Mese per Mese (Fino a {formatMonthName(targetMonth)})
        </h4>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                <th style={{ padding: '0.85rem 1rem', color: '#ddd', fontSize: '0.85rem' }}>Mese</th>
                <th style={{ padding: '0.85rem 1rem', color: '#ddd', fontSize: '0.85rem' }}>Quota Base</th>
                <th style={{ padding: '0.85rem 1rem', color: '#ddd', fontSize: '0.85rem' }}>Spese Pianificate</th>
                <th style={{ padding: '0.85rem 1rem', color: '#ddd', fontSize: '0.85rem' }}>Risparmio Mese</th>
                <th style={{ padding: '0.85rem 1rem', color: '#00ff88', fontSize: '0.85rem', fontWeight: 800 }}>Totale Messo da Parte</th>
                <th style={{ padding: '0.85rem 1rem', color: '#00ffff', fontSize: '0.85rem', fontWeight: 800 }}>Saldo Stimato</th>
              </tr>
            </thead>
            <tbody>
              {monthCalculations.map((m, idx) => (
                <tr
                  key={m.yearMonth}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)'
                  }}
                >
                  {/* Nome Mese */}
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fff' }}>
                    {m.monthLabel}
                  </td>

                  {/* Quota Base */}
                  <td style={{ padding: '0.85rem 1rem', color: '#a0a0c0' }}>
                    +{formatCurrency(m.baseQuota)}
                  </td>

                  {/* Spese programmate */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {m.expenses.length === 0 ? (
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {m.expenses.map((exp) => (
                          <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                              -{formatCurrency(exp.amount)}
                            </span>
                            <span style={{ color: '#bbb' }}>({exp.label})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExpense(exp.id)}
                              title="Rimuovi spesa programmata"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ff4444',
                                cursor: 'pointer',
                                padding: '0 0.2rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Risparmio netto del mese */}
                  <td style={{
                    padding: '0.85rem 1rem',
                    fontWeight: 700,
                    color: m.netMonthSavings >= 0 ? '#40c057' : '#ff6b6b'
                  }}>
                    {m.netMonthSavings >= 0 ? '+' : ''}{formatCurrency(m.netMonthSavings)}
                  </td>

                  {/* Totale progressivo messo da parte */}
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#00ff88', fontSize: '1.05rem' }}>
                    {formatCurrency(m.accumulatedSavings)}
                  </td>

                  {/* Saldo finale cumulativo */}
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#00ffff' }}>
                    {formatCurrency(m.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
