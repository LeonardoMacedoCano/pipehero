import test from "node:test";
import assert from "node:assert/strict";
import type { PlayableEvent } from "../types.js";
import { createGameEngine } from "./gameEngine.js";
import { JUDGMENT_WINDOWS_BY_DIFFICULTY } from "./judge.js";

function event(overrides: Partial<PlayableEvent> = {}): PlayableEvent {
  return { time: 1, frets: [0], duration: 0, isChord: false, isHOPO: false, ...overrides };
}

test("input exactly at the note's time is 'perfect'", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const result = engine.handleKeyDown(0, 1.0);
  assert.equal(result.type, "judged");
  assert.equal(result.type === "judged" && result.rating, "perfect");
});

test("input within the 'good' window but outside 'perfect'", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const result = engine.handleKeyDown(0, 1.06);
  assert.equal(result.type, "judged");
  assert.equal(result.type === "judged" && result.rating, "good");
});

test("input outside the 'good' window doesn't find a note", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const result = engine.handleKeyDown(0, 1.2);
  assert.equal(result.type, "unmatched");
});

test("wrong fret isn't confused with another fret's note", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const result = engine.handleKeyDown(1, 1.0);
  assert.equal(result.type, "unmatched");
});

test("a note not played within the window becomes an automatic miss via update()", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const missed = engine.update(1.2);
  assert.equal(missed.length, 1);
  assert.equal(engine.getState().misses.length, 1);
  assert.equal(engine.getState().pendingCount, 0);
});

test("update() before the window closes doesn't produce a premature miss", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const missed = engine.update(1.05);
  assert.equal(missed.length, 0);
  assert.equal(engine.getState().pendingCount, 1);
});

test("combo increments on hits and resets after a miss", () => {
  const engine = createGameEngine([
    event({ time: 1.0, frets: [0] }),
    event({ time: 2.0, frets: [1] }),
    event({ time: 3.0, frets: [2] }),
  ]);
  engine.handleKeyDown(0, 1.0);
  engine.update(1.0);
  assert.equal(engine.getState().combo, 1);

  engine.update(2.2);
  assert.equal(engine.getState().combo, 0);

  engine.handleKeyDown(2, 3.0);
  assert.equal(engine.getState().combo, 1);
  assert.equal(engine.getState().maxCombo, 1);
});

test("scoring: perfect is worth more than good, miss is worth zero", () => {
  const engine = createGameEngine([
    event({ time: 1.0, frets: [0] }),
    event({ time: 2.0, frets: [1] }),
  ]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyDown(1, 2.07);
  const state = engine.getState();
  assert.equal(state.score, 150);
});

test("the same note can't be judged twice", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const first = engine.handleKeyDown(0, 1.0);
  const second = engine.handleKeyDown(0, 1.01);
  assert.equal(first.type, "judged");
  assert.equal(second.type, "unmatched");
});

test("chord: only counts as a hit when both frets are pressed together", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0, 2], isChord: true })]);

  const first = engine.handleKeyDown(0, 1.0);
  assert.equal(first.type, "unmatched");
  assert.equal(engine.getState().pendingCount, 1);

  const second = engine.handleKeyDown(2, 1.01);
  assert.equal(second.type, "judged");
  assert.equal(engine.getState().hits.length, 1);
});

test("incomplete chord (only half pressed) becomes a miss when the window closes", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0, 2], isChord: true })]);
  engine.handleKeyDown(0, 1.0);
  const missed = engine.update(1.2);
  assert.equal(missed.length, 1);
  assert.equal(engine.getState().misses.length, 1);
  assert.equal(engine.getState().hits.length, 0);
});

test("releasing one chord fret and pressing both again still counts the hit", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0, 2], isChord: true })]);
  engine.handleKeyDown(0, 0.9);
  engine.handleKeyUp(0, 0.92);
  engine.handleKeyDown(0, 1.0);
  const result = engine.handleKeyDown(2, 1.0);
  assert.equal(result.type, "judged");
});

test("sustain: holding the key until the end of the duration gives the full bonus", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.update(2.0);
  assert.equal(engine.getState().score, 150);
  assert.equal(engine.getState().holdingCount, 0);
});

test("sustain: releasing the key before the end gives a proportional bonus", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.5);
  assert.equal(engine.getState().score, 125);
  assert.equal(engine.getState().holdingCount, 0);
});

test("sustain: releasing right after hitting gives the minimum bonus (near zero)", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.0);
  assert.equal(engine.getState().score, 100);
});

test("a note without duration (duration=0) doesn't enter a sustain state", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 0 })]);
  engine.handleKeyDown(0, 1.0);
  assert.equal(engine.getState().holdingCount, 0);
  assert.equal(engine.getState().score, 100);
});

