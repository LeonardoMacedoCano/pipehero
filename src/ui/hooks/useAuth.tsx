import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAchievementToast, type UnlockedAchievement } from "../components/chrome/AchievementToastProvider.js";

export interface AuthUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  googleClientId: string | null;
  isLoading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useAchievementToast();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<{ user: AuthUser | null; googleClientId: string | null }>)
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setGoogleClientId(data.googleClientId);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (credential: string) => {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { user: AuthUser; unlockedAchievements?: UnlockedAchievement[] };
      setUser(data.user);
      notify(data.unlockedAchievements ?? []);
    },
    [notify]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, googleClientId, isLoading, login, logout }),
    [user, googleClientId, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
