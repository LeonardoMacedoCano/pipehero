import type { Fret, GameEngine, GameEvent, JudgmentWindows, KeyDownResult, PlayableEvent, Rating, StarPowerPhrase, StrumResult } from "../types.js";
import { classifyTiming, DEFAULT_JUDGMENT_WINDOWS } from "./judge.js";
import { rockTierFor } from "./rockMeter.js";
import { phraseIndexAt } from "./starPower.js";

const SCORE_BY_RATING = { perfect: 100, good: 50, miss: 0 };
const SUSTAIN_HOLD_BONUS = 50;

const MULTIPLIER_STREAK_STEP = 10;
const MAX_BASE_MULTIPLIER = 4;

export const MAX_STAR_POWER_METER = 100;
export const STAR_POWER_CHARGE_MULTIPLIER = 2;
export const STAR_POWER_ACTIVATION_THRESHOLD = 50;
export const STAR_POWER_METER_EPSILON = 1e-6;
export const STAR_POWER_DRAIN_SECONDS = 25;
const STAR_POWER_DRAIN_PER_SECOND = MAX_STAR_POWER_METER / STAR_POWER_DRAIN_SECONDS;
const STAR_POWER_SCORE_MULTIPLIER = 2;

const MAX_ROCK_METER = 100;
const ROCK_METER_START = 50;
const ROCK_METER_HIT_GAIN = 1;
const ROCK_METER_MISS_LOSS = ROCK_METER_HIT_GAIN * 3;
const ROCK_METER_STRAY_PRESS_LOSS = ROCK_METER_HIT_GAIN;
const ROCK_METER_STAR_POWER_RESCUE_MULTIPLIER = 4;

