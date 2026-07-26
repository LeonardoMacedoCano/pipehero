import styled from "styled-components";
import { Button } from "lcano-react-ui";
import type { GameState, Song } from "../../types.js";

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

  return (
    <Backdrop>
      <Panel>
        {song.coverUrl ? <Cover src={song.coverUrl} alt="" /> : <CoverPlaceholder />}
        <SongName>{song.name}</SongName>
        <SongArtist>{song.artist}</SongArtist>

        <Score>{results.score}</Score>
        <ScoreLabel>Score</ScoreLabel>

        <StatsRow>
          <Stat>
            <StatValue>{results.maxCombo}</StatValue>
            <StatLabel>Max combo</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{accuracy}%</StatValue>
            <StatLabel>Accuracy</StatLabel>
          </Stat>
        </StatsRow>

        <RatingsRow>
          <Rating>
            <RatingValue $color="laneGreen">{perfectCount}</RatingValue>
            <RatingLabel>Perfect</RatingLabel>
          </Rating>
          <Rating>
            <RatingValue $color="laneBlue">{goodCount}</RatingValue>
            <RatingLabel>Good</RatingLabel>
          </Rating>
          <Rating>
            <RatingValue $color="laneRed">{missCount}</RatingValue>
            <RatingLabel>Miss</RatingLabel>
          </Rating>
        </RatingsRow>

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
  gap: 6px;
  padding: 32px 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.white};
  max-width: min(420px, 90vw);
  text-align: center;
`;

const Cover = styled.img`
  width: 72px;
  height: 72px;
  border-radius: 8px;
  object-fit: cover;
  background-color: ${({ theme }) => theme.colors.black};
  margin-bottom: 8px;
`;

const CoverPlaceholder = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.black};
  margin-bottom: 8px;
`;

const SongName = styled.h2`
  margin: 0;
  font-size: 1.2em;
`;

const SongArtist = styled.div`
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.9em;
  margin-bottom: 12px;
`;

const Score = styled.div`
  font-size: 2.6em;
  font-weight: bold;
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: 0.8em;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-bottom: 18px;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 32px;
  margin-bottom: 18px;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.div`
  font-size: 1.3em;
  font-weight: bold;
`;

const StatLabel = styled.div`
  font-size: 0.75em;
  color: ${({ theme }) => theme.colors.tertiary};
`;

const RatingsRow = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
`;

const Rating = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RatingValue = styled.div<{ $color: "laneGreen" | "laneBlue" | "laneRed" }>`
  font-size: 1.1em;
  font-weight: bold;
  color: ${({ theme, $color }) => theme.colors[$color]};
`;

const RatingLabel = styled.div`
  font-size: 0.75em;
  color: ${({ theme }) => theme.colors.tertiary};
`;
