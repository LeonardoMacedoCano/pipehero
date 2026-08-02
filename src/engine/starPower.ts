import type { Bpm, PlayEvent, Timed } from "parsehero";
import type { StarPowerPhrase } from "../types.js";
import { tickToSeconds } from "./tickToSeconds.js";

export function extractStarPowerPhrases(
  trackEvents: Timed<PlayEvent>[] | undefined,
  resolution: number,
  bpms: Timed<Bpm>[]
): StarPowerPhrase[] {
  if (!Array.isArray(trackEvents)) return [];

  return trackEvents
    .filter((e): e is Timed<Extract<PlayEvent, { type: "starpower" }>> => e.type === "starpower")
    .map((e) => ({
      startTime: e.assignedTime,
      endTime: tickToSeconds(e.tick + e.duration, resolution, bpms),
    }))
    .sort((a, b) => a.startTime - b.startTime);
}

export function phraseIndexAt(phrases: StarPowerPhrase[], time: number): number {
  return phrases.findIndex((phrase) => time >= phrase.startTime && time < phrase.endTime);
}

export function isWithinStarPowerPhrase(phrases: StarPowerPhrase[], time: number): boolean {
  return phraseIndexAt(phrases, time) !== -1;
}

const SYNTHETIC_PHRASE_COUNT = 5;
const SYNTHETIC_PHRASE_NOTE_SPAN = 6;
const SYNTHETIC_PHRASE_END_PADDING_SECONDS = 0.05;

export function synthesizeStarPowerPhrases(notes: { time: number }[]): StarPowerPhrase[] {
  const times = [...new Set(notes.map((n) => n.time))].sort((a, b) => a - b);
  if (times.length < SYNTHETIC_PHRASE_NOTE_SPAN) return [];

  const phrases: StarPowerPhrase[] = [];
  for (let i = 1; i <= SYNTHETIC_PHRASE_COUNT; i++) {
    const fraction = i / (SYNTHETIC_PHRASE_COUNT + 1);
    const startIndex = Math.min(times.length - SYNTHETIC_PHRASE_NOTE_SPAN, Math.floor(fraction * times.length));
    const endIndex = Math.min(times.length - 1, startIndex + SYNTHETIC_PHRASE_NOTE_SPAN - 1);
    phrases.push({ startTime: times[startIndex], endTime: times[endIndex] + SYNTHETIC_PHRASE_END_PADDING_SECONDS });
  }
  return phrases;
}
