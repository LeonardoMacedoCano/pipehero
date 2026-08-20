import { query } from "./db.js";
import { creditCoins } from "./economy.js";

export interface MissionDefinition {
  code: string;
  name: string;
  description: string;
  icon: string;
  rewardCoins: number;
}

export const DAILY_MISSIONS: MissionDefinition[] = [
  { code: "play_any_song", icon: "🎵", name: "Warm Up", description: "Play any song to the end today, win or lose.", rewardCoins: 10 },
  { code: "no_fail_finish", icon: "🎯", name: "Clean Finish", description: "Finish a song today without failing.", rewardCoins: 10 },
  { code: "three_star_song", icon: "⭐", name: "Solid Performance", description: "Score at least 3 stars on a song today.", rewardCoins: 15 },
  { code: "three_distinct_songs", icon: "🎶", name: "Mixing It Up", description: "Play 3 different songs today.", rewardCoins: 15 },
  {
    code: "first_star_new_song",
    icon: "🆕",
    name: "New Territory",
    description: "Star a song/difficulty you'd never starred before.",
    rewardCoins: 20,
  },
];

export const DAILY_MISSION_ALL_CLEAR_BONUS_COINS = 20;
const ALL_CLEAR_CODE = "__all_clear__";

const DAILY_MISSION_BY_CODE = new Map(DAILY_MISSIONS.map((mission) => [mission.code, mission]));

export interface DailyMissionStats {
  failed: boolean;
  stars: number;
  isFirstStarForSongDifficulty: boolean;
  distinctSongsPlayedToday: number;
}

export function evaluateScoreSubmissionMissions(stats: DailyMissionStats): string[] {
  const completed: string[] = ["play_any_song"];
  if (!stats.failed) completed.push("no_fail_finish");
  if (!stats.failed && stats.stars >= 3) completed.push("three_star_song");
  if (stats.distinctSongsPlayedToday >= 3) completed.push("three_distinct_songs");
  if (stats.isFirstStarForSongDifficulty) completed.push("first_star_new_song");
  return completed;
}

export async function gatherDailyMissionStats(
  userId: number,
  payload: { songId: string; failed: boolean; stars: number; priorStars: number },
  today: string
): Promise<DailyMissionStats> {
  await query(
    "INSERT INTO user_daily_song_plays (user_id, play_day, song_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [userId, today, payload.songId]
  );
  const [{ count }] = await query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM user_daily_song_plays WHERE user_id = $1 AND play_day = $2",
    [userId, today]
  );
  return {
    failed: payload.failed,
    stars: payload.stars,
    isFirstStarForSongDifficulty: !payload.failed && payload.priorStars === 0 && payload.stars > 0,
    distinctSongsPlayedToday: Number(count),
  };
}

export interface MissionCompletionResult {
  completed: MissionDefinition[];
  coinsAwarded: number;
  allClearBonusAwarded: boolean;
  coinsBalance: number;
}

export async function completeMissionsForToday(
  userId: number,
  codes: string[],
  today: string
): Promise<MissionCompletionResult> {
  const newlyCompleted: MissionDefinition[] = [];
  for (const code of new Set(codes)) {
    const definition = DAILY_MISSION_BY_CODE.get(code);
    if (!definition) continue;
    const inserted = await query<{ id: number }>(
      "INSERT INTO user_daily_missions (user_id, mission_code, mission_day) VALUES ($1, $2, $3) ON CONFLICT (user_id, mission_code, mission_day) DO NOTHING RETURNING id",
      [userId, code, today]
    );
    if (inserted.length > 0) newlyCompleted.push(definition);
  }

  let coinsAwarded = newlyCompleted.reduce((sum, mission) => sum + mission.rewardCoins, 0);
  let allClearBonusAwarded = false;

  if (newlyCompleted.length > 0) {
    const [{ count }] = await query<{ count: string }>(
      "SELECT COUNT(*)::int AS count FROM user_daily_missions WHERE user_id = $1 AND mission_day = $2 AND mission_code <> $3",
      [userId, today, ALL_CLEAR_CODE]
    );
    if (Number(count) === DAILY_MISSIONS.length) {
      const bonusInserted = await query<{ id: number }>(
        "INSERT INTO user_daily_missions (user_id, mission_code, mission_day) VALUES ($1, $2, $3) ON CONFLICT (user_id, mission_code, mission_day) DO NOTHING RETURNING id",
        [userId, ALL_CLEAR_CODE, today]
      );
      if (bonusInserted.length > 0) {
        coinsAwarded += DAILY_MISSION_ALL_CLEAR_BONUS_COINS;
        allClearBonusAwarded = true;
      }
    }
  }

  const coinsBalance = await creditCoins(userId, coinsAwarded);
  return { completed: newlyCompleted, coinsAwarded, allClearBonusAwarded, coinsBalance };
}

export async function getCompletedMissionCodesForToday(userId: number, today: string): Promise<Set<string>> {
  const rows = await query<{ mission_code: string }>(
    "SELECT mission_code FROM user_daily_missions WHERE user_id = $1 AND mission_day = $2",
    [userId, today]
  );
  return new Set(rows.map((row) => row.mission_code));
}

