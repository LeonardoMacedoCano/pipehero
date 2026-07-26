import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { listSongs } from "./src/server/songLibrary.js";
import { handleAuthRequest } from "./src/server/authRoutes.js";
import { runMigrations } from "./src/server/migrate.js";
import { cleanupExpiredSessions } from "./src/server/session.js";

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

function isInsideDir(filePath: string, dir: string): boolean {
  return filePath === dir || filePath.startsWith(dir + sep);
}

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

    if (req.url === "/api/songs") {
      const songs = await listSongs(SONGS_DIR);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(songs));
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
  console.log(`PipeHero (production) running at http://localhost:${PORT}`);
  console.log(`  Serving static build from: ${STATIC_DIR}`);
  console.log(`  Serving songs from: ${SONGS_DIR}`);
});
