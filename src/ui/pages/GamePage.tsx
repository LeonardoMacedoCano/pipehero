import { useEffect, useMemo } from "react";
import type { ParsedChart } from "parsehero";
import styled, { ThemeProvider, css } from "styled-components";
import { Button } from "lcano-react-ui";
import type { Difficulty, Song } from "../../types.js";
import { loadTrack } from "../../engine/chartTrack.js";
import { trackNameForDifficulty } from "../../engine/availableTracks.js";
import { extractStarPowerPhrases, synthesizeStarPowerPhrases } from "../../engine/starPower.js";
import { computeStars } from "../../scoring/stars.js";
import { useGamePlaythrough } from "../hooks/useGamePlaythrough.js";
import { pipeHeroTheme, starPowerTheme } from "../theme.js";
import GameCanvas from "../components/GameCanvas.js";
import ScoreBox from "../components/ScoreBox.js";
import PowerGauge from "../components/PowerGauge.js";
import ResultsOverlay from "../components/ResultsOverlay.js";
import FailedOverlay from "../components/FailedOverlay.js";
import { FRAME_WIDTH, cylinderGradientVertical } from "../components/IronPipeFrame.js";

function submitScore(songId: string, difficulty: Difficulty, stars: number, fullCombo: boolean): void {
  fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songId, difficulty, stars, fullCombo }),
  }).catch(() => {});
}

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
    const fromChart = extractStarPowerPhrases(chart[trackName], chart.Song.resolution, chart.SyncTrack.bpms);
    return fromChart.length > 0 ? fromChart : synthesizeStarPowerPhrases(notes);
  }, [chart, difficulty, notes]);

  const chartOffsetSeconds = chart.Song.offset ?? 0;

  const { canvasRef, audioRef, hud, needsTapToStart, phase, results, start } = useGamePlaythrough({
    notes,
    chartOffsetSeconds,
    starPowerPhrases,
    difficulty,
  });

  useEffect(() => {
    if (phase !== "results" || !results) return;
    const stars = computeStars(results.hits, results.totalNotes);
    const fullCombo = results.misses.length === 0 && results.droppedSustains.length === 0 && results.totalNotes > 0;
    submitScore(song.id, difficulty, stars, fullCombo);
  }, [phase, results, song.id, difficulty]);

  return (
    <Screen>
      <TopBar>
        <Title>{song.name}</Title>
        <Button description="« Change song" variant="secondary" onClick={onBack} />
      </TopBar>

      <CanvasArea>
        <GameCanvas canvasRef={canvasRef} />

        {phase === "playing" && (
          <ThemeProvider theme={hud.starPowerActive ? starPowerTheme : pipeHeroTheme}>
            <ScoreBoxOverlay>
              <ScoreBox score={hud.score} combo={hud.combo} multiplier={hud.multiplier} starPowerActive={hud.starPowerActive} />
            </ScoreBoxOverlay>
            <PowerGaugeOverlay>
              <PowerGauge
                rockMeter={hud.rockMeter}
                starPowerMeter={hud.starPowerMeter}
                starPowerActive={hud.starPowerActive}
                starPowerGainNonce={hud.starPowerGainNonce}
              />
            </PowerGaugeOverlay>
            {needsTapToStart && <TapToStartOverlay onClick={start}>Tap to start</TapToStartOverlay>}
          </ThemeProvider>
        )}

        {phase === "results" && results && <ResultsOverlay song={song} results={results} onBack={onBack} />}
        {phase === "failed" && results && <FailedOverlay song={song} results={results} onBack={onBack} onRetry={start} />}

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

const HUD_OVERLAY_MARGIN = 20;
const HUD_OVERLAY_GAP = 20;
const TABLET_BREAKPOINT = 700;
const MOBILE_BREAKPOINT = 480;
const MIN_SUPPORTED_VIEWPORT_WIDTH = 360;

function hudScaleForViewport(viewportWidth: number): number {
  const available = viewportWidth - HUD_OVERLAY_MARGIN * 2 - HUD_OVERLAY_GAP;
  return Math.min(1, available / (2 * FRAME_WIDTH));
}

const TABLET_HUD_SCALE = hudScaleForViewport(MOBILE_BREAKPOINT + 1);
const MOBILE_HUD_SCALE = hudScaleForViewport(MIN_SUPPORTED_VIEWPORT_WIDTH);

const hudResponsiveScale = css`
  @media (max-width: ${TABLET_BREAKPOINT}px) {
    transform: scale(${TABLET_HUD_SCALE});
  }

  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    transform: scale(${MOBILE_HUD_SCALE});
  }
`;

const TopBar = styled.div`
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px 15px;
  background: ${({ theme }) => theme.colors.primary};

  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 5px;
    background: ${({ theme }) => cylinderGradientVertical(theme)};
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(0, 0, 0, 0.5);
  }

  @media (max-width: 480px) {
    padding: 8px 12px 13px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.05em;
  color: ${({ theme }) => theme.colors.white};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 480px) {
    font-size: 0.9em;
  }
`;

const CanvasArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
`;

const ScoreBoxOverlay = styled.div`
  position: absolute;
  top: 0;
  left: ${HUD_OVERLAY_MARGIN}px;
  pointer-events: none;
  transform-origin: top left;
  ${hudResponsiveScale}
`;

const PowerGaugeOverlay = styled.div`
  position: absolute;
  top: 0;
  right: ${HUD_OVERLAY_MARGIN}px;
  pointer-events: none;
  transform-origin: top right;
  ${hudResponsiveScale}
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
