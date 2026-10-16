import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setToken } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  college: string | null;
  targetRole: string | null;
}
interface Session {
  accessToken: string;
  user: User;
}
interface Ctx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((s: Session) => {
    setToken(s.accessToken);
    setUser(s.user);
  }, []);

  useEffect(() => {
    api<Session>('/auth/refresh', { method: 'POST' })
      .then(({ data }) => apply(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    const expired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, [apply]);

  const value: Ctx = {
    user,
    loading,
    login: async (email, password) => apply((await api<Session>('/auth/login', { method: 'POST', body: { email, password } })).data),
    signup: async (name, email, password) =>
      apply((await api<Session>('/auth/signup', { method: 'POST', body: { name, email, password } })).data),
    logout: async () => {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      setToken(null);
      setUser(null);
    },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
