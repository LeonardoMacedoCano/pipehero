import { useEffect, useState } from "react";
import type { Difficulty } from "../../types.js";

export type ScoresBySong = Map<string, Partial<Record<Difficulty, number>>>;

interface ScoreEntry {
  songId: string;
  difficulty: Difficulty;
  stars: number;
}

export function useScores(): { scoresBySong: ScoresBySong; isLoading: boolean } {
  const [scoresBySong, setScoresBySong] = useState<ScoresBySong>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/scores/me")
      .then((response) => response.json() as Promise<ScoreEntry[]>)
      .then((entries) => {
        if (cancelled) return;
        const bySong: ScoresBySong = new Map();
        for (const entry of entries) {
          const forSong = bySong.get(entry.songId) ?? {};
          forSong[entry.difficulty] = entry.stars;
          bySong.set(entry.songId, forSong);
        }
        setScoresBySong(bySong);
      })
      .catch(() => {
        if (!cancelled) setScoresBySong(new Map());
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { scoresBySong, isLoading };
}
