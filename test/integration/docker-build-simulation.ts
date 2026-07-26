import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 5513;
const BASE_URL = `http://127.0.0.1:${PORT}`;

console.log("Building the project (npm run build)...");
await runCommand("npm", ["run", "build"]);

const runtimeDir = mkdtempSync(join(tmpdir(), "pipehero-docker-runtime-"));
const fakeSongsDir = mkdtempSync(join(tmpdir(), "pipehero-docker-songs-"));

console.log(`Simulating the Docker image's runtime stage in: ${runtimeDir}`);
console.log("(copying ONLY the files the Dockerfile copies into the final stage)");

try {
  cpSync("package.json", join(runtimeDir, "package.json"));
  cpSync("node_modules", join(runtimeDir, "node_modules"), { recursive: true });
  cpSync("dist", join(runtimeDir, "dist"), { recursive: true });
  cpSync("server-dist", join(runtimeDir, "server-dist"), { recursive: true });

  const songDir = join(fakeSongsDir, "docker-test-song");
  mkdirSync(songDir, { recursive: true });
  writeFileSync(join(songDir, "notes.chart"), "[Song]\n{\n  Resolution = 192\n}\n[SyncTrack]\n{\n  0 = B 120000\n}\n[ExpertSingle]\n{\n  0 = N 0 0\n}\n");
  writeFileSync(join(songDir, "song.ini"), "[song]\nname = Docker Test Song\nartist = PipeHero\n");
  writeFileSync(join(songDir, "song.wav"), "");

  console.log("Starting `node server-dist/server.js` with only what was copied (node_modules' 'dependencies' + dist/server-dist, no rest of the project)...");
  const server = spawn("node", ["server-dist/server.js"], {
    cwd: runtimeDir,
    env: {
      PATH: process.env.PATH,
      PORT: String(PORT),
      STATIC_DIR: join(runtimeDir, "dist"),
      SONGS_DIR: fakeSongsDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  server.stdout.on("data", (d) => (output += d));
  server.stderr.on("data", (d) => (output += d));

  await sleep(1000);

  const checks: { name: string; ok: boolean }[] = [];
  try {
    const songsRes = await fetch(`${BASE_URL}/api/songs`);
    const songs = await songsRes.json();
    checks.push({ name: "server starts and /api/songs responds", ok: songsRes.status === 200 });
    checks.push({ name: "finds the song in the mounted folder (external SONGS_DIR)", ok: songs.length === 1 && songs[0].name === "Docker Test Song" });

    const indexRes = await fetch(`${BASE_URL}/index.html`);
    checks.push({ name: "serves the built frontend (index.html)", ok: indexRes.status === 200 });

    const chartRes = await fetch(`${BASE_URL}${songs[0].chartUrl}`);
    checks.push({ name: "serves the song's chart from the external folder", ok: chartRes.status === 200 });
  } finally {
    server.kill();
  }

  console.log("\n=== Checks (runtime stage simulation, no real Docker) ===");
  let allOk = true;
  for (const c of checks) {
    console.log(`${c.ok ? "✔" : "✘"} ${c.name}`);
    if (!c.ok) allOk = false;
  }
  if (!allOk) {
    console.log("\n--- server output (debug) ---");
    console.log(output);
  }

  console.log(`\nPhase 6 validation (complete runtime files): ${allOk ? "OK ✔" : "FAILED ✘"}`);
  console.log("\nIMPORTANT: this does NOT replace actually testing `docker compose up` —");
  console.log("it only confirms that the set of files copied into the final stage is sufficient.");
  process.exit(allOk ? 0 : 1);
} finally {
  rmSync(runtimeDir, { recursive: true, force: true });
  rmSync(fakeSongsDir, { recursive: true, force: true });
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}
