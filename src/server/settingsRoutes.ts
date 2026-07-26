import type { IncomingMessage, ServerResponse } from "node:http";
import { query } from "./db.js";
import { readJsonBody, sendJson } from "./authRoutes.js";
import { getRequestUser } from "./requestUser.js";

const MAX_CALIBRATION_MS = 1000;

/** Handles /api/settings/* if the request matches one of its routes. Returns whether it did. */
export async function handleSettingsRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0];

  if (url === "/api/settings/me" && req.method === "GET") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 200, { calibrationMs: null });
      return true;
    }

    const rows = await query<{ calibration_ms: number }>("SELECT calibration_ms FROM user_settings WHERE user_id = $1", [
      user.id,
    ]);
    sendJson(res, 200, { calibrationMs: rows[0]?.calibration_ms ?? null });
    return true;
  }

  if (url === "/api/settings/me" && req.method === "PUT") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Not logged in" });
      return true;
    }

    const { calibrationMs } = await readJsonBody<{ calibrationMs?: number }>(req);
    if (typeof calibrationMs !== "number" || !Number.isFinite(calibrationMs) || Math.abs(calibrationMs) > MAX_CALIBRATION_MS) {
      sendJson(res, 400, { error: "Invalid calibrationMs" });
      return true;
    }

    await query(
      `INSERT INTO user_settings (user_id, calibration_ms) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET calibration_ms = EXCLUDED.calibration_ms`,
      [user.id, Math.round(calibrationMs)]
    );
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}
