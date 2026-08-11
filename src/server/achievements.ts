import { query } from "./db.js";
import { getSongLibrary } from "./songLibrary.js";
import type { Difficulty } from "../types.js";

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { code: "first_login", icon: "🎮", name: "Welcome to the Show", description: "Log in with your Google account for the first time." },
  { code: "first_song", icon: "🥁", name: "Getting Started", description: "Finish your first song." },
  {
    code: "personal_touch",
    icon: "🎨",
    name: "Personal Touch",
    description: "Save a custom setting — theme, key bindings, strum mode, calibration, or graphics quality.",
  },
  { code: "perfect_run", icon: "💯", name: "Perfect Run", description: "Finish a song with no misses and no dropped sustains." },
  { code: "setlist_regular", icon: "🎶", name: "Setlist Regular", description: "Score results on 5 different songs." },
  { code: "difficulty_master", icon: "🥇", name: "Difficulty Master", description: "Score results on all 4 difficulties of the same song." },
  { code: "five_star", icon: "⭐", name: "Five-Star Performance", description: "Score 5 stars on any song." },
  { code: "expert_five_star", icon: "👑", name: "Expert Class", description: "Score 5 stars on Expert difficulty." },
  { code: "star_power_first_use", icon: "⚡", name: "First Boost", description: "Complete a Star Power phrase without breaking it." },
  {
    code: "star_power_flawless",
    icon: "🔥",
    name: "Never Broken",
    description: "Finish a song without breaking a single Star Power phrase.",
  },
  {
    code: "rock_meter_survivor",
    icon: "💀",
    name: "Nerves of Steel",
    description: "Finish a song after your Rock Meter dropped into the red critical zone.",
  },
  { code: "combo_100", icon: "🔗", name: "On a Roll", description: "Reach a 100-note combo in a single run." },
  { code: "combo_300", icon: "🚀", name: "Unstoppable", description: "Reach a 300-note combo in a single run." },
  {
    code: "completionist",
    icon: "🏆",
    name: "Full Setlist",
    description: "Score a result on every difficulty of every song currently in the library.",
  },
  { code: "first_fail", icon: "💥", name: "That's Rock and Roll", description: "Fail a song for the first time." },
  { code: "night_owl", icon: "🌙", name: "Night Owl", description: "Finish a song between midnight and 4 AM." },
  { code: "squad_goals", icon: "🤝", name: "Squad Goals", description: "Add your first friend." },
  {
    code: "friendly_rival",
    icon: "⚔️",
    name: "Friendly Rival",
    description: "Win more song/difficulty comparisons than a friend in a head-to-head.",
  },
];

const ACHIEVEMENT_BY_CODE = new Map(ACHIEVEMENTS.map((achievement) => [achievement.code, achievement]));

export interface ScoreSubmissionStats {
  totalScoredCount: number;
  distinctSongCount: number;
  songHasAllDifficulties: boolean;
  scoredPairCount: number;
  totalLibraryPairCount: number;
  stars: number;
  difficulty: Difficulty;
  fullCombo: boolean;
  maxCombo: number;
  starPowerPhraseBroken: boolean[];
  survivedCritical: boolean;
  isLateNight: boolean;
}

const ROCK_METER_CRITICAL_THRESHOLD = 10;
const COMBO_ON_A_ROLL_THRESHOLD = 100;
const COMBO_UNSTOPPABLE_THRESHOLD = 300;

export function evaluateScoreSubmissionUnlocks(stats: ScoreSubmissionStats): string[] {
  const unlocked: string[] = [];

  if (stats.totalScoredCount === 1) unlocked.push("first_song");
  if (stats.fullCombo) unlocked.push("perfect_run");
  if (stats.distinctSongCount >= 5) unlocked.push("setlist_regular");
  if (stats.songHasAllDifficulties) unlocked.push("difficulty_master");
  if (stats.stars >= 5) unlocked.push("five_star");
  if (stats.stars >= 5 && stats.difficulty === "Expert") unlocked.push("expert_five_star");
  if (stats.starPowerPhraseBroken.some((broken) => !broken)) unlocked.push("star_power_first_use");
  if (stats.starPowerPhraseBroken.length > 0 && stats.starPowerPhraseBroken.every((broken) => !broken)) {
    unlocked.push("star_power_flawless");
  }
  if (stats.survivedCritical) unlocked.push("rock_meter_survivor");
  if (stats.maxCombo >= COMBO_ON_A_ROLL_THRESHOLD) unlocked.push("combo_100");
  if (stats.maxCombo >= COMBO_UNSTOPPABLE_THRESHOLD) unlocked.push("combo_300");
  if (stats.totalLibraryPairCount > 0 && stats.scoredPairCount >= stats.totalLibraryPairCount) unlocked.push("completionist");
  if (stats.isLateNight) unlocked.push("night_owl");

  return unlocked;
}

