import type { IncomingMessage, ServerResponse } from "node:http";
import { query } from "./db.js";
import { readJsonBody, sendJson } from "./authRoutes.js";
import { getRequestUser } from "./requestUser.js";
import { isGraphicsQuality } from "../render/graphicsQuality.js";
import { evaluateSettingsUnlocks, unlockMany } from "./achievements.js";
import { isValidThemeEffectId, isValidThemeId, ownsThemeEffectId, ownsThemeId } from "./shop.js";

const MAX_CALIBRATION_MS = 1000;
const MAX_THEME_ID_LENGTH = 64;

interface SettingsRow {
  calibration_ms: number;
  theme_id: string | null;
  theme_effect_id: string | null;
  key_bindings: Record<string, unknown> | null;
  strum_mode_enabled: boolean | null;
  graphics_quality: string | null;
}

interface SettingsPayload {
  calibrationMs?: number;
  themeId?: string;
  themeEffectId?: string;
  keyBindings?: Record<string, unknown>;
  strumModeEnabled?: boolean;
  graphicsQuality?: string;
}

function toResponseBody(row: SettingsRow | undefined) {
  return {
    calibrationMs: row?.calibration_ms ?? null,
    themeId: row?.theme_id ?? null,
    themeEffectId: row?.theme_effect_id ?? null,
    keyBindings: row?.key_bindings ?? null,
    strumModeEnabled: row?.strum_mode_enabled ?? null,
    graphicsQuality: row?.graphics_quality ?? null,
  };
}

function isValidBindingValue(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const binding = value as Record<string, unknown>;
  if (binding.source === "keyboard") return typeof binding.code === "string";
  if (binding.source === "gamepad") return typeof binding.deviceId === "string" && typeof binding.button === "number";
  return false;
}

function isValidKeyBindings(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isValidBindingValue);
}

export async function handleSettingsRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0];

  if (url === "/api/settings/me" && req.method === "GET") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 200, toResponseBody(undefined));
      return true;
    }

    const rows = await query<SettingsRow>(
      "SELECT calibration_ms, theme_id, theme_effect_id, key_bindings, strum_mode_enabled, graphics_quality FROM user_settings WHERE user_id = $1",
      [user.id]
    );
    sendJson(res, 200, toResponseBody(rows[0]));
    return true;
  }

  if (url === "/api/settings/me" && req.method === "PUT") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Not logged in" });
      return true;
    }

    let body: SettingsPayload;
    try {
      body = await readJsonBody<SettingsPayload>(req);
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return true;
    }
    const columns: string[] = [];
    const values: unknown[] = [];

    if (body.calibrationMs !== undefined) {
      if (typeof body.calibrationMs !== "number" || !Number.isFinite(body.calibrationMs) || Math.abs(body.calibrationMs) > MAX_CALIBRATION_MS) {
        sendJson(res, 400, { error: "Invalid calibrationMs" });
        return true;
      }
      columns.push("calibration_ms");
      values.push(Math.round(body.calibrationMs));
    }

    if (body.themeId !== undefined) {
      if (
        typeof body.themeId !== "string" ||
        body.themeId.length === 0 ||
        body.themeId.length > MAX_THEME_ID_LENGTH ||
        !isValidThemeId(body.themeId)
      ) {
        sendJson(res, 400, { error: "Invalid themeId" });
        return true;
      }
      if (!(await ownsThemeId(user.id, body.themeId))) {
        sendJson(res, 403, { error: "You don't own this theme yet" });
        return true;
      }
      columns.push("theme_id");
      values.push(body.themeId);
    }

    if (body.themeEffectId !== undefined) {
      if (
        typeof body.themeEffectId !== "string" ||
        body.themeEffectId.length === 0 ||
        body.themeEffectId.length > MAX_THEME_ID_LENGTH ||
        !isValidThemeEffectId(body.themeEffectId)
      ) {
        sendJson(res, 400, { error: "Invalid themeEffectId" });
        return true;
      }
      if (!(await ownsThemeEffectId(user.id, body.themeEffectId))) {
        sendJson(res, 403, { error: "You don't own this effect yet" });
        return true;
      }
      columns.push("theme_effect_id");
      values.push(body.themeEffectId);
    }

    if (body.keyBindings !== undefined) {
      if (!isValidKeyBindings(body.keyBindings)) {
        sendJson(res, 400, { error: "Invalid keyBindings" });
        return true;
      }
      columns.push("key_bindings");
      values.push(JSON.stringify(body.keyBindings));
    }

    if (body.strumModeEnabled !== undefined) {
      if (typeof body.strumModeEnabled !== "boolean") {
        sendJson(res, 400, { error: "Invalid strumModeEnabled" });
        return true;
      }
      columns.push("strum_mode_enabled");
      values.push(body.strumModeEnabled);
    }

    if (body.graphicsQuality !== undefined) {
      if (typeof body.graphicsQuality !== "string" || !isGraphicsQuality(body.graphicsQuality)) {
        sendJson(res, 400, { error: "Invalid graphicsQuality" });
        return true;
      }
      columns.push("graphics_quality");
      values.push(body.graphicsQuality);
    }

    if (columns.length === 0) {
      sendJson(res, 400, { error: "No settings provided" });
      return true;
    }

    const placeholders = columns.map((_, index) => `$${index + 2}`);
    const updateClause = columns.map((column, index) => `${column} = $${index + 2}`).join(", ");
    await query(
      `INSERT INTO user_settings (user_id, ${columns.join(", ")}) VALUES ($1, ${placeholders.join(", ")})
       ON CONFLICT (user_id) DO UPDATE SET ${updateClause}`,
      [user.id, ...values]
    );
    const unlockedAchievements = await unlockMany(user.id, evaluateSettingsUnlocks());
    sendJson(res, 200, { ok: true, unlockedAchievements });
    return true;
  }

  return false;
}
