import test from "node:test";
import assert from "node:assert/strict";
import type { Bpm, StarPowerEvent, Timed } from "parsehero";
import { extractStarPowerPhrases, isWithinStarPowerPhrase } from "./starPower.js";

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
