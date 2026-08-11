import { useEffect, useState } from "react";
import type { Difficulty } from "../../types.js";
import type { AchievementStatus } from "./useAchievements.js";

export interface FriendProfileScore {
  songId: string;
  difficulty: Difficulty;
  stars: number;
  achievedAt: string;
}

export interface FriendProfile {
  friend: { id: number; name: string; avatarUrl: string | null };
  scores: FriendProfileScore[];
  achievements: AchievementStatus[];
}

export function useFriendProfile(friendId: number): { profile: FriendProfile | null; isLoading: boolean } {
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/friends/${friendId}/profile`)
      .then((response) => response.json() as Promise<FriendProfile>)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [friendId]);

  return { profile, isLoading };
}
