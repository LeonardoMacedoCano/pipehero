import type { ChartTrack, NoteEvent, ParsedChart, Timed } from "parsehero";
import type { Fret, Note } from "../types.js";
import { tickToSeconds } from "./tickToSeconds.js";

const FRET_NAMES: Record<number, string> = {
  0: "green",
  1: "red",
  2: "yellow",
  3: "blue",
  4: "orange",
  7: "open",
};

export function loadTrack(parsedChart: ParsedChart, trackName: ChartTrack): Note[] {
  const events = parsedChart[trackName];
  if (!events) {
    throw new Error(`Track "${trackName}" not found in chart.`);
  }

  const { resolution } = parsedChart.Song;
  const bpms = parsedChart.SyncTrack.bpms;

  return events
    .filter((event): event is Timed<NoteEvent> => event.type === "note")
    .map((event, index) => {
      const durationSeconds =
        event.duration > 0
          ? tickToSeconds(event.tick + event.duration, resolution, bpms) - event.assignedTime
          : 0;

      const fret = event.note as Fret;
      return {
        id: index,
        time: event.assignedTime,
        fret,
        fretName: FRET_NAMES[fret] ?? `unknown(${fret})`,
        duration: durationSeconds,
        isChord: event.isChord,
        isHOPO: event.isHOPO,
        forced: event.forced,
        tap: event.tap,
      };
    })
    .sort((a, b) => a.time - b.time);
}
