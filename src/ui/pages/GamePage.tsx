import { useMemo } from "react";
import type { ParsedChart } from "parsehero";
import styled from "styled-components";
import { Button } from "lcano-react-ui";
import type { Difficulty, Song } from "../../types.js";
import { loadTrack } from "../../engine/chartTrack.js";
import { trackNameForDifficulty } from "../../engine/availableTracks.js";
import { extractStarPowerPhrases } from "../../engine/starPower.js";
import { useGamePlaythrough } from "../hooks/useGamePlaythrough.js";
import GameCanvas from "../components/GameCanvas.js";
import StarPowerBar from "../components/StarPowerBar.js";

export default function GamePage({
  song,
  chart,
  difficulty,
  onBack,
}: {
  song: Song;
  chart: ParsedChart;
  difficulty: Difficulty;
  onBack: () => void;
}) {
  const notes = useMemo(() => loadTrack(chart, trackNameForDifficulty(difficulty)), [chart, difficulty]);

  const starPowerPhrases = useMemo(() => {
    const trackName = trackNameForDifficulty(difficulty);
    return extractStarPowerPhrases(chart[trackName], chart.Song.resolution, chart.SyncTrack.bpms);
  }, [chart, difficulty]);

  const chartOffsetSeconds = chart.Song.offset ?? 0;

  const { canvasRef, audioRef, hud, needsTapToStart, start } = useGamePlaythrough({
    notes,
    chartOffsetSeconds,
    starPowerPhrases,
    difficulty,
  });

  return (
    <Screen>
      <TopBar>
        <Title>{song.name}</Title>
        <Button description="« Change song" variant="secondary" onClick={onBack} />
      </TopBar>

      <CanvasArea>
        <GameCanvas canvasRef={canvasRef} />

        <ScoreOverlay>{hud.score}</ScoreOverlay>
        <StarPowerOverlay>
          <StarPowerBar meter={hud.starPowerMeter} active={hud.starPowerActive} />
        </StarPowerOverlay>

        {needsTapToStart && <TapToStartOverlay onClick={start}>Tap to start</TapToStartOverlay>}

        <audio ref={audioRef} src={song.audioUrl ?? ""} preload="auto" />
      </CanvasArea>
    </Screen>
  );
}

const Screen = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.black};
`;

const TopBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.colors.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.05em;
  color: ${({ theme }) => theme.colors.white};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CanvasArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
`;

const ScoreOverlay = styled.div`
  position: absolute;
  top: 16px;
  left: 20px;
  font-size: 2.2em;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  pointer-events: none;
`;

const StarPowerOverlay = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  width: min(260px, 32vw);
  pointer-events: none;
`;

const TapToStartOverlay = styled.button`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  color: ${({ theme }) => theme.colors.white};
  font-size: 1.4em;
  border: none;
  cursor: pointer;
`;
