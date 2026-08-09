import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 5512;
const BASE_URL = `http://127.0.0.1:${PORT}`;

console.log("Building the project (npm run build)...");
await runCommand("npm", ["run", "build"]);

console.log("Starting server-dist/server.js...");
const server = spawn("node", ["server-dist/server.js"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (d) => (serverOutput += d));
server.stderr.on("data", (d) => (serverOutput += d));

await sleep(1000);

interface Check {
  name: string;
  ok: boolean;
}

const checks: Check[] = [];

try {
  const songsRes = await fetch(`${BASE_URL}/api/songs`);
  const songs = await songsRes.json();
  checks.push({ name: "/api/songs responds 200 with JSON", ok: songsRes.status === 200 });
  checks.push({ name: "/api/songs lists at least 1 song", ok: Array.isArray(songs) && songs.length >= 1 });
  checks.push({
    name: "each song has chartUrl and at least one audioUrl",
    ok: songs.every((s: { chartUrl?: unknown; audioUrls?: unknown }) => s.chartUrl && Array.isArray(s.audioUrls) && s.audioUrls.length > 0),
  });

  if (songs.length > 0) {
    const chartRes = await fetch(`${BASE_URL}${songs[0].chartUrl}`);
    const chartText = await chartRes.text();
    checks.push({ name: "first song's chartUrl is reachable and looks like a .chart", ok: chartRes.status === 200 && chartText.includes("[Song]") });

    const audioRes = await fetch(`${BASE_URL}${songs[0].audioUrls[0]}`);
    checks.push({ name: "first song's first audioUrl is reachable", ok: audioRes.status === 200 });
  }

  const indexRes = await fetch(`${BASE_URL}/index.html`);
  checks.push({ name: "/index.html responds 200", ok: indexRes.status === 200 });

  const spaRes = await fetch(`${BASE_URL}/a-route-that-does-not-exist`);
  checks.push({ name: "unknown route falls back to SPA (200, index.html)", ok: spaRes.status === 200 });

  const traversalRes = await fetch(`${BASE_URL}/songs/../../../etc/passwd`);
  const traversalBody = await traversalRes.text();
  checks.push({
    name: "path traversal attempt does not leak a system file",
    ok: !traversalBody.includes("root:"),
  });
} finally {
  server.kill();
}

console.log("\n=== Checks ===");
let allOk = true;
for (const c of checks) {
  console.log(`${c.ok ? "✔" : "✘"} ${c.name}`);
  if (!c.ok) allOk = false;
}

if (!allOk) {
  console.log("\n--- server output (for debugging) ---");
  console.log(serverOutput);
}

console.log(`\nPhase 5 validation (real server, real build): ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}
