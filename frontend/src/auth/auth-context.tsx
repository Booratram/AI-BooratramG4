import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, type AuthSession } from '../api/client';

interface LoginPayload {
  email: string;
  password: string;
  tenantSlug?: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  logout: () => void;
}

const STORAGE_KEY = 'booratramg4.session';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login: async (payload) => {
        const nextSession = await apiClient.login(payload);
        setSession(nextSession);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        return nextSession;
      },
      logout: () => {
        setSession(null);
        window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
