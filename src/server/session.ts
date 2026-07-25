import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { query } from "./db.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function signValue(value: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${signature}`;
}

export function verifySignedValue(signedValue: string, secret: string): string | null {
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);
  const expectedSignature = createHmac("sha256", secret).update(value).digest("hex");

  if (signature.length !== expectedSignature.length) return null;

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  return value;
}

export interface SessionUser {
  id: number;
  googleSub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface UserRow {
  id: number;
  google_sub: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export async function findOrCreateUser(info: {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}): Promise<SessionUser> {
  const existing = await query<UserRow>("SELECT id, google_sub, email, name, avatar_url FROM users WHERE google_sub = $1", [
    info.sub,
  ]);

  if (existing.length > 0) {
    await query("UPDATE users SET email = $1, name = $2, avatar_url = $3 WHERE id = $4", [
      info.email,
      info.name,
      info.picture,
      existing[0].id,
    ]);
    return { id: existing[0].id, googleSub: info.sub, email: info.email, name: info.name, avatarUrl: info.picture };
  }

  const inserted = await query<{ id: number }>(
    "INSERT INTO users (google_sub, email, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id",
    [info.sub, info.email, info.name, info.picture]
  );
  return { id: inserted[0].id, googleSub: info.sub, email: info.email, name: info.name, avatarUrl: info.picture };
}

export async function createSession(userId: number): Promise<string> {
  const id = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [id, userId, expiresAt]);
  return id;
}

export async function getSessionUser(sessionId: string): Promise<SessionUser | null> {
  const rows = await query<UserRow>(
    `SELECT users.id, users.google_sub, users.email, users.name, users.avatar_url
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = $1 AND sessions.expires_at > now()`,
    [sessionId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return { id: row.id, googleSub: row.google_sub, email: row.email, name: row.name, avatarUrl: row.avatar_url };
}

export async function destroySession(sessionId: string): Promise<void> {
  await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
}
