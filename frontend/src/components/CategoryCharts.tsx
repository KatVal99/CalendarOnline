import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from 'recharts';

interface Props {
  expensesByCategory: Record<string, number>;
  monthlyIncomes: Record<string, number>;
  monthlyExpenses: Record<string, number>;
  forecast: {
    currentBalance: number;
    forecast3Months: number;
    forecast6Months: number;
    forecast12Months: number;
    netMonthlyChange: number;
  } | null;
}

const COLORS = [
  '#ff3355', // Red / Pink
  '#00ffff', // Cyan
  '#ffdd00', // Yellow
  '#00ff88', // Green
  '#ff8800', // Orange
  '#9d4edd', // Purple
  '#44aaff', // Blue
  '#ff00ff'  // Magenta
];

export default function CategoryCharts({
  expensesByCategory,
  monthlyIncomes,
  monthlyExpenses,
  forecast
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  useEffect(() => {
    // Get actual container width for responsive charts
    const updateWidth = () => {
      const width = Math.min(window.innerWidth - 60, 500);
      setContainerWidth(width);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isMobile = containerWidth < 400;
  const chartHeight = isMobile ? 220 : 280;
  const pieSize = Math.min(containerWidth, isMobile ? 220 : 280);
  const pieInnerRadius = isMobile ? pieSize * 0.28 : pieSize * 0.3;
  const pieOuterRadius = isMobile ? pieSize * 0.42 : pieSize * 0.45;

  // Format pie chart data
  const pieData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({
      name,
      value: Math.abs(value)
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalExpenses = pieData.reduce((sum, item) => sum + item.value, 0);

  // Format bar chart data (Month vs Month)
  const allMonths = Array.from(
    new Set([...Object.keys(monthlyIncomes), ...Object.keys(monthlyExpenses)])
  ).sort();

  const barData = allMonths.map(month => ({
    month,
    Entrate: monthlyIncomes[month] || 0,
    Uscite: monthlyExpenses[month] || 0
  }));

  // Format forecast area chart data
  const forecastData = forecast ? [
    { label: 'Oggi', balance: forecast.currentBalance },
    { label: '+3 Mesi', balance: forecast.forecast3Months },
    { label: '+6 Mesi', balance: forecast.forecast6Months },
    { label: '+12 Mesi', balance: forecast.forecast12Months }
  ] : [];

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const pct = totalExpenses > 0 ? ((data.value / totalExpenses) * 100).toFixed(1) : '0';
      return (
        <div style={{
          background: 'rgba(12, 12, 24, 0.95)',
          border: `2px solid ${data.color || 'var(--cyan)'}`,
          boxShadow: `0 0 15px ${data.color || 'rgba(0,255,255,0.4)'}`,
          padding: '0.65rem 0.9rem',
          borderRadius: '8px',
          color: '#fff'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
            {data.name}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: data.color || '#fff' }}>
            € {Number(data.value).toFixed(2)} ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="category-charts-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* DONUT CHART: Expenses by Category */}
      <div className="neon-panel neon-cyan" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.25rem', fontWeight: 700 }}>
            📊 Spese del Mese per Categoria
          </h3>
          {totalExpenses > 0 && (
            <div style={{
              background: 'rgba(0, 255, 255, 0.12)',
              border: '1px solid rgba(0, 255, 255, 0.35)',
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              color: 'var(--cyan)',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              boxShadow: '0 0 10px rgba(0, 255, 255, 0.2)'
            }}>
              Totale Spese: € {totalExpenses.toFixed(2)}
            </div>
          )}
        </div>

        {pieData.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '1rem' }}>Nessuna spesa registrata nel mese corrente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>

            {/* Donut graphic with central total summary */}
            <div style={{ width: pieSize, height: pieSize, position: 'relative', margin: '0 auto' }}>
              <PieChart width={pieSize} height={pieSize}>
                <Pie
                  data={pieData}
                  cx={pieSize / 2}
                  cy={pieSize / 2}
                  innerRadius={pieInnerRadius}
                  outerRadius={pieOuterRadius}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="rgba(14, 14, 28, 0.9)"
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setActiveCategory(pieData[index].name)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                    {pieData.map((entry, index) => {
                      const color = COLORS[index % COLORS.length];
                      const isHovered = activeCategory === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={color}
                          style={{
                            filter: isHovered ? `drop-shadow(0 0 12px ${color})` : `drop-shadow(0 0 4px ${color})`,
                            cursor: 'pointer',
                            opacity: activeCategory && !isHovered ? 0.6 : 1,
                            transition: 'all 0.3s ease'
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>

              {/* Central Text Badge inside Donut hole */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: isMobile ? '0.6rem' : '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  {activeCategory ? activeCategory : 'TOTALE SPESE'}
                </span>
                <strong style={{ fontSize: isMobile ? '1rem' : '1.35rem', color: '#fff', fontWeight: 800, marginTop: '0.1rem' }}>
                  € {activeCategory
                    ? (expensesByCategory[activeCategory] ? Math.abs(expensesByCategory[activeCategory]).toFixed(2) : '0.00')
                    : totalExpenses.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Right side Category Breakdown list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pieData.map((item, index) => {
                const color = COLORS[index % COLORS.length];
                const pct = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0;
                const isHovered = activeCategory === item.name;

                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setActiveCategory(item.name)}
                    onMouseLeave={() => setActiveCategory(null)}
                    style={{
                      background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isHovered ? color : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      boxShadow: isHovered ? `0 0 12px ${color}40` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: color,
                          boxShadow: `0 0 8px ${color}`,
                          display: 'inline-block'
                        }} />
                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>{item.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: color,
                          background: `${color}20`,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px'
                        }}>
                          {pct.toFixed(1)}%
                        </span>
                        <strong style={{ fontSize: '1.05rem', color: '#fff' }}>€ {item.value.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* BAR CHART: Monthly Incomes vs Expenses */}
      {barData.length > 0 && (
        <div className="neon-panel neon-cyan" style={{ padding: '1.75rem' }}>
          <h3 style={{ color: '#fff', marginBottom: '1.25rem', fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 700 }}>
            📈 Confronto Mensile Entrate vs Uscite
          </h3>
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <BarChart width={containerWidth} height={chartHeight} data={barData} margin={{ left: 0, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#bbb" tick={{ fill: '#ccc', fontSize: isMobile ? 9 : 12 }} />
              <YAxis stroke="#bbb" tick={{ fill: '#ccc', fontSize: isMobile ? 9 : 12 }} width={isMobile ? 45 : 60} />
                <Tooltip
                  contentStyle={{ background: 'rgba(12,12,24,0.95)', border: '1px solid var(--cyan)', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`€ ${Number(value ?? 0).toFixed(2)}`, '']}
                />
                <Bar dataKey="Entrate" fill="#00ff88" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Uscite" fill="#ff3355" radius={[6, 6, 0, 0]} />
              </BarChart>
          </div>
        </div>
      )}

      {/* AREA CHART: Cashflow Forecast */}
      {forecast && (
        <div className="neon-panel neon-magenta" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              🔮 Previsione Saldo Futuro (Cashflow Forecast)
            </h3>
            <span style={{
              background: forecast.netMonthlyChange >= 0 ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 51, 85, 0.15)',
              color: forecast.netMonthlyChange >= 0 ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${forecast.netMonthlyChange >= 0 ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,85,0.3)'}`,
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>
              Delta Netto Mensile: € {forecast.netMonthlyChange.toFixed(2)}
            </span>
          </div>
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <AreaChart width={containerWidth} height={chartHeight} data={forecastData} margin={{ left: 0, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="#bbb" tick={{ fill: '#ccc', fontSize: isMobile ? 9 : 12 }} />
              <YAxis stroke="#bbb" tick={{ fill: '#ccc', fontSize: isMobile ? 9 : 12 }} width={isMobile ? 50 : 60} />
                <Tooltip
                  contentStyle={{ background: 'rgba(12,12,24,0.95)', border: '1px solid var(--magenta)', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`€ ${Number(value ?? 0).toFixed(2)}`, 'Saldo Stimato']}
                />
                <Area type="monotone" dataKey="balance" stroke="#ff00ff" fill="#ff00ff" fillOpacity={0.25} />
              </AreaChart>
          </div>
        </div>
      )}

    </div>
  );
}
