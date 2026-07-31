import {
  createGameEngine,
  MAX_STAR_POWER_METER,
  STAR_POWER_CHARGE_MULTIPLIER,
  STAR_POWER_DRAIN_SECONDS,
} from "../../src/engine/gameEngine.js";
import type { PlayableEvent } from "../../src/types.js";

const FRAME_STEP = 1 / 60;
const TOLERANCE_SECONDS = FRAME_STEP * 2;
const PHRASE_COUNT = 2;
const NOTES_PER_RUN = 4;
const METER_PER_PHRASE = (MAX_STAR_POWER_METER * STAR_POWER_CHARGE_MULTIPLIER) / PHRASE_COUNT;
const HALF_METER = (METER_PER_PHRASE / NOTES_PER_RUN) * 2;
const FULL_METER = (METER_PER_PHRASE / NOTES_PER_RUN) * NOTES_PER_RUN;
const HALF_DURATION_SECONDS = (HALF_METER / MAX_STAR_POWER_METER) * STAR_POWER_DRAIN_SECONDS;
const FULL_DURATION_SECONDS = (FULL_METER / MAX_STAR_POWER_METER) * STAR_POWER_DRAIN_SECONDS;

function baseEvents(): PlayableEvent[] {
  return [
    { time: 1.0, frets: [0], duration: 0, isChord: false, isHOPO: false },
    { time: 1.1, frets: [1], duration: 0, isChord: false, isHOPO: false },
    { time: 1.2, frets: [2], duration: 0, isChord: false, isHOPO: false },
    { time: 1.3, frets: [3], duration: 0, isChord: false, isHOPO: false },
  ];
}

function measureDuration(notesToHit: number): { meterAtActivation: number; durationSeconds: number } {
  const events = baseEvents();
  const starPowerPhrases = [
    { startTime: 0, endTime: 2.0 },
    { startTime: 2.0, endTime: 4.0 },
  ];
  const engine = createGameEngine(events, { starPowerPhrases });

  let time = 0;
  for (let i = 0; i < notesToHit; i++) {
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

const half = measureDuration(2);
console.log(`Half meter (${half.meterAtActivation}%): active for ${half.durationSeconds.toFixed(3)}s (expected ~${HALF_DURATION_SECONDS}s)`);

const full = measureDuration(4);
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
