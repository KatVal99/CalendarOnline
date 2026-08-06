import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../api/client';
import Toast from '../components/Toast';
import ErrorModal from '../components/ErrorModal';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError({ title: 'Password troppo corta', message: 'Minimo 8 caratteri.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setError({ title: 'Password non corrispondenti', message: 'Le due password devono essere uguali.' });
      return;
    }
    try {
      await confirmPasswordReset(token, newPassword);
      setToast('Password aggiornata! Ora puoi accedere.');
      setDone(true);
    } catch (err) {
      setError({ title: 'Errore reset', message: (err as Error).message });
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🔑 Reset Password</div>
        {done ? (
          <div className="success-msg">
            ✅ Password aggiornata con successo!<br />
            <button onClick={() => navigate('/login')} className="btn" style={{ marginTop: '1rem', display: 'inline-block' }}>Vai al Login</button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {!token && (
              <div className="error-inline">⚠️ Token mancante! Usa il link dall'email.</div>
            )}
            <label>Nuova Password (min 8 caratteri)</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
            <label>Conferma Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button className="btn btn-primary" type="submit" disabled={!token}>
              🔒 Aggiorna Password
            </button>
          </form>
        )}
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
      {error && <ErrorModal title={error.title} message={error.message} onClose={() => setError(null)} />}
    </div>
  );
}

