import { query } from "./db.js";
import { dateStringInTimeZone, resolveConfiguredTimeZone, weekStartDateStringInTimeZone } from "../timeZone.js";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  graceAvailable: boolean;
}

export interface StreakUpdateResult {
  state: StreakState;
  coinsAwarded: number;
  streakSaved: boolean;
  milestoneHit: number | null;
  alreadyCreditedToday: boolean;
}

const BASE_DAILY_LOGIN_COINS = 5;
const STREAK_MILESTONE_BONUSES: Record<number, number> = { 3: 15, 7: 30, 14: 60, 30: 150 };
const RECURRING_MILESTONE_INTERVAL = 30;
const RECURRING_MILESTONE_BONUS = 150;

let cachedServerTimeZone: string | null = null;

export function getServerTimeZone(): string {
  if (cachedServerTimeZone === null) {
    const resolved = resolveConfiguredTimeZone(process.env.TIME_ZONE);
    if (resolved.warning) console.warn(`[pipehero] ${resolved.warning}`);
    cachedServerTimeZone = resolved.timeZone;
  }
  return cachedServerTimeZone;
}

export function toServerDateString(date: Date = new Date(), timeZone: string = getServerTimeZone()): string {
  return dateStringInTimeZone(date, timeZone);
}

function daysBetween(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

export function toServerWeekStart(date: Date = new Date(), timeZone: string = getServerTimeZone()): string {
  return weekStartDateStringInTimeZone(date, timeZone);
}

export function computeStreakCoinReward(streak: number): { total: number; milestoneHit: number | null } {
  const explicitBonus = STREAK_MILESTONE_BONUSES[streak];
  if (explicitBonus !== undefined) return { total: BASE_DAILY_LOGIN_COINS + explicitBonus, milestoneHit: streak };
  if (streak > 30 && streak % RECURRING_MILESTONE_INTERVAL === 0) {
    return { total: BASE_DAILY_LOGIN_COINS + RECURRING_MILESTONE_BONUS, milestoneHit: streak };
  }
  return { total: BASE_DAILY_LOGIN_COINS, milestoneHit: null };
}

export function computeStreakUpdate(state: StreakState, today: string): StreakUpdateResult {
  if (state.lastLoginDate === null) {
    const { total, milestoneHit } = computeStreakCoinReward(1);
    return {
      state: { currentStreak: 1, longestStreak: Math.max(1, state.longestStreak), lastLoginDate: today, graceAvailable: true },
      coinsAwarded: total,
      streakSaved: false,
      milestoneHit,
      alreadyCreditedToday: false,
    };
  }

  const diffDays = daysBetween(state.lastLoginDate, today);

  if (diffDays <= 0) {
    return { state, coinsAwarded: 0, streakSaved: false, milestoneHit: null, alreadyCreditedToday: true };
  }

  if (diffDays === 1) {
    const newStreak = state.currentStreak + 1;
    const { total, milestoneHit } = computeStreakCoinReward(newStreak);
    return {
      state: { currentStreak: newStreak, longestStreak: Math.max(newStreak, state.longestStreak), lastLoginDate: today, graceAvailable: true },
      coinsAwarded: total,
      streakSaved: false,
      milestoneHit,
      alreadyCreditedToday: false,
    };
  }

  if (diffDays === 2 && state.graceAvailable) {
    const newStreak = state.currentStreak + 1;
    const { total, milestoneHit } = computeStreakCoinReward(newStreak);
    return {
      state: { currentStreak: newStreak, longestStreak: Math.max(newStreak, state.longestStreak), lastLoginDate: today, graceAvailable: false },
      coinsAwarded: total,
      streakSaved: true,
      milestoneHit,
      alreadyCreditedToday: false,
    };
  }

  const { total } = computeStreakCoinReward(1);
  return {
    state: { currentStreak: 1, longestStreak: state.longestStreak, lastLoginDate: today, graceAvailable: true },
    coinsAwarded: total,
    streakSaved: false,
    milestoneHit: null,
    alreadyCreditedToday: false,
  };
}

interface UserEconomyRow {
  coins: number;
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
  streak_grace_available: boolean;
}

export async function applyLoginStreak(
  userId: number,
  now: Date = new Date()
): Promise<StreakUpdateResult & { coinsBalance: number }> {
  const today = toServerDateString(now);
  const [existing] = await query<UserEconomyRow>(
    "SELECT coins, current_streak, longest_streak, last_login_date, streak_grace_available FROM user_economy WHERE user_id = $1",
    [userId]
  );
  const state: StreakState = existing
    ? {
        currentStreak: existing.current_streak,
        longestStreak: existing.longest_streak,
        lastLoginDate: existing.last_login_date,
        graceAvailable: existing.streak_grace_available,
      }
    : { currentStreak: 0, longestStreak: 0, lastLoginDate: null, graceAvailable: true };

  const result = computeStreakUpdate(state, today);
  if (result.alreadyCreditedToday) {
    return { ...result, coinsBalance: existing?.coins ?? 0 };
  }

  const [{ coins }] = await query<{ coins: number }>(
    `INSERT INTO user_economy (user_id, coins, current_streak, longest_streak, last_login_date, streak_grace_available)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       coins = user_economy.coins + $2,
       current_streak = $3,
       longest_streak = $4,
       last_login_date = $5,
       streak_grace_available = $6,
       updated_at = now()
     RETURNING coins`,
    [userId, result.coinsAwarded, result.state.currentStreak, result.state.longestStreak, result.state.lastLoginDate, result.state.graceAvailable]
  );
  return { ...result, coinsBalance: coins };
}

export async function creditCoins(userId: number, amount: number): Promise<number> {
  if (amount === 0) {
    const [existing] = await query<{ coins: number }>("SELECT coins FROM user_economy WHERE user_id = $1", [userId]);
    return existing?.coins ?? 0;
  }
  const [{ coins }] = await query<{ coins: number }>(
    `INSERT INTO user_economy (user_id, coins) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET coins = user_economy.coins + $2, updated_at = now()
     RETURNING coins`,
    [userId, amount]
  );
  return coins;
}
