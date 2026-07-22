import test from "node:test";
import assert from "node:assert/strict";
import type { Note } from "../types.js";
import { groupIntoPlayableEvents } from "./chordGrouping.js";

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

test("notes at different times become separate events", () => {
  const events = groupIntoPlayableEvents([note({ time: 1 }), note({ time: 2, fret: 1 })]);
  assert.equal(events.length, 2);
  assert.deepEqual(events[0].frets, [0]);
  assert.deepEqual(events[1].frets, [1]);
});

test("notes at the same time become a single chord event", () => {
  const events = groupIntoPlayableEvents([
    note({ time: 1, fret: 0 }),
    note({ time: 1, fret: 2 }),
  ]);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].frets, [0, 2]);
  assert.equal(events[0].isChord, true);
});

test("a single note (non-chord) has isChord=false", () => {
  const events = groupIntoPlayableEvents([note({ time: 1, fret: 0 })]);
  assert.equal(events[0].isChord, false);
});

test("event duration is the longest duration among the group's notes", () => {
  const events = groupIntoPlayableEvents([
    note({ time: 1, fret: 0, duration: 0 }),
    note({ time: 1, fret: 2, duration: 480 }),
  ]);
  assert.equal(events[0].duration, 480);
});

test("events come out sorted by time", () => {
  const events = groupIntoPlayableEvents([note({ time: 3 }), note({ time: 1 }), note({ time: 2 })]);
  assert.deepEqual(events.map((e) => e.time), [1, 2, 3]);
});
