import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

if (!process.env.DATABASE_URL) {
  console.log("test/integration/friends-server.ts: skipped (needs DATABASE_URL pointing at a real Postgres).");
  console.log("Usage: DATABASE_URL=postgres://user:pass@host:5432/db npm run test:integration");
  process.exit(0);
}

const PORT = 5515;
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
const userIds: number[] = [];

function cookieFor(sessionId: string): string {
  return `pipehero_session=${encodeURIComponent(sign(sessionId))}`;
}

let sign: (value: string) => string;

async function submitScore(cookie: string, songId: string, difficulty: string, stars: number): Promise<void> {
  await fetch(`${BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      songId,
      difficulty,
      stars,
      fullCombo: false,
      maxCombo: 10,
      starPowerPhraseBroken: [],
      minRockMeter: 100,
      failed: false,
      isLateNight: false,
    }),
  });
}

try {
  const { findOrCreateUser, createSession, signValue } = await import("../../src/server/session.js");
  sign = (value: string) => signValue(value, SESSION_SECRET);

  async function makeUser(label: string): Promise<{ id: number; cookie: string }> {
    const user = await findOrCreateUser({
      sub: `friends-test-${label}-${Date.now()}-${Math.random()}`,
      email: `friends-test-${label}@example.com`,
      name: `Friends Test ${label}`,
      picture: null,
    });
    userIds.push(user.id);
    const sessionId = await createSession(user.id);
    return { id: user.id, cookie: cookieFor(sessionId) };
  }

  const a = await makeUser("a");
  const b = await makeUser("b");
  const c = await makeUser("c");
  const d = await makeUser("d");

  // --- search ---
  const searchRes = await fetch(`${BASE_URL}/api/friends/search?q=${encodeURIComponent("Friends Test B")}`, {
    headers: { Cookie: a.cookie },
  });
  const searchBody: { userId: number; name: string; friendStatus: string }[] = await searchRes.json();
  checks.push({ name: "search by name finds the right user", ok: searchBody.some((r) => r.userId === b.id) });
  checks.push({
    name: "search response never leaks another user's email",
    ok: !JSON.stringify(searchBody).includes("@example.com"),
  });

  const searchByEmailRes = await fetch(`${BASE_URL}/api/friends/search?q=${encodeURIComponent("friends-test-b@example.com")}`, {
    headers: { Cookie: a.cookie },
  });
  const searchByEmailBody: { userId: number }[] = await searchByEmailRes.json();
  checks.push({ name: "search also matches by email substring", ok: searchByEmailBody.some((r) => r.userId === b.id) });

  // --- request -> pending -> accept ---
  await fetch(`${BASE_URL}/api/friends/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: a.cookie },
    body: JSON.stringify({ friendUserId: b.id }),
  });

  const aRequestsRes = await fetch(`${BASE_URL}/api/friends/requests`, { headers: { Cookie: a.cookie } });
  const aRequests: { outgoing: { friendId: number }[] } = await aRequestsRes.json();
  checks.push({ name: "A sees the request as outgoing", ok: aRequests.outgoing.some((r) => r.friendId === b.id) });

  const bRequestsRes = await fetch(`${BASE_URL}/api/friends/requests`, { headers: { Cookie: b.cookie } });
  const bRequests: { incoming: { requestId: number; friendId: number }[] } = await bRequestsRes.json();
  const incomingFromA = bRequests.incoming.find((r) => r.friendId === a.id);
  checks.push({ name: "B sees the request as incoming", ok: !!incomingFromA });

  const acceptRes = await fetch(`${BASE_URL}/api/friends/requests/${incomingFromA!.requestId}/accept`, {
    method: "POST",
    headers: { Cookie: b.cookie },
  });
  const acceptBody: { unlockedAchievements: { code: string }[] } = await acceptRes.json();
  checks.push({
    name: "accepting a friend request unlocks squad_goals for the accepter",
    ok: acceptBody.unlockedAchievements.some((ach) => ach.code === "squad_goals"),
  });

  const aFriendsRes = await fetch(`${BASE_URL}/api/friends`, { headers: { Cookie: a.cookie } });
  const aFriends: { friendId: number }[] = await aFriendsRes.json();
  checks.push({ name: "A now sees B as a friend", ok: aFriends.some((f) => f.friendId === b.id) });

  const bFriendsRes = await fetch(`${BASE_URL}/api/friends`, { headers: { Cookie: b.cookie } });
  const bFriends: { friendId: number }[] = await bFriendsRes.json();
  checks.push({ name: "B now sees A as a friend", ok: bFriends.some((f) => f.friendId === a.id) });

  const aAchievementsRes = await fetch(`${BASE_URL}/api/achievements/me`, { headers: { Cookie: a.cookie } });
  const aAchievements: { code: string; unlocked: boolean }[] = await aAchievementsRes.json();
  checks.push({
    name: "squad_goals is also unlocked for the requester (A)",
    ok: aAchievements.some((ach) => ach.code === "squad_goals" && ach.unlocked),
  });

  // --- mutual request race auto-accepts ---
  await fetch(`${BASE_URL}/api/friends/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: d.cookie },
    body: JSON.stringify({ friendUserId: c.id }),
  });
  const mutualRes = await fetch(`${BASE_URL}/api/friends/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: c.cookie },
    body: JSON.stringify({ friendUserId: d.id }),
  });
  const mutualBody: { status: string } = await mutualRes.json();
  checks.push({ name: "a mutual pending request auto-accepts on the second insert", ok: mutualBody.status === "accepted" });

  const cFriendsRes = await fetch(`${BASE_URL}/api/friends`, { headers: { Cookie: c.cookie } });
  const cFriends: { friendId: number }[] = await cFriendsRes.json();
  checks.push({ name: "C and D are friends after the mutual-request race", ok: cFriends.some((f) => f.friendId === d.id) });

  // --- feed ---
  await submitScore(a.cookie, "friends-test-song-1", "Expert", 5);
  await submitScore(b.cookie, "friends-test-song-1", "Expert", 3);

  const feedRes = await fetch(`${BASE_URL}/api/friends/feed`, { headers: { Cookie: a.cookie } });
  const feed: { userId: number; songId: string }[] = await feedRes.json();
  checks.push({ name: "A's feed shows B's recent score", ok: feed.some((entry) => entry.userId === b.id && entry.songId === "friends-test-song-1") });

  // --- profile: visible to a friend, forbidden for a non-friend ---
  const profileRes = await fetch(`${BASE_URL}/api/friends/${b.id}/profile`, { headers: { Cookie: a.cookie } });
  const profileBody: { friend: { id: number }; scores: { songId: string }[] } = await profileRes.json();
  checks.push({ name: "A can view B's profile (accepted friends)", ok: profileRes.status === 200 && profileBody.friend.id === b.id });
  checks.push({
    name: "B's profile lists the score B just submitted",
    ok: profileBody.scores.some((s) => s.songId === "friends-test-song-1"),
  });

  const forbiddenProfileRes = await fetch(`${BASE_URL}/api/friends/${b.id}/profile`, { headers: { Cookie: c.cookie } });
  checks.push({ name: "a non-friend (C) gets 403 viewing B's profile", ok: forbiddenProfileRes.status === 403 });

  // --- compare: A wins 3 song/difficulty pairs against B, unlocking friendly_rival ---
  await submitScore(a.cookie, "friends-test-song-2", "Hard", 5);
  await submitScore(b.cookie, "friends-test-song-2", "Hard", 2);
  await submitScore(a.cookie, "friends-test-song-3", "Medium", 4);
  await submitScore(b.cookie, "friends-test-song-3", "Medium", 1);

  const compareRes = await fetch(`${BASE_URL}/api/friends/${b.id}/compare`, { headers: { Cookie: a.cookie } });
  const compareBody: {
    myWeightedScore: number;
    friendWeightedScore: number;
    rows: { songId: string; winner: string }[];
    unlockedAchievements: { code: string }[];
  } = await compareRes.json();

  const song1Row = compareBody.rows.find((r) => r.songId === "friends-test-song-1");
  checks.push({ name: "compare shows A winning song-1 (5★ vs 3★)", ok: song1Row?.winner === "me" });
  checks.push({
    name: "compare weighted scores match submitted stars * difficulty weight",
    ok: compareBody.myWeightedScore === 5 * 4 + 5 * 3 + 4 * 2 && compareBody.friendWeightedScore === 3 * 4 + 2 * 3 + 1 * 2,
  });
  checks.push({
    name: "winning 3+ compared song/difficulty pairs unlocks friendly_rival",
    ok: compareBody.unlockedAchievements.some((ach) => ach.code === "friendly_rival"),
  });

  const forbiddenCompareRes = await fetch(`${BASE_URL}/api/friends/${b.id}/compare`, { headers: { Cookie: c.cookie } });
  checks.push({ name: "a non-friend (C) gets 403 comparing against B", ok: forbiddenCompareRes.status === 403 });

  // --- leaderboards ---
  const globalRes = await fetch(`${BASE_URL}/api/leaderboard/global`, { headers: { Cookie: a.cookie } });
  const globalBody: { userId: number; weightedScore: number; isMe: boolean }[] = await globalRes.json();
  const aGlobalEntry = globalBody.find((e) => e.userId === a.id);
  checks.push({
    name: "global leaderboard reports A's weighted score and marks isMe correctly",
    ok: aGlobalEntry?.weightedScore === compareBody.myWeightedScore && aGlobalEntry?.isMe === true,
  });

  const friendsLeaderboardRes = await fetch(`${BASE_URL}/api/leaderboard/friends`, { headers: { Cookie: a.cookie } });
  const friendsLeaderboardBody: { userId: number }[] = await friendsLeaderboardRes.json();
  checks.push({
    name: "friends leaderboard includes both A and B",
    ok: friendsLeaderboardBody.some((e) => e.userId === a.id) && friendsLeaderboardBody.some((e) => e.userId === b.id),
  });

  // --- unfriend ---
  await fetch(`${BASE_URL}/api/friends/${b.id}`, { method: "DELETE", headers: { Cookie: a.cookie } });
  const aFriendsAfterRes = await fetch(`${BASE_URL}/api/friends`, { headers: { Cookie: a.cookie } });
  const aFriendsAfter: { friendId: number }[] = await aFriendsAfterRes.json();
  checks.push({ name: "unfriending removes B from A's friends list", ok: !aFriendsAfter.some((f) => f.friendId === b.id) });

  const profileAfterUnfriendRes = await fetch(`${BASE_URL}/api/friends/${b.id}/profile`, { headers: { Cookie: a.cookie } });
  checks.push({ name: "A gets 403 viewing B's profile after unfriending", ok: profileAfterUnfriendRes.status === 403 });
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

console.log(`\nFriends lifecycle (real Postgres, real server): ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

async function cleanup(): Promise<void> {
  const { query } = await import("../../src/server/db.js");
  for (const id of userIds) {
    await query("DELETE FROM users WHERE id = $1", [id]).catch(() => {});
  }
}
