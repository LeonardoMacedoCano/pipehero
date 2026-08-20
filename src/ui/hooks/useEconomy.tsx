import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth.js";
import { useCoinsToast } from "../components/chrome/CoinsToast.js";

export interface EconomyMission {
  code: string;
  name: string;
  description: string;
  icon: string;
  rewardCoins: number;
  completed: boolean;
}

interface EconomySnapshot {
  coins: number;
  currentStreak: number;
  longestStreak: number;
  streakGraceAvailable: boolean;
  missionsToday: EconomyMission[];
  allClearBonusCoins: number;
  allClearCompletedToday: boolean;
}

interface CheckinResponse extends EconomySnapshot {
  streakCoinsAwardedNow: number;
  streakSaved: boolean;
  milestoneHit: number | null;
}

export interface ScoreEconomyResult {
  coins: number;
  coinsAwarded: number;
  completedMissions: Array<{ code: string; name: string; description: string; icon: string; rewardCoins: number }>;
  allClearBonusAwarded: boolean;
}

interface EconomyContextValue extends EconomySnapshot {
  isLoading: boolean;
  applyScoreEconomyResult: (result: ScoreEconomyResult) => void;
}

const EMPTY_SNAPSHOT: EconomySnapshot = {
  coins: 0,
  currentStreak: 0,
  longestStreak: 0,
  streakGraceAvailable: true,
  missionsToday: [],
  allClearBonusCoins: 0,
  allClearCompletedToday: false,
};

const EconomyContext = createContext<EconomyContextValue | undefined>(undefined);

export function EconomyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useCoinsToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [snapshot, setSnapshot] = useState<EconomySnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setSnapshot(EMPTY_SNAPSHOT);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch("/api/economy/checkin", { method: "POST" })
      .then((response) => response.json() as Promise<CheckinResponse>)
      .then((data) => {
        if (cancelled) return;
        setSnapshot({
          coins: data.coins,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          streakGraceAvailable: data.streakGraceAvailable,
          missionsToday: data.missionsToday,
          allClearBonusCoins: data.allClearBonusCoins,
          allClearCompletedToday: data.allClearCompletedToday,
        });
        if (data.streakCoinsAwardedNow > 0) {
          toastRef.current.notifyStreak(data.streakCoinsAwardedNow, data.currentStreak, data.streakSaved, data.milestoneHit);
        }
      })
      .catch(() => {
        if (!cancelled) setSnapshot(EMPTY_SNAPSHOT);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const applyScoreEconomyResult = useCallback((result: ScoreEconomyResult) => {
    setSnapshot((prev) => {
      const completedCodes = new Set(result.completedMissions.map((mission) => mission.code));
      return {
        ...prev,
        coins: result.coins,
        missionsToday: prev.missionsToday.map((mission) =>
          completedCodes.has(mission.code) ? { ...mission, completed: true } : mission
        ),
        allClearCompletedToday: prev.allClearCompletedToday || result.allClearBonusAwarded,
      };
    });
    if (result.completedMissions.length > 0) toastRef.current.notifyMissions(result.completedMissions);
  }, []);

  const value = useMemo(
    () => ({ ...snapshot, isLoading, applyScoreEconomyResult }),
    [snapshot, isLoading, applyScoreEconomyResult]
  );

  return <EconomyContext.Provider value={value}>{children}</EconomyContext.Provider>;
}

export function useEconomy(): EconomyContextValue {
  const context = useContext(EconomyContext);
  if (!context) {
    throw new Error("useEconomy must be used within an <EconomyProvider>");
  }
  return context;
}
