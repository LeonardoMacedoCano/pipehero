import type { IncomingMessage, ServerResponse } from "node:http";
import { query } from "./db.js";
import { readJsonBody, sendJson } from "./authRoutes.js";
import { getRequestUser } from "./requestUser.js";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements.js";
import { DIFFICULTY_ORDER } from "../engine/availableTracks.js";
import type { Difficulty } from "../types.js";

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTY_ORDER as string[]).includes(value);
}

interface ScoreRow {
  song_id: string;
  difficulty: string;
  stars: number;
}

interface SubmitScoreBody {
  songId?: string;
  difficulty?: string;
  stars?: number;
  fullCombo?: boolean;
}

/** Handles /api/scores and /api/achievements if the request matches one of its routes. Returns whether it did. */
export async function handleScoreRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0];

  if (url === "/api/scores" && req.method === "POST") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 200, { ok: false });
      return true;
    }

    const body = await readJsonBody<SubmitScoreBody>(req);
    const { songId, difficulty, stars, fullCombo } = body;
    if (
      typeof songId !== "string" ||
      !songId ||
      typeof difficulty !== "string" ||
      !isDifficulty(difficulty) ||
      !Number.isInteger(stars) ||
      stars! < 0 ||
      stars! > 5
    ) {
      sendJson(res, 400, { error: "Invalid score payload" });
      return true;
    }

    await query(
      `INSERT INTO song_scores (user_id, song_id, difficulty, stars)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, song_id, difficulty)
       DO UPDATE SET
         stars = GREATEST(song_scores.stars, EXCLUDED.stars),
         achieved_at = CASE WHEN EXCLUDED.stars > song_scores.stars THEN EXCLUDED.achieved_at ELSE song_scores.achieved_at END`,
      [user.id, songId, difficulty, stars]
    );

    await evaluateAchievements(user.id, { fullCombo: Boolean(fullCombo) });

    sendJson(res, 200, { ok: true });
    return true;
  }

  if (url === "/api/scores/me" && req.method === "GET") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 200, []);
      return true;
    }

    const rows = await query<ScoreRow>("SELECT song_id, difficulty, stars FROM song_scores WHERE user_id = $1", [
      user.id,
    ]);
    sendJson(
      res,
      200,
      rows.map((row) => ({ songId: row.song_id, difficulty: row.difficulty, stars: row.stars }))
    );
    return true;
  }

  if (url === "/api/achievements/me" && req.method === "GET") {
    const user = await getRequestUser(req);
    const unlocked = user
      ? await query<{ code: string; unlocked_at: string }>(
          "SELECT code, unlocked_at FROM user_achievements WHERE user_id = $1",
          [user.id]
        )
      : [];
    const unlockedByCode = new Map(unlocked.map((row) => [row.code, row.unlocked_at]));

    sendJson(
      res,
      200,
      ACHIEVEMENTS.map((achievement) => ({
        ...achievement,
        unlocked: unlockedByCode.has(achievement.code),
        unlockedAt: unlockedByCode.get(achievement.code) ?? null,
      }))
    );
    return true;
  }

  return false;
}
