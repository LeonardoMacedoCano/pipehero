import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyGoogleIdToken } from "./googleAuth.js";
import { createSession, destroySession, findOrCreateUser, getSessionUser, signValue, verifySignedValue } from "./session.js";
import { evaluateLoginUnlocks, unlockMany } from "./achievements.js";

const SESSION_COOKIE_NAME = "pipehero_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 20;
const loginAttemptsByIp = new Map<string, { count: number; windowStart: number }>();

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttemptsByIp.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginAttemptsByIp.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
}

interface PublicUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

function toPublicUser(user: { name: string; email: string; avatarUrl: string | null }): PublicUser {
  return { name: user.name, email: user.email, avatarUrl: user.avatarUrl };
}

export function readSessionIdFromCookies(req: IncomingMessage, secret: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!entry) return null;
  const value = decodeURIComponent(entry.slice(SESSION_COOKIE_NAME.length + 1));
  return verifySignedValue(value, secret);
}

function setSessionCookie(res: ServerResponse, sessionId: string, secret: string): void {
  const signed = signValue(sessionId, secret);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(signed)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`
  );
}

function clearSessionCookie(res: ServerResponse): void {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

const MAX_JSON_BODY_BYTES = 1024 * 1024;

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += (chunk as Buffer).length;
    if (totalBytes > MAX_JSON_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** Handles /api/auth/* if the request matches one of its routes. Returns whether it did. */
export async function handleAuthRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0];
  const secret = process.env.SESSION_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (url === "/api/auth/google" && req.method === "POST") {
    if (!secret || !clientId) {
      sendJson(res, 500, { error: "Login not configured on the server" });
      return true;
    }
    if (isLoginRateLimited(req.socket.remoteAddress ?? "unknown")) {
      sendJson(res, 429, { error: "Too many login attempts, try again later" });
      return true;
    }
    try {
      const { credential } = await readJsonBody<{ credential?: string }>(req);
      if (!credential) {
        sendJson(res, 400, { error: "Missing credential" });
        return true;
      }
      const googleUser = await verifyGoogleIdToken(credential, clientId);
      const user = await findOrCreateUser(googleUser);
      const sessionId = await createSession(user.id);
      setSessionCookie(res, sessionId, secret);
      const unlockedAchievements = await unlockMany(user.id, evaluateLoginUnlocks());
      sendJson(res, 200, { user: toPublicUser(user), unlockedAchievements });
    } catch (err) {
      console.error("[auth] Google login failed:", err);
      sendJson(res, 401, { error: "Invalid Google credential" });
    }
    return true;
  }

  if (url === "/api/auth/me" && req.method === "GET") {
    const sessionId = secret ? readSessionIdFromCookies(req, secret) : null;
    const user = sessionId ? await getSessionUser(sessionId) : null;
    sendJson(res, 200, { user: user ? toPublicUser(user) : null, googleClientId: clientId ?? null });
    return true;
  }

  if (url === "/api/auth/logout" && req.method === "POST") {
    const sessionId = secret ? readSessionIdFromCookies(req, secret) : null;
    if (sessionId) await destroySession(sessionId);
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}
