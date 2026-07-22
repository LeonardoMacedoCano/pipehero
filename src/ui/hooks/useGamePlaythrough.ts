import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty, Fret, Note, StarPowerPhrase } from "../../types.js";
import { createPlaythrough } from "../../game/gamePlaythrough.js";
import { drawFrame, ABSORB_DURATION_SECONDS, MISS_FALL_DURATION_SECONDS, type MissedHitInfo } from "../../render/draw.js";
import { createRenderConfig, noteRenderKey, progressFor, laneX, noteRadiusAt } from "../../render/layout.js";
import { getCalibration } from "../../audio/calibrationStore.js";
import { playMissClank } from "../../audio/missSound.js";
import { fretForKeyCode } from "../../game/keymap.js";
import { judgmentWindowsForDifficulty } from "../../engine/judge.js";

interface Hud {
  score: number;
  starPowerMeter: number;
  starPowerActive: boolean;
}

const INITIAL_HUD: Hud = { score: 0, starPowerMeter: 0, starPowerActive: false };

export function useGamePlaythrough({
  notes,
  chartOffsetSeconds,
  starPowerPhrases,
  difficulty,
}: {
  notes: Note[] | null;
  chartOffsetSeconds: number | undefined;
  starPowerPhrases: StarPowerPhrase[] | undefined;
  difficulty: Difficulty | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playthroughRef = useRef<ReturnType<typeof createPlaythrough> | null>(null);
  const rafRef = useRef<number | null>(null);
  const judgedHitsRef = useRef<Map<string, number>>(new Map());
  const holdingKeysRef = useRef<Set<string>>(new Set());
  const missedHitsRef = useRef<Map<string, MissedHitInfo>>(new Map());

  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [needsTapToStart, setNeedsTapToStart] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioRef.current?.pause();
  }, []);

  const createFreshPlaythrough = useCallback(() => {
    if (!notes || !audioRef.current) return null;
    const audio = audioRef.current;
    playthroughRef.current = createPlaythrough({
      notes,
      offsetSeconds: (chartOffsetSeconds ?? 0) + getCalibration(),
      getAudioTime: () => audio.currentTime,
      starPowerPhrases: starPowerPhrases ?? [],
      windows: judgmentWindowsForDifficulty(difficulty),
    });
    return playthroughRef.current;
  }, [notes, chartOffsetSeconds, starPowerPhrases, difficulty]);

  const loop = useCallback(() => {
    const playthrough = playthroughRef.current;
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!playthrough || !canvas || !audio || !notes) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = createRenderConfig(canvas.width, canvas.height);
    const { chartTime, newlyMissed } = playthrough.tick();

    for (const [key, judgedAt] of judgedHitsRef.current) {
      if (chartTime - judgedAt > ABSORB_DURATION_SECONDS) judgedHitsRef.current.delete(key);
    }
    for (const [key, info] of missedHitsRef.current) {
      if (chartTime - info.missedAt > MISS_FALL_DURATION_SECONDS) missedHitsRef.current.delete(key);
    }

    if (newlyMissed.length > 0) playMissClank();
    for (const event of newlyMissed) {
      // uses the note's actual position at the moment it's flagged missed
      // (not snapped back to the pipe mouth) so the dramatic fall picks up
      // exactly where the normal falling note left off, with no jump/pause
      const missProgress = progressFor(event.time, chartTime, config);
      for (const fret of event.frets) {
        missedHitsRef.current.set(noteRenderKey(fret, event.time), {
          fret,
          x: laneX(fret, missProgress, config),
          y: missProgress * config.hitLineY,
          radius: noteRadiusAt(missProgress, config),
          missedAt: chartTime,
        });
      }
    }

    const state = playthrough.getState();
    holdingKeysRef.current.clear();
    for (const event of state.activeHolds) {
      for (const fret of event.frets) holdingKeysRef.current.add(noteRenderKey(fret, event.time));
    }

    drawFrame(ctx, notes, chartTime, config, judgedHitsRef.current, holdingKeysRef.current, missedHitsRef.current);

    setHud({ score: state.score, starPowerMeter: state.starPowerMeter, starPowerActive: state.starPowerActive });

    if (!audio.paused && !audio.ended) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [notes]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    stop();
    createFreshPlaythrough();
    audio.currentTime = 0;
    try {
      await audio.play();
      setNeedsTapToStart(false);
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setNeedsTapToStart(true);
    }
  }, [stop, createFreshPlaythrough, loop]);

  useEffect(() => {
    stop();
    setHud(INITIAL_HUD);
    setNeedsTapToStart(false);
    judgedHitsRef.current.clear();
    missedHitsRef.current.clear();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas && notes) {
      drawFrame(ctx, notes, 0, createRenderConfig(canvas.width, canvas.height));
    }

    if (notes) start();
  }, [notes, chartOffsetSeconds, starPowerPhrases, difficulty, stop, start]);

  useEffect(() => stop, [stop]);

  const pressFret = useCallback((fret: Fret) => {
    const playthrough = playthroughRef.current;
    if (!playthrough) return undefined;
    const result = playthrough.pressFret(fret);
    if (result.type === "judged" || result.type === "lateGrab") {
      const judgedAt = playthrough.currentChartTime();
      for (const f of result.event.frets) {
        judgedHitsRef.current.set(noteRenderKey(f, result.event.time), judgedAt);
      }
    }
    return result;
  }, []);

  const releaseFret = useCallback((fret: Fret) => {
    playthroughRef.current?.releaseFret(fret);
  }, []);

  const activateStarPower = useCallback(() => {
    playthroughRef.current?.activateStarPower();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        activateStarPower();
        return;
      }
      if (event.repeat) return;
      const fret = fretForKeyCode(event.code);
      if (fret !== null) pressFret(fret);
    }

    function handleKeyUp(event: KeyboardEvent) {
      const fret = fretForKeyCode(event.code);
      if (fret !== null) releaseFret(fret);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressFret, releaseFret, activateStarPower]);

  return { canvasRef, audioRef, hud, needsTapToStart, start, stop };
}
