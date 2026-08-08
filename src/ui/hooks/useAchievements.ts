import { useEffect, useState } from "react";

export interface AchievementStatus {
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  globalUnlockPercent: number;
}

export function useAchievements(): { achievements: AchievementStatus[] | null; isLoading: boolean } {
  const [achievements, setAchievements] = useState<AchievementStatus[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/achievements/me")
      .then((response) => response.json() as Promise<AchievementStatus[]>)
      .then((data) => {
        if (!cancelled) setAchievements(data);
      })
      .catch(() => {
        if (!cancelled) setAchievements([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { achievements, isLoading };
}
