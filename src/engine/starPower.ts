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

export function isWithinStarPowerPhrase(phrases: StarPowerPhrase[], time: number): boolean {
  return phrases.some((phrase) => time >= phrase.startTime && time < phrase.endTime);
}
