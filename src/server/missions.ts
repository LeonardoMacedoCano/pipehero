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
  { code: "three_star_song", icon: "⭐", name: "Solid Performance", description: "Score at least 3 stars on a song today.", rewardCoins: 15 },
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
export const DAILY_LOGIN_CODE = "daily_login";

const DAILY_MISSION_BY_CODE = new Map(DAILY_MISSIONS.map((mission) => [mission.code, mission]));

export interface DailyMissionStats {
  failed: boolean;
  stars: number;
  isFirstStarForSongDifficulty: boolean;
}

export function evaluateScoreSubmissionMissions(stats: DailyMissionStats): string[] {
  const completed: string[] = ["play_any_song"];
  if (!stats.failed && stats.stars >= 3) completed.push("three_star_song");
  if (stats.isFirstStarForSongDifficulty) completed.push("first_star_new_song");
  return completed;
}

export async function gatherDailyMissionStats(
  userId: number,
  payload: { songId: string; failed: boolean; stars: number; priorStars: number },
  today: string
): Promise<DailyMissionStats> {
  // Also feeds the weekly "distinct songs this week" count (gatherWeeklyMissionStats).
  await query(
    "INSERT INTO user_daily_song_plays (user_id, play_day, song_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [userId, today, payload.songId]
  );
  return {
    failed: payload.failed,
    stars: payload.stars,
    isFirstStarForSongDifficulty: !payload.failed && payload.priorStars === 0 && payload.stars > 0,
  };
}

async function maybeAwardDailyAllClear(userId: number, today: string): Promise<{ awarded: boolean; coinsBalance: number }> {
  const [{ count }] = await query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM user_daily_missions WHERE user_id = $1 AND mission_day = $2 AND mission_code <> $3",
    [userId, today, ALL_CLEAR_CODE]
  );
  // +1 for the daily login, which lives in user_daily_missions alongside the gameplay missions but not in DAILY_MISSIONS.
  if (Number(count) !== DAILY_MISSIONS.length + 1) {
    return { awarded: false, coinsBalance: await creditCoins(userId, 0) };
  }
  const bonusInserted = await query<{ id: number }>(
    "INSERT INTO user_daily_missions (user_id, mission_code, mission_day) VALUES ($1, $2, $3) ON CONFLICT (user_id, mission_code, mission_day) DO NOTHING RETURNING id",
    [userId, ALL_CLEAR_CODE, today]
  );
  if (bonusInserted.length === 0) {
    return { awarded: false, coinsBalance: await creditCoins(userId, 0) };
  }
  return { awarded: true, coinsBalance: await creditCoins(userId, DAILY_MISSION_ALL_CLEAR_BONUS_COINS) };
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

  const missionCoins = newlyCompleted.reduce((sum, mission) => sum + mission.rewardCoins, 0);
  let coinsBalance = await creditCoins(userId, missionCoins);
  let allClearBonusAwarded = false;
  let coinsAwarded = missionCoins;

  if (newlyCompleted.length > 0) {
    const allClear = await maybeAwardDailyAllClear(userId, today);
    allClearBonusAwarded = allClear.awarded;
    if (allClear.awarded) {
      coinsBalance = allClear.coinsBalance;
      coinsAwarded += DAILY_MISSION_ALL_CLEAR_BONUS_COINS;
    }
  }

  return { completed: newlyCompleted, coinsAwarded, allClearBonusAwarded, coinsBalance };
}

export interface DailyLoginMissionResult {
  allClearBonusAwarded: boolean;
  coinsBalance: number;
}

export async function recordDailyLoginCompletion(userId: number, today: string): Promise<DailyLoginMissionResult> {
  const inserted = await query<{ id: number }>(
    "INSERT INTO user_daily_missions (user_id, mission_code, mission_day) VALUES ($1, $2, $3) ON CONFLICT (user_id, mission_code, mission_day) DO NOTHING RETURNING id",
    [userId, DAILY_LOGIN_CODE, today]
  );
  if (inserted.length === 0) {
    return { allClearBonusAwarded: false, coinsBalance: await creditCoins(userId, 0) };
  }
  const allClear = await maybeAwardDailyAllClear(userId, today);
  return { allClearBonusAwarded: allClear.awarded, coinsBalance: allClear.coinsBalance };
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
    code: "weekly_no_fail_finish",
    tier: "small",
    icon: "🎯",
    name: "Clean Finish",
    description: "Finish a song without failing at least once this week.",
    rewardCoins: 30,
  },
  {
    code: "weekly_three_distinct_songs",
    tier: "small",
    icon: "🎶",
    name: "Mixing It Up",
    description: "Play 3 different songs this week.",
    rewardCoins: 30,
  },
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

export const WEEKLY_MISSION_ALL_CLEAR_BONUS_COINS = 70;
const WEEKLY_ALL_CLEAR_CODE = "__weekly_all_clear__";

const WEEKLY_MISSION_BY_CODE = new Map(WEEKLY_MISSIONS.map((mission) => [mission.code, mission]));

export interface WeeklyMissionStats {
  failed: boolean;
  distinctDaysPlayedThisWeek: number;
  distinctSongsPlayedThisWeek: number;
}

export function evaluateScoreSubmissionWeeklyMissions(stats: WeeklyMissionStats): string[] {
  const completed: string[] = [];
  if (!stats.failed) completed.push("weekly_no_fail_finish");
  if (stats.distinctSongsPlayedThisWeek >= 3) completed.push("weekly_three_distinct_songs");
  if (stats.distinctDaysPlayedThisWeek >= 2) completed.push("weekly_play_2_days");
  if (stats.distinctDaysPlayedThisWeek >= 4) completed.push("weekly_play_4_days");
  if (stats.distinctDaysPlayedThisWeek >= 6) completed.push("weekly_play_6_days");
  return completed;
}

export async function gatherWeeklyMissionStats(userId: number, weekStart: string, failed: boolean): Promise<WeeklyMissionStats> {
  const [{ days, songs }] = await query<{ days: string; songs: string }>(
    `SELECT COUNT(DISTINCT play_day)::int AS days, COUNT(DISTINCT song_id)::int AS songs
     FROM user_daily_song_plays
     WHERE user_id = $1 AND play_day >= $2::date AND play_day < $2::date + INTERVAL '7 days'`,
    [userId, weekStart]
  );
  return { failed, distinctDaysPlayedThisWeek: Number(days), distinctSongsPlayedThisWeek: Number(songs) };
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
