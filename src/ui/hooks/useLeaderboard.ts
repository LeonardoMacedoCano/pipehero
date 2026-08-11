import { useEffect, useState } from "react";

export interface LeaderboardEntry {
  userId: number;
  name: string;
  avatarUrl: string | null;
  weightedScore: number;
  rank: number;
  isMe: boolean;
}

export type LeaderboardScope = "global" | "friends";

export function useLeaderboard(scope: LeaderboardScope): { leaderboard: LeaderboardEntry[]; isLoading: boolean } {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/leaderboard/${scope}`)
      .then((response) => response.json() as Promise<LeaderboardEntry[]>)
      .then((data) => {
        if (!cancelled) setLeaderboard(data);
      })
      .catch(() => {
        if (!cancelled) setLeaderboard([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope]);

  return { leaderboard, isLoading };
}
