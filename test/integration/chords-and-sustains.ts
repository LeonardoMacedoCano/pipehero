import { readFileSync } from "node:fs";
import { parseChart } from "../../node_modules/parsehero/dist/index.js";
import { loadTrack } from "../../src/engine/chartTrack.js";
import { groupIntoPlayableEvents } from "../../src/engine/chordGrouping.js";
import { createGameEngine } from "../../src/engine/gameEngine.js";

const raw = readFileSync("test/fixtures/synthetic-complex.chart", "utf-8");
const { chart } = parseChart(raw);
const notes = loadTrack(chart, "ExpertSingle");
const events = groupIntoPlayableEvents(notes);

const chordEvents = events.filter((e) => e.isChord);
const sustainEvents = events.filter((e) => e.duration > 0);
console.log(`Chart: ${chart.Song.name} — ${events.length} events (${chordEvents.length} chords, ${sustainEvents.length} sustains)`);

const engine = createGameEngine(events);

for (const evt of events) {
  for (const fret of evt.frets) engine.handleKeyDown(fret, evt.time);
  const releaseTime = evt.time + evt.duration;
  for (const fret of evt.frets) engine.handleKeyUp(fret, releaseTime);
}
const lastEvent = events[events.length - 1];
engine.update(lastEvent.time + lastEvent.duration + 1);

const state = engine.getState();

const MULTIPLIER_STREAK_STEP = 10;
const MAX_BASE_MULTIPLIER = 4;
function multiplierForCombo(combo: number): number {
  return Math.min(MAX_BASE_MULTIPLIER, 1 + Math.floor(combo / MULTIPLIER_STREAK_STEP));
}

let expectedBaseScore = 0;
for (let i = 1; i <= events.length; i++) {
  expectedBaseScore += 100 * multiplierForCombo(i);
}
const finalMultiplier = multiplierForCombo(events.length);
const expectedSustainBonus = sustainEvents.length * 50 * finalMultiplier;
const expectedScore = expectedBaseScore + expectedSustainBonus;

console.log("\n=== Scenario: perfect player (hits everything, holds sustains to the end) ===");
console.log(`Hits: ${state.hits.length}/${events.length}`);
console.log(`Misses: ${state.misses.length}`);
console.log(`Score: ${state.score} (expected: ${expectedScore} = ${expectedBaseScore} base + ${expectedSustainBonus} sustain bonus)`);

const scenario1Ok =
  state.hits.length === events.length && state.misses.length === 0 && state.score === expectedScore;

const engine2 = createGameEngine(events);
const firstChord = chordEvents[0];
engine2.handleKeyDown(firstChord.frets[0], firstChord.time);
const missed = engine2.update(firstChord.time + 1);
const scenario2Ok =
  missed.some((e) => e.time === firstChord.time && e.frets.join(",") === firstChord.frets.join(",")) &&
  engine2.getState().hits.length === 0;

console.log("\n=== Scenario: incomplete chord becomes a miss (no partial hit) ===");
console.log(`Chord tested: frets [${firstChord.frets.join(",")}] at t=${firstChord.time.toFixed(3)}s`);
console.log(`Result: ${scenario2Ok ? "correctly missed ✔" : "FAILED — should not have been accepted"}`);

const engine3 = createGameEngine(events);
const firstSustain = sustainEvents[0];
for (const fret of firstSustain.frets) engine3.handleKeyDown(fret, firstSustain.time);
const halfway = firstSustain.time + firstSustain.duration / 2;
for (const fret of firstSustain.frets) engine3.handleKeyUp(fret, halfway);
const scoreAfterHalfSustain = engine3.getState().score;
const expectedScoreAfterDrop = 100;
const droppedCorrectly = engine3.getState().droppedSustains.length === 1;
const scenario3Ok = scoreAfterHalfSustain === expectedScoreAfterDrop && droppedCorrectly;

console.log("\n=== Scenario: releasing a sustain halfway drops it (all-or-nothing, no partial bonus) ===");
console.log(`Score: ${scoreAfterHalfSustain} (expected: ${expectedScoreAfterDrop})`);
console.log(`Result: ${scenario3Ok ? "OK ✔" : "FAILED"}`);

const allOk = scenario1Ok && scenario2Ok && scenario3Ok;
console.log(`\nPhase 4 validation (chords + sustains against a real chart): ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);
