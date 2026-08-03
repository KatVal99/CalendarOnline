import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AuthState } from '../types';
import { logout as apiLogout } from '../api/client';

interface AuthContextValue {
  auth: AuthState | null;
  isAuthenticated: boolean;
  setAuth: (state: AuthState) => void;
  logout: () => void;
  email: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadAuthFromStorage(): AuthState | null {
  const authHeader = localStorage.getItem('budgetAuthHeader');
  const email = localStorage.getItem('budgetEmail');
  if (authHeader && email) return { authHeader, email };
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState | null>(loadAuthFromStorage);

  const setAuth = useCallback((state: AuthState) => {
    localStorage.setItem('budgetAuthHeader', state.authHeader);
    localStorage.setItem('budgetEmail', state.email);
    setAuthState(state);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setAuthState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        auth,
        isAuthenticated: auth !== null,
        setAuth,
        logout,
        email: auth?.email ?? '',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

