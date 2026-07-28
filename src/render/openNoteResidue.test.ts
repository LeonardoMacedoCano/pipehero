import test from "node:test";
import assert from "node:assert/strict";
import { createPlaythrough } from "../game/gamePlaythrough.js";
import type { Note } from "../types.js";
import { noteRenderKey, RENDER_CONFIG, getVisibleNotes } from "./layout.js";
import { OPEN_RESIDUE_FALL_SECONDS } from "./draw.js";

interface Sim {
  note: Note;
  key: string;
  openHoldReleaseAtRef: Map<string, number>;
  tick: () => number;
  press: () => void;
  releaseNowAt: (chartTime: number) => void;
  setTime: (t: number) => void;
}

function makeSim(duration: number): Sim {
  const note: Note = {
    id: 0,
    time: 1.0,
    fret: 7,
    fretName: "open",
    duration,
    isChord: false,
    isHOPO: false,
    forced: false,
    tap: false,
  };
  const notes = [note];
  const key = noteRenderKey(note.fret, note.time);
  const noteByKey = new Map<string, Note>([[key, note]]);

  let fakeAudioTime = 0;
  const playthrough = createPlaythrough({ notes, getAudioTime: () => fakeAudioTime });
  let holdingKeys = new Set<string>();
  const openHoldReleaseAtRef = new Map<string, number>();

  function tick(): number {
    const chartTime = playthrough.currentChartTime();
    playthrough.tick();
    const state = playthrough.getState();
    const previouslyHoldingKeys = holdingKeys;
    holdingKeys = new Set();
    for (const event of state.activeHolds) {
      for (const fret of event.frets) holdingKeys.add(noteRenderKey(fret, event.time));
    }
    for (const k of previouslyHoldingKeys) {
      if (holdingKeys.has(k) || openHoldReleaseAtRef.has(k)) continue;
      const n = noteByKey.get(k);
      if (n && n.fret === 7 && n.duration > 0) openHoldReleaseAtRef.set(k, chartTime);
    }
    return chartTime;
  }

  return {
    note,
    key,
    openHoldReleaseAtRef,
    tick,
    press: () => {
      playthrough.pressFret(7);
    },
    releaseNowAt: (chartTime: number) => {
      playthrough.releaseFret(7);
      for (const k of holdingKeys) {
        const n = noteByKey.get(k);
        if (n && n.fret === 7 && !openHoldReleaseAtRef.has(k)) openHoldReleaseAtRef.set(k, chartTime);
      }
    },
    setTime: (t: number) => {
      fakeAudioTime = t;
    },
  };
}

function heightFractionFor(sim: Sim, chartTime: number): number {
  const naturalEnd = sim.note.time + sim.note.duration;
  const naturalAnchor = chartTime >= naturalEnd ? naturalEnd : Infinity;
  const detectedAnchor = sim.openHoldReleaseAtRef.get(sim.key) ?? Infinity;
  const anchor = Math.min(naturalAnchor, detectedAnchor);
  if (anchor === Infinity) return 1;
  return Math.max(0, Math.min(1, 1 - (chartTime - anchor) / OPEN_RESIDUE_FALL_SECONDS));
}

function assertNoPopAcrossSchedule(duration: number, releaseAtSeconds: number | null, dts: number[]): void {
  const sim = makeSim(duration);
  sim.setTime(1.0);
  sim.press();
  sim.tick();

  const releaseAtChartTime = releaseAtSeconds !== null ? 1.0 + releaseAtSeconds : Infinity;
  let released = false;
  let t = 1.0;

  for (const dt of dts) {
    t += dt;
    sim.setTime(t);
    if (!released && t >= releaseAtChartTime) {
      released = true;
      sim.releaseNowAt(releaseAtChartTime);
    }
    const chartTime = sim.tick();
    const visible = getVisibleNotes([sim.note], chartTime, RENDER_CONFIG);
    const stillVisible = visible.some((v) => v.fret === 7);
    const heightFraction = heightFractionFor(sim, chartTime);

    assert.ok(
      !(heightFraction > 0.02 && !stillVisible),
      `note despawned while residue still at ${(heightFraction * 100).toFixed(0)}% height (t=${chartTime.toFixed(3)}, duration=${duration}, releaseAt=${releaseAtSeconds})`
    );
  }
}

test("open note held to natural completion: a frame stall straddling the note's end doesn't cut the residue off mid-fall", () => {
  const dts: number[] = [];
  for (let t = 0; t < 1.9; t += 1 / 60) dts.push(1 / 60);
  dts.push(0.2); // stall that jumps straight past the natural end (note.time=1, duration=2 -> ends at t=3)
  for (let i = 0; i < 60; i++) dts.push(1 / 60);
  assertNoPopAcrossSchedule(2.0, null, dts);
});

test("open note held to natural completion: clean 60fps frames never cut the residue off", () => {
  const dts = Array.from({ length: 300 }, () => 1 / 60);
  assertNoPopAcrossSchedule(2.0, null, dts);
});

test("open note released early mid-hold: residue falls and finishes before the note despawns", () => {
  const dts = Array.from({ length: 300 }, () => 1 / 60);
  assertNoPopAcrossSchedule(2.0, 0.6, dts);
});

test("stress: many random durations, release points, and frame-timing jitter never pop the residue mid-fall", () => {
  function mulberry32(seed: number) {
    return function random() {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  for (let trial = 0; trial < 300; trial++) {
    const rand = mulberry32(trial * 7919 + 13);
    const duration = 0.5 + rand() * 4.5;
    const releaseFraction = rand();
    const willReleaseEarly = releaseFraction < 0.85;

    const dts: number[] = [];
    let elapsed = 0;
    const endAt = duration + 0.6;
    while (elapsed < endAt) {
      const r = rand();
      const dt = r < 0.01 ? rand() * 0.4 : r < 0.06 ? rand() * 0.15 : 1 / 60 + rand() * 0.005;
      dts.push(dt);
      elapsed += dt;
    }

    assertNoPopAcrossSchedule(duration, willReleaseEarly ? duration * releaseFraction : null, dts);
  }
});
