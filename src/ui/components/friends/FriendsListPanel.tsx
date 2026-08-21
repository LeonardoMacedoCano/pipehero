import { useState } from "react";
import { Button, HighlightBox, Loading, Stack } from "lcano-react-ui";
import styled from "styled-components";
import { useFriends } from "../../hooks/useFriends.js";
import { useFriendSearch, type FriendSearchResult } from "../../hooks/useFriendSearch.js";
import { useAchievementToast, type UnlockedAchievement } from "../chrome/AchievementToastProvider.js";
import AvatarBadge from "../chrome/AvatarBadge.js";

interface FriendMutationResponse {
  ok: boolean;
  unlockedAchievements?: UnlockedAchievement[];
}

export default function FriendsListPanel({
  onOpenProfile,
  onCompare,
}: {
  onOpenProfile: (friendId: number, friendName: string) => void;
  onCompare: (friendId: number, friendName: string) => void;
}) {
  const { friends, incoming, outgoing, isLoading, refetch } = useFriends();
  const [query, setQuery] = useState("");
  const { results, isLoading: isSearching } = useFriendSearch(query);
  const { notify } = useAchievementToast();

  async function sendRequest(friendUserId: number) {
    const response = await fetch("/api/friends/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId }),
    });
    const data = (await response.json()) as FriendMutationResponse;
    notify(data.unlockedAchievements ?? []);
    setQuery("");
    refetch();
  }

  async function acceptRequest(requestId: number) {
    const response = await fetch(`/api/friends/requests/${requestId}/accept`, { method: "POST" });
    const data = (await response.json()) as FriendMutationResponse;
    notify(data.unlockedAchievements ?? []);
    refetch();
  }

  async function declineRequest(requestId: number) {
    await fetch(`/api/friends/requests/${requestId}/decline`, { method: "POST" });
    refetch();
  }

  async function unfriend(friendId: number) {
    await fetch(`/api/friends/${friendId}`, { method: "DELETE" });
    refetch();
  }

  return (
    <Stack direction="column" gap="20px">
      <Section>
        <SearchInput
          type="text"
          placeholder="Search by name or email…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {isSearching && <Muted>Searching…</Muted>}
        {results.length > 0 && (
          <ResultsList>
            {results.map((result) => (
              <SearchResultRow key={result.userId} result={result} onAdd={() => sendRequest(result.userId)} />
            ))}
          </ResultsList>
        )}
      </Section>

      <Loading isLoading={isLoading} />

      {incoming.length > 0 && (
        <Section>
          <SectionTitle>Pending requests</SectionTitle>
          {incoming.map((request) => (
            <FriendRow key={request.requestId}>
              <AvatarBadge equippedAvatarId={request.equippedAvatarId} equippedBorderId={request.equippedBorderId} size={32} />
              <RowName>{request.name}</RowName>
              <Stack direction="row" gap="6px" width="auto" wrap>
                <Button description="Accept" variant="quaternary" width="auto" onClick={() => acceptRequest(request.requestId)} />
                <Button description="Decline" variant="secondary" width="auto" onClick={() => declineRequest(request.requestId)} />
              </Stack>
            </FriendRow>
          ))}
        </Section>
      )}

      {outgoing.length > 0 && (
        <Section>
          <SectionTitle>Sent requests</SectionTitle>
          {outgoing.map((request) => (
            <FriendRow key={request.requestId}>
              <AvatarBadge equippedAvatarId={request.equippedAvatarId} equippedBorderId={request.equippedBorderId} size={32} />
              <RowName>{request.name}</RowName>
              <Stack direction="row" gap="6px" width="auto" wrap>
                <HighlightBox variant="secondary" width="auto" style={{ padding: "4px 10px" }}>
                  Pending
                </HighlightBox>
                <Button description="Cancel" variant="secondary" width="auto" onClick={() => declineRequest(request.requestId)} />
              </Stack>
            </FriendRow>
          ))}
        </Section>
      )}

      <Section>
        <SectionTitle>Your friends ({friends.length})</SectionTitle>
        {friends.length === 0 ? (
          <Muted>No friends yet — search above to add one.</Muted>
        ) : (
          friends.map((friend) => (
            <FriendRow key={friend.friendId}>
              <AvatarBadge equippedAvatarId={friend.equippedAvatarId} equippedBorderId={friend.equippedBorderId} size={32} />
              <RowName>{friend.name}</RowName>
              <Stack direction="row" gap="6px" width="auto" wrap>
                <Button
                  description="Profile"
                  variant="secondary"
                  width="auto"
                  onClick={() => onOpenProfile(friend.friendId, friend.name)}
                />
                <Button description="Compare" variant="quaternary" width="auto" onClick={() => onCompare(friend.friendId, friend.name)} />
                <Button description="Unfriend" variant="secondary" width="auto" onClick={() => unfriend(friend.friendId)} />
              </Stack>
            </FriendRow>
          ))
        )}
      </Section>
    </Stack>
  );
}

function SearchResultRow({ result, onAdd }: { result: FriendSearchResult; onAdd: () => void }) {
  return (
    <FriendRow>
      <AvatarBadge equippedAvatarId={result.equippedAvatarId} equippedBorderId={result.equippedBorderId} size={32} />
      <RowName>{result.name}</RowName>
      {result.friendStatus === "friends" && (
        <HighlightBox variant="quaternary" width="auto" style={{ padding: "4px 10px" }}>
          Already friends
        </HighlightBox>
      )}
      {result.friendStatus === "pending_outgoing" && (
        <HighlightBox variant="secondary" width="auto" style={{ padding: "4px 10px" }}>
          Pending
        </HighlightBox>
      )}
      {result.friendStatus === "pending_incoming" && (
        <HighlightBox variant="secondary" width="auto" style={{ padding: "4px 10px" }}>
          Wants to add you
        </HighlightBox>
      )}
      {result.friendStatus === "none" && <Button description="Add" variant="quaternary" width="auto" onClick={onAdd} />}
    </FriendRow>
  );
}

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionTitle = styled.h3`
  font-size: 1em;
  color: ${({ theme }) => theme.colors.white};
  margin: 0;
`;

const Muted = styled.span`
  opacity: 0.6;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  background-color: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.white};

  &::placeholder {
    color: ${({ theme }) => theme.colors.tertiary};
  }
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FriendRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const RowName = styled.span`
  flex: 1 1 140px;
  min-width: 0;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