test("sustain: grabbing mid-hold after missing the start counts as a miss but gives a proportional bonus", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.update(1.2);
  assert.equal(engine.getState().misses.length, 1);

  const result = engine.handleKeyDown(0, 1.5);
  assert.equal(result.type, "lateGrab");
  assert.equal(engine.getState().hits.length, 0);
  assert.equal(engine.getState().misses.length, 1);

  engine.update(2.0);
  assert.equal(engine.getState().score, Math.round(50 * 0.5));
});

test("sustain: the same note can't be grabbed late twice", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.update(1.2);
  const first = engine.handleKeyDown(0, 1.3);
  assert.equal(first.type, "lateGrab");
  engine.handleKeyUp(0, 1.4);

  const second = engine.handleKeyDown(0, 1.6);
  assert.equal(second.type, "unmatched");
});

test("sustain: can't be grabbed late after the sustain has already ended", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.update(2.5);
  const result = engine.handleKeyDown(0, 2.5);
  assert.equal(result.type, "unmatched");
});

test("activeHolds reflects events currently being held, both a normal hit and a late grab", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  assert.equal(engine.getState().activeHolds.length, 0);

  engine.handleKeyDown(0, 1.0);
  assert.equal(engine.getState().activeHolds.length, 1);
  assert.equal(engine.getState().activeHolds[0].time, 1.0);

  engine.handleKeyUp(0, 1.5);
  assert.equal(engine.getState().activeHolds.length, 0);
});

test("star power: hitting notes within a phrase fills the meter", () => {
  const events = [event({ time: 1.0, frets: [0] }), event({ time: 2.0, frets: [1] })];
  const starPowerPhrases = [{ startTime: 0.5, endTime: 2.5 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  assert.ok(engine.getState().starPowerMeter > 0 && engine.getState().starPowerMeter < 100);

  engine.handleKeyDown(1, 2.0);
  assert.equal(engine.getState().starPowerMeter, 100);
});

test("star power: notes outside a phrase don't fill the meter", () => {
  const events = [event({ time: 1.0, frets: [0] })];
  const starPowerPhrases = [{ startTime: 5.0, endTime: 6.0 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  assert.equal(engine.getState().starPowerMeter, 0);
});

test("star power: doesn't activate if the meter is below the threshold (50%)", () => {
  const events = [event({ time: 1.0, frets: [0] })];
  const starPowerPhrases = [{ startTime: 0.5, endTime: 1.5 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  const events2 = [
    event({ time: 1.0, frets: [0] }),
    event({ time: 2.0, frets: [1] }),
    event({ time: 3.0, frets: [2] }),
    event({ time: 4.0, frets: [3] }),
  ];
  const engine2 = createGameEngine(events2, { starPowerPhrases: [{ startTime: 0, endTime: 5 }] });
  engine2.handleKeyDown(0, 1.0);
  assert.equal(engine2.activateStarPower(), false);
  assert.equal(engine2.getState().starPowerActive, false);
});

test("star power: activating doubles the score of following hits", () => {
  const events = [event({ time: 1.0, frets: [0] }), event({ time: 2.0, frets: [1] })];
  const starPowerPhrases = [{ startTime: 0, endTime: 3 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  const activated = engine.activateStarPower();
  assert.equal(activated, true);

  const scoreBeforeSecondHit = engine.getState().score;
  engine.handleKeyDown(1, 2.0);
  assert.equal(engine.getState().score - scoreBeforeSecondHit, 200);
});

test("star power: drains over time while active, via update()", () => {
  const events = [event({ time: 1.0, frets: [0] })];
  const starPowerPhrases = [{ startTime: 0, endTime: 2 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  engine.activateStarPower();
  engine.update(1.0);
  engine.update(7.0);
  const state = engine.getState();
  assert.ok(state.starPowerMeter < 100);
});

test("without star power phrases (parameter omitted), the engine works normally", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  engine.handleKeyDown(0, 1.0);
  assert.equal(engine.getState().starPowerMeter, 0);
  assert.equal(engine.getState().starPowerActive, false);
  assert.equal(engine.activateStarPower(), false);
});

test("windows (parameter omitted) uses the default Expert window — a 200ms difference is a miss", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const result = engine.handleKeyDown(0, 1.2);
  assert.equal(result.type, "unmatched");
});

test("custom windows (Easy) accepts an input that would be a miss on the default window", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })], {
    windows: JUDGMENT_WINDOWS_BY_DIFFICULTY.Easy,
  });
  const result = engine.handleKeyDown(0, 1.12);
  assert.equal(result.type, "judged");
  assert.equal(result.type === "judged" && result.rating, "good");
});

test("custom windows (Easy) also widens the automatic miss via update()", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })], {
    windows: JUDGMENT_WINDOWS_BY_DIFFICULTY.Easy,
  });
  const missed = engine.update(1.12);
  assert.equal(missed.length, 0);
  assert.equal(engine.getState().pendingCount, 1);
});
