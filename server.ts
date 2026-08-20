import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { getSongLibrary, loadSongLibrary } from "./src/server/songLibrary.js";
import { handleAuthRequest } from "./src/server/authRoutes.js";
import { handleScoreRequest } from "./src/server/scoreRoutes.js";
import { handleFriendsRequest } from "./src/server/friendsRoutes.js";
import { handleSettingsRequest } from "./src/server/settingsRoutes.js";
import { handleEconomyRequest } from "./src/server/economyRoutes.js";
import { handleShopRequest } from "./src/server/shopRoutes.js";
import { runMigrations } from "./src/server/migrate.js";
import { cleanupExpiredSessions } from "./src/server/session.js";
import { isInsideDir } from "./src/server/pathGuard.js";

const SESSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const PORT = process.env.PORT ? Number(process.env.PORT) : 5511;
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? "./dist");
const SONGS_DIR = resolve(process.env.SONGS_DIR ?? process.env.MUSIC_PATH ?? "./songs");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".chart": "text/plain; charset=utf-8",
  ".mid": "audio/midi",
  ".ini": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
};

async function serveStaticFile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let filePath = normalize(join(STATIC_DIR, urlPath));

  if (!isInsideDir(filePath, STATIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  let stats = await stat(filePath).catch(() => null);
  if (stats && stats.isDirectory()) {
    filePath = join(filePath, "index.html");
    stats = await stat(filePath).catch(() => null);
  }
  if (!stats) {
    filePath = join(STATIC_DIR, "index.html");
    stats = await stat(filePath).catch(() => null);
  }

  if (!stats) {
    res.writeHead(404);
    res.end("Not found — did you run 'npm run build' before starting the server?");
    return;
  }

  const contentType = MIME_TYPES[extname(filePath)] ?? "application/octet-stream";
  const data = await readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(data);
}

async function serveSongAsset(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const relPath = decodeURIComponent((req.url ?? "").slice("/songs/".length).split("?")[0]);
  const filePath = normalize(join(SONGS_DIR, relPath));

  if (!isInsideDir(filePath, SONGS_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/auth/")) {
      if (await handleAuthRequest(req, res)) return;
    }

    if (req.url?.startsWith("/api/scores") || req.url?.startsWith("/api/achievements")) {
      if (await handleScoreRequest(req, res)) return;
    }

    if (req.url?.startsWith("/api/friends") || req.url?.startsWith("/api/leaderboard")) {
      if (await handleFriendsRequest(req, res)) return;
    }

    if (req.url?.startsWith("/api/settings/")) {
      if (await handleSettingsRequest(req, res)) return;
    }

    if (req.url?.startsWith("/api/economy")) {
      if (await handleEconomyRequest(req, res)) return;
    }

    if (req.url?.startsWith("/api/shop")) {
      if (await handleShopRequest(req, res)) return;
    }

    if (req.url === "/api/songs") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(getSongLibrary()));
      return;
    }

    if (req.url?.startsWith("/songs/")) {
      await serveSongAsset(req, res);
      return;
    }

    await serveStaticFile(req, res);
  } catch (err) {
    console.error("[server] unhandled error:", err);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

const songs = await loadSongLibrary(SONGS_DIR);
console.log(`[pipehero] song library loaded: ${songs.length} song(s) from ${SONGS_DIR}`);

let dbAvailable = false;
try {
  await runMigrations();
  dbAvailable = Boolean(process.env.DATABASE_URL);
} catch (err) {
  console.error("[pipehero] failed to run migrations — starting without login/accounts:", err);
}

if (dbAvailable) {
  cleanupExpiredSessions().catch((err) => console.error("[pipehero] session cleanup failed:", err));
  setInterval(() => {
    cleanupExpiredSessions().catch((err) => console.error("[pipehero] session cleanup failed:", err));
  }, SESSION_CLEANUP_INTERVAL_MS).unref();
}

server.listen(PORT, () => {
  console.log(`[pipehero] running at http://localhost:${PORT}`);
  console.log(`[pipehero] serving static build from: ${STATIC_DIR}`);
  console.log(`[pipehero] serving songs from: ${SONGS_DIR}`);
});
