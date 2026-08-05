import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginCheck, registerUser, requestPasswordReset } from '../api/client';
import Toast from '../components/Toast';
import ErrorModal from '../components/ErrorModal';

type Section = 'login' | 'register' | 'reset';

export default function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<Section>('login');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // Reset form
  const [resetEmail, setResetEmail] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await loginCheck(loginEmail, loginPassword);
      if (ok) {
        const encoded = btoa(`${loginEmail}:${loginPassword}`);
        setAuth({ authHeader: `Basic ${encoded}`, email: loginEmail });
        navigate('/');
      } else {
        setError({ title: 'Accesso negato', message: 'Email o password errata. Verifica le credenziali e riprova.' });
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        setError({ title: 'Server non raggiungibile', message: 'Il server potrebbe essere in avvio (fino a 60 sec). Riprova tra qualche secondo.' });
      } else {
        setError({ title: 'Errore di rete', message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 8) {
      setError({ title: 'Password troppo corta', message: 'La password deve essere di almeno 8 caratteri.' });
      return;
    }
    try {
      await registerUser(regUsername, regPassword, regEmail);
      showToast('Account creato! Ora puoi accedere.');
      setSection('login');
    } catch (err) {
      setError({ title: 'Errore registrazione', message: (err as Error).message });
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordReset(resetEmail);
      showToast('Email di reset inviata! Controlla la posta.');
      setSection('login');
    } catch (err) {
      setError({ title: 'Errore reset', message: (err as Error).message });
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">Budget Club</div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`tab-btn ${section === 'login' ? 'active' : ''}`}
            onClick={() => setSection('login')}
          >Accedi</button>
          <button
            className={`tab-btn ${section === 'register' ? 'active' : ''}`}
            onClick={() => setSection('register')}
          >Registrati</button>
          <button
            className={`tab-btn ${section === 'reset' ? 'active' : ''}`}
            onClick={() => setSection('reset')}
          >Reset Password</button>
        </div>

        {/* Login */}
        {section === 'login' && (
          <form className="login-form" onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <label>Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Connessione al server...' : '🔓 Accedi'}
            </button>
          </form>
        )}

        {/* Register */}
        {section === 'register' && (
          <form className="login-form" onSubmit={handleRegister}>
            <label>Username</label>
            <input
              type="text"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              required
            />
            <label>Password (min 8 caratteri)</label>
            <input
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
            <label>Email</label>
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Creazione...' : '✅ Crea Account'}
            </button>
          </form>
        )}

        {/* Reset */}
        {section === 'reset' && (
          <form className="login-form" onSubmit={handleReset}>
            <label>Email account</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Invio...' : '📧 Invia link reset'}
            </button>
          </form>
        )}
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
      {error && (
        <ErrorModal title={error.title} message={error.message} onClose={() => setError(null)} />
      )}
    </div>
  );
}

