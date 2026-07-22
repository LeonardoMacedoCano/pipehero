import { readFileSync } from "node:fs";
import { parseChart } from "../../node_modules/parsehero/dist/index.js";
import { loadTrack } from "../../src/engine/chartTrack.js";
import { groupIntoPlayableEvents } from "../../src/engine/chordGrouping.js";
import { createPlaythrough } from "../../src/game/gamePlaythrough.js";
import type { Fret, KeyDownResult } from "../../src/types.js";

const raw = readFileSync("songs/dev-placeholder/notes.chart", "utf-8");
const { chart, warnings } = parseChart(raw);
const notes = loadTrack(chart, "ExpertSingle");
const events = groupIntoPlayableEvents(notes);
const offsetSeconds = chart.Song.offset ?? 0;

console.log(`Chart: ${chart.Song.name} — offset=${offsetSeconds}s`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Flattened notes: ${notes.length} — grouped events: ${events.length} (${events.filter((e) => e.isChord).length} chords, ${events.filter((e) => e.duration > 0).length} sustains)`);

let audioTime = 0;
const FRAME_STEP = 1 / 60;
const playthrough = createPlaythrough({
  notes,
  offsetSeconds,
  getAudioTime: () => audioTime,
});

const lastEvent = events[events.length - 1];
const totalDuration = lastEvent.time - offsetSeconds + lastEvent.duration + 1;
let nextEventIndex = 0;
const pendingReleases: { frets: Fret[]; releaseAudioTime: number }[] = [];

while (audioTime <= totalDuration) {
  playthrough.tick();

  while (nextEventIndex < events.length) {
    const event = events[nextEventIndex];
    const eventAudioTime = event.time - offsetSeconds;
    if (audioTime < eventAudioTime) break;

    let lastResult: KeyDownResult | null = null;
    for (const fret of event.frets) {
      lastResult = playthrough.pressFret(fret);
    }
    if (!lastResult || lastResult.type !== "judged") {
      console.error("Failure: event was not completed even after pressing all frets", event, lastResult);
      process.exit(1);
    }
    if (event.duration > 0) {
      pendingReleases.push({ frets: event.frets, releaseAudioTime: eventAudioTime + event.duration });
    } else {
      for (const fret of event.frets) playthrough.releaseFret(fret);
    }
    nextEventIndex++;
  }

  for (let i = pendingReleases.length - 1; i >= 0; i--) {
    if (audioTime >= pendingReleases[i].releaseAudioTime) {
      for (const fret of pendingReleases[i].frets) playthrough.releaseFret(fret);
      pendingReleases.splice(i, 1);
    }
  }

  audioTime += FRAME_STEP;
}

const state = playthrough.getState();
console.log("\n=== Result ===");
console.log(`Total events: ${state.totalNotes}`);
console.log(`Hits: ${state.hits.length}`);
console.log(`Misses: ${state.misses.length}`);
console.log(`Pending: ${state.pendingCount}`);
console.log(`Score: ${state.score}`);

const ok = state.hits.length === events.length && state.misses.length === 0 && state.pendingCount === 0;
console.log(`\nCumulative validation Phase 0 + 1 + 3 + 4: ${ok ? "OK ✔" : "FAILED ✘"}`);
process.exit(ok ? 0 : 1);
