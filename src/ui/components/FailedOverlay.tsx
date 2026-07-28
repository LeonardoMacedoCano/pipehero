import styled from "styled-components";
import { Button } from "lcano-react-ui";
import type { GameState, Song } from "../../types.js";

export default function FailedOverlay({
  song,
  results,
  onBack,
  onRetry,
}: {
  song: Song;
  results: GameState;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <Backdrop>
      <Panel>
        <BooedTitle>Booed off stage!</BooedTitle>
        <SongName>{song.name}</SongName>
        <SongArtist>{song.artist}</SongArtist>

        <Score>{results.score}</Score>
        <ScoreLabel>Score</ScoreLabel>

        <Message>The crowd lost patience. Give it another shot.</Message>

        <Actions>
          <Button description="Try again" variant="primary" onClick={onRetry} />
          <Button description="Back to menu" variant="secondary" onClick={onBack} />
        </Actions>
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
  border: 1px solid ${({ theme }) => theme.colors.warning};
  box-shadow: 0 0 30px rgba(232, 68, 60, 0.3);
  color: ${({ theme }) => theme.colors.white};
  max-width: min(420px, 90vw);
  text-align: center;
`;

const BooedTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 1.3em;
  color: ${({ theme }) => theme.colors.warning};
`;

const SongName = styled.div`
  font-weight: bold;
`;

const SongArtist = styled.div`
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.9em;
  margin-bottom: 12px;
`;

const Score = styled.div`
  font-size: 2.2em;
  font-weight: bold;
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: 0.8em;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-bottom: 12px;
`;

const Message = styled.div`
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-bottom: 20px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
`;
