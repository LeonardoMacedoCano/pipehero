import type { GameEvent } from "../types.js";

export function computeStars(hits: GameEvent[], totalNotes: number): number {
  if (totalNotes <= 0) return 0;

  let weightedHits = 0;
  for (const hit of hits) {
    if (hit.rating === "perfect") weightedHits += 2;
    else if (hit.rating === "good") weightedHits += 1;
  }
  const ratio = weightedHits / (totalNotes * 2);

  if (ratio >= 0.95) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  if (ratio > 0) return 1;
  return 0;
}
