import { useEffect, useState } from "react";
import type { Song } from "../../types.js";

export function useSongs(): { songs: Song[] | null; error: Error | null; isLoading: boolean } {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/songs")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Song[]>;
      })
      .then((data) => {
        if (!cancelled) setSongs(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { songs, error, isLoading: songs === null && error === null };
}
