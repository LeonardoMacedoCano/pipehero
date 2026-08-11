import styled from "styled-components";
import type { CompareRow, CompareWinner } from "../../hooks/useFriendCompare.js";

const STAR_COUNT = 5;

function StarLine({ label, stars, highlighted }: { label: string; stars: number | null; highlighted: boolean }) {
  return (
    <Line $highlighted={highlighted}>
      <LineLabel>{label}</LineLabel>
      {stars === null ? (
        <Muted>hasn't played this yet</Muted>
      ) : (
        <Stars>
          {Array.from({ length: STAR_COUNT }, (_, i) => (
            <Star key={i} $filled={i < stars}>
              ★
            </Star>
          ))}
        </Stars>
      )}
      {highlighted && <Trophy>🏆</Trophy>}
    </Line>
  );
}

function winnerNote(winner: CompareWinner): string | null {
  if (winner === "tie") return "Tied!";
  return null;
}

export default function CompareStarRow({ songName, row }: { songName: string; row: CompareRow }) {
  const note = winnerNote(row.winner);
  return (
    <Row>
      <RowHeader>
        <SongName title={songName}>{songName}</SongName>
        <Difficulty>{row.difficulty}</Difficulty>
        {note && <TieBadge>{note}</TieBadge>}
      </RowHeader>
      <StarLine label="You" stars={row.myStars} highlighted={row.winner === "me"} />
      <StarLine label="Them" stars={row.friendStars} highlighted={row.winner === "friend"} />
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 132px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  padding: 10px 14px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const RowHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
`;

const SongName = styled.span`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Difficulty = styled.span`
  flex-shrink: 0;
  font-size: 0.8em;
  opacity: 0.7;
`;

const TieBadge = styled.span`
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.78em;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.gray};
`;

const Line = styled.div<{ $highlighted: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: ${({ theme, $highlighted }) => ($highlighted ? theme.colors.quaternary : "transparent")};
`;

const LineLabel = styled.span`
  min-width: 3.4em;
  font-size: 0.82em;
  opacity: 0.85;
`;

const Stars = styled.span`
  letter-spacing: 1px;
`;

const Star = styled.span<{ $filled: boolean }>`
  opacity: ${({ $filled }) => ($filled ? 1 : 0.3)};
`;

const Trophy = styled.span`
  margin-left: auto;
`;

const Muted = styled.span`
  opacity: 0.6;
  font-size: 0.85em;
`;
