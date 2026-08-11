import { useCallback, useEffect, useState } from "react";

export interface FriendRequestEntry {
  requestId: number;
  friendId: number;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface FriendEntry {
  friendId: number;
  name: string;
  avatarUrl: string | null;
  friendsSince: string;
}

interface FriendRequestsResponse {
  incoming: FriendRequestEntry[];
  outgoing: FriendRequestEntry[];
}

export function useFriends(): {
  friends: FriendEntry[];
  incoming: FriendRequestEntry[];
  outgoing: FriendRequestEntry[];
  isLoading: boolean;
  refetch: () => void;
} {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      fetch("/api/friends").then((response) => response.json() as Promise<FriendEntry[]>),
      fetch("/api/friends/requests").then((response) => response.json() as Promise<FriendRequestsResponse>),
    ])
      .then(([friendsData, requestsData]) => {
        if (cancelled) return;
        setFriends(friendsData);
        setIncoming(requestsData.incoming);
        setOutgoing(requestsData.outgoing);
      })
      .catch(() => {
        if (!cancelled) {
          setFriends([]);
          setIncoming([]);
          setOutgoing([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { friends, incoming, outgoing, isLoading, refetch };
}
