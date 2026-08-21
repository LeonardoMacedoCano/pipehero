import { useEffect, useState } from "react";
import type { Difficulty } from "../../types.js";

export interface FeedEntry {
  userId: number;
  name: string;
  avatarUrl: string | null;
  equippedAvatarId: string | null;
  equippedBorderId: string | null;
  songId: string;
  difficulty: Difficulty;
  stars: number;
  achievedAt: string;
}

export function useFriendsFeed(): { feed: FeedEntry[]; isLoading: boolean } {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/friends/feed")
      .then((response) => response.json() as Promise<FeedEntry[]>)
      .then((data) => {
        if (!cancelled) setFeed(data);
      })
      .catch(() => {
        if (!cancelled) setFeed([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { feed, isLoading };
}
