import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

if (!process.env.DATABASE_URL) {
  console.log("test/integration/shop-server.ts: skipped (needs DATABASE_URL pointing at a real Postgres).");
  console.log("Usage: DATABASE_URL=postgres://user:pass@host:5432/db npm run test:integration");
  process.exit(0);
}

const PORT = 5517;
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
let userCId: number | null = null;
let userDId: number | null = null;

try {
  const { findOrCreateUser, createSession, signValue } = await import("../../src/server/session.js");
  const { query } = await import("../../src/server/db.js");
  const { ownsCosmeticId } = await import("../../src/server/shop.js");

  const userA = await findOrCreateUser({
    sub: `shop-test-a-${Date.now()}`,
    email: "shop-test-a@example.com",
    name: "Shop Test A",
    picture: null,
  });
  userAId = userA.id;
  const sessionA = await createSession(userA.id);
  const cookieA = `pipehero_session=${encodeURIComponent(signValue(sessionA, SESSION_SECRET))}`;
  await query("INSERT INTO user_economy (user_id, coins) VALUES ($1, 500) ON CONFLICT (user_id) DO UPDATE SET coins = 500", [
    userA.id,
  ]);

  // --- Anonymous browsing ---
  const anonRes = await fetch(`${BASE_URL}/api/shop/me`);
  const anon = await anonRes.json();
  checks.push({ name: "anonymous GET /api/shop/me returns 0 coins and everything unowned", ok: anon.coins === 0 && anon.items.length === 22 && anon.items.every((i: { owned: boolean }) => !i.owned) });
  checks.push({ name: "anonymous GET /api/shop/me reports every equipped slot as null", ok: Object.values(anon.equipped).every((v) => v === null) });

  // --- Starting state for userA ---
  const meRes = await fetch(`${BASE_URL}/api/shop/me`, { headers: { Cookie: cookieA } });
  const me = await meRes.json();
  checks.push({ name: "userA starts with 500 coins and nothing owned", ok: me.coins === 500 && me.items.every((i: { owned: boolean }) => !i.owned) });

  // --- Successful purchase debits the exact price ---
  const buy1Res = await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ itemId: "theme_darkOnyxAmber" }),
  });
  const buy1 = await buy1Res.json();
  checks.push({ name: "buying Dark Onyx Amber (300 coins) debits exactly 300 and grants ownership", ok: buy1.ok === true && buy1.coinsBalance === 200 });

  const afterBuy1Res = await fetch(`${BASE_URL}/api/shop/me`, { headers: { Cookie: cookieA } });
  const afterBuy1 = await afterBuy1Res.json();
  const ownsAmber = afterBuy1.items.find((i: { id: string }) => i.id === "theme_darkOnyxAmber")?.owned;
  checks.push({ name: "GET /api/shop/me reflects the new ownership and balance", ok: afterBuy1.coins === 200 && ownsAmber === true });

  // --- Buying an already-owned item does not double-charge ---
  const buy1RepeatRes = await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ itemId: "theme_darkOnyxAmber" }),
  });
  const buy1Repeat = await buy1RepeatRes.json();
  checks.push({ name: "re-buying an owned item fails with already_owned and status 400", ok: buy1RepeatRes.status === 400 && buy1Repeat.ok === false && buy1Repeat.error === "already_owned" });

  const afterRepeatRes = await fetch(`${BASE_URL}/api/shop/me`, { headers: { Cookie: cookieA } });
  const afterRepeat = await afterRepeatRes.json();
  checks.push({ name: "re-buying an owned item does not change the coin balance", ok: afterRepeat.coins === 200 });

  // --- A second successful purchase (200 -> 50) ---
  const buy2Res = await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ itemId: "effect_bloom" }),
  });
  const buy2 = await buy2Res.json();
  checks.push({ name: "buying Bloom (150 coins) leaves exactly 50 coins", ok: buy2.ok === true && buy2.coinsBalance === 50 });

  // --- Insufficient funds: no partial state change ---
  const buy3Res = await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ itemId: "theme_draculaDark" }),
  });
  const buy3 = await buy3Res.json();
  checks.push({ name: "buying with insufficient coins fails with status 402 and does not touch the balance", ok: buy3Res.status === 402 && buy3.ok === false && buy3.error === "insufficient_coins" });

  const afterFailedBuyRes = await fetch(`${BASE_URL}/api/shop/me`, { headers: { Cookie: cookieA } });
  const afterFailedBuy = await afterFailedBuyRes.json();
  const ownsDracula = afterFailedBuy.items.find((i: { id: string }) => i.id === "theme_draculaDark")?.owned;
  checks.push({ name: "a failed purchase leaves both the coin balance and ownership untouched (transaction rolled back cleanly)", ok: afterFailedBuy.coins === 50 && ownsDracula === false });

  // --- PUT /api/settings/me now enforces ownership ---
  const putLockedRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ themeId: "draculaDark" }),
  });
  checks.push({ name: "PUT /api/settings/me rejects an unowned themeId with 403", ok: putLockedRes.status === 403 });

  const putOwnedRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ themeId: "darkOnyxAmber", themeEffectId: "bloom" }),
  });
  const putOwned = await putOwnedRes.json();
  checks.push({ name: "PUT /api/settings/me accepts an owned themeId/themeEffectId", ok: putOwnedRes.status === 200 && putOwned.ok === true });

  const putInvalidRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ themeId: "not-a-real-theme" }),
  });
  checks.push({ name: "PUT /api/settings/me rejects an id that isn't in the catalog at all with 400", ok: putInvalidRes.status === 400 });

  // --- Grandfather: a user who already had a premium effect equipped before the shop existed keeps it ---
  const userB = await findOrCreateUser({
    sub: `shop-test-b-${Date.now()}`,
    email: "shop-test-b@example.com",
    name: "Shop Test B",
    picture: null,
  });
  userBId = userB.id;
  await query(
    `INSERT INTO user_settings (user_id, theme_effect_id) VALUES ($1, 'breathing')
     ON CONFLICT (user_id) DO UPDATE SET theme_effect_id = 'breathing'`,
    [userB.id]
  );
  const ownedBeforeGrandfather = await ownsCosmeticId(userB.id, "effect", "breathing");
  checks.push({ name: "before the grandfather backfill, a pre-existing equipped effect is NOT yet owned", ok: ownedBeforeGrandfather === false });

  // Same backfill the migration runs, applied here directly since the real migration already ran once for the DB.
  await query(
    `INSERT INTO user_cosmetic_unlocks (user_id, item_id)
     SELECT user_id, 'effect_' || theme_effect_id FROM user_settings
     WHERE user_id = $1 AND theme_effect_id IS NOT NULL AND theme_effect_id <> 'none'
     ON CONFLICT DO NOTHING`,
    [userB.id]
  );
  const ownedAfterGrandfather = await ownsCosmeticId(userB.id, "effect", "breathing");
  checks.push({ name: "after the grandfather backfill, the pre-existing equipped effect is owned", ok: ownedAfterGrandfather === true });

  // --- Profile cosmetics: ownership-gated equip, unequip, and multi-slot equip ---
  const userC = await findOrCreateUser({
    sub: `shop-test-c-${Date.now()}`,
    email: "shop-test-c@example.com",
    name: "Shop Test C",
    picture: null,
  });
  userCId = userC.id;
  const sessionC = await createSession(userC.id);
  const cookieC = `pipehero_session=${encodeURIComponent(signValue(sessionC, SESSION_SECRET))}`;
  await query("INSERT INTO user_economy (user_id, coins) VALUES ($1, 1000) ON CONFLICT (user_id) DO UPDATE SET coins = 1000", [
    userC.id,
  ]);

  const equipUnownedRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({ equippedAvatarId: "guitar" }),
  });
  checks.push({ name: "equipping an avatar not owned yet is rejected with 403", ok: equipUnownedRes.status === 403 });

  const buyAvatarRes = await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({ itemId: "avatar_guitar" }),
  });
  const buyAvatar = await buyAvatarRes.json();
  checks.push({ name: "buying the Guitarist avatar (100 coins) succeeds", ok: buyAvatar.ok === true && buyAvatar.coinsBalance === 900 });

  const equipAvatarRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({ equippedAvatarId: "guitar" }),
  });
  checks.push({ name: "equipping an owned avatar succeeds", ok: equipAvatarRes.status === 200 });

  const afterEquipRes = await fetch(`${BASE_URL}/api/shop/me`, { headers: { Cookie: cookieC } });
  const afterEquip = await afterEquipRes.json();
  checks.push({ name: "GET /api/shop/me reflects the equipped avatar", ok: afterEquip.equipped.avatarId === "guitar" });

  const settingsAfterEquipRes = await fetch(`${BASE_URL}/api/settings/me`, { headers: { Cookie: cookieC } });
  const settingsAfterEquip = await settingsAfterEquipRes.json();
  checks.push({ name: "GET /api/settings/me reflects the equipped avatar", ok: settingsAfterEquip.equippedAvatarId === "guitar" });

  const unequipRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({ equippedAvatarId: null }),
  });
  checks.push({ name: "unequipping (null) always succeeds, no ownership check needed", ok: unequipRes.status === 200 });

  const afterUnequipRes = await fetch(`${BASE_URL}/api/shop/me`, { headers: { Cookie: cookieC } });
  const afterUnequip = await afterUnequipRes.json();
  checks.push({ name: "GET /api/shop/me reflects the unequip", ok: afterUnequip.equipped.avatarId === null });

  await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({ itemId: "border_gold" }),
  });
  await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({ itemId: "background_stage" }),
  });
  await fetch(`${BASE_URL}/api/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({ itemId: "tag_rockstar" }),
  });
  const equipAllRes = await fetch(`${BASE_URL}/api/settings/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieC },
    body: JSON.stringify({
      equippedAvatarId: "guitar",
      equippedBorderId: "gold",
      equippedBackgroundId: "stage",
      equippedTagId: "rockstar",
    }),
  });
  checks.push({ name: "equipping all 4 profile slots at once succeeds", ok: equipAllRes.status === 200 });

  const afterEquipAllRes = await fetch(`${BASE_URL}/api/shop/me`, { headers: { Cookie: cookieC } });
  const afterEquipAll = await afterEquipAllRes.json();
  checks.push({
    name: "GET /api/shop/me reflects all 4 equipped slots",
    ok:
      afterEquipAll.equipped.avatarId === "guitar" &&
      afterEquipAll.equipped.borderId === "gold" &&
      afterEquipAll.equipped.backgroundId === "stage" &&
      afterEquipAll.equipped.tagId === "rockstar",
  });

  // --- A friend viewing your profile sees your equipped cosmetics ---
  const userD = await findOrCreateUser({
    sub: `shop-test-d-${Date.now()}`,
    email: "shop-test-d@example.com",
    name: "Shop Test D",
    picture: null,
  });
  userDId = userD.id;
  const sessionD = await createSession(userD.id);
  const cookieD = `pipehero_session=${encodeURIComponent(signValue(sessionD, SESSION_SECRET))}`;
  await query("INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT DO NOTHING", [
    userC.id,
    userD.id,
  ]);

  const friendProfileRes = await fetch(`${BASE_URL}/api/friends/${userC.id}/profile`, { headers: { Cookie: cookieD } });
  const friendProfile = await friendProfileRes.json();
  checks.push({
    name: "GET /api/friends/:id/profile exposes the friend's equipped cosmetics",
    ok:
      friendProfile.friend.equippedAvatarId === "guitar" &&
      friendProfile.friend.equippedBorderId === "gold" &&
      friendProfile.friend.equippedBackgroundId === "stage" &&
      friendProfile.friend.equippedTagId === "rockstar",
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

console.log(`\nShop purchase/ownership flow (real Postgres, real server): ${allOk ? "OK ✔" : "FAILED ✘"}`);
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
  if (userCId) await query("DELETE FROM users WHERE id = $1", [userCId]).catch(() => {});
  if (userDId) await query("DELETE FROM users WHERE id = $1", [userDId]).catch(() => {});
}
