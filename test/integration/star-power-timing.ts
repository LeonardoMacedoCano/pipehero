import { createGameEngine } from "../../src/engine/gameEngine.js";
import type { PlayableEvent } from "../../src/types.js";

const FRAME_STEP = 1 / 60;
const TOLERANCE_SECONDS = FRAME_STEP * 2;

function baseEvents(): PlayableEvent[] {
  return [
    { time: 1.0, frets: [0], duration: 0, isChord: false, isHOPO: false },
    { time: 1.1, frets: [1], duration: 0, isChord: false, isHOPO: false },
  ];
}

function measureDuration(notesToHit: number): { meterAtActivation: number; durationSeconds: number } {
  const events = baseEvents();
  const starPowerPhrases = [{ startTime: 0, endTime: 2.0 }];
  const engine = createGameEngine(events, { starPowerPhrases });

  let time = 0;
  for (let i = 0; i < notesToHit; i++) {
    time = events[i].time;
    engine.handleKeyDown(events[i].frets[0], time);
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
console.log(`Half meter (${half.meterAtActivation}%): active for ${half.durationSeconds.toFixed(3)}s (expected ~12.5s)`);

const full = measureDuration(2);
console.log(`Full meter (${full.meterAtActivation}%): active for ${full.durationSeconds.toFixed(3)}s (expected ~25.0s)`);

const halfOk = half.meterAtActivation === 50 && Math.abs(half.durationSeconds - 12.5) <= TOLERANCE_SECONDS;
const fullOk = full.meterAtActivation === 100 && Math.abs(full.durationSeconds - 25.0) <= TOLERANCE_SECONDS;
const proportionOk = Math.abs(full.durationSeconds - half.durationSeconds * 2) <= TOLERANCE_SECONDS * 2;

console.log(`\nHalf meter ≈ 12.5s: ${halfOk ? "OK ✔" : "FAILED ✘"}`);
console.log(`Full meter ≈ 25.0s: ${fullOk ? "OK ✔" : "FAILED ✘"}`);
console.log(`Full duration is exactly double the half duration: ${proportionOk ? "OK ✔" : "FAILED ✘"}`);

const allOk = halfOk && fullOk && proportionOk;
console.log(`\nStar Power timing validation: ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);
