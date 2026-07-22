import test from "node:test";
import assert from "node:assert/strict";
import type { Note } from "../types.js";
import { createPlaythrough } from "./gamePlaythrough.js";
import { JUDGMENT_WINDOWS_BY_DIFFICULTY } from "../engine/judge.js";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 0,
    time: 1,
    fret: 0,
    fretName: "green",
    duration: 0,
    isChord: false,
    isHOPO: false,
    forced: false,
    tap: false,
    ...overrides,
  };
}

test("pressFret uses the audio time converted by the offset, not the raw time", () => {
  const notes = [note({ time: 5.0, fret: 0 })];
  let fakeAudioTime = 4.0;
  const playthrough = createPlaythrough({
    notes,
    offsetSeconds: 1.0,
    getAudioTime: () => fakeAudioTime,
  });

  const result = playthrough.pressFret(0);
  assert.equal(result.type, "judged");
  assert.equal(result.type === "judged" && result.rating, "perfect");
});

test("tick() marks an automatic miss when the audio clock passes the window", () => {
  const notes = [note({ time: 5.0, fret: 0 })];
  let fakeAudioTime = 5.5;
  const playthrough = createPlaythrough({ notes, getAudioTime: () => fakeAudioTime });

  const { newlyMissed } = playthrough.tick();
  assert.equal(newlyMissed.length, 1);
  assert.equal(playthrough.getState().misses.length, 1);
});

test("full simulation: advance the clock and press each note at the right time", () => {
  const notes = [
    note({ id: 0, time: 1.0, fret: 0 }),
    note({ id: 1, time: 2.0, fret: 1 }),
    note({ id: 2, time: 3.0, fret: 2 }),
  ];
  let fakeAudioTime = 0;
  const playthrough = createPlaythrough({ notes, getAudioTime: () => fakeAudioTime });

  for (const n of notes) {
    fakeAudioTime = n.time;
    playthrough.tick();
    const result = playthrough.pressFret(n.fret);
    assert.equal(result.type, "judged");
    assert.equal(result.type === "judged" && result.rating, "perfect");
  }

  const state = playthrough.getState();
  assert.equal(state.hits.length, 3);
  assert.equal(state.misses.length, 0);
  assert.equal(state.score, 300);
});

test("a chord (two notes flattened at the same time) is grouped and judged as a single event", () => {
  const notes = [note({ time: 1.0, fret: 0, isChord: true }), note({ time: 1.0, fret: 2, isChord: true })];
  let fakeAudioTime = 1.0;
  const playthrough = createPlaythrough({ notes, getAudioTime: () => fakeAudioTime });

  const first = playthrough.pressFret(0);
  assert.equal(first.type, "unmatched");
  const second = playthrough.pressFret(2);
  assert.equal(second.type, "judged");
  assert.equal(playthrough.getState().hits.length, 1);
});

test("sustain: releaseFret before the end gives a partial bonus through the playthrough layer", () => {
  const notes = [note({ time: 1.0, fret: 0, duration: 1.0 })];
  let fakeAudioTime = 1.0;
  const playthrough = createPlaythrough({ notes, getAudioTime: () => fakeAudioTime });

  playthrough.pressFret(0);
  fakeAudioTime = 1.5;
  playthrough.releaseFret(0);

  assert.equal(playthrough.getState().score, 125);
});

test("custom windows reach the engine: an input that would be unmatched on Expert becomes a hit on Easy", () => {
  const notes = [note({ time: 1.0, fret: 0 })];
  let fakeAudioTime = 1.12;
  const playthrough = createPlaythrough({
    notes,
    getAudioTime: () => fakeAudioTime,
    windows: JUDGMENT_WINDOWS_BY_DIFFICULTY.Easy,
  });

  const result = playthrough.pressFret(0);
  assert.equal(result.type, "judged");
});
