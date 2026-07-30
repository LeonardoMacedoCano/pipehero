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

test("unmatched: pressing one fret of an incomplete chord is flagged as awaiting the rest, not a wrong press", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0, 2], isChord: true })]);
  const result = engine.handleKeyDown(0, 1.0);
  assert.equal(result.type, "unmatched");
  assert.equal(result.type === "unmatched" && result.awaitingChord, true);
});

test("unmatched: pressing a fret with no nearby note is a genuine wrong press", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const result = engine.handleKeyDown(1, 1.0);
  assert.equal(result.type, "unmatched");
  assert.equal(result.type === "unmatched" && result.awaitingChord, false);
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

test("sustain: releasing the key before the end is all-or-nothing — no partial bonus", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.5);
  assert.equal(engine.getState().score, 100);
  assert.equal(engine.getState().holdingCount, 0);
});

test("sustain: releasing right after hitting also gives zero bonus", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.0);
  assert.equal(engine.getState().score, 100);
});

test("sustain: releasing early marks it as dropped, and it can't be pressed again for the rest of its duration", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.5);
  assert.equal(engine.getState().droppedSustains.length, 1);

  const result = engine.handleKeyDown(0, 1.7);
  assert.equal(result.type, "unmatched");
  assert.equal(engine.getState().holdingCount, 0);
  assert.equal(engine.getState().droppedSustains.length, 1);

  engine.update(2.0);
  assert.equal(engine.getState().score, 100);
});

test("a note without duration (duration=0) doesn't enter a sustain state", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 0 })]);
  engine.handleKeyDown(0, 1.0);
  assert.equal(engine.getState().holdingCount, 0);
  assert.equal(engine.getState().score, 100);
});

test("sustain: missing the start locks the note out — it can't be grabbed mid-hold anymore", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.update(1.2);
  assert.equal(engine.getState().misses.length, 1);

  const result = engine.handleKeyDown(0, 1.5);
  assert.equal(result.type, "unmatched");
  assert.equal(engine.getState().hits.length, 0);
  assert.equal(engine.getState().misses.length, 1);
  assert.equal(engine.getState().holdingCount, 0);

  engine.update(2.0);
  assert.equal(engine.getState().score, 0);
});

test("sustain: can't be grabbed after the sustain has already ended", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.update(2.5);
  const result = engine.handleKeyDown(0, 2.5);
  assert.equal(result.type, "unmatched");
});

