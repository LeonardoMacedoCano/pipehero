export function computeStars(score: number, idealScore: number): number {
  if (idealScore <= 0) return 0;

  const ratio = score / idealScore;

  if (ratio >= 0.95) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  if (ratio > 0) return 1;
  return 0;
}
