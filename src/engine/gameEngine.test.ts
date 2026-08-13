import test from "node:test";
import assert from "node:assert/strict";
import type { Fret, PlayableEvent } from "../types.js";
import {
  createGameEngine,
  MAX_STAR_POWER_METER,
  STAR_POWER_ACTIVATION_THRESHOLD,
  STAR_POWER_CHARGE_MULTIPLIER,
} from "./gameEngine.js";
import { JUDGMENT_WINDOWS_BY_DIFFICULTY } from "./judge.js";

function meterPerPhrase(phraseCount: number): number {
  return (MAX_STAR_POWER_METER * STAR_POWER_CHARGE_MULTIPLIER) / phraseCount;
}

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

test("overstrum: a stray press with no note anywhere nearby resets combo and drains the rock meter, but by a smaller amount than missing a real note", () => {
  const engine = createGameEngine([event({ time: 5.0, frets: [0] })]);
  const before = engine.getState().rockMeter;
  const result = engine.handleKeyDown(1, 1.0);
  assert.equal(result.type, "unmatched");
  assert.equal(result.type === "unmatched" && result.awaitingChord, false);
  assert.equal(engine.getState().combo, 0);
  const strayLoss = before - engine.getState().rockMeter;
  assert.ok(strayLoss > 0);

  const missEngine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const beforeMiss = missEngine.getState().rockMeter;
  missEngine.update(1.2);
  const realMissLoss = beforeMiss - missEngine.getState().rockMeter;

  assert.ok(strayLoss < realMissLoss);
});

test("overstrum: a wrong fret pressed while a real note is due right there costs the full miss penalty, not the smaller stray one", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const before = engine.getState().rockMeter;
  const result = engine.handleKeyDown(4, 1.0);
  assert.equal(result.type, "unmatched");

  const missEngine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const beforeMiss = missEngine.getState().rockMeter;
  missEngine.update(1.2);

  assert.equal(engine.getState().rockMeter, before - (beforeMiss - missEngine.getState().rockMeter));
});

test("overstrum: pressing wrong-then-correct still scores the correct note, but the wrong press already broke combo/rock meter on its own", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const before = engine.getState().rockMeter;

  const wrong = engine.handleKeyDown(4, 1.0);
  assert.equal(wrong.type, "unmatched");
  assert.equal(engine.getState().combo, 0);
  assert.ok(engine.getState().rockMeter < before);
  const afterWrong = engine.getState().rockMeter;

  const correct = engine.handleKeyDown(0, 1.0);
  assert.equal(correct.type, "judged");
  assert.equal(engine.getState().score, 100);
  assert.equal(engine.getState().combo, 1);
  assert.equal(engine.getState().rockMeter, afterWrong + 1);
});

test("wrongInputs counts a stray press even when it doesn't cost a note miss, so it still disqualifies a full combo", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] }), event({ time: 2.0, frets: [0] })]);
  engine.handleKeyDown(0, 1.0);
  assert.equal(engine.getState().wrongInputs, 0);

  engine.handleKeyDown(1, 1.5);
  assert.equal(engine.getState().wrongInputs, 1);

  engine.handleKeyDown(0, 2.0);
  assert.equal(engine.getState().wrongInputs, 1);
  assert.equal(engine.getState().misses.length, 0);
  assert.equal(engine.getState().hits.length, 2);
});

test("overstrum: releasing the wrong fret before pressing the correct one doesn't avoid the penalty — each key press is judged on its own", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })]);
  const before = engine.getState().rockMeter;

  engine.handleKeyDown(4, 1.0);
  engine.handleKeyUp(4, 1.0);
  assert.ok(engine.getState().rockMeter < before);

  const result = engine.handleKeyDown(0, 1.0);
  assert.equal(result.type, "judged");
  assert.equal(engine.getState().score, 100);
});

