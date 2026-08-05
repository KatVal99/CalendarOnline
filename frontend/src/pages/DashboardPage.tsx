import { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarEvent, DashboardData, LedgerEntry } from '../types';
import {
  fetchCalendarEvents, fetchDashboard, deleteIncome, deleteExpense, deleteMonthlyClose,
  fetchCategorySummary, fetchSavingsGoals, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, depositSavingsGoal,
  fetchCategoryLimits, setCategoryLimit, fetchForecast
} from '../api/client';
import CalendarWidget from '../components/CalendarWidget';
import PaginatedTable from '../components/PaginatedTable';
import Toast from '../components/Toast';
import ErrorModal from '../components/ErrorModal';
import CategoryCharts from '../components/CategoryCharts';
import SavingsGoalsWidget, { SavingsGoal } from '../components/SavingsGoalsWidget';
import CategoryLimitsWidget, { CategoryLimit } from '../components/CategoryLimitsWidget';
import { useAuth } from '../context/AuthContext';

// ─── Donut Chart ──────────────────────────────────────────────────
interface DonutSegment { label: string; value: number; tone: string; pct: number }
const TONE_COLORS: Record<string, string> = { green: '#00ff88', red: '#ff4444', yellow: '#ffdd00', cyan: '#00ffff' };

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcD(cx: number, cy: number, r: number, start: number, end: number): string {
  if (end - start >= 360) end = start + 359.99;
  const s = polarXY(cx, cy, r, start), e = polarXY(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}
function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const [hov, setHov] = useState<string | null>(null);
  const size = 220, cx = 110, cy = 110, r = 78, sw = 28, gap = 3;
  const total = segments.reduce((s, i) => s + i.value, 0);
  const hovSeg = segments.find((s) => s.label === hov);
  let cursor = 0;
  const arcs = segments.filter((s) => s.pct > 0).map((seg) => {
    const span = (seg.pct / 100) * 360;
    const start = cursor + gap / 2, end = cursor + span - gap / 2;
    cursor += span;
    return { ...seg, start, end };
  });
  return (
    <div className="donut-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,0,255,0.1)" strokeWidth={sw} />
        {arcs.map((arc) => {
          const color = TONE_COLORS[arc.tone] ?? '#fff';
          const isH = hov === arc.label;
          return (
            <path key={arc.label} d={arcD(cx, cy, r, arc.start, arc.end)} fill="none"
              stroke={color} strokeWidth={isH ? sw + 6 : sw} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 ${isH ? 10 : 5}px ${color})`, cursor: 'pointer', transition: 'stroke-width 0.2s' }}
              onMouseEnter={() => setHov(arc.label)} onMouseLeave={() => setHov(null)} />
          );
        })}
        {hovSeg ? (
          <>
            <text x={cx} y={cy - 10} textAnchor="middle" fill={TONE_COLORS[hovSeg.tone]} fontSize="8" fontFamily="'Press Start 2P',monospace">{hovSeg.label}</text>
            <text x={cx} y={cy + 6} textAnchor="middle" fill="#e0e0ff" fontSize="8" fontFamily="'Press Start 2P',monospace">{hovSeg.pct.toFixed(1)}%</text>
            <text x={cx} y={cy + 22} textAnchor="middle" fill={TONE_COLORS[hovSeg.tone]} fontSize="7" fontFamily="'Press Start 2P',monospace">{new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(hovSeg.value)}</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#8888aa" fontSize="7" fontFamily="'Press Start 2P',monospace">TOTALE</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#00ffff" fontSize="8" fontFamily="'Press Start 2P',monospace">{new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(total)}</text>
          </>
        )}
      </svg>
      <div className="donut-legend">
        {segments.map((seg) => (
          <div key={seg.label} className={`donut-leg-item${hov === seg.label ? ' donut-leg-active' : ''}`}
            onMouseEnter={() => setHov(seg.label)} onMouseLeave={() => setHov(null)}>
            <span className="donut-dot" style={{ background: TONE_COLORS[seg.tone], boxShadow: `0 0 6px ${TONE_COLORS[seg.tone]}` }} />
            <span className="donut-leg-label">{seg.label}</span>
            <span className="donut-leg-pct" style={{ color: TONE_COLORS[seg.tone] }}>{seg.pct.toFixed(1)}%</span>
            <strong className="donut-leg-val">{new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(seg.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Smooth Line Chart ────────────────────────────────────────────
function SmoothLineChart({ rawData, color = '#00ff88' }: { rawData: number[]; color?: string }) {
  const data = rawData.length < 2 ? [0, 0, 0, ...rawData] : rawData;
  const vw = 340, vh = 70, pad = { l: 6, r: 6, t: 8, b: 8 };
  const uw = vw - pad.l - pad.r, uh = vh - pad.t - pad.b;
  const min = Math.min(...data), max = Math.max(...data, min + 1), range = max - min;
  const pts = data.map((v, i) => ({
    x: pad.l + (i / (data.length - 1)) * uw,
    y: pad.t + (1 - (v - min) / range) * uh,
  }));
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1], cpx = (prev.x + p.x) / 2;
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }, '');
  const areaPath = `${linePath} L ${pts[pts.length-1].x} ${pad.t+uh} L ${pts[0].x} ${pad.t+uh} Z`;
  const gid = `sg${color.replace('#','')}`;
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" className="smooth-chart" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />)}
    </svg>
  );
}



function formatCurrency(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    INCOME: '🟢 Entrata', EXPENSE: '🔴 Spesa', DEBT_CREATED: '🟡 Debito',
    DEBT_REMOVED: '🟡 Fine Debito', FLEXIA_SET: '🟠 Flexia', FLEXIA_REMOVED: '🟠 Flexia rimossa',
    SUBSCRIPTION_ADDED: '🔵 Abbonamento', SUBSCRIPTION_REMOVED: '🔵 Abb. rimosso',
    MONTHLY_CLOSE: '⚪ Chiusura Mese', BALANCE_CARRYOVER: '⚪ Riporto',
  };
  return map[source] ?? source;
}

function computeDebtTotal(data: DashboardData): number {
  return data.debts.reduce((sum, d) => sum + d.monthlyInstallment, 0);
}

function clampPercentage(value: number): number { return Math.max(0, Math.min(100, value)); }
function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function eventSortKey(event: CalendarEvent): string {
  return `${event.date}T${event.time?.slice(0, 5) || '23:59'}`;
}

function taskLabelFromEvents(events: CalendarEvent[]): string {
   if (events.length === 0) return 'Nessun appuntamento in calendario';
   const now = new Date();
   const todayKey = toDateKey(now);
   const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
   const nowKey = `${todayKey}T${currentTime}`;

   const sorted = [...events].sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)));

   // Cerca solo eventi nel futuro (da ora in poi)
   const upcoming = sorted.find((event) => eventSortKey(event) >= nowKey);
   if (upcoming) {
     // Se è oggi, mostra l'orario; se è futuro, mostra "NEXT"
     if (upcoming.date === todayKey) {
       return `${upcoming.time ? `${upcoming.time.slice(0, 5)} · ` : ''}${upcoming.title}`;
     }
     return `NEXT ${upcoming.date.slice(8, 10)}/${upcoming.date.slice(5, 7)}${upcoming.time ? ` ${upcoming.time.slice(0, 5)}` : ''} · ${upcoming.title}`;
   }

   return 'Nessun appuntamento in calendario';
}

export default function DashboardPage() {
  const { email } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [movementFilter, setMovementFilter] = useState('');
  const [calendarTaskEvents, setCalendarTaskEvents] = useState<CalendarEvent[]>([]);

  // Advanced features state
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [backendGoals, setBackendGoals] = useState<SavingsGoal[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
  const [forecastData, setForecastData] = useState<any | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const showError = (msg: string) => setError({ title: 'Errore', message: msg });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, catSummary, goalsData, limitsData, fcData] = await Promise.all([
        fetchDashboard(),
        fetchCategorySummary().catch((e) => { console.warn('Categorie summary fallita:', e.message); return null; }),
        fetchSavingsGoals().catch((e) => { console.warn('Salvadanai falliti:', e.message); showToast('⚠️ Errore caricamento salvadanai: ' + e.message); return []; }),
        fetchCategoryLimits().catch((e) => { console.warn('Tetti spesa falliti:', e.message); showToast('⚠️ Errore caricamento tetti spesa: ' + e.message); return []; }),
        fetchForecast().catch(() => null)
      ]);
      setData(dash);
      if (catSummary?.expensesByCategory) {
        setExpensesByCategory(catSummary.expensesByCategory);
      }
      setBackendGoals(goalsData || []);
      setCategoryLimits(limitsData || []);
      setForecastData(fcData);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddSavingsGoal = async (name: string, targetAmount: number, targetDate?: string, icon?: string) => {
    try {
      await createSavingsGoal(name, targetAmount, targetDate, icon);
      showToast('Salvadanaio creato con successo! 🎯');
      load();
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const handleUpdateSavingsGoal = async (goalId: string, name: string, targetAmount: number, targetDate?: string, icon?: string) => {
    try {
      await updateSavingsGoal(goalId, name, targetAmount, targetDate, icon);
      showToast('Salvadanaio aggiornato! ✏️');
      load();
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const handleDepositSavingsGoal = async (goalId: string, amount: number) => {
    try {
      await depositSavingsGoal(goalId, amount);
      showToast('Transazione salvadanaio registrata! 💰');
      load();
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const handleDeleteSavingsGoal = async (goalId: string) => {
    try {
      await deleteSavingsGoal(goalId);
      showToast('Salvadanaio eliminato');
      load();
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const handleSetCategoryLimit = async (category: string, monthlyLimit: number) => {
    try {
      await setCategoryLimit(category, monthlyLimit);
      showToast(`Tetto spesa per ${category} aggiornato! ⚠️`);
      load();
    } catch (e) {
      showError((e as Error).message);
    }
  };

  useEffect(() => { load(); }, [load]);

  const loadCalendarTask = useCallback(async () => {
    try {
      const current = new Date();
      setCalendarTaskEvents(await fetchCalendarEvents(current.getFullYear(), current.getMonth() + 1));
    } catch (e) {
      showError((e as Error).message);
    }
  }, []);

  useEffect(() => { void loadCalendarTask(); }, [loadCalendarTask]);



  const handleDeleteMovement = async (entry: LedgerEntry) => {
    try {
      if (entry.source === 'INCOME') await deleteIncome(entry.eventId);
      else if (entry.source === 'EXPENSE') await deleteExpense(entry.eventId);
      showToast('Movimento eliminato'); load();
    } catch (e) { showError((e as Error).message); }
  };

  const handlePurge = async () => {
    if (!confirm('Eliminare tutte le chiusure mese dal saldo?')) return;
    try { await deleteMonthlyClose(); showToast('Chiusure mese eliminate ✅'); load(); }
    catch (e) { showError((e as Error).message); }
  };

  const now = new Date();
  const currentMonthKey = toMonthKey(now);
  const previousMonthKey = toMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const filteredEntries = useMemo(() => {
    const entries = data?.latestEntries ?? [];
    const term = movementFilter.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((e) =>
      e.description.toLowerCase().includes(term) ||
      e.date.toLowerCase().includes(term) ||
      sourceLabel(e.source).toLowerCase().includes(term)
    );
  }, [data, movementFilter]);

  const monthIncome = Math.max(0, data?.monthlyIncomes[currentMonthKey] ?? 0);
  const monthExpense = Math.abs(data?.monthlyExpenses[currentMonthKey] ?? 0);
  const prevIncome = Math.max(0, data?.monthlyIncomes[previousMonthKey] ?? 0);
  const prevExpense = Math.abs(data?.monthlyExpenses[previousMonthKey] ?? 0);
  const monthNet = monthIncome - monthExpense;
  const prevNet = prevIncome - prevExpense;
  const netTrend = prevNet === 0 ? (monthNet >= 0 ? 100 : -100) : ((monthNet - prevNet) / Math.abs(prevNet)) * 100;

  // Donut chart segments
  const budgetSegments = useMemo((): DonutSegment[] => {
    if (!data) return [];
    const debtTotal = computeDebtTotal(data);
    const subsTotal = data.monthlySubscriptionsTotal;
    const total = Math.max(1, monthIncome + monthExpense + debtTotal + subsTotal);
    return [
      { label: 'Entrate', value: monthIncome, tone: 'green', pct: clampPercentage((monthIncome / total) * 100) },
      { label: 'Spese', value: monthExpense, tone: 'red', pct: clampPercentage((monthExpense / total) * 100) },
      { label: 'Debiti', value: debtTotal, tone: 'yellow', pct: clampPercentage((debtTotal / total) * 100) },
      { label: 'Abbon.', value: subsTotal, tone: 'cyan', pct: clampPercentage((subsTotal / total) * 100) },
    ];
  }, [data, monthIncome, monthExpense]);

  // Smooth line chart data: monthly net
  const smoothLineData = useMemo(() => {
    if (!data) return [];
    const keys = Array.from(new Set([...Object.keys(data.monthlyIncomes), ...Object.keys(data.monthlyExpenses)])).sort().slice(-8);
    return keys.map((k) => (data.monthlyIncomes[k] ?? 0) - Math.abs(data.monthlyExpenses[k] ?? 0));
  }, [data]);

  const dynamicTask = useMemo(() => taskLabelFromEvents(calendarTaskEvents), [calendarTaskEvents]);

  const profileAlias = useMemo(() => {
    const head = email.split('@')[0] ?? '';
    return head ? head.replace(/[._-]+/g, ' ').trim() : 'Utente';
  }, [email]);

  const profileStatus = data?.currentMonthClosed ? '🔒 Mese chiuso' : '🟢 Mese aperto';

  if (loading) return <div className="loading"><span className="loading-pulse">⏳ Caricamento...</span></div>;

  if (!data) return (
    <div className="page dashboard-page" style={{ textAlign: 'center', paddingTop: '3rem' }}>
      <h2>⚠️ Impossibile caricare i dati</h2>
      <p style={{ margin: '1rem 0', color: '#a0a0c0' }}>Il server potrebbe essere in fase di avvio. Riprova tra qualche secondo.</p>
      <button className="btn btn-primary" onClick={load} style={{ marginTop: '1rem' }}>🔄 Riprova Caricamento</button>
      {error && <ErrorModal title={error.title} message={error.message} onClose={() => setError(null)} />}
    </div>
  );

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h1>📊 Dashboard</h1>
        <button className="btn" onClick={load}>🔄 Aggiorna</button>
      </div>

      {data && (
        <div className="dashboard-hero-grid">
          {/* Saldo - smooth line */}
          <section className="neon-panel neon-magenta balance-panel">
            <div className="panel-kicker">💰 Saldo Attuale</div>
            <div className={`hero-balance ${data.currentBalance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(data.currentBalance)}
            </div>
            <div className="smooth-chart-container">
              <SmoothLineChart rawData={smoothLineData} color={data.currentBalance >= 0 ? '#00ff88' : '#ff4444'} />
            </div>
            <div className="chart-caption">Netto mensile — ultimi mesi</div>
          </section>

          {/* Ticker */}
          <section className="neon-panel neon-cyan ticker-panel">
            <p>
              {monthIncome >= monthExpense ? '▲' : '▼'} ENTRATE VS SPESE:{' '}
              <strong className={monthIncome >= monthExpense ? 'positive' : 'negative'}>
                {formatCurrency(monthIncome)} / {formatCurrency(monthExpense)}
              </strong>
            </p>
            <p>
              {netTrend >= 0 ? '▲' : '▼'} NETTO VS MESE PREC.:{' '}
              <strong className={netTrend >= 0 ? 'positive' : 'negative'}>
                {netTrend >= 0 ? '+' : ''}{netTrend.toFixed(1)}%
              </strong>
            </p>
            <div className="task-tape">TODAY&apos;S TASK: {dynamicTask}</div>
          </section>

          {/* Side Stack */}
          <aside className="side-stack">
            <section className="neon-panel neon-magenta compact-stats">
              <span className="panel-kicker">💳 IMPEGNI MENSILI</span>
              <div className="stats-card-group">
                <div className="stat-item-badge cyan">
                  <span className="stat-item-icon">🔄</span>
                  <div className="stat-item-info">
                    <span className="stat-item-label">Abbonamenti / Mese</span>
                    <span className="stat-item-value cyan">{formatCurrency(data.monthlySubscriptionsTotal)}</span>
                  </div>
                </div>
                <div className="stat-item-badge yellow">
                  <span className="stat-item-icon">🪙</span>
                  <div className="stat-item-info">
                    <span className="stat-item-label">Rate Debiti / Mese</span>
                    <span className="stat-item-value yellow">{formatCurrency(computeDebtTotal(data))}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="neon-panel neon-green profile-panel">
              <span className="panel-kicker">👤 PROFILO UTENTE</span>
              <div className="profile-card-content">
                <div className="avatar-ring-large">
                  {profileAlias.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info-group">
                  <span className="profile-name">{profileAlias}</span>
                  <div className={`profile-status-badge ${data.currentMonthClosed ? 'closed' : 'open'}`}>
                    <span className="status-dot-pulse" />
                    {profileStatus}
                  </div>
                  {email && <span className="profile-mail-text">📧 {email}</span>}
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* ADVANCED CHARTS & ANALYTICS */}
      {data && (
        <>
          <CategoryCharts
            expensesByCategory={expensesByCategory}
            monthlyIncomes={data.monthlyIncomes}
            monthlyExpenses={data.monthlyExpenses}
            forecast={forecastData}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <SavingsGoalsWidget
              goals={backendGoals}
              onAddGoal={handleAddSavingsGoal}
              onUpdateGoal={handleUpdateSavingsGoal}
              onDeposit={handleDepositSavingsGoal}
              onDeleteGoal={handleDeleteSavingsGoal}
            />
            <CategoryLimitsWidget
              expensesByCategory={expensesByCategory}
              limits={categoryLimits}
              onSetLimit={handleSetCategoryLimit}
            />
          </div>
        </>
      )}

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        <section className="card">
          <h2>📅 Calendario Appuntamenti</h2>
          <CalendarWidget onError={showError} onToast={showToast} onEventsMutate={loadCalendarTask} />
        </section>

        <section className="card">
          <div className="section-header">
            <h2>📋 Movimenti Recenti</h2>
            <div className="table-actions">
              <input type="text" className="movement-filter" placeholder="Filter"
                value={movementFilter} onChange={(e) => setMovementFilter(e.target.value)} />
              <button className="btn btn-small btn-danger" onClick={handlePurge}>🗑️ Purge</button>
            </div>
          </div>
          <PaginatedTable
            data={filteredEntries}
            keyFn={(row) => row.eventId}
            columns={[
              { header: 'Data', render: (row) => row.date },
              { header: 'Tipo', render: (row) => sourceLabel(row.source) },
              { header: 'Descrizione', render: (row) => row.description },
              { header: 'Importo', render: (row) => <span className={row.delta >= 0 ? 'positive' : 'negative'}>{formatCurrency(row.delta)}</span> },
              { header: '', render: (row) => (row.source === 'INCOME' || row.source === 'EXPENSE')
                ? <button className="btn btn-small btn-danger" onClick={() => handleDeleteMovement(row)}>✕</button> : null },
            ]}
          />
        </section>
      </div>

      {data && (
        <div className="dashboard-lower-grid">
          {/* Budget Overview - Donut */}
          <section className="card donut-card">
            <h2>📊 BUDGET OVERVIEW</h2>
            <DonutChart segments={budgetSegments} />
          </section>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
      {error && <ErrorModal title={error.title} message={error.message} onClose={() => setError(null)} />}
    </div>
  );
}


