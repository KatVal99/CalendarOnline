import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchSavingsGoalTransactions,
  deleteSavingsGoalTransaction,
  updateSavingsGoalTransaction,
  SavingsGoalTransaction
} from '../api/client';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon?: string;
}

interface Props {
  goals: SavingsGoal[];
  onAddGoal: (name: string, targetAmount: number, targetDate?: string, icon?: string) => Promise<void>;
  onUpdateGoal?: (goalId: string, name: string, targetAmount: number, targetDate?: string, icon?: string) => Promise<void>;
  onDeposit: (goalId: string, amount: number) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onRefresh?: () => void;
}

export default function SavingsGoalsWidget({ goals, onAddGoal, onUpdateGoal, onDeposit, onDeleteGoal, onRefresh }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('🎯');

  // Edit Modal State
  const [editModalGoal, setEditModalGoal] = useState<SavingsGoal | null>(null);
  const [editName, setEditName] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editIcon, setEditIcon] = useState('🎯');

  // Deposit Modal State
  const [depositModalGoalId, setDepositModalGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Quota Action Modal State (Scadenza & Quota Consigliata tab click)
  const [quotaModalGoal, setQuotaModalGoal] = useState<{ goal: SavingsGoal; quotaInfo: any } | null>(null);
  const [editQuotaDate, setEditQuotaDate] = useState('');

  // History Modal State
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);
  const [transactions, setTransactions] = useState<SavingsGoalTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNote, setEditTxNote] = useState('');

  const loadTransactions = async (goalId: string) => {
    setLoadingTx(true);
    try {
      const txs = await fetchSavingsGoalTransactions(goalId);
      setTransactions(txs);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setLoadingTx(false);
    }
  };

  const openHistoryModal = (goal: SavingsGoal) => {
    setHistoryGoal(goal);
    setEditingTxId(null);
    loadTransactions(goal.id);
  };

  const handleDeleteTransaction = async (goalId: string, txId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo versamento? L'importo verrà rimosso dal salvadanaio e restituito al tuo saldo.")) return;
    await deleteSavingsGoalTransaction(goalId, txId);
    await loadTransactions(goalId);
    onRefresh?.(); // Trigger parent balance update
  };

  const handleUpdateTransaction = async (goalId: string, txId: string) => {
    if (!editTxAmount) return;
    await updateSavingsGoalTransaction(goalId, txId, parseFloat(editTxAmount), editTxNote);
    setEditingTxId(null);
    await loadTransactions(goalId);
    onRefresh?.(); // Trigger parent balance update
  };

  const openQuotaModal = (goal: SavingsGoal, quotaInfo: any) => {
    setQuotaModalGoal({ goal, quotaInfo });
    setEditQuotaDate(goal.targetDate || '');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    await onAddGoal(name, parseFloat(targetAmount), targetDate || undefined, icon);
    setName('');
    setTargetAmount('');
    setTargetDate('');
    setShowAddModal(false);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditModalGoal(goal);
    setEditName(goal.name);
    setEditTargetAmount(goal.targetAmount.toString());
    setEditTargetDate(goal.targetDate || '');
    setEditIcon(goal.icon || '🎯');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalGoal || !editName || !editTargetAmount || !onUpdateGoal) return;
    await onUpdateGoal(
      editModalGoal.id,
      editName,
      parseFloat(editTargetAmount),
      editTargetDate || undefined,
      editIcon
    );
    setEditModalGoal(null);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalGoalId || !depositAmount) return;
    await onDeposit(depositModalGoalId, parseFloat(depositAmount));
    setDepositAmount('');
    setDepositModalGoalId(null);
  };

  const calculateMonthlyQuota = (goal: SavingsGoal) => {
    if (!goal.targetDate) return null;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-based: 0 = Jan, 11 = Dec

    const parts = goal.targetDate.split('-');
    if (parts.length < 2) return null;

    const targetYear = parseInt(parts[0], 10);
    const targetMonth = parseInt(parts[1], 10) - 1; // 0-based

    if (isNaN(targetYear) || isNaN(targetMonth)) return null;

    // Remaining months including the current month
    const remainingMonths = (targetYear - currentYear) * 12 + (targetMonth - currentMonth) + 1;
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : `${parts[1]}/${parts[0]}`;

    if (remainingAmount <= 0) {
      return {
        formattedDate,
        remainingMonths: Math.max(0, remainingMonths),
        monthlyQuota: 0,
        remainingAmount: 0,
        isCompleted: true,
        isExpired: remainingMonths <= 0
      };
    }

    if (remainingMonths <= 0) {
      return {
        formattedDate,
        remainingMonths: 0,
        monthlyQuota: remainingAmount,
        remainingAmount,
        isCompleted: false,
        isExpired: true
      };
    }

    const monthlyQuota = remainingAmount / remainingMonths;

    return {
      formattedDate,
      remainingMonths,
      monthlyQuota,
      remainingAmount,
      isCompleted: false,
      isExpired: false
    };
  };

  return (
    <div className="neon-panel neon-cyan" style={{ padding: '1.75rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem', fontWeight: 700 }}>
          🐖 Salvadonai Virtuali & Obiettivi di Risparmio
        </h3>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '0.6rem 1.1rem', fontSize: '0.95rem', fontWeight: 'bold' }}>
          + Nuovo Salvadanaio
        </button>
      </div>

      {goals.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: '1rem' }}>Nessun salvadanaio attivo. Creane uno per iniziare a risparmiare per un obiettivo!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '1.25rem' }}>
          {goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const quotaInfo = calculateMonthlyQuota(goal);

            return (
              <div key={goal.id} style={{
                background: '#242438',
                padding: '1.35rem',
                borderRadius: '12px',
                border: '1px solid #4a4a6e',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#ffffff' }}>
                      {goal.icon || '🎯'} {goal.name}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {onUpdateGoal && (
                        <button
                          className="btn btn-small"
                          onClick={() => openEditModal(goal)}
                          title="Modifica Salvadanaio"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          ✏️ Modifica
                        </button>
                      )}
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => onDeleteGoal(goal.id)}
                        title="Elimina Salvadanaio"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', borderRadius: '6px' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f1f5f9', marginTop: '0.6rem' }}>
                    € {goal.currentAmount.toFixed(2)} / € {goal.targetAmount.toFixed(2)}{' '}
                    <span style={{ color: percent >= 100 ? '#40c057' : '#38bdf8', fontWeight: 'bold' }}>
                      ({percent}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '14px',
                    background: '#33334d',
                    borderRadius: '7px',
                    margin: '0.85rem 0',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: percent >= 100 ? '#40c057' : 'linear-gradient(90deg, #4361ee, #4cc9f0)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  {/* Monthly Quota & Target Date Breakdown */}
                  {quotaInfo && (
                    <div
                      onClick={() => openQuotaModal(goal, quotaInfo)}
                      title="Clicca per versare la quota mensile o gestire la scadenza"
                      style={{
                        marginTop: '0.75rem',
                        marginBottom: '0.85rem',
                        padding: '0.85rem 1rem',
                        background: 'rgba(56, 189, 248, 0.12)',
                        borderRadius: '10px',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        fontSize: '0.95rem',
                        color: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.22)';
                        e.currentTarget.style.borderColor = 'var(--cyan)';
                        e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📅 Scadenza: <strong style={{ color: '#fff' }}>{quotaInfo.formattedDate}</strong></span>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.12)',
                          color: quotaInfo.isExpired ? '#ff6b6b' : '#38bdf8'
                        }}>
                          {quotaInfo.isExpired
                            ? '⚠️ Scaduto'
                            : quotaInfo.remainingMonths === 1
                            ? '⏳ Entro fine mese'
                            : `⏱️ ${quotaInfo.remainingMonths} mesi rimasti`}
                        </span>
                      </div>
                      
                      {!quotaInfo.isCompleted && !quotaInfo.isExpired && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.15rem', color: '#38bdf8' }}>
                          <span style={{ fontSize: '0.95rem', color: '#e2e8f0' }}>💡 Quota consigliata:</span>
                          <span>€ {quotaInfo.monthlyQuota.toFixed(2)} / mese</span>
                        </div>
                      )}

                      {quotaInfo.isExpired && !quotaInfo.isCompleted && (
                        <div style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          Mancano € {quotaInfo.remainingAmount.toFixed(2)} (Scaduto)
                        </div>
                      )}

                      {quotaInfo.isCompleted && (
                        <div style={{ color: '#40c057', fontWeight: 'bold', fontSize: '0.95rem' }}>
                          🎉 Obiettivo Raggiunto!
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', textAlign: 'right', marginTop: '0.1rem', fontWeight: 600 }}>
                        ⚙️ Clicca per versare quota o gestire scadenza
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => setDepositModalGoalId(goal.id)}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    + Deposita / Preleva
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={() => openHistoryModal(goal)}
                    title="Visualizza, modifica ed elimina versamenti"
                    style={{ padding: '0.65rem 0.85rem', fontSize: '0.9rem', fontWeight: 'bold', background: 'rgba(0, 255, 255, 0.12)', border: '1px solid var(--cyan)', color: 'var(--cyan)' }}
                  >
                    📜 Versamenti
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Goal */}
      {showAddModal && createPortal(
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 12, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999,
          padding: '1.5rem', overflowY: 'auto'
        }}>
          <div onClick={(e) => e.stopPropagation()} className="neon-panel neon-cyan" style={{
            padding: '1.75rem', borderRadius: '14px', width: '100%', maxWidth: '440px',
            maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column'
          }}>
            <h4 style={{ color: 'var(--cyan)', textShadow: '0 0 10px var(--cyan)', marginTop: 0, marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 700 }}>
              🎯 Nuovo Salvadanaio
            </h4>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Nome Obiettivo:</label>
                <input
                  type="text"
                  placeholder="es. Vacanza, Auto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Importo Target (€):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="es. 3000.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Icona / Emoji:</label>
                <input
                  type="text"
                  placeholder="es. 🚗, ✈️, 💻"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Data di Scadenza (opzionale - per quota mensile):
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div style={{
                display: 'flex', gap: '0.85rem', justifyContent: 'flex-end',
                marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)',
                position: 'sticky', bottom: 0, background: 'rgba(14, 14, 28, 0.95)', zIndex: 10
              }}>
                <button type="button" className="btn btn-danger" onClick={() => setShowAddModal(false)} style={{ padding: '0.55rem 1.2rem' }}>Annulla</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.5rem', fontWeight: 'bold' }}>Crea</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Edit Goal */}
      {editModalGoal && createPortal(
        <div className="modal-backdrop" onClick={() => setEditModalGoal(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 12, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999,
          padding: '1.5rem', overflowY: 'auto'
        }}>
          <div onClick={(e) => e.stopPropagation()} className="neon-panel neon-cyan" style={{
            padding: '1.75rem', borderRadius: '14px', width: '100%', maxWidth: '440px',
            maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column'
          }}>
            <h4 style={{ color: 'var(--cyan)', textShadow: '0 0 10px var(--cyan)', marginTop: 0, marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 700 }}>✏️ Modifica Salvadanaio</h4>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Nome Obiettivo:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Importo Target (€):</label>
                <input
                  type="number"
                  step="0.01"
                  value={editTargetAmount}
                  onChange={(e) => setEditTargetAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Icona / Emoji:</label>
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Data di Scadenza (opzionale - per quota mensile):
                </label>
                <input
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div style={{
                display: 'flex', gap: '0.85rem', justifyContent: 'flex-end',
                marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)',
                position: 'sticky', bottom: 0, background: 'rgba(14, 14, 28, 0.95)', zIndex: 10
              }}>
                <button type="button" className="btn btn-danger" onClick={() => setEditModalGoal(null)} style={{ padding: '0.55rem 1.2rem' }}>Annulla</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.5rem', fontWeight: 'bold' }}>Salva Modifiche</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Deposit */}
      {depositModalGoalId && createPortal(
        <div className="modal-backdrop" onClick={() => setDepositModalGoalId(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 12, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999,
          padding: '1.5rem', overflowY: 'auto'
        }}>
          <div onClick={(e) => e.stopPropagation()} className="neon-panel neon-cyan" style={{
            padding: '1.75rem', borderRadius: '14px', width: '100%', maxWidth: '400px',
            maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column'
          }}>
            <h4 style={{ color: 'var(--cyan)', textShadow: '0 0 10px var(--cyan)', marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>💰 Deposita o Preleva</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
              I depositi (valori positivi) detraggono denaro dal tuo saldo disponibile. I prelievi (valori negativi) lo restituiscono.
            </p>
            <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <input
                type="number"
                step="0.01"
                placeholder="Importo (es. 50 o -20)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                required
              />
              <div style={{
                display: 'flex', gap: '0.85rem', justifyContent: 'flex-end',
                marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)',
                position: 'sticky', bottom: 0, background: 'rgba(14, 14, 28, 0.95)', zIndex: 10
              }}>
                <button type="button" className="btn btn-danger" onClick={() => setDepositModalGoalId(null)} style={{ padding: '0.55rem 1.2rem' }}>Annulla</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.5rem', fontWeight: 'bold' }}>Conferma</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Quota Action & Scadenza Management */}
      {quotaModalGoal && createPortal(
        <div className="modal-backdrop" onClick={() => setQuotaModalGoal(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 12, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999,
          padding: '1.5rem', overflowY: 'auto'
        }}>
          <div onClick={(e) => e.stopPropagation()} className="neon-panel neon-cyan" style={{
            padding: '1.75rem', borderRadius: '14px', width: '100%', maxWidth: '460px',
            maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', gap: '1.25rem'
          }}>
            <div>
              <h4 style={{ color: 'var(--cyan)', textShadow: '0 0 10px var(--cyan)', marginTop: 0, marginBottom: '0.3rem', fontSize: '1.3rem', fontWeight: 700 }}>
                💡 Gestione Quota & Scadenza
              </h4>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                {quotaModalGoal.goal.icon || '🎯'} <strong>{quotaModalGoal.goal.name}</strong>
              </span>
            </div>

            {/* ACTION 1: Versa o Rimuovi Quota del Mese */}
            {!quotaModalGoal.quotaInfo.isCompleted && !quotaModalGoal.quotaInfo.isExpired && (
              <div style={{
                background: 'rgba(0, 255, 136, 0.08)',
                border: '1px solid rgba(0, 255, 136, 0.35)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--green)' }}>
                  💸 Versa o Rimuovi Quota del Mese (€ {quotaModalGoal.quotaInfo.monthlyQuota.toFixed(2)})
                </div>
                <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: 0, lineHeight: 1.4 }}>
                  Versa la quota nel salvadanaio (scalando il saldo) oppure stornala/rimuovila per <strong>restituire l'importo al tuo saldo disponibile</strong>.
                </p>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    className="btn btn-green"
                    onClick={async () => {
                      await onDeposit(quotaModalGoal.goal.id, quotaModalGoal.quotaInfo.monthlyQuota);
                      setQuotaModalGoal(null);
                    }}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    ✓ Versa € {quotaModalGoal.quotaInfo.monthlyQuota.toFixed(2)}
                  </button>

                  {quotaModalGoal.goal.currentAmount > 0 && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={async () => {
                        const withdrawAmt = Math.min(quotaModalGoal.goal.currentAmount, quotaModalGoal.quotaInfo.monthlyQuota);
                        await onDeposit(quotaModalGoal.goal.id, -withdrawAmt);
                        setQuotaModalGoal(null);
                      }}
                      style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '0.9rem', fontWeight: 'bold' }}
                    >
                      ↩️ Rimuovi € {Math.min(quotaModalGoal.goal.currentAmount, quotaModalGoal.quotaInfo.monthlyQuota).toFixed(2)}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ACTION 2: Modifica o Rimuovi Data di Scadenza */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>
                ⚙️ Modifica / Rimuovi Scadenza
              </div>

              <div>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Data di Scadenza:
                </label>
                <input
                  type="date"
                  value={editQuotaDate}
                  onChange={(e) => setEditQuotaDate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                {onUpdateGoal && (
                  <button
                    type="button"
                    className="btn btn-yellow"
                    style={{ flex: 1, padding: '0.55rem 0.85rem' }}
                    onClick={async () => {
                      await onUpdateGoal(
                        quotaModalGoal.goal.id,
                        quotaModalGoal.goal.name,
                        quotaModalGoal.goal.targetAmount,
                        editQuotaDate || undefined,
                        quotaModalGoal.goal.icon
                      );
                      setQuotaModalGoal(null);
                    }}
                  >
                    💾 Aggiorna Data
                  </button>
                )}

                {onUpdateGoal && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '0.55rem 0.85rem' }}
                    onClick={async () => {
                      await onUpdateGoal(
                        quotaModalGoal.goal.id,
                        quotaModalGoal.goal.name,
                        quotaModalGoal.goal.targetAmount,
                        undefined,
                        quotaModalGoal.goal.icon
                      );
                      setQuotaModalGoal(null);
                    }}
                  >
                    🗑️ Rimuovi Scadenza
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setQuotaModalGoal(null)}
                style={{ padding: '0.55rem 1.2rem' }}
              >
                Chiudi
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Modal Transaction History */}
      {historyGoal && createPortal(
        <div className="modal-backdrop" onClick={() => setHistoryGoal(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 12, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999,
          padding: '1.5rem', overflowY: 'auto'
        }}>
          <div onClick={(e) => e.stopPropagation()} className="neon-panel neon-cyan" style={{
            padding: '1.75rem', borderRadius: '14px', width: '100%', maxWidth: '560px',
            maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ color: 'var(--cyan)', textShadow: '0 0 10px var(--cyan)', marginTop: 0, marginBottom: '0.3rem', fontSize: '1.3rem', fontWeight: 700 }}>
                  📜 Cronologia Versamenti
                </h4>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                  {historyGoal.icon || '🎯'} <strong>{historyGoal.name}</strong> (Attuale: € {historyGoal.currentAmount.toFixed(2)})
                </span>
              </div>
              <button
                className="btn btn-small btn-danger"
                onClick={() => setHistoryGoal(null)}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                ✕
              </button>
            </div>

            {loadingTx ? (
              <div style={{ textAlign: 'center', color: 'var(--cyan)', padding: '1.5rem' }}>
                Caricamento versamenti in corso...
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem' }}>
                Nessun versamento registrato per questo salvadanaio.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {transactions.map((tx) => {
                  const isEditing = editingTxId === tx.id;
                  const isDeposit = tx.amount > 0;

                  return (
                    <div key={tx.id} style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isDeposit ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`,
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>Importo (€):</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editTxAmount}
                                onChange={(e) => setEditTxAmount(e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--cyan)', color: '#fff', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ flex: 2 }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>Nota:</label>
                              <input
                                type="text"
                                value={editTxNote}
                                onChange={(e) => setEditTxNote(e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--cyan)', color: '#fff', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-small"
                              onClick={() => setEditingTxId(null)}
                              style={{ padding: '0.35rem 0.75rem' }}
                            >
                              Annulla
                            </button>
                            <button
                              className="btn btn-small btn-primary"
                              onClick={() => handleUpdateTransaction(historyGoal.id, tx.id)}
                              style={{ padding: '0.35rem 0.95rem', fontWeight: 'bold' }}
                            >
                              💾 Salva Modifica
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: isDeposit ? '#40c057' : '#ff6b6b' }}>
                              {isDeposit ? '➕ Deposito: ' : '➖ Prelievo: '} € {Math.abs(tx.amount).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                              {tx.note || (isDeposit ? 'Versamento quota' : 'Prelievo quota')} • {new Date(tx.createdAt).toLocaleString('it-IT')}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn btn-small"
                              title="Modifica Versamento"
                              onClick={() => {
                                setEditingTxId(tx.id);
                                setEditTxAmount(tx.amount.toString());
                                setEditTxNote(tx.note || '');
                              }}
                              style={{ padding: '0.35rem 0.65rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              ✏️ Modifica
                            </button>
                            <button
                              className="btn btn-small btn-danger"
                              title="Elimina Versamento"
                              onClick={() => handleDeleteTransaction(historyGoal.id, tx.id)}
                              style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              🗑️ Elimina
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className="btn"
                onClick={() => setHistoryGoal(null)}
                style={{ padding: '0.55rem 1.2rem' }}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