const FRET_RANK: Partial<Record<Fret, number>> = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createGameEngine(
  events: PlayableEvent[],
  {
    starPowerPhrases = [],
    windows = DEFAULT_JUDGMENT_WINDOWS,
    strumMode = false,
  }: { starPowerPhrases?: StarPowerPhrase[]; windows?: JudgmentWindows; strumMode?: boolean } = {}
): GameEngine {
  const pending: GameEvent[] = events.map((event) => ({
    ...event,
    state: "pending",
    rating: null,
    starPowerPhraseIndex: phraseIndexAt(starPowerPhrases, event.time),
  }));
  const hits: GameEvent[] = [];
  const misses: GameEvent[] = [];
  const droppedSustains: GameEvent[] = [];
  const heldFrets = new Set<Fret>();
  const holdingEvents = new Set<GameEvent>();
  const sustainOwnerByFret = new Map<Fret, GameEvent>();
  let combo = 0;
  let maxCombo = 0;
  let score = 0;
  let rockMeter = ROCK_METER_START;
  let failed = false;

  const phraseTotals = starPowerPhrases.map(
    (_, index) => pending.filter((event) => event.starPowerPhraseIndex === index).length
  );
  const meterPerPhrase =
    starPowerPhrases.length > 0 ? (MAX_STAR_POWER_METER * STAR_POWER_CHARGE_MULTIPLIER) / starPowerPhrases.length : 0;
  const phraseHitCounts = starPowerPhrases.map(() => 0);
  const phraseBroken = starPowerPhrases.map(() => false);
  let starPowerMeter = 0;
  let starPowerActive = false;
  let lastUpdateTime: number | null = null;

  function scoreMultiplier(): number {
    const baseMultiplier = Math.min(MAX_BASE_MULTIPLIER, 1 + Math.floor(combo / MULTIPLIER_STREAK_STEP));
    return baseMultiplier * (starPowerActive ? STAR_POWER_SCORE_MULTIPLIER : 1);
  }

  function loseRockMeter(amount: number): void {
    rockMeter = clamp(rockMeter - amount, 0, MAX_ROCK_METER);
    if (rockMeter <= 0) failed = true;
  }

  function breakStarPowerPhrase(phraseIndex: number): void {
    if (phraseIndex < 0 || phraseIndex >= phraseBroken.length) return;
    phraseBroken[phraseIndex] = true;
  }

  function registerStarPowerHit(event: GameEvent): boolean {
    const phraseIndex = event.starPowerPhraseIndex;
    if (phraseIndex < 0 || !phraseTotals[phraseIndex] || phraseBroken[phraseIndex]) return false;
    phraseHitCounts[phraseIndex] += 1;
    if (phraseHitCounts[phraseIndex] < phraseTotals[phraseIndex]) return false;
    starPowerMeter = Math.min(MAX_STAR_POWER_METER, starPowerMeter + meterPerPhrase);
    return true;
  }

  function activateStarPower(): boolean {
    if (starPowerActive || starPowerMeter < STAR_POWER_ACTIVATION_THRESHOLD - STAR_POWER_METER_EPSILON) return false;
    starPowerActive = true;
    return true;
  }

  function findNearestPending(time: number, matches: (event: GameEvent) => boolean): GameEvent | null {
    let closest: GameEvent | null = null;
    let closestDelta = Infinity;
    for (const event of pending) {
      if (event.state !== "pending") continue;
      const delta = Math.abs(event.time - time);
      if (delta > windows.good || delta >= closestDelta) continue;
      if (!matches(event)) continue;
      closest = event;
      closestDelta = delta;
    }
    return closest;
  }

  function findCompletableEvent(time: number): GameEvent | null {
    return findNearestPending(time, (event) => event.frets.every((fret) => heldFrets.has(fret)));
  }

  function isAwaitingChord(fret: Fret, time: number): boolean {
    return pending.some(
      (event) => event.state === "pending" && event.frets.includes(fret) && Math.abs(event.time - time) <= windows.good
    );
  }

  function hasNearbyNote(time: number): boolean {
    return pending.some((event) => event.state === "pending" && Math.abs(event.time - time) <= windows.good);
  }

  function isHighestForTarget(target: Fret): boolean {
    if (!heldFrets.has(target)) return false;
    const targetRank = FRET_RANK[target];
    for (const fret of heldFrets) {
      if (fret === target || sustainOwnerByFret.has(fret)) continue;
      const rank = FRET_RANK[fret];
      if (rank !== undefined && (targetRank === undefined || rank > targetRank)) return false;
    }
    return true;
  }

  function noColorFretHeld(): boolean {
    return [0, 1, 2, 3, 4].every((fret) => !heldFrets.has(fret as Fret));
  }

  function findStrumMatch(time: number): GameEvent | null {
    const openReady = noColorFretHeld();
    return findNearestPending(time, (event) => {
      if (event.frets.length === 1 && event.frets[0] === 7) return openReady;
      if (!event.frets.every((fret) => heldFrets.has(fret))) return false;
      return event.frets.length === 1 ? isHighestForTarget(event.frets[0]) : true;
    });
  }

  function finalizeSustain(event: GameEvent, dropped: boolean): void {
    if (!holdingEvents.has(event)) return;
    holdingEvents.delete(event);
    for (const fret of event.frets) {
      if (sustainOwnerByFret.get(fret) === event) sustainOwnerByFret.delete(fret);
    }
    if (dropped) {
      droppedSustains.push(event);
    } else {
      score += Math.round(SUSTAIN_HOLD_BONUS * scoreMultiplier());
    }
  }

  function applyHit(event: GameEvent, time: number): { rating: Rating; starPowerPhraseCompleted: boolean } {
    const rating = classifyTiming(event.time - time, windows);
    event.state = "hit";
    event.rating = rating;
    hits.push(event);
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    score += Math.round(SCORE_BY_RATING[rating] * scoreMultiplier());

    let starPowerPhraseCompleted = false;
    if (rating !== "miss") {
      starPowerPhraseCompleted = registerStarPowerHit(event);
      const rescued = starPowerActive && rockTierFor(rockMeter) === "critical";
      const gain = ROCK_METER_HIT_GAIN * (rescued ? ROCK_METER_STAR_POWER_RESCUE_MULTIPLIER : 1);
      rockMeter = clamp(rockMeter + gain, 0, MAX_ROCK_METER);
    } else {
      breakStarPowerPhrase(event.starPowerPhraseIndex);
    }

    if (event.duration > 0) {
      holdingEvents.add(event);
      for (const eventFret of event.frets) {
        sustainOwnerByFret.set(eventFret, event);
      }
    }

    return { rating, starPowerPhraseCompleted };
  }

  function applyWrongInput(time: number): void {
    combo = 0;
    loseRockMeter(hasNearbyNote(time) ? ROCK_METER_MISS_LOSS : ROCK_METER_STRAY_PRESS_LOSS);
  }

  function handleKeyDown(fret: Fret, time: number): KeyDownResult {
    heldFrets.add(fret);

    if (strumMode) {
      return { type: "unmatched", fret, time, awaitingChord: isAwaitingChord(fret, time) };
    }

    const event = findCompletableEvent(time);
    if (event) {
      const { rating, starPowerPhraseCompleted } = applyHit(event, time);
      return { type: "judged", event, rating, starPowerPhraseCompleted };
    }

    const awaitingChord = isAwaitingChord(fret, time);
    if (!awaitingChord) applyWrongInput(time);
    return { type: "unmatched", fret, time, awaitingChord };
  }

  function strum(time: number): StrumResult {
    const event = findStrumMatch(time);
    if (event) {
      const { rating, starPowerPhraseCompleted } = applyHit(event, time);
      return { type: "judged", event, rating, starPowerPhraseCompleted };
    }
    applyWrongInput(time);
    return { type: "whiffed", time };
  }

  function handleKeyUp(fret: Fret, time: number): void {
    heldFrets.delete(fret);
    const event = sustainOwnerByFret.get(fret);
    if (event) {
      finalizeSustain(event, time < event.time + event.duration - windows.good);
    }
  }

  function update(currentTime: number): GameEvent[] {
    const newlyMissed: GameEvent[] = [];
    for (const event of pending) {
      if (event.state === "pending" && currentTime - event.time > windows.good) {
        event.state = "missed";
        event.rating = "miss";
        misses.push(event);
        newlyMissed.push(event);
        combo = 0;
        loseRockMeter(ROCK_METER_MISS_LOSS);
        breakStarPowerPhrase(event.starPowerPhraseIndex);
      }
    }

    for (const event of holdingEvents) {
      if (currentTime >= event.time + event.duration) {
        finalizeSustain(event, false);
      }
    }

    if (starPowerActive) {
      const elapsed = lastUpdateTime !== null ? Math.max(0, currentTime - lastUpdateTime) : 0;
      starPowerMeter = Math.max(0, starPowerMeter - STAR_POWER_DRAIN_PER_SECOND * elapsed);
      if (starPowerMeter <= 0) {
        starPowerMeter = 0;
        starPowerActive = false;
      }
    }
    lastUpdateTime = currentTime;

    return newlyMissed;
  }

  function getState() {
    return {
      score,
      combo,
      maxCombo,
      hits: [...hits],
      misses: [...misses],
      droppedSustains: [...droppedSustains],
      pendingCount: pending.filter((event) => event.state === "pending").length,
      holdingCount: holdingEvents.size,
      activeHolds: [...holdingEvents],
      totalNotes: events.length,
      starPowerMeter,
      starPowerActive,
      starPowerPhraseBroken: [...phraseBroken],
      multiplier: scoreMultiplier(),
      rockMeter,
      failed,
    };
  }

  return { handleKeyDown, handleKeyUp, strum, update, getState, activateStarPower };
}
