import { readFileSync } from "node:fs";
import { parseChart, type NoteEvent, type Timed } from "../node_modules/parsehero/dist/index.js";

const path = process.argv[2];
if (!path) {
  console.error("Usage: tsx parse-chart.ts <path-to-chart-file>");
  process.exit(1);
}

const raw = readFileSync(path, "utf-8");
const { chart, warnings } = parseChart(raw);

console.log("=== Song ===");
console.log(chart.Song);

console.log("\n=== Parser warnings ===");
console.log(warnings.length ? warnings : "(none)");

const trackNames = Object.keys(chart).filter(
  (k) => k !== "Song" && k !== "SyncTrack" && k !== "Events"
);
console.log("\n=== Tracks found ===");
console.log(trackNames);

for (const trackName of trackNames) {
  const events = (chart as unknown as Record<string, Timed<NoteEvent>[]>)[trackName];
  const notes = events.filter((e) => e.type === "note");
  console.log(`\n=== ${trackName}: ${notes.length} notes ===`);
  console.log("First note:", notes[0]);
  console.log("Last note:", notes[notes.length - 1]);
  const chords = notes.filter((n) => n.isChord);
  const sustains = notes.filter((n) => n.duration > 0);
  const hopos = notes.filter((n) => n.isHOPO);
  console.log(
    `Summary: ${chords.length} chord notes, ${sustains.length} sustains, ${hopos.length} HOPOs`
  );
  console.log("\nFull list (tick, time-s, fret, duration, chord, hopo, forced):");
  for (const n of notes) {
    console.log(
      `  tick=${n.tick}\tt=${n.assignedTime.toFixed(4)}s\tfret=${n.note}\tdur=${n.duration}\tchord=${n.isChord}\thopo=${n.isHOPO}\tforced=${n.forced}`
    );
  }
}
