import { query } from "./db.js";

export interface Achievement {
  code: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { code: "first_song", name: "Getting Started", description: "Finish your first song." },
  { code: "perfect_run", name: "Perfect Run", description: "Finish a song with no misses and no dropped sustains." },
  { code: "setlist_regular", name: "Setlist Regular", description: "Score results on 5 different songs." },
  { code: "difficulty_master", name: "Difficulty Master", description: "Score results on all 4 difficulties of the same song." },
];

async function unlock(userId: number, code: string): Promise<void> {
  await query("INSERT INTO user_achievements (user_id, code) VALUES ($1, $2) ON CONFLICT (user_id, code) DO NOTHING", [
    userId,
    code,
  ]);
}

export async function evaluateAchievements(userId: number, { fullCombo }: { fullCombo: boolean }): Promise<void> {
  const [{ count: totalCount }] = await query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM song_scores WHERE user_id = $1",
    [userId]
  );
  if (Number(totalCount) === 1) await unlock(userId, "first_song");

  if (fullCombo) await unlock(userId, "perfect_run");

  const [{ count: distinctSongs }] = await query<{ count: string }>(
    "SELECT COUNT(DISTINCT song_id)::int AS count FROM song_scores WHERE user_id = $1",
    [userId]
  );
  if (Number(distinctSongs) >= 5) await unlock(userId, "setlist_regular");

  const masteredSongs = await query<{ song_id: string }>(
    "SELECT song_id FROM song_scores WHERE user_id = $1 GROUP BY song_id HAVING COUNT(DISTINCT difficulty) = 4",
    [userId]
  );
  if (masteredSongs.length > 0) await unlock(userId, "difficulty_master");
}
