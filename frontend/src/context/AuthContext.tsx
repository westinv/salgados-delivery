import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "../api/client";

interface AuthContextValue {
  authenticated: boolean | null; // null = still checking on boot
  login: (senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!api.getToken()) {
        if (!cancelled) setAuthenticated(false);
        return;
      }
      try {
        const res = await api.verificarSessao();
        if (!cancelled) setAuthenticated(res.autenticado);
      } catch {
        if (!cancelled) setAuthenticated(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (senha: string) => {
    const res = await api.login(senha);
    api.setToken(res.token);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      setAuthenticated(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
