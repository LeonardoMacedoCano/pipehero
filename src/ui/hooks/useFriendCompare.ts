import { useEffect, useState } from "react";
import type { Difficulty } from "../../types.js";
import { useAchievementToast, type UnlockedAchievement } from "../components/chrome/AchievementToastProvider.js";

export type CompareWinner = "me" | "friend" | "tie" | "unplayed";

export interface CompareRow {
  songId: string;
  difficulty: Difficulty;
  myStars: number | null;
  friendStars: number | null;
  winner: CompareWinner;
}

export interface CompareData {
  friend: { id: number; name: string; avatarUrl: string | null };
  myWeightedScore: number;
  friendWeightedScore: number;
  rows: CompareRow[];
  distribution: { me: Record<Difficulty, number[]>; friend: Record<Difficulty, number[]> };
  unlockedAchievements: UnlockedAchievement[];
}

export function useFriendCompare(friendId: number): { compare: CompareData | null; isLoading: boolean } {
  const [compare, setCompare] = useState<CompareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useAchievementToast();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/friends/${friendId}/compare`)
      .then((response) => response.json() as Promise<CompareData>)
      .then((data) => {
        if (cancelled) return;
        setCompare(data);
        notify(data.unlockedAchievements ?? []);
      })
      .catch(() => {
        if (!cancelled) setCompare(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [friendId, notify]);

  return { compare, isLoading };
}
