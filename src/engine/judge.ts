import type { Difficulty, JudgmentWindows, Rating } from "../types.js";

export const JUDGMENT_WINDOWS_BY_DIFFICULTY: Record<Difficulty, JudgmentWindows> = {
  Expert: { perfect: 0.05, good: 0.14 },
  Hard: { perfect: 0.07, good: 0.17 },
  Medium: { perfect: 0.09, good: 0.2 },
  Easy: { perfect: 0.12, good: 0.24 },
};

export const DEFAULT_JUDGMENT_WINDOWS: JudgmentWindows = JUDGMENT_WINDOWS_BY_DIFFICULTY.Expert;

export function judgmentWindowsForDifficulty(difficulty: Difficulty | null | undefined): JudgmentWindows {
  return difficulty ? JUDGMENT_WINDOWS_BY_DIFFICULTY[difficulty] : DEFAULT_JUDGMENT_WINDOWS;
}

export function classifyTiming(deltaSeconds: number, windows: JudgmentWindows = DEFAULT_JUDGMENT_WINDOWS): Rating {
  const abs = Math.abs(deltaSeconds);
  if (abs <= windows.perfect) return "perfect";
  if (abs <= windows.good) return "good";
  return "miss";
}
