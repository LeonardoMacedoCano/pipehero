import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Difficulty, Fret, GameState, Note, StarPowerPhrase } from "../../types.js";
import { createPlaythrough } from "../../game/gamePlaythrough.js";
import { drawFrame, ABSORB_DURATION_SECONDS, OPEN_RESIDUE_FALL_SECONDS } from "../../render/draw.js";
import { createRenderConfig, highwayBuildConfig, noteRenderKey } from "../../render/layout.js";
import { getCalibration } from "../../audio/calibrationStore.js";
import { playMissClank } from "../../audio/missSound.js";
import { playBooSound } from "../../audio/booSound.js";
import { setCrowdAmbience, type CrowdAmbience } from "../../audio/crowdAmbience.js";
import { rockTierFor } from "../../engine/rockMeter.js";
import { COLORS, STAR_POWER_COLORS } from "../../colors.js";
import { fretForBinding, isStarPowerBinding, DEFAULT_ACTION_BINDINGS } from "../../game/keymap.js";
import { getBindings, type ActionBindings } from "../../game/keymapStore.js";
import { judgmentWindowsForDifficulty } from "../../engine/judge.js";
import { useGamepadPolling } from "./useGamepadPolling.js";

interface Hud {
  score: number;
  combo: number;
  multiplier: number;
  starPowerMeter: number;
  starPowerActive: boolean;
  rockMeter: number;
}

const INITIAL_HUD: Hud = {
  score: 0,
  combo: 0,
  multiplier: 1,
  starPowerMeter: 0,
  starPowerActive: false,
  rockMeter: 50,
};

export type GamePhase = "playing" | "results" | "failed";

const HIGHWAY_BUILD_INTRO_MS = 550;
const HIGHWAY_BUILD_OUTRO_MS = 500;

function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

function easeInCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * clamped;
}

