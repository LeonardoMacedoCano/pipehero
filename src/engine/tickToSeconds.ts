import type { Bpm, Timed } from "parsehero";

export function tickToSeconds(tick: number, resolution: number, bpms: Timed<Bpm>[]): number {
  let segment = bpms[0];
  for (const bpm of bpms) {
    if (bpm.tick > tick) break;
    segment = bpm;
  }
  const ticksIntoSegment = tick - segment.tick;
  const secondsIntoSegment = (ticksIntoSegment / resolution) * (60 / segment.bpm);
  return segment.assignedTime + secondsIntoSegment;
}
