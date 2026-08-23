import { query } from "./db.js";
import { creditCoins } from "./economy.js";

export interface MissionProgressSpec {
  statKey: "distinctSongsPlayedToday" | "distinctDaysPlayedThisWeek";
  target: number;
}

export interface MissionDefinition {
  code: string;
  name: string;
  description: string;
  icon: string;
  rewardCoins: number;
  progress?: MissionProgressSpec;
}

export const DAILY_MISSION_POOL: MissionDefinition[] = [
  { code: "play_any_song", icon: "🎵", name: "Warm Up", description: "Finish a song today without failing.", rewardCoins: 10 },
  { code: "four_star_song", icon: "⭐", name: "Solid Performance", description: "Score at least 4 stars on a song today.", rewardCoins: 15 },
  {
    code: "first_star_new_song",
    icon: "🆕",
    name: "New Territory",
    description: "Star a song/difficulty you'd never starred before.",
    rewardCoins: 20,
  },
  {
    code: "hard_or_expert_clear",
    icon: "🔥",
    name: "Step It Up",
    description: "Finish a song on Hard or Expert difficulty without failing.",
    rewardCoins: 20,
  },
  {
    code: "three_songs_today",
    icon: "🎼",
    name: "Triple Session",
    description: "Play 3 different songs today.",
    rewardCoins: 20,
    progress: { statKey: "distinctSongsPlayedToday", target: 3 },
  },
  { code: "five_star_song", icon: "🌟", name: "Perfectionist", description: "Score a perfect 5 stars on a song today.", rewardCoins: 25 },
  {
    code: "full_combo_song",
    icon: "💯",
    name: "Flawless Run",
    description: "Full combo a song today without failing.",
    rewardCoins: 25,
  },
];

export const DAILY_MISSIONS_PER_DAY = 3;

function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectDailyMissions(userId: number, today: string): MissionDefinition[] {
  const rng = mulberry32(hashSeed(`${userId}:${today}`));
  const shuffled = [...DAILY_MISSION_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, DAILY_MISSIONS_PER_DAY);
}

export const DAILY_MISSION_ALL_CLEAR_BONUS_COINS = 20;
const ALL_CLEAR_CODE = "__all_clear__";
export const DAILY_LOGIN_CODE = "daily_login";

const DAILY_MISSION_BY_CODE = new Map(DAILY_MISSION_POOL.map((mission) => [mission.code, mission]));

export interface DailyMissionStats {
  failed: boolean;
  stars: number;
  isFirstStarForSongDifficulty: boolean;
  isHardOrExpert: boolean;
  distinctSongsPlayedToday: number;
  fullCombo: boolean;
}

export function evaluateScoreSubmissionMissions(stats: DailyMissionStats, activeMissionCodes: ReadonlySet<string>): string[] {
  const completed: string[] = [];
  if (activeMissionCodes.has("play_any_song") && !stats.failed) completed.push("play_any_song");
  if (activeMissionCodes.has("four_star_song") && !stats.failed && stats.stars >= 4) completed.push("four_star_song");
  if (activeMissionCodes.has("five_star_song") && !stats.failed && stats.stars >= 5) completed.push("five_star_song");
  if (activeMissionCodes.has("first_star_new_song") && stats.isFirstStarForSongDifficulty) completed.push("first_star_new_song");
  if (activeMissionCodes.has("hard_or_expert_clear") && !stats.failed && stats.isHardOrExpert) completed.push("hard_or_expert_clear");
  if (activeMissionCodes.has("three_songs_today") && stats.distinctSongsPlayedToday >= 3) completed.push("three_songs_today");
  if (activeMissionCodes.has("full_combo_song") && !stats.failed && stats.fullCombo) completed.push("full_combo_song");
  return completed;
}

async function countDistinctSongsPlayedToday(userId: number, today: string): Promise<number> {
  const [{ count }] = await query<{ count: string }>(
    "SELECT COUNT(DISTINCT song_id)::int AS count FROM user_daily_song_plays WHERE user_id = $1 AND play_day = $2",
    [userId, today]
  );
  return Number(count);
}

export async function getDailyMissionProgressStats(userId: number, today: string): Promise<{ distinctSongsPlayedToday: number }> {
  return { distinctSongsPlayedToday: await countDistinctSongsPlayedToday(userId, today) };
}

