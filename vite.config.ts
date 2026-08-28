import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { listSongs } from "./src/server/songLibrary.js";
import { handleApiRequest } from "./src/server/apiDispatch.js";
import { serveSongAsset } from "./src/server/songAssets.js";
import { runMigrations } from "./src/server/migrate.js";
import packageJson from "./package.json" with { type: "json" };

function songsMiddlewarePlugin(songsDir: string): Plugin {
  return {
    name: "pipehero-songs-middleware",
    configureServer(server) {
      void runMigrations();

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (await handleApiRequest(req, res)) return;

        if (req.url === "/api/songs") {
          const songs = await listSongs(songsDir);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(songs));
          return;
        }

        if (req.url?.startsWith("/songs/")) {
          await serveSongAsset(req, res, songsDir);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const songsDir = resolve(env.SONGS_DIR ?? env.MUSIC_PATH ?? "./songs");
  console.log(`[pipehero] serving songs from: ${songsDir}`);

  return {
    plugins: [react(), songsMiddlewarePlugin(songsDir)],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  };
});
