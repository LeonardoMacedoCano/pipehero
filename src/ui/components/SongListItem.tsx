import styled from "styled-components";
import type { Difficulty, Song } from "../../types.js";
import DifficultyStars from "./DifficultyStars.js";

export default function SongListItem({
  song,
  stars,
  onSelect,
}: {
  song: Song;
  stars?: Partial<Record<Difficulty, number>>;
  onSelect: (song: Song) => void;
}) {
  const metaParts = [song.artist, song.genre].filter(Boolean);
  if (song.album) metaParts.push(song.album);

  return (
    <Card type="button" onClick={() => onSelect(song)}>
      {song.coverUrl ? (
        <Cover src={song.coverUrl} alt="" />
      ) : (
        <CoverPlaceholder />
      )}
      <Info>
        <Name>{song.name}</Name>
        <Meta>{metaParts.join(" — ")}</Meta>
      </Info>
      <DifficultyStars stars={stars} />
    </Card>
  );
}

const Card = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  font: inherit;

  &:hover {
    border-color: ${({ theme }) => theme.colors.quaternary};
  }
`;

const Cover = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.colors.black};
`;

const CoverPlaceholder = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 6px;
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.colors.black};
`;

const Info = styled.div`
  min-width: 0;
  flex: 1;
`;

const Name = styled.div`
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Meta = styled.div`
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.85em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