test("overstrum: pressing one fret of a pending chord is legitimate anticipation, not penalized", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0, 2], isChord: true })]);
  const before = engine.getState().rockMeter;
  const result = engine.handleKeyDown(0, 1.0);
  assert.equal(result.type, "unmatched");
  assert.equal(result.type === "unmatched" && result.awaitingChord, true);
  assert.equal(engine.getState().combo, 0);
  assert.equal(engine.getState().rockMeter, before);
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
  engine.handleKeyUp(0, 1.0);
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
  engine.handleKeyUp(0, 1.0);
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

test("sustain: releasing within the good window of the end is tolerated, not dropped", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 2.0 - JUDGMENT_WINDOWS_BY_DIFFICULTY.Expert.good + 0.01);
  assert.equal(engine.getState().droppedSustains.length, 0);
  assert.equal(engine.getState().score, 150);
});

test("sustain: releasing right at the edge of the good window still counts as held", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 2.0 - JUDGMENT_WINDOWS_BY_DIFFICULTY.Expert.good);
  assert.equal(engine.getState().droppedSustains.length, 0);
  assert.equal(engine.getState().score, 150);
});

test("sustain: releasing just past the good window is still dropped", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })]);
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 2.0 - JUDGMENT_WINDOWS_BY_DIFFICULTY.Expert.good - 0.01);
  assert.equal(engine.getState().droppedSustains.length, 1);
  assert.equal(engine.getState().score, 100);
});

test("sustain: the release tolerance scales with the difficulty's judgment windows", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0], duration: 1.0 })], {
    windows: JUDGMENT_WINDOWS_BY_DIFFICULTY.Easy,
  });
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 2.0 - JUDGMENT_WINDOWS_BY_DIFFICULTY.Easy.good + 0.01);
  assert.equal(engine.getState().droppedSustains.length, 0);
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

