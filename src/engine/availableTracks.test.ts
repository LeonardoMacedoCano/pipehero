import test from "node:test";
import assert from "node:assert/strict";
import type { NoteEvent, ParsedChart, Timed } from "parsehero";
import { listAvailableDifficulties, pickHardestDifficulty, trackNameForDifficulty } from "./availableTracks.js";

function note(overrides: Partial<Timed<NoteEvent>> = {}): Timed<NoteEvent> {
  return {
    type: "note",
    note: 0,
    duration: 0,
    isChord: false,
    isHOPO: false,
    forced: false,
    tap: false,
    tick: 0,
    assignedTime: 0,
    ...overrides,
  };
}

test("only detects difficulties that actually have notes", () => {
  const chart = {
    ExpertSingle: [note()],
    HardSingle: [note()],
  } as ParsedChart;
  assert.deepEqual(listAvailableDifficulties(chart), ["Expert", "Hard"]);
});

test("sorts from hardest to easiest, regardless of the object's order", () => {
  const chart = {
    EasySingle: [note()],
    ExpertSingle: [note()],
    MediumSingle: [note()],
  } as ParsedChart;
  assert.deepEqual(listAvailableDifficulties(chart), ["Expert", "Medium", "Easy"]);
});

test("track present but empty (only non-note events) doesn't count as available", () => {
  const chart = {
    ExpertSingle: [{ type: "event", value: "x", tick: 0, assignedTime: 0 }],
  } as ParsedChart;
  assert.deepEqual(listAvailableDifficulties(chart), []);
});

test("chart with no guitar track returns an empty list", () => {
  assert.deepEqual(listAvailableDifficulties({ Song: {} } as ParsedChart), []);
});

test("pickHardestDifficulty picks Expert when available", () => {
  const chart = { EasySingle: [note()], ExpertSingle: [note()] } as ParsedChart;
  assert.equal(pickHardestDifficulty(chart), "Expert");
});

test("pickHardestDifficulty falls back to the next difficulty if Expert doesn't exist", () => {
  const chart = { EasySingle: [note()], HardSingle: [note()] } as ParsedChart;
  assert.equal(pickHardestDifficulty(chart), "Hard");
});

test("pickHardestDifficulty returns null if there's no difficulty at all", () => {
  assert.equal(pickHardestDifficulty({} as ParsedChart), null);
});

test("trackNameForDifficulty builds the correct track name", () => {
  assert.equal(trackNameForDifficulty("Expert"), "ExpertSingle");
  assert.equal(trackNameForDifficulty("Easy"), "EasySingle");
});
