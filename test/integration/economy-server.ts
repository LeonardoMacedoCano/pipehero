import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

if (!process.env.DATABASE_URL) {
  console.log("test/integration/economy-server.ts: skipped (needs DATABASE_URL pointing at a real Postgres).");
  console.log("Usage: DATABASE_URL=postgres://user:pass@host:5432/db npm run test:integration");
  process.exit(0);
}

const PORT = 5516;
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
  const { toUtcDateString } = await import("../../src/server/economy.js");

  const userA = await findOrCreateUser({
    sub: `economy-test-a-${Date.now()}`,
    email: "economy-test-a@example.com",
    name: "Economy Test A",
    picture: null,
  });
  userAId = userA.id;
  const sessionA = await createSession(userA.id);
  const cookieA = `pipehero_session=${encodeURIComponent(signValue(sessionA, SESSION_SECRET))}`;

  const userB = await findOrCreateUser({
    sub: `economy-test-b-${Date.now()}`,
    email: "economy-test-b@example.com",
    name: "Economy Test B",
    picture: null,
  });
  userBId = userB.id;
  const sessionB = await createSession(userB.id);
  const cookieB = `pipehero_session=${encodeURIComponent(signValue(sessionB, SESSION_SECRET))}`;

  const yesterday = toUtcDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const twoDaysAgo = toUtcDateString(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

  // --- Streak: first checkin ---
  const checkin1Res = await fetch(`${BASE_URL}/api/economy/checkin`, { method: "POST", headers: { Cookie: cookieA } });
  const checkin1 = await checkin1Res.json();
  checks.push({ name: "first checkin starts streak at 1 and awards the base 5 coins", ok: checkin1.currentStreak === 1 && checkin1.streakCoinsAwardedNow === 5 && checkin1.coins === 5 });

  const checkin1RepeatRes = await fetch(`${BASE_URL}/api/economy/checkin`, { method: "POST", headers: { Cookie: cookieA } });
  const checkin1Repeat = await checkin1RepeatRes.json();
  checks.push({ name: "checking in again the same day does not award coins twice", ok: checkin1Repeat.currentStreak === 1 && checkin1Repeat.streakCoinsAwardedNow === 0 && checkin1Repeat.coins === 5 });

  // --- Streak: consecutive day ---
  await query("UPDATE user_economy SET last_login_date = $1 WHERE user_id = $2", [yesterday, userA.id]);
  const checkin2Res = await fetch(`${BASE_URL}/api/economy/checkin`, { method: "POST", headers: { Cookie: cookieA } });
  const checkin2 = await checkin2Res.json();
  checks.push({ name: "checking in on the next consecutive day extends the streak to 2", ok: checkin2.currentStreak === 2 && checkin2.streakSaved === false && checkin2.streakGraceAvailable === true });

  // --- Streak: missed one day, grace available -> saved ---
  await query("UPDATE user_economy SET last_login_date = $1 WHERE user_id = $2", [twoDaysAgo, userA.id]);
  const checkin3Res = await fetch(`${BASE_URL}/api/economy/checkin`, { method: "POST", headers: { Cookie: cookieA } });
  const checkin3 = await checkin3Res.json();
  checks.push({ name: "missing exactly one day with grace available saves the streak (3) and spends the grace", ok: checkin3.currentStreak === 3 && checkin3.streakSaved === true && checkin3.streakGraceAvailable === false });

  // --- Streak: missed one day again, grace already spent -> resets ---
  await query("UPDATE user_economy SET last_login_date = $1 WHERE user_id = $2", [twoDaysAgo, userA.id]);
  const checkin4Res = await fetch(`${BASE_URL}/api/economy/checkin`, { method: "POST", headers: { Cookie: cookieA } });
  const checkin4 = await checkin4Res.json();
  checks.push({ name: "missing one day with no grace left resets the streak back to 1", ok: checkin4.currentStreak === 1 && checkin4.streakSaved === false });

  // --- Checkin without a session ---
  const anonCheckinRes = await fetch(`${BASE_URL}/api/economy/checkin`, { method: "POST" });
  const anonCheckin = await anonCheckinRes.json();
  checks.push({ name: "checkin without a session returns a zeroed snapshot", ok: anonCheckin.coins === 0 && anonCheckin.currentStreak === 0 && anonCheckin.missionsToday.length === 5 });

  // --- Missions: a failed run only completes play_any_song ---
  const failScoreRes = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieB },
    body: JSON.stringify({ songId: "economy-test-fail-song", difficulty: "Medium", failed: true }),
  });
  const failScoreBody = await failScoreRes.json();
  const failCompletedCodes: string[] = (failScoreBody.economy?.completedMissions ?? []).map((m: { code: string }) => m.code);
  checks.push({ name: "a failed run only completes play_any_song", ok: failCompletedCodes.length === 1 && failCompletedCodes.includes("play_any_song") });

  // --- Missions: a strong run on a brand-new song completes several missions at once ---
  const score1Res = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ songId: "economy-test-song-1", difficulty: "Medium", stars: 4, fullCombo: false, maxCombo: 10, starPowerPhraseBroken: [], minRockMeter: 100, failed: false, isLateNight: false }),
  });
  const score1Body = await score1Res.json();
  const score1Codes: string[] = (score1Body.economy?.completedMissions ?? []).map((m: { code: string }) => m.code);
  checks.push({
    name: "a 4-star finish on a never-starred song completes play_any_song/no_fail_finish/three_star_song/first_star_new_song",
    ok: ["play_any_song", "no_fail_finish", "three_star_song", "first_star_new_song"].every((code) => score1Codes.includes(code)),
  });

  const score1RepeatRes = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ songId: "economy-test-song-1", difficulty: "Medium", stars: 4, fullCombo: false, maxCombo: 10, starPowerPhraseBroken: [], minRockMeter: 100, failed: false, isLateNight: false }),
  });
  const score1RepeatBody = await score1RepeatRes.json();
  checks.push({ name: "resubmitting the same score does not repeat any mission", ok: (score1RepeatBody.economy?.completedMissions ?? []).length === 0 });

  // --- Missions: a 2nd distinct song does not yet complete three_distinct_songs ---
  const score2Res = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ songId: "economy-test-song-2", difficulty: "Easy", stars: 1, fullCombo: false, maxCombo: 5, starPowerPhraseBroken: [], minRockMeter: 100, failed: false, isLateNight: false }),
  });
  const score2Body = await score2Res.json();
  const score2Codes: string[] = (score2Body.economy?.completedMissions ?? []).map((m: { code: string }) => m.code);
  checks.push({ name: "a 2nd distinct song today does not complete three_distinct_songs yet", ok: !score2Codes.includes("three_distinct_songs") });

  // --- Missions: a 3rd distinct song completes three_distinct_songs and the all-clear bonus ---
  const score3Res = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ songId: "economy-test-song-3", difficulty: "Easy", stars: 1, fullCombo: false, maxCombo: 5, starPowerPhraseBroken: [], minRockMeter: 100, failed: false, isLateNight: false }),
  });
  const score3Body = await score3Res.json();
  const score3Codes: string[] = (score3Body.economy?.completedMissions ?? []).map((m: { code: string }) => m.code);
  checks.push({ name: "a 3rd distinct song today completes three_distinct_songs", ok: score3Codes.includes("three_distinct_songs") });
  checks.push({ name: "completing all 5 daily missions triggers the all-clear bonus exactly once", ok: score3Body.economy?.allClearBonusAwarded === true });

  const score4Res = await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ songId: "economy-test-song-4", difficulty: "Easy", stars: 1, fullCombo: false, maxCombo: 5, starPowerPhraseBroken: [], minRockMeter: 100, failed: false, isLateNight: false }),
  });
  const score4Body = await score4Res.json();
  checks.push({ name: "the all-clear bonus does not repeat once every mission is already done today", ok: score4Body.economy?.allClearBonusAwarded === false });

  const finalCheckinRes = await fetch(`${BASE_URL}/api/economy/checkin`, { method: "POST", headers: { Cookie: cookieA } });
  const finalCheckin = await finalCheckinRes.json();
  const expectedCoins = 5 /* day-1 checkin */ + 5 /* consecutive day */ + 5 /* saved day */ + 5 /* reset day */ + 10 + 10 + 15 + 15 + 20 + 20; /* missions + all-clear */
  checks.push({ name: "GET-equivalent checkin reports a coin balance matching every award granted so far", ok: finalCheckin.coins === expectedCoins });
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

console.log(`\nEconomy checkin/missions flow (real Postgres, real server): ${allOk ? "OK ✔" : "FAILED ✘"}`);
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