test("activeHolds reflects events currently being held", () => {
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

test("star power: activates at exactly 50%, even when floating-point addition lands a hair under it", () => {
  const starPowerPhrases = [
    { startTime: 0, endTime: 3 },
    { startTime: 3, endTime: 6 },
    { startTime: 6, endTime: 9 },
    { startTime: 9, endTime: 12 },
  ];
  const events = [
    event({ time: 1, frets: [0] }),
    event({ time: 1.3, frets: [1] }),
    event({ time: 1.6, frets: [2] }),
    event({ time: 1.9, frets: [3] }),
    event({ time: 2.2, frets: [4] }),
    event({ time: 2.5, frets: [0] }),
    event({ time: 4, frets: [1] }),
    event({ time: 4.3, frets: [2] }),
    event({ time: 4.6, frets: [3] }),
    event({ time: 4.9, frets: [4] }),
    event({ time: 5.2, frets: [0] }),
    event({ time: 5.5, frets: [1] }),
  ];
  const engine = createGameEngine(events, { starPowerPhrases });

  for (const e of events) engine.handleKeyDown(e.frets[0], e.time);

  assert.ok(engine.getState().starPowerMeter < 50);
  assert.equal(engine.activateStarPower(), true);
  assert.equal(engine.getState().starPowerActive, true);
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

test("multiplier: starts at 1x and steps up every 10-note streak, capped at 4x", () => {
  const events = Array.from({ length: 31 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const engine = createGameEngine(events);

  assert.equal(engine.getState().multiplier, 1);

  for (let i = 0; i < 9; i++) engine.handleKeyDown(0, i + 1);
  assert.equal(engine.getState().combo, 9);
  assert.equal(engine.getState().multiplier, 1);

  engine.handleKeyDown(0, 10);
  assert.equal(engine.getState().combo, 10);
  assert.equal(engine.getState().multiplier, 2);

  for (let i = 10; i < 20; i++) engine.handleKeyDown(0, i + 1);
  assert.equal(engine.getState().combo, 20);
  assert.equal(engine.getState().multiplier, 3);

  for (let i = 20; i < 30; i++) engine.handleKeyDown(0, i + 1);
  assert.equal(engine.getState().combo, 30);
  assert.equal(engine.getState().multiplier, 4);

  engine.handleKeyDown(0, 31);
  assert.equal(engine.getState().multiplier, 4);
});

test("multiplier: resets to 1x after a miss", () => {
  const events = [event({ time: 1, frets: [0] }), event({ time: 2, frets: [1] })];
  const engine = createGameEngine(events);
  for (let i = 0; i < 10; i++) engine.handleKeyDown(0, 1);
  engine.update(1.2);
  assert.equal(engine.getState().multiplier, 1);
});

test("multiplier: a dropped sustain loses the hold bonus but doesn't break the streak", () => {
  const events = [event({ time: 1, frets: [0], duration: 1 }), event({ time: 2, frets: [1] })];
  const engine = createGameEngine(events);
  engine.handleKeyDown(0, 1);
  assert.equal(engine.getState().combo, 1);
  engine.handleKeyUp(0, 1.5);
  assert.equal(engine.getState().combo, 1);
  assert.equal(engine.getState().droppedSustains.length, 1);

  engine.handleKeyDown(1, 2);
  assert.equal(engine.getState().combo, 2);
});

test("multiplier: star power doubles the current tier, up to 8x", () => {
  const events = Array.from({ length: 11 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const starPowerPhrases = [{ startTime: 0, endTime: 20 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  for (let i = 0; i < 10; i++) engine.handleKeyDown(0, i + 1);
  assert.equal(engine.getState().multiplier, 2);

  engine.activateStarPower();
  assert.equal(engine.getState().multiplier, 4);

  engine.handleKeyDown(0, 11);
  assert.equal(engine.getState().combo, 11);
});

test("rock meter: starts at 50, rises on hits, falls on misses, and clamps at 100", () => {
  const events = Array.from({ length: 20 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const engine = createGameEngine(events);
  assert.equal(engine.getState().rockMeter, 50);

  engine.handleKeyDown(0, 1);
  assert.ok(engine.getState().rockMeter > 50);

  for (let i = 1; i < 20; i++) engine.handleKeyDown(0, i + 1);
  assert.equal(engine.getState().rockMeter, 100);
});

test("rock meter: falls on auto-miss", () => {
  const engine = createGameEngine([event({ time: 1, frets: [0] })]);
  engine.update(1.2);
  assert.ok(engine.getState().rockMeter < 50);
});

test("rock meter: a dropped sustain doesn't drain it — only a real miss does", () => {
  const engine = createGameEngine([event({ time: 1, frets: [0], duration: 1 })]);
  engine.handleKeyDown(0, 1);
  const beforeDrop = engine.getState().rockMeter;
  engine.handleKeyUp(0, 1.5);
  assert.equal(engine.getState().rockMeter, beforeDrop);
});

test("rock meter: hitting zero sets failed to true and clamps at zero", () => {
  const events = Array.from({ length: 10 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const engine = createGameEngine(events);
  for (let i = 0; i < events.length; i++) engine.update(events[i].time + 0.2);
  assert.equal(engine.getState().rockMeter, 0);
  assert.equal(engine.getState().failed, true);
});

test("rock meter: an overstrum (wrong fret, not awaiting any chord) drains the meter like a miss", () => {
  const engine = createGameEngine([event({ time: 1, frets: [0] })]);
  const before = engine.getState().rockMeter;
  engine.handleKeyDown(4, 1);
  assert.ok(engine.getState().rockMeter < before);
});

test("rock meter: pressing a fret that's legitimately awaited by a pending chord doesn't penalize", () => {
  const engine = createGameEngine([event({ time: 1, frets: [0, 1] })]);
  const before = engine.getState().rockMeter;
  const result = engine.handleKeyDown(0, 1);
  assert.equal(result.type, "unmatched");
  assert.equal(result.type === "unmatched" && result.awaitingChord, true);
  assert.equal(engine.getState().rockMeter, before);
});

test("rock meter: miss loss is exactly 3x the hit gain (matches Guitar Hero III's ratio)", () => {
  const hitEngine = createGameEngine([event({ time: 1, frets: [0] })]);
  hitEngine.handleKeyDown(0, 1);
  const gain = hitEngine.getState().rockMeter - 50;

  const missEngine = createGameEngine([event({ time: 1, frets: [0] })]);
  missEngine.update(1.2);
  const loss = 50 - missEngine.getState().rockMeter;

  assert.equal(loss, gain * 3);
});

test("rock meter: Star Power drastically boosts the gain per hit while critical (near-fail rescue)", () => {
  const events = Array.from({ length: 11 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const starPowerPhrases = [{ startTime: 0, endTime: 20 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  for (let i = 0; i < 10; i++) engine.handleKeyDown(0, i + 1);
  engine.activateStarPower();
  assert.equal(engine.getState().starPowerActive, true);

  for (let i = 0; i < 8; i++) engine.handleKeyDown(4, 100 + i);
  const critical = engine.getState().rockMeter;
  assert.ok(critical < 10);

  engine.handleKeyDown(0, 11);
  assert.equal(engine.getState().rockMeter, critical + 12);
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
