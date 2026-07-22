import type { Note, PlayableEvent } from "../types.js";

export function groupIntoPlayableEvents(notes: Note[]): PlayableEvent[] {
  const byTime = new Map<number, Note[]>();
  for (const note of notes) {
    const key = note.time;
    if (!byTime.has(key)) byTime.set(key, []);
    byTime.get(key)!.push(note);
  }

  return Array.from(byTime.values())
    .map((group) => ({
      time: group[0].time,
      frets: group.map((n) => n.fret).sort((a, b) => a - b),
      duration: Math.max(...group.map((n) => n.duration)),
      isChord: group.length > 1,
      isHOPO: group[0].isHOPO,
    }))
    .sort((a, b) => a.time - b.time);
}
