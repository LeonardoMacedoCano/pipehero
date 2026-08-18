import { useEffect, useMemo } from "react";
import type { ParsedChart } from "parsehero";
import styled, { ThemeProvider, css } from "styled-components";
import { Button, useMediaQuery } from "lcano-react-ui";
import type { Difficulty, Song } from "../../types.js";
import { loadTrack } from "../../engine/chartTrack.js";
import { trackNameForDifficulty } from "../../engine/availableTracks.js";
import { extractStarPowerPhrases, synthesizeStarPowerPhrases } from "../../engine/starPower.js";
import { computeStars } from "../../scoring/stars.js";
import { useGamePlaythrough } from "../hooks/useGamePlaythrough.js";
import { useAchievementToast, type UnlockedAchievement } from "../components/chrome/AchievementToastProvider.js";
import { useControlScheme } from "../hooks/useControlScheme.js";
import { useThemeControl } from "../contexts/theme/ThemeControlProvider.js";
import { getStrumModeEnabled } from "../../game/strumModeStore.js";
import { HIT_LINE_Y_RATIO, TOUCH_HIT_LINE_Y_RATIO_LANDSCAPE, TOUCH_HIT_LINE_Y_RATIO_PORTRAIT } from "../../render/layout.js";
import { LANDSCAPE_HEIGHT_BREAKPOINT, LANDSCAPE_MEDIA_QUERY } from "../responsive.js";
import GameCanvas from "../components/GameCanvas.js";
import ScoreBox from "../components/ScoreBox.js";
import PowerGauge from "../components/PowerGauge.js";
import TouchControls from "../components/TouchControls.js";
import ResultsOverlay from "../components/ResultsOverlay.js";
import FailedOverlay from "../components/FailedOverlay.js";
import { FRAME_WIDTH, FRAME_HEIGHT } from "../components/IronPipeFrame.js";
import { cylinderGradientVertical } from "../pipeStyles.js";

const COMPACT_TOPBAR_BUTTON_STYLE = { padding: "3px 10px", fontSize: "0.82em" };

interface SubmitScorePayload {
  songId: string;
  difficulty: Difficulty;
  stars: number;
  fullCombo: boolean;
  maxCombo: number;
  starPowerPhraseBroken: boolean[];
  minRockMeter: number;
  failed: boolean;
  isLateNight: boolean;
}

