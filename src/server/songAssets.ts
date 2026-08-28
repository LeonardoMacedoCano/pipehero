import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isInsideDir } from "./pathGuard.js";

export const SONG_MIME_TYPES: Record<string, string> = {
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

/** Serves a file under `/songs/...` from `songsDir`, shared by the dev (Vite) and production servers. */
export async function serveSongAsset(req: IncomingMessage, res: ServerResponse, songsDir: string): Promise<void> {
  const relPath = decodeURIComponent((req.url ?? "").slice("/songs/".length).split("?")[0]);
  const filePath = normalize(join(songsDir, relPath));

  if (!isInsideDir(filePath, songsDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": SONG_MIME_TYPES[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}