export async function gatherDailyMissionStats(
  userId: number,
  payload: { songId: string; difficulty: string; failed: boolean; stars: number; priorStars: number; fullCombo: boolean },
  today: string
): Promise<DailyMissionStats> {
  await query(
    "INSERT INTO user_daily_song_plays (user_id, play_day, song_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [userId, today, payload.songId]
  );
  return {
    failed: payload.failed,
    stars: payload.stars,
    isFirstStarForSongDifficulty: !payload.failed && payload.priorStars === 0 && payload.stars > 0,
    isHardOrExpert: payload.difficulty === "Hard" || payload.difficulty === "Expert",
    distinctSongsPlayedToday: await countDistinctSongsPlayedToday(userId, today),
    fullCombo: payload.fullCombo,
  };
}

async function maybeAwardDailyAllClear(userId: number, today: string): Promise<{ awarded: boolean; coinsBalance: number }> {
  const [{ count }] = await query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM user_daily_missions WHERE user_id = $1 AND mission_day = $2 AND mission_code <> $3",
    [userId, today, ALL_CLEAR_CODE]
  );
  if (Number(count) !== selectDailyMissions(userId, today).length + 1) {
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
    code: "weekly_play_2_days",
    tier: "small",
    icon: "🗓️",
    name: "Stopping By",
    description: "Play on 2 different days this week.",
    rewardCoins: 30,
    progress: { statKey: "distinctDaysPlayedThisWeek", target: 2 },
  },
  {
    code: "weekly_full_combo_once",
    tier: "small",
    icon: "💯",
    name: "One Clean Take",
    description: "Full combo any song, at some point this week.",
    rewardCoins: 30,
  },
  {
    code: "weekly_play_4_days",
    tier: "medium",
    icon: "📅",
    name: "Regular Visitor",
    description: "Play on 4 different days this week.",
    rewardCoins: 60,
    progress: { statKey: "distinctDaysPlayedThisWeek", target: 4 },
  },
  {
    code: "weekly_hard_expert_no_fail",
    tier: "medium",
    icon: "🔥",
    name: "Raising The Bar",
    description: "Finish a song on Hard or Expert difficulty without failing, at some point this week.",
    rewardCoins: 60,
  },
  {
    code: "weekly_play_6_days",
    tier: "large",
    icon: "🏅",
    name: "Weekly Dedication",
    description: "Play on 6 different days this week.",
    rewardCoins: 120,
    progress: { statKey: "distinctDaysPlayedThisWeek", target: 6 },
  },
];

export interface MissionProgress {
  current: number;
  target: number;
}

export function computeMissionProgress(
  mission: MissionDefinition,
  stats: Partial<Record<MissionProgressSpec["statKey"], number>>
): MissionProgress | null {
  if (!mission.progress) return null;
  const current = stats[mission.progress.statKey] ?? 0;
  return { current: Math.min(current, mission.progress.target), target: mission.progress.target };
}

export const WEEKLY_MISSION_ALL_CLEAR_BONUS_COINS = 70;
const WEEKLY_ALL_CLEAR_CODE = "__weekly_all_clear__";

const WEEKLY_MISSION_BY_CODE = new Map(WEEKLY_MISSIONS.map((mission) => [mission.code, mission]));

export interface WeeklyMissionStats {
  failed: boolean;
  distinctDaysPlayedThisWeek: number;
  isHardOrExpert: boolean;
  fullCombo: boolean;
}

export function evaluateScoreSubmissionWeeklyMissions(stats: WeeklyMissionStats): string[] {
  const completed: string[] = [];
  if (stats.distinctDaysPlayedThisWeek >= 2) completed.push("weekly_play_2_days");
  if (!stats.failed && stats.fullCombo) completed.push("weekly_full_combo_once");
  if (stats.distinctDaysPlayedThisWeek >= 4) completed.push("weekly_play_4_days");
  if (!stats.failed && stats.isHardOrExpert) completed.push("weekly_hard_expert_no_fail");
  if (stats.distinctDaysPlayedThisWeek >= 6) completed.push("weekly_play_6_days");
  return completed;
}

export async function gatherWeeklyMissionStats(
  userId: number,
  weekStart: string,
  submission: { failed: boolean; isHardOrExpert: boolean; fullCombo: boolean }
): Promise<WeeklyMissionStats> {
  const [{ days }] = await query<{ days: string }>(
    `SELECT COUNT(DISTINCT play_day)::int AS days
     FROM user_daily_song_plays
     WHERE user_id = $1 AND play_day >= $2::date AND play_day < $2::date + INTERVAL '7 days'`,
    [userId, weekStart]
  );
  return { ...submission, distinctDaysPlayedThisWeek: Number(days) };
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
