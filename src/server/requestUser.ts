import type { IncomingMessage } from "node:http";
import { getSessionUser, type SessionUser } from "./session.js";
import { readSessionIdFromCookies } from "./authRoutes.js";

export async function getRequestUser(req: IncomingMessage): Promise<SessionUser | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const sessionId = readSessionIdFromCookies(req, secret);
  return sessionId ? getSessionUser(sessionId) : null;
}
