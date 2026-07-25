import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

if (!process.env.DATABASE_URL) {
  console.log("test/integration/auth-server.ts: skipped (needs DATABASE_URL pointing at a real Postgres).");
  console.log("Usage: DATABASE_URL=postgres://user:pass@host:5432/db npm run test:integration");
  process.exit(0);
}

const PORT = 5513;
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
let testUserId: number | null = null;
let testSessionId: string | null = null;

try {
  const { findOrCreateUser, createSession, signValue, destroySession } = await import("../../src/server/session.js");

  const meRes = await fetch(`${BASE_URL}/api/auth/me`);
  const meBody = await meRes.json();
  checks.push({ name: "GET /api/auth/me with no cookie returns user: null", ok: meBody.user === null });
  checks.push({
    name: "GET /api/auth/me reports the configured googleClientId",
    ok: meBody.googleClientId === GOOGLE_CLIENT_ID,
  });

  const user = await findOrCreateUser({
    sub: `integration-test-${Date.now()}`,
    email: "integration-test@example.com",
    name: "Integration Test",
    picture: "https://example.com/avatar.png",
  });
  testUserId = user.id;
  checks.push({ name: "findOrCreateUser persists a real row in Postgres", ok: !!user.id });

  testSessionId = await createSession(user.id);
  const cookieHeader = `pipehero_session=${encodeURIComponent(signValue(testSessionId, SESSION_SECRET))}`;

  const meAfterLoginRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: cookieHeader } });
  const meAfterLoginBody = await meAfterLoginRes.json();
  checks.push({
    name: "GET /api/auth/me with a valid signed session cookie returns the logged-in user",
    ok: meAfterLoginBody.user?.name === "Integration Test" && meAfterLoginBody.user?.email === "integration-test@example.com",
  });

  const tamperedCookie = `pipehero_session=${encodeURIComponent(signValue(testSessionId, "wrong-secret"))}`;
  const meTamperedRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: tamperedCookie } });
  const meTamperedBody = await meTamperedRes.json();
  checks.push({ name: "GET /api/auth/me rejects a cookie signed with the wrong secret", ok: meTamperedBody.user === null });

  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", headers: { Cookie: cookieHeader } });
  const logoutBody = await logoutRes.json();
  checks.push({ name: "POST /api/auth/logout responds ok", ok: logoutBody.ok === true });

  const meAfterLogoutRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: cookieHeader } });
  const meAfterLogoutBody = await meAfterLogoutRes.json();
  checks.push({
    name: "GET /api/auth/me after logout no longer finds the (destroyed) session",
    ok: meAfterLogoutBody.user === null,
  });
  testSessionId = null;
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

console.log(`\nGoogle login / session validation (real Postgres, real server): ${allOk ? "OK ✔" : "FAILED ✘"}`);
process.exit(allOk ? 0 : 1);

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

async function cleanup(): Promise<void> {
  const { query } = await import("../../src/server/db.js");
  if (testSessionId) await query("DELETE FROM sessions WHERE id = $1", [testSessionId]).catch(() => {});
  if (testUserId) await query("DELETE FROM users WHERE id = $1", [testUserId]).catch(() => {});
}
