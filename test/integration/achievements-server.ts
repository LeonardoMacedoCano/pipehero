import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

if (!process.env.DATABASE_URL) {
  console.log("test/integration/achievements-server.ts: skipped (needs DATABASE_URL pointing at a real Postgres).");
  console.log("Usage: DATABASE_URL=postgres://user:pass@host:5432/db npm run test:integration");
  process.exit(0);
}

const PORT = 5514;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
const SESSION_SECRET = "test-session-secret";

console.log("Building the project (npm run build)...");
await runCommand("npm", ["run", "build"]);

console.log("Starting server-dist/server.js...");
const server = spawn("node", ["server-dist/server.js"], {
  env: { ...process.env, PORT: String(PORT), GOOGLE_CLIENT_ID, SESSION_SECRET },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (d) => (serverOutput += d));
server.stderr.on("data", (d) => (serverOutput += d));

await sleep(1500);

interface Check {
  name: string;
  ok: boolean;
}

const checks: Check[] = [];
let userAId: number | null = null;
let userBId: number | null = null;

try {
  const { findOrCreateUser, createSession, signValue } = await import("../../src/server/session.js");
  const { query } = await import("../../src/server/db.js");
  const { evaluateLoginUnlocks, unlockMany } = await import("../../src/server/achievements.js");

  const userA = await findOrCreateUser({
    sub: `achievements-test-a-${Date.now()}`,
    email: "achievements-test-a@example.com",
    name: "Achievements Test A",
    picture: null,
  });
  userAId = userA.id;
  const sessionA = await createSession(userA.id);
  const cookieA = `pipehero_session=${encodeURIComponent(signValue(sessionA, SESSION_SECRET))}`;

  const userB = await findOrCreateUser({
    sub: `achievements-test-b-${Date.now()}`,
    email: "achievements-test-b@example.com",
    name: "Achievements Test B",
    picture: null,
  });
  userBId = userB.id;

  const firstLoginUnlocked = await unlockMany(userA.id, evaluateLoginUnlocks());
  checks.push({ name: "first login unlocks first_login", ok: firstLoginUnlocked.some((a) => a.code === "first_login") });

  const firstLoginRepeat = await unlockMany(userA.id, evaluateLoginUnlocks());
  checks.push({ name: "a second login does not re-unlock first_login", ok: firstLoginRepeat.length === 0 });

  await unlockMany(userB.id, evaluateLoginUnlocks());

  const scoreRes = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({
      songId: "integration-test-song",
      difficulty: "Expert",
      stars: 5,
      fullCombo: true,
      maxCombo: 50,
      starPowerPhraseBroken: [false, false],
      minRockMeter: 100,
      failed: false,
      isLateNight: false,
    }),
  });
  const scoreBody = await scoreRes.json();
  const unlockedCodes: string[] = (scoreBody.unlockedAchievements ?? []).map((a: { code: string }) => a.code);
  checks.push({
    name: "a flawless 5-star Expert full-combo run unlocks first_song/perfect_run/five_star/expert_five_star/star_power_first_use/star_power_flawless",
    ok: ["first_song", "perfect_run", "five_star", "expert_five_star", "star_power_first_use", "star_power_flawless"].every(
      (code) => unlockedCodes.includes(code)
    ),
  });

  const scoreRepeatRes = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({
      songId: "integration-test-song",
      difficulty: "Expert",
      stars: 5,
      fullCombo: true,
      maxCombo: 50,
      starPowerPhraseBroken: [false, false],
      minRockMeter: 100,
      failed: false,
      isLateNight: false,
    }),
  });
  const scoreRepeatBody = await scoreRepeatRes.json();
  checks.push({
    name: "resubmitting the same score is idempotent — no achievements repeat",
    ok: (scoreRepeatBody.unlockedAchievements ?? []).length === 0,
  });

  const failRes = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ songId: "integration-test-song-2", difficulty: "Medium", failed: true }),
  });
  const failBody = await failRes.json();
  checks.push({
    name: "a failed run unlocks first_fail",
    ok: (failBody.unlockedAchievements ?? []).some((a: { code: string }) => a.code === "first_fail"),
  });

  const scoresAfterFailRes = await fetch(`${BASE_URL}/api/scores/me`, { headers: { Cookie: cookieA } });
  const scoresAfterFail: { songId: string }[] = await scoresAfterFailRes.json();
  checks.push({
    name: "a failed run does not create a song_scores row",
    ok: !scoresAfterFail.some((s) => s.songId === "integration-test-song-2"),
  });

  const settingsRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ graphicsQuality: "low" }),
  });
  const settingsBody = await settingsRes.json();
  checks.push({
    name: "saving a setting unlocks personal_touch",
    ok: (settingsBody.unlockedAchievements ?? []).some((a: { code: string }) => a.code === "personal_touch"),
  });

  const [{ count: totalUsers }] = await query<{ count: string }>("SELECT COUNT(*)::int AS count FROM users");
  const [{ count: firstLoginCount }] = await query<{ count: string }>(
    "SELECT COUNT(DISTINCT user_id)::int AS count FROM user_achievements WHERE code = 'first_login'"
  );
  const expectedPercent = Math.round((Number(firstLoginCount) / Number(totalUsers)) * 1000) / 10;

  const achievementsRes = await fetch(`${BASE_URL}/api/achievements/me`, { headers: { Cookie: cookieA } });
  const achievementsBody: { code: string; globalUnlockPercent: number }[] = await achievementsRes.json();
  const firstLoginEntry = achievementsBody.find((a) => a.code === "first_login");
  checks.push({
    name: "GET /api/achievements/me reports globalUnlockPercent matching COUNT(user_achievements)/COUNT(users)",
    ok: firstLoginEntry?.globalUnlockPercent === expectedPercent,
  });
} catch (err) {
  checks.push({ name: `unexpected error: ${err instanceof Error ? err.message : String(err)}`, ok: false });
} finally {
  server.kill();
  await cleanup();
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

console.log(`\nAchievements unlock/notify flow (real Postgres, real server): ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

async function cleanup(): Promise<void> {
  const { query } = await import("../../src/server/db.js");
  if (userAId) await query("DELETE FROM users WHERE id = $1", [userAId]).catch(() => {});
  if (userBId) await query("DELETE FROM users WHERE id = $1", [userBId]).catch(() => {});
}
