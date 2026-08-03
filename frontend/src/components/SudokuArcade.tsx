import { useCallback, useEffect, useMemo, useState } from 'react';

const PUZZLES = [
  {
    puzzle: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  },
  {
    puzzle: '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
    solution: '435269781682571493197834562826195347374682915951743628519326874248957136763418259',
  },
];

function chunkBoard(serialized: string): string[] {
  return serialized.split('');
}

function getConflicts(board: string[], index: number): boolean {
  const value = board[index];
  if (!value || value === '0') return false;
  const row = Math.floor(index / 9);
  const col = index % 9;

  for (let i = 0; i < 9; i++) {
    const rowIndex = row * 9 + i;
    const colIndex = i * 9 + col;
    if (rowIndex !== index && board[rowIndex] === value) return true;
    if (colIndex !== index && board[colIndex] === value) return true;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const current = r * 9 + c;
      if (current !== index && board[current] === value) return true;
    }
  }
  return false;
}

export default function SudokuArcade() {
  const [seed, setSeed] = useState(0);
  const current = PUZZLES[seed % PUZZLES.length];
  const [board, setBoard] = useState<string[]>(() => chunkBoard(current.puzzle));
  const [selected, setSelected] = useState<number | null>(null);

  const fixed = useMemo(
      () => new Set(chunkBoard(current.puzzle).map((v, i) => (v !== '0' ? i : -1)).filter((i) => i >= 0)),
      [current]
  );
  const solved = current.solution;
  const completed = board.every((value, index) => value === solved[index]);
  const filled = board.filter((value) => value !== '0').length;

  const selectedValue = selected !== null ? board[selected] : null;
  const selectedRow = selected !== null ? Math.floor(selected / 9) : -1;
  const selectedCol = selected !== null ? selected % 9 : -1;
  const selectedBox = selected !== null ? `${Math.floor(selectedRow / 3)}-${Math.floor(selectedCol / 3)}` : '';

  const restart = useCallback((nextSeed = seed) => {
    const picked = PUZZLES[nextSeed % PUZZLES.length];
    setBoard(chunkBoard(picked.puzzle));
    setSelected(null);
  }, [seed]);

  const setCell = useCallback((value: string) => {
    if (selected === null || fixed.has(selected)) return;
    setBoard((prev) => {
      const next = [...prev];
      next[selected] = value;
      return next;
    });
  }, [selected, fixed]);

  const revealHint = () => {
    const target = board.findIndex((value, index) => value !== solved[index]);
    if (target < 0) return;
    const next = [...board];
    next[target] = solved[target];
    setBoard(next);
    setSelected(target);
  };

  // Supporto Tastiera (Frecce, Numeri, Backspace/Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selected === null) return;
      if (e.key >= '1' && e.key <= '9') {
        setCell(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        setCell('0');
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        let next = selected;
        if (e.key === 'ArrowUp') next = Math.max(0, selected - 9);
        if (e.key === 'ArrowDown') next = Math.min(80, selected + 9);
        if (e.key === 'ArrowLeft') next = Math.max(0, selected - 1);
        if (e.key === 'ArrowRight') next = Math.min(80, selected + 1);
        setSelected(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, setCell]);

  return (
      <div className="arcade-panel sudoku-panel" style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div className="arcade-subheader" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ color: '#00f0ff', letterSpacing: '1px' }}>🧠 SUDOKU GRID</h2>
            <p style={{ color: '#8a99ad', fontSize: '0.85rem' }}>Riempire la matrice 9×9 senza ripetizioni su righe, colonne e box 3×3.</p>
          </div>
          <div className="sudoku-stats" style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
            <span>Completate: <strong style={{ color: '#00f0ff' }}>{filled}/81</strong></span>
            <span>Stato: <strong style={{ color: completed ? '#00ff88' : '#ffb700' }}>{completed ? 'RISOLTO' : 'IN CORSO'}</strong></span>
          </div>
        </div>

        <div className="sudoku-layout" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* GRIGLIA PRINCIPALE */}
          <div className="sudoku-board-wrap" style={{ flex: '0 0 auto' }}>
            <div className="sudoku-axis-labels sudoku-axis-top" style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 44px)', textAlign: 'center', marginBottom: '4px', color: '#00f0ff', fontSize: '11px', fontWeight: 'bold' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
            </div>
            <div className="sudoku-main-grid-wrap" style={{ display: 'flex', gap: '6px' }}>
              <div className="sudoku-axis-labels sudoku-axis-left" style={{ display: 'grid', gridTemplateRows: 'repeat(9, 44px)', alignItems: 'center', color: '#00f0ff', fontSize: '11px', fontWeight: 'bold' }}>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((label) => <span key={label}>{label}</span>)}
              </div>

              <div
                  className="sudoku-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(9, 44px)',
                    gridTemplateRows: 'repeat(9, 44px)',
                    gap: '1px',
                    background: '#002b36',
                    border: '2px solid #00f0ff',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
              >
                {board.map((value, index) => {
                  const row = Math.floor(index / 9);
                  const col = index % 9;
                  const isFixed = fixed.has(index);
                  const isSelected = selected === index;
                  const isConflict = getConflicts(board, index);
                  const isRowActive = row === selectedRow;
                  const isColActive = col === selectedCol;
                  const isBoxActive = `${Math.floor(row / 3)}-${Math.floor(col / 3)}` === selectedBox;
                  const isSameValue = selectedValue && selectedValue !== '0' && value === selectedValue;

                  // Calcolo stili dinamici per la cella
                  let bg = '#06131e';
                  let textColor = '#ffffff';

                  if (isFixed) {
                    textColor = '#00f0ff';
                  }
                  if (isRowActive || isColActive || isBoxActive) {
                    bg = '#0d2235';
                  }
                  if (isSameValue) {
                    bg = '#163854';
                  }
                  if (isSelected) {
                    bg = '#ffe600';
                    textColor = '#000000';
                  }
                  if (isConflict) {
                    bg = '#ff0055';
                    textColor = '#ffffff';
                  }

                  const borderBottom = row % 3 === 2 && row !== 8 ? '2px solid #00f0ff' : '1px solid #0a2942';
                  const borderRight = col % 3 === 2 && col !== 8 ? '2px solid #00f0ff' : '1px solid #0a2942';

                  return (
                      <button
                          key={index}
                          type="button"
                          style={{
                            background: bg,
                            color: textColor,
                            border: 'none',
                            borderBottom,
                            borderRight,
                            fontSize: '1.2rem',
                            fontWeight: isFixed ? 'bold' : '500',
                            cursor: isFixed ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            outline: 'none',
                          }}
                          onClick={() => setSelected(index)}
                      >
                        {value !== '0' ? value : ''}
                      </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PANNELLO DI CONTROLLO COMPATTO */}
          <div className="sudoku-sidepanel" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Pad numerico 3x3 stile calcolatrice/arcade */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#00f0ff', letterSpacing: '1px', fontWeight: 'bold' }}>TASTIERA NUMERICA</span>
              <div
                  className="sudoku-controls"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginTop: '8px',
                  }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button
                        key={n}
                        className="btn btn-small sudoku-num-btn"
                        type="button"
                        style={{
                          padding: '12px 0',
                          fontSize: '1.25rem',
                          fontWeight: 'bold',
                          background: '#0a2236',
                          color: '#00f0ff',
                          border: '1px solid #00f0ff44',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        }}
                        onClick={() => setCell(String(n))}
                    >
                      {n}
                    </button>
                ))}
              </div>
            </div>

            {/* Azioni rapide */}
            <div className="sudoku-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button className="btn btn-small btn-danger" type="button" style={{ background: '#ff0055', color: '#fff', padding: '10px' }} onClick={() => setCell('0')}>
                🗑 Cancella
              </button>
              <button className="btn btn-small btn-primary" type="button" style={{ background: '#00f0ff', color: '#000', fontWeight: 'bold', padding: '10px' }} onClick={revealHint}>
                💡 Suggerimento
              </button>
              <button className="btn btn-small" type="button" style={{ background: '#1c3144', color: '#fff', padding: '10px' }} onClick={() => restart()}>
                ↺ Reset
              </button>
              <button className="btn btn-small btn-yellow" type="button" style={{ background: '#ffe600', color: '#000', fontWeight: 'bold', padding: '10px' }} onClick={() => { const nextSeed = seed + 1; setSeed(nextSeed); restart(nextSeed); }}>
                🎮 Nuovo Schema
              </button>
            </div>

            {/* Tip Box */}
            <div
                className="sudoku-tip-box"
                style={{
                  background: '#061624',
                  border: '1px solid #00f0ff33',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                  lineHeight: '1.5',
                }}
            >
            <span style={{ color: '#ffe600', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              💡 CONTROLLI TASTIERA
            </span>
              <p style={{ margin: 0 }}>
                Puoi usare i numeri della tastiera fisica (
                <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>1-9</span>
                ), le frecce direzionali per muoverti e{' '}
                <span style={{ color: '#ff0055', fontWeight: 'bold' }}>Backspace</span> per cancellare.
              </p>
            </div>

            {completed && (
                <div
                    className="sudoku-win-box"
                    style={{
                      background: '#00ff88',
                      color: '#000',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '12px',
                      borderRadius: '6px',
                      boxShadow: '0 0 15px rgba(0,255,136,0.4)',
                    }}
                >
                  🎉 ECCELLENTE! SUDOKU COMPLETATO!
                </div>
            )}
          </div>
        </div>
      </div>
  );
}