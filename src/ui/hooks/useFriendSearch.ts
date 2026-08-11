import { useEffect, useState } from "react";

export type FriendStatus = "none" | "pending_outgoing" | "pending_incoming" | "friends";

export interface FriendSearchResult {
  userId: number;
  name: string;
  avatarUrl: string | null;
  friendStatus: FriendStatus;
}

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useFriendSearch(query: string): { results: FriendSearchResult[]; isLoading: boolean } {
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      fetch(`/api/friends/search?q=${encodeURIComponent(trimmed)}`)
        .then((response) => response.json() as Promise<FriendSearchResult[]>)
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  return { results, isLoading };
}
