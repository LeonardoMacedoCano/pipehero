import type { Fret, GameEngine, GameEvent, JudgmentWindows, KeyDownResult, PlayableEvent, StarPowerPhrase } from "../types.js";
import { classifyTiming, DEFAULT_JUDGMENT_WINDOWS } from "./judge.js";

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
const ROCK_METER_PERFECT_GAIN = 3;
const ROCK_METER_GOOD_GAIN = 1.5;
const ROCK_METER_MISS_LOSS = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createGameEngine(
  events: PlayableEvent[],
  { starPowerPhrases = [], windows = DEFAULT_JUDGMENT_WINDOWS }: { starPowerPhrases?: StarPowerPhrase[]; windows?: JudgmentWindows } = {}
): GameEngine {
  const pending: GameEvent[] = events.map((event) => ({
    ...event,
    state: "pending",
    rating: null,
    starPowerPhraseIndex: findPhraseIndex(starPowerPhrases, event.time),
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
  let starPowerMeter = 0;
  let starPowerActive = false;
  let lastUpdateTime: number | null = null;

  function findPhraseIndex(phrases: StarPowerPhrase[], time: number): number {
    return phrases.findIndex((phrase) => time >= phrase.startTime && time < phrase.endTime);
  }

  function scoreMultiplier(): number {
    const baseMultiplier = Math.min(MAX_BASE_MULTIPLIER, 1 + Math.floor(combo / MULTIPLIER_STREAK_STEP));
    return baseMultiplier * (starPowerActive ? STAR_POWER_SCORE_MULTIPLIER : 1);
  }

  function loseRockMeter(amount: number): void {
    rockMeter = clamp(rockMeter - amount, 0, MAX_ROCK_METER);
    if (rockMeter <= 0) failed = true;
  }

  function creditStarPower(event: GameEvent): void {
    const phraseIndex = event.starPowerPhraseIndex;
    if (phraseIndex < 0 || !phraseTotals[phraseIndex]) return;
    starPowerMeter = Math.min(MAX_STAR_POWER_METER, starPowerMeter + meterPerPhrase / phraseTotals[phraseIndex]);
  }

  function activateStarPower(): boolean {
    if (starPowerActive || starPowerMeter < STAR_POWER_ACTIVATION_THRESHOLD - STAR_POWER_METER_EPSILON) return false;
    starPowerActive = true;
    return true;
  }

  function findCompletableEvent(time: number): GameEvent | null {
    let closest: GameEvent | null = null;
    let closestDelta = Infinity;
    for (const event of pending) {
      if (event.state !== "pending") continue;
      const isComplete = event.frets.every((fret) => heldFrets.has(fret));
      if (!isComplete) continue;
      const delta = Math.abs(event.time - time);
      if (delta <= windows.good && delta < closestDelta) {
        closest = event;
        closestDelta = delta;
      }
    }
    return closest;
  }

  function isAwaitingChord(fret: Fret, time: number): boolean {
    return pending.some(
      (event) => event.state === "pending" && event.frets.includes(fret) && Math.abs(event.time - time) <= windows.good
    );
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

  function handleKeyDown(fret: Fret, time: number): KeyDownResult {
    heldFrets.add(fret);

    const event = findCompletableEvent(time);
    if (event) {
      const rating = classifyTiming(event.time - time, windows);
      event.state = "hit";
      event.rating = rating;
      hits.push(event);
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      score += Math.round(SCORE_BY_RATING[rating] * scoreMultiplier());
      if (rating !== "miss") {
        creditStarPower(event);
        rockMeter = clamp(rockMeter + (rating === "perfect" ? ROCK_METER_PERFECT_GAIN : ROCK_METER_GOOD_GAIN), 0, MAX_ROCK_METER);
      }

      if (event.duration > 0) {
        holdingEvents.add(event);
        for (const eventFret of event.frets) {
          sustainOwnerByFret.set(eventFret, event);
        }
      }

      return { type: "judged", event, rating };
    }

    return { type: "unmatched", fret, time, awaitingChord: isAwaitingChord(fret, time) };
  }

  function handleKeyUp(fret: Fret, time: number): void {
    heldFrets.delete(fret);
    const event = sustainOwnerByFret.get(fret);
    if (event && time < event.time + event.duration) {
      finalizeSustain(event, true);
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
      multiplier: scoreMultiplier(),
      rockMeter,
      failed,
    };
  }

  return { handleKeyDown, handleKeyUp, update, getState, activateStarPower };
}
