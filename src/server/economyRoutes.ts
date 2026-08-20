import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./authRoutes.js";
import { getRequestUser } from "./requestUser.js";
import { applyLoginStreak, toUtcDateString } from "./economy.js";
import { DAILY_MISSIONS, DAILY_MISSION_ALL_CLEAR_BONUS_COINS, getCompletedMissionCodesForToday, isAllClearCode } from "./missions.js";

function emptyEconomySnapshot() {
  return {
    coins: 0,
    currentStreak: 0,
    longestStreak: 0,
    streakGraceAvailable: true,
    streakCoinsAwardedNow: 0,
    streakSaved: false,
    milestoneHit: null,
    missionsToday: DAILY_MISSIONS.map((mission) => ({ ...mission, completed: false })),
    allClearBonusCoins: DAILY_MISSION_ALL_CLEAR_BONUS_COINS,
    allClearCompletedToday: false,
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
    const today = toUtcDateString();
    const completedCodes = await getCompletedMissionCodesForToday(user.id, today);

    sendJson(res, 200, {
      coins: streakResult.coinsBalance,
      currentStreak: streakResult.state.currentStreak,
      longestStreak: streakResult.state.longestStreak,
      streakGraceAvailable: streakResult.state.graceAvailable,
      streakCoinsAwardedNow: streakResult.alreadyCreditedToday ? 0 : streakResult.coinsAwarded,
      streakSaved: streakResult.streakSaved,
      milestoneHit: streakResult.milestoneHit,
      missionsToday: DAILY_MISSIONS.map((mission) => ({ ...mission, completed: completedCodes.has(mission.code) })),
      allClearBonusCoins: DAILY_MISSION_ALL_CLEAR_BONUS_COINS,
      allClearCompletedToday: [...completedCodes].some(isAllClearCode),
    });
    return true;
  }

  return false;
}
