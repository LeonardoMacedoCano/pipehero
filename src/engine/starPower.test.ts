import test from "node:test";
import assert from "node:assert/strict";
import type { Bpm, StarPowerEvent, Timed } from "parsehero";
import { extractStarPowerPhrases, isWithinStarPowerPhrase, synthesizeStarPowerPhrases } from "./starPower.js";

const RESOLUTION = 192;
const BPMS: Timed<Bpm>[] = [{ tick: 0, bpm: 120, assignedTime: 0, type: "bpm" }];

function starPowerEvent(overrides: Partial<Timed<StarPowerEvent>> = {}): Timed<StarPowerEvent> {
  return { type: "starpower", tick: 0, duration: 192, assignedTime: 0, ...overrides };
}

test("extracts star power phrases with startTime/endTime in seconds (not ticks)", () => {
  const events = [starPowerEvent({ tick: 384, duration: 192, assignedTime: 1.0 })];
  const phrases = extractStarPowerPhrases(events, RESOLUTION, BPMS);
  assert.equal(phrases.length, 1);
  assert.equal(phrases[0].startTime, 1.0);
  assert.equal(phrases[0].endTime, 1.5);
});

test("ignores events that aren't starpower (notes, text events)", () => {
  const events = [
    { type: "note", tick: 0, assignedTime: 0, duration: 0, note: 0, isChord: false, isHOPO: false, forced: false, tap: false },
    { type: "event", value: "section x", tick: 0, assignedTime: 0 },
    starPowerEvent({ tick: 0, duration: 192, assignedTime: 0 }),
  ];
  const phrases = extractStarPowerPhrases(events as never, RESOLUTION, BPMS);
  assert.equal(phrases.length, 1);
});

test("returns an empty list if there are no star power events", () => {
  assert.deepEqual(extractStarPowerPhrases([], RESOLUTION, BPMS), []);
  assert.deepEqual(extractStarPowerPhrases(undefined, RESOLUTION, BPMS), []);
});

test("comes out sorted by time even if the events arrive out of order", () => {
  const events = [
    starPowerEvent({ tick: 768, duration: 192, assignedTime: 2.0 }),
    starPowerEvent({ tick: 0, duration: 192, assignedTime: 0 }),
  ];
  const phrases = extractStarPowerPhrases(events, RESOLUTION, BPMS);
  assert.equal(phrases[0].startTime, 0);
  assert.equal(phrases[1].startTime, 2.0);
});

test("isWithinStarPowerPhrase: inside the [start, end) interval counts as within", () => {
  const phrases = [{ startTime: 1.0, endTime: 2.0 }];
  assert.equal(isWithinStarPowerPhrase(phrases, 1.0), true);
  assert.equal(isWithinStarPowerPhrase(phrases, 1.5), true);
  assert.equal(isWithinStarPowerPhrase(phrases, 2.0), false);
  assert.equal(isWithinStarPowerPhrase(phrases, 0.5), false);
});

test("isWithinStarPowerPhrase with an empty list always returns false", () => {
  assert.equal(isWithinStarPowerPhrase([], 5.0), false);
});

test("synthesizeStarPowerPhrases: returns nothing for an empty chart", () => {
  assert.deepEqual(synthesizeStarPowerPhrases([]), []);
});

test("synthesizeStarPowerPhrases: returns nothing when there aren't enough notes to form a single phrase", () => {
  const notes = [{ time: 0 }, { time: 1 }, { time: 2 }];
  assert.deepEqual(synthesizeStarPowerPhrases(notes), []);
});

test("synthesizeStarPowerPhrases: spreads 5 phrases evenly across a long chart, each covering 6 consecutive notes", () => {
  const notes = Array.from({ length: 60 }, (_, i) => ({ time: i * 0.5 }));
  const phrases = synthesizeStarPowerPhrases(notes);

  assert.equal(phrases.length, 5);
  assert.deepEqual(
    phrases.map((p) => [p.startTime, Number((p.endTime - 0.05).toFixed(4))]),
    [
      [5, 7.5],
      [10, 12.5],
      [15, 17.5],
      [20, 22.5],
      [25, 27.5],
    ]
  );
});

test("synthesizeStarPowerPhrases: is sorted and non-overlapping across a long chart", () => {
  const notes = Array.from({ length: 60 }, (_, i) => ({ time: i * 0.5 }));
  const phrases = synthesizeStarPowerPhrases(notes);
  for (let i = 1; i < phrases.length; i++) {
    assert.ok(phrases[i].startTime >= phrases[i - 1].endTime, `phrase ${i} overlaps phrase ${i - 1}`);
  }
});

test("synthesizeStarPowerPhrases: chords (several notes sharing a tick) count as a single time slot", () => {
  const notes = Array.from({ length: 60 }, (_, i) => ({ time: i * 0.5 }));
  const chordedNotes = notes.flatMap((n) => [n, n, n]);
  assert.deepEqual(synthesizeStarPowerPhrases(chordedNotes), synthesizeStarPowerPhrases(notes));
});

test("synthesizeStarPowerPhrases: is deterministic — same input always produces the same output", () => {
  const notes = Array.from({ length: 60 }, (_, i) => ({ time: i * 0.5 }));
  assert.deepEqual(synthesizeStarPowerPhrases(notes), synthesizeStarPowerPhrases(notes));
});
