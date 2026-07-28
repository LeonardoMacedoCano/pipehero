import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Fret } from "../src/types.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.split("=");
    return [key.replace(/^--/, ""), value];
  })
);

const BPM = Number(args.bpm ?? 120);
const RESOLUTION = 192;
const TICKS_PER_SECOND = (RESOLUTION * BPM) / 60;

const BEAT_INTERVAL_SECONDS = Number(args.beatInterval ?? 0.4);
const BEAT_COUNT = Number(args.beats ?? 50);
const LEAD_IN_SECONDS = 1.5;
const FRET_PATTERN: Fret[] = [0, 1, 2, 3, 4];
const SUSTAIN_DURATION_SECONDS = 0.8;
const SAMPLE_RATE = 44100;
const BEEP_DURATION = 0.08;
const BEEP_FREQ_BY_FRET: Record<number, number> = { 0: 392, 1: 440, 2: 494, 3: 523, 4: 587 };
const SONG_NAME = args.name ?? "PipeHero Dev Click Track";
const SONG_ARTIST = args.artist ?? "PipeHero";
const SONG_GENRE = args.genre ?? "Metal";
const INCLUDE_CHORDS_AND_SUSTAINS = args.simple !== "true";

const OUT_DIR = args.out ?? "songs/dev-placeholder";
mkdirSync(OUT_DIR, { recursive: true });

interface NoteEventSpec {
  time: number;
  frets: Fret[];
  durationSeconds: number;
}

const noteEvents: NoteEventSpec[] = [];
for (let i = 0; i < BEAT_COUNT; i++) {
  const time = LEAD_IN_SECONDS + i * BEAT_INTERVAL_SECONDS;
  const baseFret = FRET_PATTERN[i % FRET_PATTERN.length];

  if (INCLUDE_CHORDS_AND_SUSTAINS && i > 0 && i % 12 === 0) {
    noteEvents.push({ time, frets: [baseFret], durationSeconds: SUSTAIN_DURATION_SECONDS });
  } else if (INCLUDE_CHORDS_AND_SUSTAINS && i > 0 && i % 8 === 0) {
    const secondFret = FRET_PATTERN[(i + 2) % FRET_PATTERN.length];
    noteEvents.push({ time, frets: [baseFret, secondFret], durationSeconds: 0 });
  } else {
    noteEvents.push({ time, frets: [baseFret], durationSeconds: 0 });
  }
}

const SP_PHRASE_INTERVAL_BEATS = 12;
const SP_PHRASE_LENGTH_BEATS = 4;
const SP_PHRASE_END_PADDING_SECONDS = 0.1;

interface StarPowerPhraseSpec {
  startTime: number;
  endTime: number;
}

const starPowerPhrases: StarPowerPhraseSpec[] = [];
for (let i = 0; i + SP_PHRASE_LENGTH_BEATS <= BEAT_COUNT; i += SP_PHRASE_INTERVAL_BEATS) {
  const startTime = LEAD_IN_SECONDS + i * BEAT_INTERVAL_SECONDS;
  const endTime = LEAD_IN_SECONDS + (i + SP_PHRASE_LENGTH_BEATS - 1) * BEAT_INTERVAL_SECONDS + SP_PHRASE_END_PADDING_SECONDS;
  starPowerPhrases.push({ startTime, endTime });
}

function secondsToTick(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

function secondsToTickDuration(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

const chartNoteLines = noteEvents.flatMap((n) =>
  n.frets.map((fret) => ({ tick: secondsToTick(n.time), line: `N ${fret} ${secondsToTickDuration(n.durationSeconds)}` }))
);
const chartStarPowerLines = starPowerPhrases.map((phrase) => ({
  tick: secondsToTick(phrase.startTime),
  line: `S 2 ${secondsToTick(phrase.endTime) - secondsToTick(phrase.startTime)}`,
}));
const chartEventLines = [...chartNoteLines, ...chartStarPowerLines]
  .sort((a, b) => a.tick - b.tick)
  .map(({ tick, line }) => `  ${tick} = ${line}`);

const chartLines = [
  "[Song]",
  "{",
  `  Name = "${SONG_NAME}"`,
  `  Artist = "${SONG_ARTIST}"`,
  '  Charter = "auto-generated"',
  "  Offset = 0",
  `  Resolution = ${RESOLUTION}`,
  `  Genre = "${SONG_GENRE}"`,
  '  MediaType = "cd"',
  '  MusicStream = "song.wav"',
  "}",
  "[SyncTrack]",
  "{",
  "  0 = TS 4",
  `  0 = B ${BPM * 1000}`,
  "}",
  "[ExpertSingle]",
  "{",
  ...chartEventLines,
  "}",
  "",
];
writeFileSync(join(OUT_DIR, "notes.chart"), chartLines.join("\n"));

const songIni = `[song]
name = ${SONG_NAME}
artist = ${SONG_ARTIST}
charter = auto-generated
genre = ${SONG_GENRE}
`;
writeFileSync(join(OUT_DIR, "song.ini"), songIni);

const totalSeconds = noteEvents[noteEvents.length - 1].time + 2;
const totalSamples = Math.ceil(totalSeconds * SAMPLE_RATE);
const samples = new Float32Array(totalSamples);

for (const note of noteEvents) {
  const startSample = Math.floor(note.time * SAMPLE_RATE);
  const beepSamples = Math.floor(BEEP_DURATION * SAMPLE_RATE);
  for (const fret of note.frets) {
    const freq = BEEP_FREQ_BY_FRET[fret];
    for (let i = 0; i < beepSamples; i++) {
      const idx = startSample + i;
      if (idx >= totalSamples) break;
      const t = i / SAMPLE_RATE;
      const envelope = 1 - i / beepSamples;
      samples[idx] += (Math.sin(2 * Math.PI * freq * t) * 0.3 * envelope) / note.frets.length;
    }
  }
}

writeWav(join(OUT_DIR, "song.wav"), { sampleRate: SAMPLE_RATE, samples });

function writeWav(path: string, { sampleRate, samples }: { sampleRate: number; samples: Float32Array }): void {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  writeFileSync(path, buffer);
}

console.log(
  `Generated in ${OUT_DIR}/: notes.chart (${noteEvents.length} notes, ${starPowerPhrases.length} star power phrases), song.wav (${totalSeconds.toFixed(1)}s), song.ini`
);
