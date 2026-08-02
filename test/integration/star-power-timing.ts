import {
  createGameEngine,
  MAX_STAR_POWER_METER,
  STAR_POWER_CHARGE_MULTIPLIER,
  STAR_POWER_DRAIN_SECONDS,
} from "../../src/engine/gameEngine.js";
import type { PlayableEvent, StarPowerPhrase } from "../../src/types.js";

const FRAME_STEP = 1 / 60;
const TOLERANCE_SECONDS = FRAME_STEP * 2;
const PHRASE_COUNT = 4;
const NOTES_PER_PHRASE = 2;
const METER_PER_PHRASE = (MAX_STAR_POWER_METER * STAR_POWER_CHARGE_MULTIPLIER) / PHRASE_COUNT;
const HALF_METER = METER_PER_PHRASE;
const FULL_METER = METER_PER_PHRASE * 2;
const HALF_DURATION_SECONDS = (HALF_METER / MAX_STAR_POWER_METER) * STAR_POWER_DRAIN_SECONDS;
const FULL_DURATION_SECONDS = (FULL_METER / MAX_STAR_POWER_METER) * STAR_POWER_DRAIN_SECONDS;

function basePhrases(): StarPowerPhrase[] {
  return Array.from({ length: PHRASE_COUNT }, (_, i) => ({ startTime: i * 2, endTime: i * 2 + 2 }));
}

function baseEvents(phrases: StarPowerPhrase[]): PlayableEvent[] {
  return phrases.flatMap((phrase, phraseIndex) =>
    Array.from({ length: NOTES_PER_PHRASE }, (_, noteIndex) => ({
      time: phrase.startTime + noteIndex * 0.1,
      frets: [((phraseIndex * NOTES_PER_PHRASE + noteIndex) % 5) as PlayableEvent["frets"][number]],
      duration: 0,
      isChord: false,
      isHOPO: false,
    }))
  );
}

function measureDuration(phrasesToComplete: number): { meterAtActivation: number; durationSeconds: number } {
  const starPowerPhrases = basePhrases();
  const events = baseEvents(starPowerPhrases);
  const engine = createGameEngine(events, { starPowerPhrases });

  let time = 0;
  for (let i = 0; i < phrasesToComplete * NOTES_PER_PHRASE; i++) {
    time = events[i].time;
    engine.handleKeyDown(events[i].frets[0], time);
    engine.handleKeyUp(events[i].frets[0], time);
  }

  const meterAtActivation = engine.getState().starPowerMeter;
  const activated = engine.activateStarPower();
  if (!activated) {
    throw new Error(`activateStarPower() returned false at meter=${meterAtActivation}`);
  }

  let elapsed = 0;
  let currentTime = time;
  while (engine.getState().starPowerActive) {
    currentTime += FRAME_STEP;
    engine.update(currentTime);
    elapsed += FRAME_STEP;
    if (elapsed > 60) throw new Error("Star Power never ran out — runaway loop, aborting");
  }

  return { meterAtActivation, durationSeconds: elapsed };
}

console.log("=== Star Power duration: half meter vs. full meter ===\n");

const half = measureDuration(1);
console.log(`Half meter (${half.meterAtActivation}%): active for ${half.durationSeconds.toFixed(3)}s (expected ~${HALF_DURATION_SECONDS}s)`);

const full = measureDuration(2);
console.log(`Full meter (${full.meterAtActivation}%): active for ${full.durationSeconds.toFixed(3)}s (expected ~${FULL_DURATION_SECONDS}s)`);

const halfOk = half.meterAtActivation === HALF_METER && Math.abs(half.durationSeconds - HALF_DURATION_SECONDS) <= TOLERANCE_SECONDS;
const fullOk = full.meterAtActivation === FULL_METER && Math.abs(full.durationSeconds - FULL_DURATION_SECONDS) <= TOLERANCE_SECONDS;
const proportionOk = Math.abs(full.durationSeconds - half.durationSeconds * 2) <= TOLERANCE_SECONDS * 2;

console.log(`\nHalf meter ≈ ${HALF_DURATION_SECONDS}s: ${halfOk ? "OK ✔" : "FAILED ✘"}`);
console.log(`Full meter ≈ ${FULL_DURATION_SECONDS}s: ${fullOk ? "OK ✔" : "FAILED ✘"}`);
console.log(`Full duration is exactly double the half duration: ${proportionOk ? "OK ✔" : "FAILED ✘"}`);

const allOk = halfOk && fullOk && proportionOk;
console.log(`\nStar Power timing validation: ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);
