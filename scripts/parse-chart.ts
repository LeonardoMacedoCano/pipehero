import { readFileSync } from "node:fs";
import { parseChart, type NoteEvent, type Timed } from "../node_modules/parsehero/dist/index.js";

const path = process.argv[2];
if (!path) {
  console.error("Usage: tsx parse-chart.ts <path-to-chart-file>");
  process.exit(1);
}

const isMid = path.toLowerCase().endsWith(".mid");
const fileBuffer = readFileSync(path);
const { chart, warnings } = isMid
  ? parseChart(fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength))
  : parseChart(fileBuffer.toString("utf-8"));

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

  const starPowerEvents = (events as unknown as { type: string; tick: number; duration: number; assignedTime: number }[]).filter(
    (e) => e.type === "starpower"
  );
  console.log(`Star Power phrases: ${starPowerEvents.length}`);
  for (const sp of starPowerEvents) {
    console.log(`  tick=${sp.tick}\tt=${sp.assignedTime.toFixed(4)}s\tduration=${sp.duration} ticks`);
  }

  console.log("\nFull list (tick, time-s, fret, duration, chord, hopo, forced):");
  for (const n of notes) {
    console.log(
      `  tick=${n.tick}\tt=${n.assignedTime.toFixed(4)}s\tfret=${n.note}\tdur=${n.duration}\tchord=${n.isChord}\thopo=${n.isHOPO}\tforced=${n.forced}`
    );
  }
}