function crowdAmbienceForRockMeter(rockMeter: number): CrowdAmbience {
  const tier = rockTierFor(rockMeter);
  if (tier === "critical" || tier === "red") return "boo";
  if (tier === "yellow") return "cheer";
  return "loud-cheer";
}

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
  const missedKeysRef = useRef<Set<string>>(new Set());
  const errorClicksRef = useRef<Map<Fret, number>>(new Map());
  const openHoldReleaseAtRef = useRef<Map<string, number>>(new Map());
  const lastErrorAtRef = useRef<number | null>(null);
  const introStartRef = useRef<number | null>(null);
  const endedAtRef = useRef<number | null>(null);
  const failedAtRef = useRef<number | null>(null);
  const resultsSnapshotRef = useRef<GameState | null>(null);

  const noteByKey = useMemo(() => {
    const map = new Map<string, Note>();
    if (notes) for (const note of notes) map.set(noteRenderKey(note.fret, note.time), note);
    return map;
  }, [notes]);

  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [needsTapToStart, setNeedsTapToStart] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [results, setResults] = useState<GameState | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioRef.current?.pause();
    setCrowdAmbience("silent");
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

    if (audio.ended) {
      if (endedAtRef.current === null) {
        endedAtRef.current = performance.now();
        resultsSnapshotRef.current = playthrough.getState();
        setCrowdAmbience("silent");
      }
      const outroElapsed = performance.now() - endedAtRef.current;
      const remaining = 1 - Math.min(1, outroElapsed / HIGHWAY_BUILD_OUTRO_MS);
      drawFrame(ctx, [], 0, highwayBuildConfig(config, easeInCubic(remaining)));
      if (outroElapsed < HIGHWAY_BUILD_OUTRO_MS) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setResults(resultsSnapshotRef.current);
        setPhase("results");
      }
      return;
    }

    if (failedAtRef.current !== null) {
      const outroElapsed = performance.now() - failedAtRef.current;
      const remaining = 1 - Math.min(1, outroElapsed / HIGHWAY_BUILD_OUTRO_MS);
      drawFrame(ctx, [], 0, highwayBuildConfig(config, easeInCubic(remaining)));
      if (outroElapsed < HIGHWAY_BUILD_OUTRO_MS) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setResults(resultsSnapshotRef.current);
        setPhase("failed");
      }
      return;
    }

    const { chartTime, newlyMissed } = playthrough.tick();

    for (const [key, judgedAt] of judgedHitsRef.current) {
      const note = noteByKey.get(key);
      const releasedAt = openHoldReleaseAtRef.current.get(key);
      const holdEnd =
        note && note.fret === 7 && note.duration > 0
          ? (releasedAt ?? note.time + note.duration) + OPEN_RESIDUE_FALL_SECONDS
          : judgedAt + ABSORB_DURATION_SECONDS;
      if (chartTime > holdEnd) {
        judgedHitsRef.current.delete(key);
        openHoldReleaseAtRef.current.delete(key);
      }
    }

    if (newlyMissed.length > 0) {
      playMissClank();
      lastErrorAtRef.current = chartTime;
    }
    for (const event of newlyMissed) {
      for (const fret of event.frets) {
        missedKeysRef.current.add(noteRenderKey(fret, event.time));
      }
    }

    const state = playthrough.getState();
    if (state.failed && failedAtRef.current === null) {
      failedAtRef.current = performance.now();
      resultsSnapshotRef.current = state;
      audio.pause();
      setCrowdAmbience("silent");
      playBooSound();
    } else {
      setCrowdAmbience(crowdAmbienceForRockMeter(state.rockMeter));
    }
    const previouslyHoldingKeys = holdingKeysRef.current;
    holdingKeysRef.current = new Set();
    for (const event of state.activeHolds) {
      for (const fret of event.frets) holdingKeysRef.current.add(noteRenderKey(fret, event.time));
    }
    for (const key of previouslyHoldingKeys) {
      if (holdingKeysRef.current.has(key) || openHoldReleaseAtRef.current.has(key)) continue;
      const note = noteByKey.get(key);
      if (note && note.fret === 7 && note.duration > 0) openHoldReleaseAtRef.current.set(key, chartTime);
    }
    for (const event of state.droppedSustains) {
      for (const fret of event.frets) missedKeysRef.current.add(noteRenderKey(fret, event.time));
    }

    const introElapsed = introStartRef.current === null ? Infinity : performance.now() - introStartRef.current;
    const frameConfig =
      introElapsed < HIGHWAY_BUILD_INTRO_MS
        ? highwayBuildConfig(config, easeOutCubic(introElapsed / HIGHWAY_BUILD_INTRO_MS))
        : config;

    const palette = state.starPowerActive ? STAR_POWER_COLORS : COLORS;

    drawFrame(
      ctx,
      notes,
      chartTime,
      frameConfig,
      judgedHitsRef.current,
      holdingKeysRef.current,
      missedKeysRef.current,
      errorClicksRef.current,
      lastErrorAtRef.current,
      openHoldReleaseAtRef.current,
      palette,
      state.starPowerActive,
      starPowerPhrases ?? []
    );

    setHud({
      score: state.score,
      combo: state.combo,
      multiplier: state.multiplier,
      starPowerMeter: state.starPowerMeter,
      starPowerActive: state.starPowerActive,
      rockMeter: state.rockMeter,
    });

    if (!audio.paused || failedAtRef.current !== null) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [notes, noteByKey]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    stop();
    createFreshPlaythrough();
    audio.currentTime = 0;
    endedAtRef.current = null;
    failedAtRef.current = null;
    resultsSnapshotRef.current = null;
    setResults(null);
    setPhase("playing");
    try {
      await audio.play();
      setNeedsTapToStart(false);
      introStartRef.current = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setNeedsTapToStart(true);
    }
  }, [stop, createFreshPlaythrough, loop]);

  useEffect(() => {
    stop();
    setHud(INITIAL_HUD);
    setNeedsTapToStart(false);
    setPhase("playing");
    setResults(null);
    judgedHitsRef.current.clear();
    missedKeysRef.current.clear();
    errorClicksRef.current.clear();
    openHoldReleaseAtRef.current.clear();
    lastErrorAtRef.current = null;
    endedAtRef.current = null;
    failedAtRef.current = null;
    resultsSnapshotRef.current = null;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas && notes) {
      drawFrame(ctx, notes, 0, highwayBuildConfig(createRenderConfig(canvas.width, canvas.height), 0));
    }

    if (notes) start();
  }, [notes, chartOffsetSeconds, starPowerPhrases, difficulty, stop, start]);

  useEffect(() => stop, [stop]);

  const pressFret = useCallback((fret: Fret) => {
    const playthrough = playthroughRef.current;
    if (!playthrough) return undefined;
    const result = playthrough.pressFret(fret);
    if (result.type === "judged") {
      const judgedAt = playthrough.currentChartTime();
      for (const f of result.event.frets) {
        judgedHitsRef.current.set(noteRenderKey(f, result.event.time), judgedAt);
      }
    } else if (!result.awaitingChord) {
      const pressedAt = playthrough.currentChartTime();
      errorClicksRef.current.set(fret, pressedAt);
      lastErrorAtRef.current = pressedAt;
    }
    return result;
  }, []);

  const releaseFret = useCallback(
    (fret: Fret) => {
      const playthrough = playthroughRef.current;
      if (!playthrough) return;
      playthrough.releaseFret(fret);
      if (fret !== 7) return;
      const releasedAt = playthrough.currentChartTime();
      for (const key of holdingKeysRef.current) {
        const note = noteByKey.get(key);
        if (note && note.fret === 7 && !openHoldReleaseAtRef.current.has(key)) {
          openHoldReleaseAtRef.current.set(key, releasedAt);
        }
      }
    },
    [noteByKey]
  );

  const activateStarPower = useCallback(() => {
    playthroughRef.current?.activateStarPower();
  }, []);

  const bindingsRef = useRef<ActionBindings>(DEFAULT_ACTION_BINDINGS);

  useEffect(() => {
    bindingsRef.current = getBindings();

    function handleKeyDown(event: KeyboardEvent) {
      const binding = { source: "keyboard" as const, code: event.code };
      if (isStarPowerBinding(binding, bindingsRef.current)) {
        activateStarPower();
        return;
      }
      if (event.repeat) return;
      const fret = fretForBinding(binding, bindingsRef.current);
      if (fret !== null) pressFret(fret);
    }

    function handleKeyUp(event: KeyboardEvent) {
      const fret = fretForBinding({ source: "keyboard", code: event.code }, bindingsRef.current);
      if (fret !== null) releaseFret(fret);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressFret, releaseFret, activateStarPower]);

  useGamepadPolling(
    (edges) => {
      for (const edge of edges.pressed) {
        const binding = { source: "gamepad" as const, deviceId: edge.deviceId, button: edge.button };
        if (isStarPowerBinding(binding, bindingsRef.current)) {
          activateStarPower();
          continue;
        }
        const fret = fretForBinding(binding, bindingsRef.current);
        if (fret !== null) pressFret(fret);
      }
      for (const edge of edges.released) {
        const fret = fretForBinding(
          { source: "gamepad", deviceId: edge.deviceId, button: edge.button },
          bindingsRef.current
        );
        if (fret !== null) releaseFret(fret);
      }
    },
    true
  );

  return { canvasRef, audioRef, hud, needsTapToStart, phase, results, start, stop };
}
