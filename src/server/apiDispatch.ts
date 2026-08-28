import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAuthRequest } from "./authRoutes.js";
import { handleScoreRequest } from "./scoreRoutes.js";
import { handleFriendsRequest } from "./friendsRoutes.js";
import { handleSettingsRequest } from "./settingsRoutes.js";
import { handleEconomyRequest } from "./economyRoutes.js";
import { handleShopRequest } from "./shopRoutes.js";

/**
 * Shared by server.ts (production) and vite.config.ts (dev middleware) so the
 * two runtimes can't drift on which URL prefixes map to which route handler.
 * `/api/songs` is intentionally excluded — dev and prod list the song library
 * differently (live scan vs. cached at startup).
 */
export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url ?? "";

  if (url.startsWith("/api/auth/")) {
    if (await handleAuthRequest(req, res)) return true;
  }

  if (url.startsWith("/api/scores") || url.startsWith("/api/achievements")) {
    if (await handleScoreRequest(req, res)) return true;
  }

  if (url.startsWith("/api/friends") || url.startsWith("/api/leaderboard")) {
    if (await handleFriendsRequest(req, res)) return true;
  }

  if (url.startsWith("/api/settings/")) {
    if (await handleSettingsRequest(req, res)) return true;
  }

  if (url.startsWith("/api/economy")) {
    if (await handleEconomyRequest(req, res)) return true;
  }

  if (url.startsWith("/api/shop")) {
    if (await handleShopRequest(req, res)) return true;
  }

  return false;
}
