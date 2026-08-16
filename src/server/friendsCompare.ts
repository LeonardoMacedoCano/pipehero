import type { Difficulty } from "../types.js";

export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { Expert: 4, Hard: 3, Medium: 2, Easy: 1 };

export const WEIGHT_CASE_SQL = "CASE ss.difficulty WHEN 'Expert' THEN 4 WHEN 'Hard' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Easy' THEN 1 END";

export interface ScoreEntry {
  songId: string;
  difficulty: Difficulty;
  stars: number;
}

export function computeWeightedScore(scores: { difficulty: Difficulty; stars: number }[]): number {
  return scores.reduce((sum, entry) => sum + entry.stars * DIFFICULTY_WEIGHT[entry.difficulty], 0);
}

export type CompareWinner = "me" | "friend" | "tie" | "unplayed";

export function determineWinner(myStars: number | null, friendStars: number | null): CompareWinner {
  if (myStars === null || friendStars === null) return "unplayed";
  if (myStars > friendStars) return "me";
  if (friendStars > myStars) return "friend";
  return "tie";
}

export interface CompareRow {
  songId: string;
  difficulty: Difficulty;
  myStars: number | null;
  friendStars: number | null;
  winner: CompareWinner;
}

function scoreKey(songId: string, difficulty: Difficulty): string {
  return `${songId}:${difficulty}`;
}

export function buildCompareRows(mine: ScoreEntry[], friend: ScoreEntry[]): CompareRow[] {
  const rows = new Map<string, CompareRow>();

  for (const entry of mine) {
    rows.set(scoreKey(entry.songId, entry.difficulty), {
      songId: entry.songId,
      difficulty: entry.difficulty,
      myStars: entry.stars,
      friendStars: null,
      winner: "unplayed",
    });
  }

  for (const entry of friend) {
    const key = scoreKey(entry.songId, entry.difficulty);
    const existing = rows.get(key);
    if (existing) {
      existing.friendStars = entry.stars;
    } else {
      rows.set(key, { songId: entry.songId, difficulty: entry.difficulty, myStars: null, friendStars: entry.stars, winner: "unplayed" });
    }
  }

  for (const row of rows.values()) {
    row.winner = determineWinner(row.myStars, row.friendStars);
  }

  return [...rows.values()];
}

export function countWins(rows: CompareRow[]): { myWins: number; friendWins: number } {
  let myWins = 0;
  let friendWins = 0;
  for (const row of rows) {
    if (row.winner === "me") myWins += 1;
    else if (row.winner === "friend") friendWins += 1;
  }
  return { myWins, friendWins };
}

const STAR_BUCKET_COUNT = 6;
const DIFFICULTIES: Difficulty[] = ["Expert", "Hard", "Medium", "Easy"];

export function buildStarDistribution(scores: { difficulty: Difficulty; stars: number }[]): Record<Difficulty, number[]> {
  const distribution = Object.fromEntries(
    DIFFICULTIES.map((difficulty) => [difficulty, new Array<number>(STAR_BUCKET_COUNT).fill(0)])
  ) as Record<Difficulty, number[]>;

  for (const entry of scores) {
    distribution[entry.difficulty][entry.stars] += 1;
  }

  return distribution;
}
