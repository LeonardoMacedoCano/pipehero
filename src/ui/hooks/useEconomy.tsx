import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth.js";
import { useCoinsToast } from "../components/chrome/CoinsToast.js";

export interface MissionProgress {
  current: number;
  target: number;
}

export interface EconomyMission {
  code: string;
  name: string;
  description: string;
  icon: string;
  rewardCoins: number;
  completed: boolean;
  progress: MissionProgress | null;
}

export interface EconomyWeeklyMission extends EconomyMission {
  tier: "small" | "medium" | "large";
}

interface EconomySnapshot {
  timeZone: string;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  streakGraceAvailable: boolean;
  missionsToday: EconomyMission[];
  allClearBonusCoins: number;
  allClearCompletedToday: boolean;
  missionsThisWeek: EconomyWeeklyMission[];
  weeklyAllClearBonusCoins: number;
  weeklyAllClearCompletedThisWeek: boolean;
}

interface CheckinResponse extends EconomySnapshot {
  streakCoinsAwardedNow: number;
  streakSaved: boolean;
  milestoneHit: number | null;
}

export interface DailyLoginModalData {
  coinsAwarded: number;
  currentStreak: number;
  longestStreak: number;
  streakSaved: boolean;
  milestoneHit: number | null;
  graceAvailable: boolean;
}

export interface ScoreEconomyResult {
  coins: number;
  coinsAwarded: number;
  completedMissions: Array<{ code: string; name: string; description: string; icon: string; rewardCoins: number }>;
  allClearBonusAwarded: boolean;
  dailyMissionProgress: Array<{ code: string; progress: MissionProgress | null }>;
  completedWeeklyMissions: Array<{ code: string; name: string; description: string; icon: string; rewardCoins: number }>;
  weeklyAllClearBonusAwarded: boolean;
  weeklyMissionProgress: Array<{ code: string; progress: MissionProgress | null }>;
}

interface EconomyContextValue extends EconomySnapshot {
  isLoading: boolean;
  applyScoreEconomyResult: (result: ScoreEconomyResult) => void;
  setCoinsBalance: (coins: number) => void;
  dailyLoginModal: DailyLoginModalData | null;
  dismissDailyLoginModal: () => void;
}

const EMPTY_SNAPSHOT: EconomySnapshot = {
  timeZone: "UTC",
  coins: 0,
  currentStreak: 0,
  longestStreak: 0,
  streakGraceAvailable: true,
  missionsToday: [],
  allClearBonusCoins: 0,
  allClearCompletedToday: false,
  missionsThisWeek: [],
  weeklyAllClearBonusCoins: 0,
  weeklyAllClearCompletedThisWeek: false,
};

const EconomyContext = createContext<EconomyContextValue | undefined>(undefined);

export function EconomyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useCoinsToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [snapshot, setSnapshot] = useState<EconomySnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyLoginModal, setDailyLoginModal] = useState<DailyLoginModalData | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    fetch("/api/economy/checkin", { method: "POST" })
      .then((response) => response.json() as Promise<CheckinResponse>)
      .then((data) => {
        if (cancelled) return;
        setSnapshot({
          timeZone: data.timeZone,
          coins: data.coins,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          streakGraceAvailable: data.streakGraceAvailable,
          missionsToday: data.missionsToday,
          allClearBonusCoins: data.allClearBonusCoins,
          allClearCompletedToday: data.allClearCompletedToday,
          missionsThisWeek: data.missionsThisWeek,
          weeklyAllClearBonusCoins: data.weeklyAllClearBonusCoins,
          weeklyAllClearCompletedThisWeek: data.weeklyAllClearCompletedThisWeek,
        });
        if (data.streakCoinsAwardedNow > 0) {
          toastRef.current.notifyStreak(data.streakCoinsAwardedNow, data.currentStreak, data.streakSaved, data.milestoneHit);
          setDailyLoginModal({
            coinsAwarded: data.streakCoinsAwardedNow,
            currentStreak: data.currentStreak,
            longestStreak: data.longestStreak,
            streakSaved: data.streakSaved,
            milestoneHit: data.milestoneHit,
            graceAvailable: data.streakGraceAvailable,
          });
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
      const dailyProgressByCode = new Map(result.dailyMissionProgress.map((entry) => [entry.code, entry.progress]));
      const completedWeeklyCodes = new Set(result.completedWeeklyMissions.map((mission) => mission.code));
      const weeklyProgressByCode = new Map(result.weeklyMissionProgress.map((entry) => [entry.code, entry.progress]));
      return {
        ...prev,
        coins: result.coins,
        missionsToday: prev.missionsToday.map((mission) => {
          const progress = dailyProgressByCode.get(mission.code);
          return {
            ...mission,
            completed: mission.completed || completedCodes.has(mission.code),
            progress: progress !== undefined ? progress : mission.progress,
          };
        }),
        allClearCompletedToday: prev.allClearCompletedToday || result.allClearBonusAwarded,
        missionsThisWeek: prev.missionsThisWeek.map((mission) => {
          const progress = weeklyProgressByCode.get(mission.code);
          return {
            ...mission,
            completed: mission.completed || completedWeeklyCodes.has(mission.code),
            progress: progress !== undefined ? progress : mission.progress,
          };
        }),
        weeklyAllClearCompletedThisWeek: prev.weeklyAllClearCompletedThisWeek || result.weeklyAllClearBonusAwarded,
      };
    });
    if (result.completedMissions.length > 0) toastRef.current.notifyMissions(result.completedMissions);
    if (result.completedWeeklyMissions.length > 0) {
      toastRef.current.notifyMissions(result.completedWeeklyMissions, "Weekly Mission Complete");
    }
  }, []);

  const setCoinsBalance = useCallback((coins: number) => {
    setSnapshot((prev) => ({ ...prev, coins }));
  }, []);

  const dismissDailyLoginModal = useCallback(() => {
    setDailyLoginModal(null);
  }, []);

  const value = useMemo(
    () => ({ ...snapshot, isLoading, applyScoreEconomyResult, setCoinsBalance, dailyLoginModal, dismissDailyLoginModal }),
    [snapshot, isLoading, applyScoreEconomyResult, setCoinsBalance, dailyLoginModal, dismissDailyLoginModal]
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
