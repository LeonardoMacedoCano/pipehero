import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Fret } from "../src/types.js";

const RESOLUTION = 192;
const TICKS_PER_BEAT = RESOLUTION;
const OUT_DIR = "test/fixtures";

const BPM_SECTIONS = [
  { startBeat: 0, bpm: 140 },
  { startBeat: 50, bpm: 170 },
  { startBeat: 100, bpm: 100 },
  { startBeat: 150, bpm: 155 },
];

const FRET_PATTERN: Fret[] = [0, 1, 2, 3, 4];
const OPEN_FRET: Fret = 7;
const NOTE_SPACING_BEATS = 0.5;
const FIRST_NOTE_BEAT = 8;
const TOTAL_BEATS = 200;
const SUSTAIN_DURATION_BEATS = 1.5;

interface NoteEventSpec {
  tick: number;
  frets: Fret[];
  durationTicks: number;
}

const noteEvents: NoteEventSpec[] = [];
let slot = 0;
for (let beat = FIRST_NOTE_BEAT; beat < TOTAL_BEATS; beat += NOTE_SPACING_BEATS, slot++) {
  const tick = Math.round(beat * TICKS_PER_BEAT);
  const baseFret = FRET_PATTERN[slot % FRET_PATTERN.length];

  if (slot > 0 && slot % 40 === 0) {
    noteEvents.push({ tick, frets: [OPEN_FRET], durationTicks: 0 });
  } else if (slot > 0 && slot % 16 === 0) {
    noteEvents.push({ tick, frets: [baseFret], durationTicks: Math.round(SUSTAIN_DURATION_BEATS * TICKS_PER_BEAT) });
  } else if (slot > 0 && slot % 10 === 0) {
    const secondFret = FRET_PATTERN[(slot + 2) % FRET_PATTERN.length];
    noteEvents.push({ tick, frets: [baseFret, secondFret], durationTicks: 0 });
  } else {
    noteEvents.push({ tick, frets: [baseFret], durationTicks: 0 });
  }
}

const syncTrackLines = BPM_SECTIONS.flatMap(({ startBeat, bpm }, index) => {
  const tick = Math.round(startBeat * TICKS_PER_BEAT);
  const lines = [`  ${tick} = B ${bpm * 1000}`];
  if (index === 0) lines.unshift(`  ${tick} = TS 4`);
  return lines;
});

const chartNoteLines = noteEvents.flatMap((n) => n.frets.map((fret) => `  ${n.tick} = N ${fret} ${n.durationTicks}`));

const chartLines = [
  "[Song]",
  "{",
  '  Name = "PipeHero Test Chart (synthetic)"',
  '  Artist = "PipeHero"',
  '  Charter = "auto-generated"',
  "  Offset = 0",
  `  Resolution = ${RESOLUTION}`,
  '  Genre = "Metal (synthetic)"',
  '  MediaType = "cd"',
  '  MusicStream = "song.wav"',
  "}",
  "[SyncTrack]",
  "{",
  ...syncTrackLines,
  "}",
  "[ExpertSingle]",
  "{",
  ...chartNoteLines,
  "}",
  "",
];

writeFileSync(join(OUT_DIR, "synthetic-complex.chart"), chartLines.join("\n"));

const chordCount = noteEvents.filter((n) => n.frets.length > 1).length;
const sustainCount = noteEvents.filter((n) => n.durationTicks > 0).length;
console.log(
  `Generated ${OUT_DIR}/synthetic-complex.chart: ${noteEvents.length} notes (${chordCount} chords, ${sustainCount} sustains), ${BPM_SECTIONS.length} BPM sections.`
);
