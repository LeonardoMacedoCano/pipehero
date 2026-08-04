import { useCallback, useEffect, useState } from "react";

export interface AuthUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

export function useAuth(): {
  user: AuthUser | null;
  googleClientId: string | null;
  isLoading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
} {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = useCallback(async (credential: string) => {
    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return { user, googleClientId, isLoading, login, logout };
}
