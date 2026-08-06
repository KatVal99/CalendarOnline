import { useEffect, useMemo, useState } from 'react';
import { fetchDashboard } from '../api/client';
import { DashboardData, MonthlyTrend } from '../types';
import ErrorModal from '../components/ErrorModal';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

/** Calcola il trend mensile dai due Map del backend */
function buildTrend(data: DashboardData): MonthlyTrend[] {
  const months = new Set([
    ...Object.keys(data.monthlyIncomes),
    ...Object.keys(data.monthlyExpenses),
  ]);
  return Array.from(months)
    .sort()
    .map(month => ({
      month,
      incomes: data.monthlyIncomes[month] ?? 0,
      expenses: Math.abs(data.monthlyExpenses[month] ?? 0),
    }));
}

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcD(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polarXY(cx, cy, r, start);
  const e = polarXY(cx, cy, r, end);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

function polygonPoint(cx: number, cy: number, radius: number, index: number, total: number) {
  const angle = (-Math.PI / 2) + (index / total) * Math.PI * 2;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function ReportCircle({ segments, centerTop, centerBottom }: {
  segments: { label: string; value: number; color: string }[];
  centerTop: string;
  centerBottom: string;
}) {
  const total = Math.max(1, segments.reduce((sum, segment) => sum + segment.value, 0));
  const size = 250;
  const cx = 125;
  const cy = 125;
  const radius = 86;
  const strokeWidth = 24;
  let cursor = 0;

  return (
    <div className="report-circle-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="report-circle-svg">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        {segments.filter((segment) => segment.value > 0).map((segment) => {
          const span = (segment.value / total) * 360;
          const start = cursor + 2;
          const end = cursor + span - 2;
          cursor += span;
          return (
            <path
              key={segment.label}
              d={arcD(cx, cy, radius, start, end)}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${segment.color})` }}
              className="report-circle-path"
            />
          );
        })}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#8888aa" fontSize="8" fontFamily="'Press Start 2P', monospace">{centerTop}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#00ffff" fontSize="9" fontFamily="'Press Start 2P', monospace">{centerBottom}</text>
      </svg>
      <div className="report-circle-legend">
        {segments.map((segment) => (
          <div key={segment.label} className="report-circle-legend-item">
            <span className="report-circle-dot" style={{ background: segment.color, boxShadow: `0 0 7px ${segment.color}` }} />
            <span>{segment.label}</span>
            <strong>{formatCurrency(segment.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarChart({ values }: { values: Array<{ label: string; value: number; color: string }> }) {
  const size = 280;
  const cx = 140;
  const cy = 140;
  const radius = 96;
  const max = Math.max(1, ...values.map((item) => item.value));

  const points = values.map((item, index) => {
    const p = polygonPoint(cx, cy, (item.value / max) * radius, index, values.length);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <div className="radar-chart-box">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[1, 2, 3, 4].map((ring) => {
          const ringRadius = (radius / 4) * ring;
          const ringPoints = values.map((_, index) => {
            const p = polygonPoint(cx, cy, ringRadius, index, values.length);
            return `${p.x},${p.y}`;
          }).join(' ');
          return <polygon key={ring} points={ringPoints} fill="none" stroke="rgba(0,255,255,0.14)" strokeWidth="1" />;
        })}
        {values.map((item, index) => {
          const p = polygonPoint(cx, cy, radius, index, values.length);
          return (
            <g key={item.label}>
              <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(0,255,255,0.16)" strokeWidth="1" />
              <text x={p.x} y={p.y} dx={p.x < cx ? -8 : 8} dy={p.y < cy ? -4 : 12} fill={item.color} fontSize="7" fontFamily="'Press Start 2P', monospace">
                {item.label}
              </text>
            </g>
          );
        })}
        <polygon points={points} fill="rgba(255,0,255,0.18)" stroke="#ff00ff" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px #ff00ff)' }} />
      </svg>
    </div>
  );
}

export default function ReportPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(e => setError({ title: 'Errore caricamento', message: (e as Error).message }));
  }, []);

  const trend: MonthlyTrend[] = data ? buildTrend(data) : [];

  useEffect(() => {
    if (trend.length > 0 && !selectedMonth) {
      setSelectedMonth(trend[trend.length - 1].month);
    }
  }, [trend, selectedMonth]);

  const selectedTrend = useMemo(
    () => trend.find((item) => item.month === selectedMonth) ?? trend[trend.length - 1],
    [trend, selectedMonth],
  );

  const debtMonthly = data?.debts.reduce((sum, debt) => sum + debt.monthlyInstallment, 0) ?? 0;
  const selectedSegments = useMemo(() => {
    if (!selectedTrend || !data) return [];
    return [
      { label: 'Entrate', value: selectedTrend.incomes, color: '#00ff88' },
      { label: 'Spese', value: selectedTrend.expenses, color: '#ff3355' },
      { label: 'Debiti', value: debtMonthly, color: '#ffdd00' },
      { label: 'Abbon.', value: data.monthlySubscriptionsTotal, color: '#00ffff' },
    ];
  }, [data, debtMonthly, selectedTrend]);

  const averageNet = trend.length > 0
    ? trend.reduce((sum, item) => sum + item.incomes - item.expenses, 0) / trend.length
    : 0;

  const selectedIndex = selectedTrend ? trend.findIndex((item) => item.month === selectedTrend.month) : -1;
  const previousTrend = selectedIndex > 0 ? trend[selectedIndex - 1] : null;
  const monthDelta = selectedTrend && previousTrend
    ? (selectedTrend.incomes - selectedTrend.expenses) - (previousTrend.incomes - previousTrend.expenses)
    : 0;

  const radarValues = useMemo(() => {
    if (!selectedTrend || !data) return [];
    return [
      { label: 'INC', value: selectedTrend.incomes, color: '#00ff88' },
      { label: 'EXP', value: selectedTrend.expenses, color: '#ff3355' },
      { label: 'DEBT', value: debtMonthly, color: '#ffdd00' },
      { label: 'SUB', value: data.monthlySubscriptionsTotal, color: '#00ffff' },
      { label: 'NET', value: Math.abs(selectedTrend.incomes - selectedTrend.expenses), color: '#ff00ff' },
    ];
  }, [data, debtMonthly, selectedTrend]);

  const handleExportCSV = () => {
    if (!trend.length) return;
    const headers = ['Mese', 'Entrate (€)', 'Spese (€)', 'Saldo Mensile (€)'];
    const rows = trend.map((t) => [t.month, t.incomes.toFixed(2), t.expenses.toFixed(2), (t.incomes - t.expenses).toFixed(2)]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `report_mensile_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page report-page">
      <div className="page-header">
        <h1>📈 Report Mensile</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-small btn-primary" onClick={handleExportCSV}>📥 Esporta CSV</button>
          <button className="btn btn-small" onClick={handlePrint}>🖨️ Stampa / PDF</button>
        </div>
      </div>

      {data && (
        <div className="totals-grid">
          <div className="total-card">
            <div className="total-label">💰 Saldo</div>
            <div className={`total-value ${data.currentBalance >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(data.currentBalance)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">🔵 Abbonamenti</div>
            <div className="total-value">{formatCurrency(data.monthlySubscriptionsTotal)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">🟡 Rate</div>
            <div className="total-value">{formatCurrency(data.debts.reduce((s, d) => s + d.monthlyInstallment, 0))}</div>
          </div>
          <div className="total-card">
            <div className="total-label">📅 Mesi analizzati</div>
            <div className="total-value">{trend.length}</div>
          </div>
        </div>
      )}

      {trend.length > 0 && selectedTrend && (
        <section className="card chart-card report-circle-card">
          <div className="section-header">
            <h2>◎ Report Circolare</h2>
            <div className="report-month-chips">
              {trend.slice(-6).map((item) => (
                <button
                  key={item.month}
                  className={`btn btn-small report-chip ${selectedTrend.month === item.month ? 'report-chip-active' : ''}`}
                  onClick={() => setSelectedMonth(item.month)}
                >
                  {item.month.slice(5)}
                </button>
              ))}
            </div>
          </div>
          <div className="report-circle-grid">
            <div className="report-viz-stack">
              <ReportCircle
                segments={selectedSegments}
                centerTop={selectedTrend.month}
                centerBottom={formatCurrency(selectedTrend.incomes - selectedTrend.expenses)}
              />
              <RadarChart values={radarValues} />
            </div>
            <div className="report-insights">
              <div className="report-insight-box">
                <span className="panel-kicker">Saldo mese</span>
                <strong className={selectedTrend.incomes - selectedTrend.expenses >= 0 ? 'positive' : 'negative'}>
                  {formatCurrency(selectedTrend.incomes - selectedTrend.expenses)}
                </strong>
              </div>
              <div className="report-insight-box">
                <span className="panel-kicker">Media netta</span>
                <strong className={averageNet >= 0 ? 'positive' : 'negative'}>{formatCurrency(averageNet)}</strong>
              </div>
              <div className="report-insight-box">
                <span className="panel-kicker">Vs mese prec.</span>
                <strong className={monthDelta >= 0 ? 'positive' : 'negative'}>
                  {previousTrend ? `${monthDelta >= 0 ? '+' : ''}${formatCurrency(monthDelta)}` : 'N/D'}
                </strong>
              </div>
              <div className="report-insight-box">
                <span className="panel-kicker">Entrate / Spese</span>
                <strong>{selectedTrend.incomes > 0 ? ((selectedTrend.expenses / selectedTrend.incomes) * 100).toFixed(1) : '0.0'}%</strong>
              </div>
              <div className="report-insight-box">
                <span className="panel-kicker">Carico fisso</span>
                <strong>{formatCurrency(debtMonthly + (data?.monthlySubscriptionsTotal ?? 0))}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <h2>📊 Tabella Trend Spidey</h2>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mese</th>
                <th>Entrate</th>
                <th>Spese</th>
                <th>Saldo Mensile</th>
              </tr>
            </thead>
            <tbody>
              {trend.length === 0 ? (
                <tr><td colSpan={4} className="empty-row">Nessun dato disponibile</td></tr>
              ) : (
                trend.map((t) => (
                  <tr key={t.month}>
                    <td>{t.month}</td>
                    <td className="positive">{formatCurrency(t.incomes)}</td>
                    <td className="negative">{formatCurrency(t.expenses)}</td>
                    <td className={t.incomes - t.expenses >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(t.incomes - t.expenses)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error && <ErrorModal title={error.title} message={error.message} onClose={() => setError(null)} />}
    </div>
  );
}
