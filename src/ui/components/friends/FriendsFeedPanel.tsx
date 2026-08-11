import { useState } from "react";
import { Loading, SearchPagination, Stack } from "lcano-react-ui";
import styled from "styled-components";
import { useFriendsFeed } from "../../hooks/useFriendsFeed.js";
import { useSongs } from "../../hooks/useSongs.js";
import { toPage } from "../../utils/paginate.js";

const FEED_PAGE_SIZE = 5;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FriendsFeedPanel() {
  const { feed, isLoading } = useFriendsFeed();
  const { songs } = useSongs();
  const songNameById = new Map((songs ?? []).map((song) => [song.id, song.name]));
  const [pageIndex, setPageIndex] = useState(0);
  const page = toPage(feed, pageIndex, FEED_PAGE_SIZE);

  return (
    <Stack direction="column" gap="10px">
      <Loading isLoading={isLoading} />
      {!isLoading && feed.length === 0 && <Muted>No activity yet — add a friend and start playing!</Muted>}
      {page.content.map((entry, index) => (
        <FeedRow key={`${entry.userId}-${entry.songId}-${entry.difficulty}-${index}`}>
          {entry.avatarUrl && <Avatar src={entry.avatarUrl} alt="" />}
          <FeedText>
            <strong>{entry.name}</strong> scored <StarsText>{entry.stars}★</StarsText> on{" "}
            <strong>{songNameById.get(entry.songId) ?? entry.songId}</strong> ({entry.difficulty})
          </FeedText>
          <FeedTime>{timeAgo(entry.achievedAt)}</FeedTime>
        </FeedRow>
      ))}
      {page.totalPages > 1 && <SearchPagination page={page} loadPage={(nextPageIndex) => setPageIndex(nextPageIndex)} />}
    </Stack>
  );
}

const Muted = styled.span`
  opacity: 0.6;
`;

const FeedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const FeedText = styled.span`
  flex: 1;
  min-width: 200px;
  color: ${({ theme }) => theme.colors.white};
`;

const StarsText = styled.span`
  color: ${({ theme }) => theme.colors.quaternary};
  font-weight: bold;
`;

const FeedTime = styled.span`
  flex-shrink: 0;
  font-size: 0.78em;
  opacity: 0.6;
  margin-left: auto;
`;