test("star power: charges the phrase only after every note in it has been hit — no partial credit", () => {
  const events = [
    event({ time: 1.0, frets: [0] }),
    event({ time: 1.5, frets: [1] }),
    event({ time: 2.0, frets: [2] }),
    event({ time: 2.5, frets: [3] }),
  ];
  const starPowerPhrases = [{ startTime: 0.5, endTime: 3.0 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.0);
  assert.equal(engine.getState().starPowerMeter, 0);

  engine.handleKeyDown(1, 1.5);
  engine.handleKeyUp(1, 1.5);
  engine.handleKeyDown(2, 2.0);
  engine.handleKeyUp(2, 2.0);
  assert.equal(engine.getState().starPowerMeter, 0);

  const result = engine.handleKeyDown(3, 2.5);
  assert.equal(result.type === "judged" && result.starPowerPhraseCompleted, true);
  assert.equal(engine.getState().starPowerMeter, MAX_STAR_POWER_METER);
});

test("star power: missing one note in an otherwise-perfect phrase awards zero credit, and it stays zero", () => {
  const events = [
    event({ time: 1.0, frets: [0] }),
    event({ time: 1.5, frets: [1] }),
    event({ time: 2.0, frets: [2] }),
    event({ time: 2.5, frets: [3] }),
  ];
  const starPowerPhrases = [{ startTime: 0.5, endTime: 3.0 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.0);
  engine.handleKeyDown(1, 1.5);
  engine.handleKeyUp(1, 1.5);
  engine.update(2.2);
  assert.equal(engine.getState().misses.length, 1);
  assert.equal(engine.getState().starPowerPhraseBroken[0], true);

  const result = engine.handleKeyDown(3, 2.5);
  assert.equal(result.type === "judged" && result.starPowerPhraseCompleted, false);
  assert.equal(engine.getState().starPowerMeter, 0);
});

test("star power: completing a chord that ends a phrase credits the lump sum exactly once", () => {
  const events = [event({ time: 1.0, frets: [0] }), event({ time: 1.5, frets: [1, 2], isChord: true })];
  const starPowerPhrases = [{ startTime: 0.5, endTime: 2.0 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.0);

  const first = engine.handleKeyDown(1, 1.5);
  assert.equal(first.type, "unmatched");
  assert.equal(engine.getState().starPowerMeter, 0);

  const second = engine.handleKeyDown(2, 1.5);
  assert.equal(second.type === "judged" && second.starPowerPhraseCompleted, true);
  assert.equal(engine.getState().starPowerMeter, MAX_STAR_POWER_METER);
});

test("star power: notes outside a phrase don't fill the meter", () => {
  const events = [event({ time: 1.0, frets: [0] })];
  const starPowerPhrases = [{ startTime: 5.0, endTime: 6.0 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  assert.equal(engine.getState().starPowerMeter, 0);
});

test("star power: doesn't activate if the meter is below the threshold (50%)", () => {
  const starPowerPhrases = Array.from({ length: 5 }, (_, i) => ({ startTime: i, endTime: i + 1 }));
  const events = starPowerPhrases.map((phrase, i) => event({ time: phrase.startTime + 0.5, frets: [(i % 5) as Fret] }));
  const engine = createGameEngine(events, { starPowerPhrases });
  assert.ok(meterPerPhrase(starPowerPhrases.length) < STAR_POWER_ACTIVATION_THRESHOLD);

  engine.handleKeyDown(events[0].frets[0], events[0].time);
  assert.equal(engine.activateStarPower(), false);
  assert.equal(engine.getState().starPowerActive, false);
});

test("star power: activates at exactly 50%, even when floating-point addition lands a hair under it", () => {
  const starPowerPhrases = Array.from({ length: 48 }, (_, i) => ({ startTime: i, endTime: i + 1 }));
  const events = starPowerPhrases.map((phrase, i) => event({ time: phrase.startTime + 0.5, frets: [(i % 5) as Fret] }));
  const engine = createGameEngine(events, { starPowerPhrases });

  for (const e of events.slice(0, 12)) {
    engine.handleKeyDown(e.frets[0], e.time);
    engine.handleKeyUp(e.frets[0], e.time);
  }

  assert.ok(engine.getState().starPowerMeter < STAR_POWER_ACTIVATION_THRESHOLD);
  assert.equal(engine.activateStarPower(), true);
  assert.equal(engine.getState().starPowerActive, true);
});

test("star power: activating doubles the score of following hits", () => {
  const events = [
    event({ time: 1.0, frets: [0] }),
    event({ time: 1.5, frets: [1] }),
    event({ time: 3.0, frets: [2] }),
  ];
  const starPowerPhrases = [{ startTime: 0, endTime: 2 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.handleKeyDown(0, 1.0);
  engine.handleKeyUp(0, 1.0);
  engine.handleKeyDown(1, 1.5);
  const activated = engine.activateStarPower();
  assert.equal(activated, true);

  const scoreBeforeThirdHit = engine.getState().score;
  engine.handleKeyDown(2, 3.0);
  assert.equal(engine.getState().score - scoreBeforeThirdHit, 200);
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

test("star power: a non-finite update() is ignored instead of poisoning the meter with NaN forever", () => {
  const events = [event({ time: 1.0, frets: [0] })];
  const starPowerPhrases = [{ startTime: 0, endTime: 2 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  engine.update(0.5);
  engine.update(NaN);
  engine.handleKeyDown(0, 1.0);
  engine.activateStarPower();
  engine.update(1.1);

  const state = engine.getState();
  assert.ok(Number.isFinite(state.starPowerMeter));
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
  const starPowerPhrases = [{ startTime: 0, endTime: 10.5 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  for (let i = 0; i < 10; i++) engine.handleKeyDown(0, i + 1);
  assert.equal(engine.getState().multiplier, 2);

  engine.activateStarPower();
  assert.equal(engine.getState().multiplier, 4);

  engine.handleKeyDown(0, 11);
  assert.equal(engine.getState().combo, 11);
});

test("rock meter: starts at 50, rises on hits, falls on misses, and clamps at 100", () => {
  const events = Array.from({ length: 60 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const engine = createGameEngine(events);
  assert.equal(engine.getState().rockMeter, 50);

  engine.handleKeyDown(0, 1);
  assert.ok(engine.getState().rockMeter > 50);

  for (let i = 1; i < 60; i++) engine.handleKeyDown(0, i + 1);
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
  const events = Array.from({ length: 20 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const engine = createGameEngine(events);
  for (let i = 0; i < events.length; i++) engine.update(events[i].time + 0.2);
  assert.equal(engine.getState().rockMeter, 0);
  assert.equal(engine.getState().failed, true);
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
  const hitEvents = Array.from({ length: 10 }, (_, i) => event({ time: i + 1, frets: [0] }));
  const missEvents = Array.from({ length: 17 }, (_, i) => event({ time: 11 + i, frets: [1] }));
  const rescueEvent = event({ time: 28, frets: [0] });
  const starPowerPhrases = [{ startTime: 0, endTime: 10.5 }];
  const engine = createGameEngine([...hitEvents, ...missEvents, rescueEvent], { starPowerPhrases });

  for (let i = 0; i < 10; i++) engine.handleKeyDown(0, i + 1);
  engine.activateStarPower();
  assert.equal(engine.getState().starPowerActive, true);

  for (let i = 0; i < 17; i++) engine.update(11 + i + 0.2);
  const critical = engine.getState().rockMeter;
  assert.ok(critical < 10);
  assert.equal(engine.getState().starPowerActive, true);

  engine.handleKeyDown(0, 28);
  assert.equal(engine.getState().rockMeter, critical + 4);
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

test("strum mode: holding the correct fret alone doesn't score anything by itself — only strum() judges", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })], { strumMode: true });
  const result = engine.handleKeyDown(0, 1.0);
  assert.equal(result.type, "unmatched");
  assert.equal(engine.getState().score, 0);
  assert.equal(engine.getState().pendingCount, 1);
});

test("strum mode: strumming with the correct fret held hits the note", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })], { strumMode: true });
  engine.handleKeyDown(0, 1.0);
  const result = engine.strum(1.0);
  assert.equal(result.type, "judged");
  assert.equal(result.type === "judged" && result.rating, "perfect");
  assert.equal(engine.getState().score, 100);
});

test("strum mode: strumming with nothing held doesn't kill the note — it can still be hit before the window closes", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })], { strumMode: true });
  const whiff = engine.strum(0.95);
  assert.equal(whiff.type, "whiffed");
  assert.equal(engine.getState().pendingCount, 1);

  engine.handleKeyDown(0, 1.0);
  const result = engine.strum(1.0);
  assert.equal(result.type, "judged");
});

test("strum mode: chords require the exact combination at the moment of the strum", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0, 2] })], { strumMode: true });
  engine.handleKeyDown(0, 1.0);
  const incomplete = engine.strum(1.0);
  assert.equal(incomplete.type, "whiffed");

  engine.handleKeyDown(2, 1.0);
  const complete = engine.strum(1.0);
  assert.equal(complete.type, "judged");
});

