import React, { useState } from 'react';

export interface CategoryLimit {
  id: string;
  category: String;
  monthlyLimit: number;
}

interface Props {
  expensesByCategory: Record<string, number>;
  limits: CategoryLimit[];
  onSetLimit: (category: string, monthlyLimit: number) => Promise<void>;
  onDeleteLimit?: (category: string) => Promise<void>;
}

const DEFAULT_CATEGORIES = [
  'Alimentari', 'Svago', 'Bollette', 'Casa', 'Trasporti', 'Salute', 'Abbonamenti', 'Altro'
];

export default function CategoryLimitsWidget({ expensesByCategory, limits, onSetLimit, onDeleteLimit }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('Alimentari');
  const [limitInput, setLimitInput] = useState('');

  const limitsMap: Record<string, number> = {};
  limits.forEach((l) => {
    limitsMap[l.category.toString()] = l.monthlyLimit;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !limitInput) return;
    await onSetLimit(selectedCategory, parseFloat(limitInput));
    setLimitInput('');
  };

  return (
    <div className="neon-panel neon-yellow" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <h3 style={{ color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        ⚠️ Tetti di Spesa per Categoria (Spending Limits)
      </h3>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ flex: 1, minWidth: '150px' }}
        >
          {DEFAULT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Limite mensile (€)"
          value={limitInput}
          onChange={(e) => setLimitInput(e.target.value)}
          style={{ flex: 1, minWidth: '150px' }}
          required
        />
        <button type="submit" className="btn btn-primary">Imposta Limite</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.keys(limitsMap).length === 0 ? (
          <p style={{ color: '#aaa' }}>Nessun tetto di spesa impostato. Seleziona una categoria e imposta un massimo!</p>
        ) : (
          Object.entries(limitsMap).map(([category, limitVal]) => {
            const currentSpent = Math.abs(expensesByCategory[category] || 0);
            const percent = Math.min(100, Math.round((currentSpent / limitVal) * 100));
            const isExceeded = currentSpent > limitVal;
            const isWarning = percent >= 80 && !isExceeded;

            return (
              <div key={category} style={{ background: '#252538', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', color: '#fff' }}>{category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{
                      color: isExceeded ? '#ff6b6b' : isWarning ? '#ffd166' : '#06d6a0',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      € {currentSpent.toFixed(2)} / € {limitVal.toFixed(2)} ({percent}%)
                    </span>
                    {onDeleteLimit && (
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', lineHeight: '1' }}
                        onClick={() => onDeleteLimit(category)}
                        title={`Elimina tetto di spesa per ${category}`}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#444', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: isExceeded ? '#ff6b6b' : isWarning ? '#ffd166' : '#06d6a0',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
