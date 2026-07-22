import type { ChartTrack, Difficulty as ParseHeroDifficulty, ParsedChart } from "parsehero";
import type { Difficulty } from "../types.js";

const DIFFICULTY_ORDER: Difficulty[] = ["Expert", "Hard", "Medium", "Easy"];
const GUITAR_FIVE_FRET_INSTRUMENT = "Single";

export function listAvailableDifficulties(parsedChart: ParsedChart): Difficulty[] {
  return DIFFICULTY_ORDER.filter((difficulty) => {
    const key = trackNameForDifficulty(difficulty);
    const events = parsedChart[key];
    return Array.isArray(events) && events.some((e) => e.type === "note");
  });
}

export function pickHardestDifficulty(parsedChart: ParsedChart): Difficulty | null {
  const available = listAvailableDifficulties(parsedChart);
  return available[0] ?? null;
}

export function trackNameForDifficulty(difficulty: Difficulty): ChartTrack {
  return `${difficulty as ParseHeroDifficulty}${GUITAR_FIVE_FRET_INSTRUMENT}`;
}