test("strum mode: a held fret outside the chord blocks it, same as the single-note anchoring rule", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0, 2], isChord: true })], { strumMode: true });
  engine.handleKeyDown(0, 1.0);
  engine.handleKeyDown(2, 1.0);
  engine.handleKeyDown(4, 1.0);
  assert.equal(engine.strum(1.0).type, "whiffed");
});

test("strum mode: an anchored lower fret below the chord's highest note doesn't block it", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [2, 3], isChord: true })], { strumMode: true });
  engine.handleKeyDown(0, 0.9);
  engine.handleKeyDown(2, 1.0);
  engine.handleKeyDown(3, 1.0);
  assert.equal(engine.strum(1.0).type, "judged");
});

test("strum mode: highest fret wins — holding an extra higher fret blocks a single note, regardless of press order", () => {
  const engineHigherFirst = createGameEngine([event({ time: 1.0, frets: [0] })], { strumMode: true });
  engineHigherFirst.handleKeyDown(4, 0.9);
  engineHigherFirst.handleKeyDown(0, 1.0);
  assert.equal(engineHigherFirst.strum(1.0).type, "whiffed");

  const engineLowerFirst = createGameEngine([event({ time: 1.0, frets: [0] })], { strumMode: true });
  engineLowerFirst.handleKeyDown(0, 1.0);
  engineLowerFirst.handleKeyDown(4, 1.0);
  assert.equal(engineLowerFirst.strum(1.0).type, "whiffed");
});

