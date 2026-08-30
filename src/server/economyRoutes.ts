import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./authRoutes.js";
import { getRequestUser } from "./requestUser.js";
import { applyLoginStreak, computeStreakCoinReward, getServerTimeZone, toServerDateString, toServerWeekStart } from "./economy.js";
import {
  DAILY_LOGIN_CODE,
  DAILY_MISSIONS_PER_DAY,
  DAILY_MISSION_ALL_CLEAR_BONUS_COINS,
  DAILY_MISSION_POOL,
  WEEKLY_MISSIONS,
  WEEKLY_MISSION_ALL_CLEAR_BONUS_COINS,
  computeMissionProgress,
  gatherWeeklyMissionStats,
  getCompletedMissionCodesForToday,
  getCompletedWeeklyMissionCodesForWeek,
  getDailyMissionProgressStats,
  isAllClearCode,
  isWeeklyAllClearCode,
  recordDailyLoginCompletion,
  selectDailyMissions,
} from "./missions.js";

function emptyEconomySnapshot() {
  return {
    timeZone: getServerTimeZone(),
    coins: 0,
    currentStreak: 0,
    longestStreak: 0,
    streakGraceAvailable: true,
    streakCoinsAwardedNow: 0,
    streakSaved: false,
    milestoneHit: null,
    missionsToday: [
      {
        code: DAILY_LOGIN_CODE,
        icon: "fire",
        name: "Daily Login",
        description: "Log in to start (or keep) your streak.",
        rewardCoins: 5,
        completed: false,
        progress: null,
      },
      ...DAILY_MISSION_POOL.slice(0, DAILY_MISSIONS_PER_DAY).map((mission) => ({
        ...mission,
        completed: false,
        progress: computeMissionProgress(mission, { distinctSongsPlayedToday: 0 }),
      })),
    ],
    allClearBonusCoins: DAILY_MISSION_ALL_CLEAR_BONUS_COINS,
    allClearCompletedToday: false,
    missionsThisWeek: WEEKLY_MISSIONS.map((mission) => ({
      ...mission,
      completed: false,
      progress: computeMissionProgress(mission, { distinctDaysPlayedThisWeek: 0 }),
    })),
    weeklyAllClearBonusCoins: WEEKLY_MISSION_ALL_CLEAR_BONUS_COINS,
    weeklyAllClearCompletedThisWeek: false,
  };
}

export async function handleEconomyRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0];

  if (url === "/api/economy/checkin" && req.method === "POST") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 200, emptyEconomySnapshot());
      return true;
    }

    const streakResult = await applyLoginStreak(user.id);
    const today = toServerDateString();
    const loginResult = await recordDailyLoginCompletion(user.id, today);
    const completedCodes = await getCompletedMissionCodesForToday(user.id, today);
    const dailyProgressStats = await getDailyMissionProgressStats(user.id, today);
    const weekStart = toServerWeekStart();
    const completedWeeklyCodes = await getCompletedWeeklyMissionCodesForWeek(user.id, weekStart);
    const weeklyStats = await gatherWeeklyMissionStats(user.id, weekStart, { failed: false, isHardOrExpert: false, fullCombo: false });

    const loginMission = {
      code: DAILY_LOGIN_CODE,
      icon: "fire",
      name: "Daily Login",
      description: `Open the game today to keep your streak going (day ${streakResult.state.currentStreak}).`,
      rewardCoins: computeStreakCoinReward(streakResult.state.currentStreak).total,
      completed: true,
      progress: null,
    };

    sendJson(res, 200, {
      timeZone: getServerTimeZone(),
      coins: loginResult.coinsBalance,
      currentStreak: streakResult.state.currentStreak,
      longestStreak: streakResult.state.longestStreak,
      streakGraceAvailable: streakResult.state.graceAvailable,
      streakCoinsAwardedNow: streakResult.alreadyCreditedToday ? 0 : streakResult.coinsAwarded,
      streakSaved: streakResult.streakSaved,
      milestoneHit: streakResult.milestoneHit,
      missionsToday: [
        loginMission,
        ...selectDailyMissions(user.id, today).map((mission) => ({
          ...mission,
          completed: completedCodes.has(mission.code),
          progress: computeMissionProgress(mission, dailyProgressStats),
        })),
      ],
      allClearBonusCoins: DAILY_MISSION_ALL_CLEAR_BONUS_COINS,
      allClearCompletedToday: [...completedCodes].some(isAllClearCode),
      missionsThisWeek: WEEKLY_MISSIONS.map((mission) => ({
        ...mission,
        completed: completedWeeklyCodes.has(mission.code),
        progress: computeMissionProgress(mission, weeklyStats),
      })),
      weeklyAllClearBonusCoins: WEEKLY_MISSION_ALL_CLEAR_BONUS_COINS,
      weeklyAllClearCompletedThisWeek: [...completedWeeklyCodes].some(isWeeklyAllClearCode),
    });
    return true;
  }

  return false;
}
