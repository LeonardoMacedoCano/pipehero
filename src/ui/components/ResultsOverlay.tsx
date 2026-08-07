import styled from "styled-components";
import { Button } from "lcano-react-ui";
import type { GameState, Song } from "../../types.js";
import { LANDSCAPE_MEDIA_QUERY } from "../responsive.js";
import { computeStars } from "../../scoring/stars.js";

const MAX_STARS = 5;

export default function ResultsOverlay({
  song,
  results,
  onBack,
}: {
  song: Song;
  results: GameState;
  onBack: () => void;
}) {
  const totalNotes = results.totalNotes;
  const accuracy = totalNotes > 0 ? Math.round((results.hits.length / totalNotes) * 100) : 0;
  const perfectCount = results.hits.filter((hit) => hit.rating === "perfect").length;
  const goodCount = results.hits.filter((hit) => hit.rating === "good").length;
  const missCount = results.misses.length;
  const stars = computeStars(results.hits, totalNotes);

  return (
    <Backdrop>
      <Panel>
        <Header>
          {song.coverUrl ? <Cover src={song.coverUrl} alt="" /> : <CoverPlaceholder />}
          <HeaderText>
            <SongName>{song.name}</SongName>
            <SongArtist>{song.artist}</SongArtist>
          </HeaderText>
        </Header>

        <Score>{results.score}</Score>
        <ScoreLabel>Score</ScoreLabel>

        <Stars aria-label={`${stars} out of ${MAX_STARS} stars`}>
          {Array.from({ length: MAX_STARS }, (_, i) => (
            <Star key={i} $filled={i < stars}>
              ★
            </Star>
          ))}
        </Stars>

        <StatsGrid>
          <Stat>
            <StatValue>{results.maxCombo}</StatValue>
            <StatLabel>Max combo</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{accuracy}%</StatValue>
            <StatLabel>Accuracy</StatLabel>
          </Stat>
          <Stat>
            <StatValue $color="laneGreen">{perfectCount}</StatValue>
            <StatLabel>Perfect</StatLabel>
          </Stat>
          <Stat>
            <StatValue $color="laneBlue">{goodCount}</StatValue>
            <StatLabel>Good</StatLabel>
          </Stat>
          <Stat>
            <StatValue $color="laneRed">{missCount}</StatValue>
            <StatLabel>Miss</StatLabel>
          </Stat>
        </StatsGrid>

        <Button description="Back to menu" variant="secondary" onClick={onBack} />
      </Panel>
    </Backdrop>
  );
}

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.white};
  max-width: min(420px, 90vw);
  max-height: 90vh;
  overflow-y: auto;
  text-align: center;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    gap: 3px;
    padding: 12px 24px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    gap: 8px;
  }
`;

const HeaderText = styled.div`
  text-align: left;
`;

const Cover = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  background-color: ${({ theme }) => theme.colors.black};
  flex-shrink: 0;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    width: 40px;
    height: 40px;
  }
`;

const CoverPlaceholder = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.black};
  flex-shrink: 0;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    width: 40px;
    height: 40px;
  }
`;

const SongName = styled.h2`
  margin: 0;
  font-size: 1.1em;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    font-size: 0.95em;
  }
`;

const SongArtist = styled.div`
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.85em;
`;

const Score = styled.div`
  font-size: 2.4em;
  font-weight: bold;
  line-height: 1;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    font-size: 1.6em;
  }
`;

const ScoreLabel = styled.div`
  font-size: 0.8em;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.tertiary};
`;

const Stars = styled.div`
  font-size: 1.4em;
  letter-spacing: 2px;
  margin: 4px 0 8px;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    font-size: 1.1em;
    margin: 2px 0 4px;
  }
`;

const Star = styled.span<{ $filled: boolean }>`
  color: ${({ theme, $filled }) => ($filled ? theme.colors.quaternary : theme.colors.gray)};
`;

const StatsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  column-gap: 22px;
  row-gap: 12px;
  margin-bottom: 20px;

  @media ${LANDSCAPE_MEDIA_QUERY} {
    column-gap: 16px;
    row-gap: 4px;
    margin-bottom: 8px;
  }
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.div<{ $color?: "laneGreen" | "laneBlue" | "laneRed" }>`
  font-size: 1.1em;
  font-weight: bold;
  color: ${({ theme, $color }) => ($color ? theme.colors[$color] : theme.colors.white)};
`;

const StatLabel = styled.div`
  font-size: 0.72em;
  color: ${({ theme }) => theme.colors.tertiary};
`;