test("strum mode: holding a lower fret as an anchor doesn't block the correct higher note", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [3] })], { strumMode: true });
  engine.handleKeyDown(0, 0.9);
  engine.handleKeyDown(3, 1.0);
  assert.equal(engine.strum(1.0).type, "judged");
});

test("strum mode: sustaining a higher fret doesn't block strumming a lower single note on another fret", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [4], duration: 1.0 }), event({ time: 1.5, frets: [0] })], {
    strumMode: true,
  });
  engine.handleKeyDown(4, 1.0);
  engine.strum(1.0);
  assert.equal(engine.getState().holdingCount, 1);

  engine.handleKeyDown(0, 1.5);
  assert.equal(engine.strum(1.5).type, "judged");
});

test("strum mode: re-strumming a discrete note on the same fret as its own active sustain hits normally", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [2], duration: 1.0 }), event({ time: 1.5, frets: [2] })], {
    strumMode: true,
  });
  engine.handleKeyDown(2, 1.0);
  assert.equal(engine.strum(1.0).type, "judged");
  assert.equal(engine.getState().holdingCount, 1);

  const result = engine.strum(1.5);
  assert.equal(result.type, "judged");
  assert.equal(engine.getState().combo, 2);
});

test("strum mode: a whiffed strum still drains the rock meter and resets combo, tiered the same as tap mode", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })], { strumMode: true });
  const before = engine.getState().rockMeter;
  engine.handleKeyDown(4, 1.0);
  engine.strum(1.0);
  assert.equal(engine.getState().combo, 0);
  assert.ok(engine.getState().rockMeter < before);
});

test("strum mode: releasing frets and pressing new ones only counts what's held at the moment of the strum", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [0] })], { strumMode: true });
  engine.handleKeyDown(4, 0.5);
  engine.handleKeyUp(4, 0.6);
  engine.handleKeyDown(0, 1.0);
  const result = engine.strum(1.0);
  assert.equal(result.type, "judged");
});

test("strum mode: an open note hits when strummed with no colored fret held", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [7] })], { strumMode: true });
  const result = engine.strum(1.0);
  assert.equal(result.type, "judged");
});

test("strum mode: an open note doesn't hit if a colored fret is held during the strum", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [7] })], { strumMode: true });
  engine.handleKeyDown(2, 1.0);
  const result = engine.strum(1.0);
  assert.equal(result.type, "whiffed");
});

test("strum mode: an active sustain on a colored fret also blocks an open note — hand is physically occupied", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [2], duration: 1.0 }), event({ time: 1.5, frets: [7] })], {
    strumMode: true,
  });
  engine.handleKeyDown(2, 1.0);
  engine.strum(1.0);
  assert.equal(engine.getState().holdingCount, 1);

  const result = engine.strum(1.5);
  assert.equal(result.type, "whiffed");
});

test("strum mode: a colored note is unaffected by the open-note matching rule", () => {
  const engine = createGameEngine([event({ time: 1.0, frets: [2] })], { strumMode: true });
  engine.handleKeyDown(2, 1.0);
  const result = engine.strum(1.0);
  assert.equal(result.type, "judged");
});