export function isAllClearCode(code: string): boolean {
  return code === ALL_CLEAR_CODE;
}

export type WeeklyMissionTier = "small" | "medium" | "large";

export interface WeeklyMissionDefinition extends MissionDefinition {
  tier: WeeklyMissionTier;
}

export const WEEKLY_MISSIONS: WeeklyMissionDefinition[] = [
  {
    code: "weekly_play_2_days",
    tier: "small",
    icon: "🗓️",
    name: "Stopping By",
    description: "Play on 2 different days this week.",
    rewardCoins: 30,
  },
  {
    code: "weekly_play_4_days",
    tier: "medium",
    icon: "📅",
    name: "Regular Visitor",
    description: "Play on 4 different days this week.",
    rewardCoins: 60,
  },
  {
    code: "weekly_play_6_days",
    tier: "large",
    icon: "🏅",
    name: "Weekly Dedication",
    description: "Play on 6 different days this week.",
    rewardCoins: 120,
  },
];

export const WEEKLY_MISSION_ALL_CLEAR_BONUS_COINS = 50;
const WEEKLY_ALL_CLEAR_CODE = "__weekly_all_clear__";

const WEEKLY_MISSION_BY_CODE = new Map(WEEKLY_MISSIONS.map((mission) => [mission.code, mission]));

export interface WeeklyMissionStats {
  distinctDaysPlayedThisWeek: number;
}

export function evaluateScoreSubmissionWeeklyMissions(stats: WeeklyMissionStats): string[] {
  const completed: string[] = [];
  if (stats.distinctDaysPlayedThisWeek >= 2) completed.push("weekly_play_2_days");
  if (stats.distinctDaysPlayedThisWeek >= 4) completed.push("weekly_play_4_days");
  if (stats.distinctDaysPlayedThisWeek >= 6) completed.push("weekly_play_6_days");
  return completed;
}

export async function gatherWeeklyMissionStats(userId: number, weekStart: string): Promise<WeeklyMissionStats> {
  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT play_day)::int AS count FROM user_daily_song_plays
     WHERE user_id = $1 AND play_day >= $2::date AND play_day < $2::date + INTERVAL '7 days'`,
    [userId, weekStart]
  );
  return { distinctDaysPlayedThisWeek: Number(count) };
}

export interface WeeklyMissionCompletionResult {
  completed: WeeklyMissionDefinition[];
  coinsAwarded: number;
  allClearBonusAwarded: boolean;
  coinsBalance: number;
}

export async function completeWeeklyMissions(
  userId: number,
  codes: string[],
  weekStart: string
): Promise<WeeklyMissionCompletionResult> {
  const newlyCompleted: WeeklyMissionDefinition[] = [];
  for (const code of new Set(codes)) {
    const definition = WEEKLY_MISSION_BY_CODE.get(code);
    if (!definition) continue;
    const inserted = await query<{ id: number }>(
      "INSERT INTO user_weekly_missions (user_id, mission_code, week_start) VALUES ($1, $2, $3) ON CONFLICT (user_id, mission_code, week_start) DO NOTHING RETURNING id",
      [userId, code, weekStart]
    );
    if (inserted.length > 0) newlyCompleted.push(definition);
  }

  let coinsAwarded = newlyCompleted.reduce((sum, mission) => sum + mission.rewardCoins, 0);
  let allClearBonusAwarded = false;

  if (newlyCompleted.length > 0) {
    const [{ count }] = await query<{ count: string }>(
      "SELECT COUNT(*)::int AS count FROM user_weekly_missions WHERE user_id = $1 AND week_start = $2 AND mission_code <> $3",
      [userId, weekStart, WEEKLY_ALL_CLEAR_CODE]
    );
    if (Number(count) === WEEKLY_MISSIONS.length) {
      const bonusInserted = await query<{ id: number }>(
        "INSERT INTO user_weekly_missions (user_id, mission_code, week_start) VALUES ($1, $2, $3) ON CONFLICT (user_id, mission_code, week_start) DO NOTHING RETURNING id",
        [userId, WEEKLY_ALL_CLEAR_CODE, weekStart]
      );
      if (bonusInserted.length > 0) {
        coinsAwarded += WEEKLY_MISSION_ALL_CLEAR_BONUS_COINS;
        allClearBonusAwarded = true;
      }
    }
  }

  const coinsBalance = await creditCoins(userId, coinsAwarded);
  return { completed: newlyCompleted, coinsAwarded, allClearBonusAwarded, coinsBalance };
}

export async function getCompletedWeeklyMissionCodesForWeek(userId: number, weekStart: string): Promise<Set<string>> {
  const rows = await query<{ mission_code: string }>(
    "SELECT mission_code FROM user_weekly_missions WHERE user_id = $1 AND week_start = $2",
    [userId, weekStart]
  );
  return new Set(rows.map((row) => row.mission_code));
}

export function isWeeklyAllClearCode(code: string): boolean {
  return code === WEEKLY_ALL_CLEAR_CODE;
}