export function evaluateFailureUnlocks(): string[] {
  return ["first_fail"];
}

export function evaluateLoginUnlocks(): string[] {
  return ["first_login"];
}

export function evaluateSettingsUnlocks(): string[] {
  return ["personal_touch"];
}

export function evaluateFriendAcceptedUnlocks(): string[] {
  return ["squad_goals"];
}

const FRIENDLY_RIVAL_MIN_COMPARED_ROWS = 3;

export function evaluateCompareUnlocks(myWins: number, friendWins: number, totalComparedRows: number): string[] {
  if (myWins > friendWins && totalComparedRows >= FRIENDLY_RIVAL_MIN_COMPARED_ROWS) return ["friendly_rival"];
  return [];
}

export function isRockMeterSurvivor(minRockMeter: number, failed: boolean): boolean {
  return !failed && minRockMeter < ROCK_METER_CRITICAL_THRESHOLD;
}

async function unlock(userId: number, code: string): Promise<boolean> {
  const inserted = await query<{ id: number }>(
    "INSERT INTO user_achievements (user_id, code) VALUES ($1, $2) ON CONFLICT (user_id, code) DO NOTHING RETURNING id",
    [userId, code]
  );
  return inserted.length > 0;
}

export async function unlockMany(userId: number, codes: string[]): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  for (const code of new Set(codes)) {
    const achievement = ACHIEVEMENT_BY_CODE.get(code);
    if (!achievement) continue;
    if (await unlock(userId, code)) newlyUnlocked.push(achievement);
  }
  return newlyUnlocked;
}

export async function gatherScoreSubmissionStats(
  userId: number,
  payload: {
    songId: string;
    difficulty: Difficulty;
    stars: number;
    fullCombo: boolean;
    maxCombo: number;
    starPowerPhraseBroken: boolean[];
    minRockMeter: number;
    failed: boolean;
    isLateNight: boolean;
  }
): Promise<ScoreSubmissionStats> {
  const [{ count: totalScoredCount }] = await query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM song_scores WHERE user_id = $1",
    [userId]
  );
  const [{ count: distinctSongCount }] = await query<{ count: string }>(
    "SELECT COUNT(DISTINCT song_id)::int AS count FROM song_scores WHERE user_id = $1",
    [userId]
  );
  const songDifficultyCounts = await query<{ song_id: string; count: string }>(
    "SELECT song_id, COUNT(DISTINCT difficulty)::int AS count FROM song_scores WHERE user_id = $1 GROUP BY song_id",
    [userId]
  );
  const songHasAllDifficulties = songDifficultyCounts.some((row) => Number(row.count) === 4);

  const [{ count: scoredPairCount }] = await query<{ count: string }>(
    "SELECT COUNT(DISTINCT (song_id, difficulty))::int AS count FROM song_scores WHERE user_id = $1",
    [userId]
  );

  const totalLibraryPairCount = getSongLibrary().reduce((sum, song) => sum + song.availableDifficulties.length, 0);

  return {
    totalScoredCount: Number(totalScoredCount),
    distinctSongCount: Number(distinctSongCount),
    songHasAllDifficulties,
    scoredPairCount: Number(scoredPairCount),
    totalLibraryPairCount,
    stars: payload.stars,
    difficulty: payload.difficulty,
    fullCombo: payload.fullCombo,
    maxCombo: payload.maxCombo,
    starPowerPhraseBroken: payload.starPowerPhraseBroken,
    survivedCritical: isRockMeterSurvivor(payload.minRockMeter, payload.failed),
    isLateNight: payload.isLateNight,
  };
}

export async function computeGlobalUnlockPercents(): Promise<Map<string, number>> {
  const [{ count: totalUsers }] = await query<{ count: string }>("SELECT COUNT(*)::int AS count FROM users");
  const total = Number(totalUsers);

  const unlockCounts = await query<{ code: string; count: string }>(
    "SELECT code, COUNT(DISTINCT user_id)::int AS count FROM user_achievements GROUP BY code"
  );
  const countByCode = new Map(unlockCounts.map((row) => [row.code, Number(row.count)]));

  const percents = new Map<string, number>();
  for (const achievement of ACHIEVEMENTS) {
    const count = countByCode.get(achievement.code) ?? 0;
    percents.set(achievement.code, total > 0 ? Math.round((count / total) * 1000) / 10 : 0);
  }
  return percents;
}
