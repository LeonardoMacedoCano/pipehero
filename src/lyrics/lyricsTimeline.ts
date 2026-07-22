import type { SimpleEvent, Timed } from "parsehero";
import type { LyricPhrase, LyricSyllable } from "../types.js";

const LYRIC_EVENT_PREFIX = "lyric ";

export function extractLyricEvents(chartEvents: Timed<SimpleEvent>[] | undefined): LyricSyllable[] {
  if (!Array.isArray(chartEvents)) return [];
  return chartEvents
    .filter((e) => e.type === "event" && typeof e.value === "string" && e.value.startsWith(LYRIC_EVENT_PREFIX))
    .map((e) => ({ time: e.assignedTime, raw: e.value.slice(LYRIC_EVENT_PREFIX.length) }));
}

export function assembleLine(rawSyllables: string[]): string {
  let line = "";
  let previousContinues = false;
  for (const raw of rawSyllables) {
    const noSpaceBefore = raw.startsWith("#") || previousContinues;
    const text = raw.replace(/^#/, "");
    const continuesNext = text.endsWith("-");
    const visibleText = continuesNext ? text.slice(0, -1) : text;
    line += (line && !noSpaceBefore ? " " : "") + visibleText;
    previousContinues = continuesNext;
  }
  return line;
}

interface PhraseBuilder {
  startTime: number;
  endTime: number | null;
  syllables: LyricSyllable[];
}

export function groupIntoPhrases(chartEvents: Timed<SimpleEvent>[] | undefined): LyricPhrase[] {
  if (!Array.isArray(chartEvents)) return [];

  const phrases: PhraseBuilder[] = [];
  let current: PhraseBuilder | null = null;

  for (const event of chartEvents) {
    if (event.type !== "event" || typeof event.value !== "string") continue;

    if (event.value === "phrase_start") {
      current = { startTime: event.assignedTime, endTime: null, syllables: [] };
      phrases.push(current);
    } else if (event.value === "phrase_end") {
      if (current) current.endTime = event.assignedTime;
    } else if (event.value.startsWith(LYRIC_EVENT_PREFIX) && current) {
      current.syllables.push({ time: event.assignedTime, raw: event.value.slice(LYRIC_EVENT_PREFIX.length) });
    }
  }

  return phrases.map((p) => ({
    startTime: p.startTime,
    endTime: p.endTime ?? p.startTime,
    text: assembleLine(p.syllables.map((s) => s.raw)),
    syllables: p.syllables,
  }));
}

const DEFAULT_PHRASE_LINGER_SECONDS = 0.4;

export function currentPhrase(
  phrases: LyricPhrase[],
  currentTime: number,
  lingerSeconds = DEFAULT_PHRASE_LINGER_SECONDS
): LyricPhrase | null {
  return phrases.find((p) => currentTime >= p.startTime && currentTime <= p.endTime + lingerSeconds) ?? null;
}