async function submitScore(payload: SubmitScorePayload): Promise<UnlockedAchievement[]> {
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { unlockedAchievements?: UnlockedAchievement[] };
    return data.unlockedAchievements ?? [];
  } catch {
    return [];
  }
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
  const { currentTheme, themeOption } = useThemeControl();
  const notes = useMemo(() => loadTrack(chart, trackNameForDifficulty(difficulty)), [chart, difficulty]);

  const starPowerPhrases = useMemo(() => {
    const trackName = trackNameForDifficulty(difficulty);
    const fromChart = extractStarPowerPhrases(chart[trackName], chart.Song.resolution, chart.SyncTrack.bpms);
    return fromChart.length > 0 ? fromChart : synthesizeStarPowerPhrases(notes);
  }, [chart, difficulty, notes]);

  const chartOffsetSeconds = chart.Song.offset ?? 0;

  const { scheme } = useControlScheme();
  const isTouch = scheme === "touch";
  const isLandscapePhone = useMediaQuery(LANDSCAPE_MEDIA_QUERY);
  const hitLineRatio = !isTouch ? HIT_LINE_Y_RATIO : isLandscapePhone ? TOUCH_HIT_LINE_Y_RATIO_LANDSCAPE : TOUCH_HIT_LINE_Y_RATIO_PORTRAIT;

  const {
    canvasRef,
    getAudioRef,
    hud,
    needsTapToStart,
    phase,
    results,
    minRockMeterRef,
    start,
    pressFret,
    releaseFret,
    strum,
    activateStarPower,
  } = useGamePlaythrough({
    notes,
    chartOffsetSeconds,
    starPowerPhrases,
    difficulty,
    hitLineRatio,
    palette: themeOption.palette,
  });

  const showTouchControls = isTouch && phase === "playing";
  const strumModeEnabled = getStrumModeEnabled();
  const { notify } = useAchievementToast();

  useEffect(() => {
    if ((phase !== "results" && phase !== "failed") || !results) return;
    const failed = phase === "failed";
    const stars = failed ? 0 : computeStars(results.score, results.idealScore);
    const fullCombo =
      !failed &&
      results.misses.length === 0 &&
      results.droppedSustains.length === 0 &&
      results.wrongInputs === 0 &&
      results.totalNotes > 0;
    const isLateNight = new Date().getHours() < 4;
    submitScore({
      songId: song.id,
      difficulty,
      stars,
      fullCombo,
      maxCombo: results.maxCombo,
      starPowerPhraseBroken: results.starPowerPhraseBroken,
      minRockMeter: minRockMeterRef.current,
      failed,
      isLateNight,
    }).then(notify);
  }, [phase, results, song.id, difficulty, notify, minRockMeterRef]);

  return (
    <Screen>
      <TopBar>
        <Title>{song.name}</Title>
        <Button
          description="« Change song"
          variant="secondary"
          onClick={onBack}
          style={isLandscapePhone ? COMPACT_TOPBAR_BUTTON_STYLE : undefined}
        />
      </TopBar>

      <CanvasArea>
        <Highway>
          <GameCanvas canvasRef={canvasRef} />

          {phase === "playing" && (
            <ThemeProvider theme={currentTheme}>
              {showTouchControls && (
                <TouchControls strumMode={strumModeEnabled} onPressFret={pressFret} onReleaseFret={releaseFret} onStrum={strum} />
              )}

              <ScoreBoxOverlay>
                <ScoreBox score={hud.score} combo={hud.combo} multiplier={hud.multiplier} starPowerActive={hud.starPowerActive} />
              </ScoreBoxOverlay>
              <PowerGaugeOverlay>
                <PowerGauge
                  rockMeter={hud.rockMeter}
                  starPowerMeter={hud.starPowerMeter}
                  starPowerActive={hud.starPowerActive}
                  starPowerGainNonce={hud.starPowerGainNonce}
                  onActivateStarPower={isTouch ? activateStarPower : undefined}
                />
              </PowerGaugeOverlay>
              {needsTapToStart && <TapToStartOverlay onClick={start}>Tap to start</TapToStartOverlay>}
            </ThemeProvider>
          )}
        </Highway>

        {phase === "results" && results && <ResultsOverlay song={song} results={results} onBack={onBack} />}
        {phase === "failed" && results && <FailedOverlay song={song} results={results} onBack={onBack} onRetry={start} />}

        {song.audioUrls.map((url, index) => (
          <audio key={url} ref={getAudioRef(index)} src={url} preload="auto" />
        ))}
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

const MIN_SUPPORTED_LANDSCAPE_HEIGHT = 320;
const HUD_HEIGHT_BUDGET_RATIO = 0.32;

function hudScaleForViewport(viewportWidth: number): number {
  const available = viewportWidth - HUD_OVERLAY_MARGIN * 2 - HUD_OVERLAY_GAP;
  return Math.min(1, available / (2 * FRAME_WIDTH));
}

function hudScaleForHeight(viewportHeight: number): number {
  return Math.min(1, (viewportHeight * HUD_HEIGHT_BUDGET_RATIO) / FRAME_HEIGHT);
}

const TABLET_HUD_SCALE = hudScaleForViewport(MOBILE_BREAKPOINT + 1);
const MOBILE_HUD_SCALE = hudScaleForViewport(MIN_SUPPORTED_VIEWPORT_WIDTH);
const LANDSCAPE_HUD_SCALE = hudScaleForHeight(MIN_SUPPORTED_LANDSCAPE_HEIGHT);

const hudResponsiveScale = css`
  @media (max-width: ${TABLET_BREAKPOINT}px) {
    transform: scale(${TABLET_HUD_SCALE});
  }

  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    transform: scale(${MOBILE_HUD_SCALE});
  }

  @media (max-height: ${LANDSCAPE_HEIGHT_BREAKPOINT}px) {
    transform: scale(${LANDSCAPE_HUD_SCALE});
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

    @media (max-height: ${LANDSCAPE_HEIGHT_BREAKPOINT}px) {
      height: 3px;
    }
  }

  @media (max-width: 480px) {
    padding: 8px 12px 13px;
  }

  @media (max-height: ${LANDSCAPE_HEIGHT_BREAKPOINT}px) {
    padding: 3px 12px 4px;
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

  @media (max-height: ${LANDSCAPE_HEIGHT_BREAKPOINT}px) {
    font-size: 0.82em;
  }
`;

const CanvasArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const Highway = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
`;

const ScoreBoxOverlay = styled.div`
  position: absolute;
  top: 0;
  left: ${HUD_OVERLAY_MARGIN}px;
  z-index: 2;
  pointer-events: none;
  transform-origin: top left;
  ${hudResponsiveScale}
`;

const PowerGaugeOverlay = styled.div`
  position: absolute;
  top: 0;
  right: ${HUD_OVERLAY_MARGIN}px;
  z-index: 2;
  pointer-events: none;
  transform-origin: top right;
  ${hudResponsiveScale}
`;

const TapToStartOverlay = styled.button`
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  color: ${({ theme }) => theme.colors.white};
  font-size: 1.4em;
  border: none;
  cursor: pointer;
`;
