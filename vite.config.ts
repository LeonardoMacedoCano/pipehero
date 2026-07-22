import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { listSongs } from "./src/server/songLibrary.js";

const MIME_TYPES: Record<string, string> = {
  ".chart": "text/plain; charset=utf-8",
  ".ini": "text/plain; charset=utf-8",
  ".mid": "audio/midi",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Serves the song library live from the songs folder — on purpose
// OUTSIDE the project/Vite build directory, to be a truly "dynamic"
// folder (adding a new song doesn't require a rebuild). Used only in
// `npm run dev`; the production version (Docker) uses the same logic
// in server.ts.
function songsMiddlewarePlugin(songsDir: string): Plugin {
  return {
    name: "pipehero-songs-middleware",
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.url === "/api/songs") {
          const songs = await listSongs(songsDir);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(songs));
          return;
        }

        if (req.url?.startsWith("/songs/")) {
          const relPath = decodeURIComponent(req.url.slice("/songs/".length));
          const filePath = normalize(join(songsDir, relPath));
          if (!filePath.startsWith(songsDir)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
          }
          try {
            const data = await readFile(filePath);
            res.setHeader("Content-Type", MIME_TYPES[extname(filePath)] ?? "application/octet-stream");
            res.end(data);
          } catch {
            res.writeHead(404);
            res.end("Not found");
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Reads a .env file at the project root (same mechanism docker-compose
  // uses) — so you can configure the songs folder without touching a
  // system/terminal environment variable, just create a ".env" with
  // SONGS_DIR=... (or MUSIC_PATH=..., both work, so you don't have to
  // remember a different name than Docker's).
  const env = loadEnv(mode, process.cwd(), "");
  const songsDir = resolve(env.SONGS_DIR ?? env.MUSIC_PATH ?? "./songs");
  console.log(`[pipehero] serving songs from: ${songsDir}`);

  return {
    plugins: [react(), songsMiddlewarePlugin(songsDir)],
  };
});
