import { readFileSync } from "node:fs";
import { parseChart } from "../../node_modules/parsehero/dist/index.js";
import { loadTrack } from "../../src/engine/chartTrack.js";
import { groupIntoPlayableEvents } from "../../src/engine/chordGrouping.js";
import { createGameEngine } from "../../src/engine/gameEngine.js";

const chartPath = process.argv[2] ?? "test/fixtures/synthetic-complex.chart";
const raw = readFileSync(chartPath, "utf-8");
const { chart, warnings } = parseChart(raw);

const notes = loadTrack(chart, "ExpertSingle");
const events = groupIntoPlayableEvents(notes);
console.log(`Chart: ${chart.Song.name} — ${chart.Song.artist}`);
console.log(`Parser warnings: ${warnings.length}`);
console.log(`Flattened notes (chartTrack): ${notes.length} — grouped events (engine): ${events.length}`);

const engine = createGameEngine(events);

for (const evt of events) {
  for (const fret of evt.frets) {
    const result = engine.handleKeyDown(fret, evt.time);
    if (evt.frets.length === 1 && (result.type !== "judged" || result.rating !== "perfect")) {
      console.error("Unexpected failure judging event:", evt, result);
      process.exit(1);
    }
  }
  for (const fret of evt.frets) {
    engine.handleKeyUp(fret, evt.time + evt.duration);
  }
}

const lastEvent = events[events.length - 1];
engine.update(lastEvent.time + lastEvent.duration + 1);

const state = engine.getState();
console.log("\n=== Result ===");
console.log(`Total events: ${state.totalNotes}`);
console.log(`Events hit: ${state.hits.length}`);
console.log(`Events missed: ${state.misses.length}`);
console.log(`Events still pending: ${state.pendingCount}`);

const ok = state.totalNotes === events.length && state.hits.length === events.length && state.misses.length === 0;

console.log(`\nCumulative validation Phase 0 + Phase 1 + Phase 4: ${ok ? "OK ✔" : "FAILED ✘"}`);
process.exit(ok ? 0 : 1);
