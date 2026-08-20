import { query, withTransaction } from "./db.js";

export type CosmeticSlot =
  | "theme"
  | "effect"
  | "avatar"
  | "border"
  | "background"
  | "tag"
  | "achievementFrame"
  | "achievementEffect";

export interface ShopItem {
  id: string;
  slot: CosmeticSlot;
  refId: string;
  name: string;
  description: string;
  priceCoins: number;
}

const FREE_IDS: Partial<Record<CosmeticSlot, string>> = { theme: "darkCarbonGreen", effect: "none" };

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "theme_darkOnyxAmber",
    slot: "theme",
    refId: "darkOnyxAmber",
    name: "Dark Onyx Amber",
    description: "Brushed carbon with a warm amber edge.",
    priceCoins: 300,
  },
  {
    id: "theme_draculaDark",
    slot: "theme",
    refId: "draculaDark",
    name: "Dracula Dark",
    description: "The classic Dracula palette.",
    priceCoins: 300,
  },
  {
    id: "effect_endCycle",
    slot: "effect",
    refId: "endCycle",
    name: "End Cycle",
    description: "A slow, subtle color drift across the whole site, inspired by the End portal in Minecraft.",
    priceCoins: 150,
  },
  {
    id: "effect_breathing",
    slot: "effect",
    refId: "breathing",
    name: "Breathing",
    description: "A gentle brightness pulse across the whole site, like it's slowly breathing.",
    priceCoins: 150,
  },
  {
    id: "effect_bloom",
    slot: "effect",
    refId: "bloom",
    name: "Bloom",
    description: "A very soft wash of the theme's accent color breathes across the whole screen.",
    priceCoins: 150,
  },
  {
    id: "avatar_guitar",
    slot: "avatar",
    refId: "guitar",
    name: "Guitarist",
    description: "🎸 on a green badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_drums",
    slot: "avatar",
    refId: "drums",
    name: "Drummer",
    description: "🥁 on a red badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_mic",
    slot: "avatar",
    refId: "mic",
    name: "Vocalist",
    description: "🎤 on a yellow badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_keys",
    slot: "avatar",
    refId: "keys",
    name: "Keyboardist",
    description: "🎹 on a blue badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_bolt",
    slot: "avatar",
    refId: "bolt",
    name: "Shredder",
    description: "⚡ on an orange badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_star",
    slot: "avatar",
    refId: "star",
    name: "Star Performer",
    description: "🌟 on a purple badge.",
    priceCoins: 100,
  },
  {
    id: "border_gold",
    slot: "border",
    refId: "gold",
    name: "Gold Ring",
    description: "A solid gold ring around your avatar.",
    priceCoins: 200,
  },
  {
    id: "border_neon",
    slot: "border",
    refId: "neon",
    name: "Neon Ring",
    description: "A glowing cyan-to-pink gradient ring.",
    priceCoins: 200,
  },
  {
    id: "border_fire",
    slot: "border",
    refId: "fire",
    name: "Fire Ring",
    description: "A glowing orange-to-red gradient ring.",
    priceCoins: 200,
  },
  {
    id: "background_stage",
    slot: "background",
    refId: "stage",
    name: "Stage Lights",
    description: "A warm spotlight glow behind your name.",
    priceCoins: 200,
  },
  {
    id: "background_sunset",
    slot: "background",
    refId: "sunset",
    name: "Sunset",
    description: "An orange-to-purple gradient behind your name.",
    priceCoins: 200,
  },
  {
    id: "background_circuit",
    slot: "background",
    refId: "circuit",
    name: "Circuit Grid",
    description: "A subtle dark grid pattern behind your name.",
    priceCoins: 200,
  },
  {
    id: "tag_rockstar",
    slot: "tag",
    refId: "rockstar",
    name: "Rockstar",
    description: "🎸 Rockstar — shown next to your name.",
    priceCoins: 80,
  },
  {
    id: "tag_perfectionist",
    slot: "tag",
    refId: "perfectionist",
    name: "Perfectionist",
    description: "💯 Perfectionist — shown next to your name.",
    priceCoins: 80,
  },
  {
    id: "tag_speedster",
    slot: "tag",
    refId: "speedster",
    name: "Speed Demon",
    description: "⚡ Speed Demon — shown next to your name.",
    priceCoins: 80,
  },
  {
    id: "tag_completionist",
    slot: "tag",
    refId: "completionist",
    name: "Completionist",
    description: "🏆 Completionist — shown next to your name.",
    priceCoins: 80,
  },
  {
    id: "tag_nightowl",
    slot: "tag",
    refId: "nightowl",
    name: "Night Owl",
    description: "🌙 Night Owl — shown next to your name.",
    priceCoins: 80,
  },
  {
    id: "achievementFrame_bronze",
    slot: "achievementFrame",
    refId: "bronze",
    name: "Bronze Frame",
    description: "A bronze frame around your unlocked achievement cards.",
    priceCoins: 150,
  },
  {
    id: "achievementFrame_silver",
    slot: "achievementFrame",
    refId: "silver",
    name: "Silver Frame",
    description: "A silver frame around your unlocked achievement cards.",
    priceCoins: 150,
  },
  {
    id: "achievementFrame_gold",
    slot: "achievementFrame",
    refId: "goldFrame",
    name: "Gold Frame",
    description: "A gold frame around your unlocked achievement cards.",
    priceCoins: 150,
  },
  {
    id: "achievementEffect_shimmer",
    slot: "achievementEffect",
    refId: "shimmer",
    name: "Shimmer",
    description: "A light sweep animation across your unlocked achievement cards.",
    priceCoins: 150,
  },
  {
    id: "achievementEffect_pulse",
    slot: "achievementEffect",
    refId: "pulse",
    name: "Pulse",
    description: "A gentle glow pulse on your unlocked achievement cards.",
    priceCoins: 150,
  },
];

const SHOP_ITEM_BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

export function isValidCosmeticId(slot: CosmeticSlot, id: string): boolean {
  return id === FREE_IDS[slot] || SHOP_ITEMS.some((item) => item.slot === slot && item.refId === id);
}

async function ownsItem(userId: number, itemId: string): Promise<boolean> {
  const rows = await query("SELECT 1 FROM user_cosmetic_unlocks WHERE user_id = $1 AND item_id = $2", [userId, itemId]);
  return rows.length > 0;
}

export async function ownsCosmeticId(userId: number, slot: CosmeticSlot, id: string): Promise<boolean> {
  if (id === FREE_IDS[slot]) return true;
  const item = SHOP_ITEMS.find((i) => i.slot === slot && i.refId === id);
  return item ? ownsItem(userId, item.id) : false;
}

export async function getOwnedItemIds(userId: number): Promise<Set<string>> {
  const rows = await query<{ item_id: string }>("SELECT item_id FROM user_cosmetic_unlocks WHERE user_id = $1", [userId]);
  return new Set(rows.map((row) => row.item_id));
}

export type PurchaseResult =
  | { ok: true; coinsBalance: number }
  | { ok: false; error: "not_found" | "already_owned" | "insufficient_coins" };

export async function purchaseItem(userId: number, itemId: string): Promise<PurchaseResult> {
  const item = SHOP_ITEM_BY_ID.get(itemId);
  if (!item) return { ok: false, error: "not_found" };

  return withTransaction(async (client) => {
    const alreadyOwned = await client.query("SELECT 1 FROM user_cosmetic_unlocks WHERE user_id = $1 AND item_id = $2", [
      userId,
      itemId,
    ]);
    if ((alreadyOwned.rowCount ?? 0) > 0) return { ok: false, error: "already_owned" };

    const walletRows = await client.query<{ coins: number }>("SELECT coins FROM user_economy WHERE user_id = $1 FOR UPDATE", [
      userId,
    ]);
    const coins = walletRows.rows[0]?.coins ?? 0;
    if (coins < item.priceCoins) return { ok: false, error: "insufficient_coins" };

    await client.query(
      `INSERT INTO user_economy (user_id, coins) VALUES ($1, 0)
       ON CONFLICT (user_id) DO UPDATE SET coins = user_economy.coins - $2`,
      [userId, item.priceCoins]
    );
    await client.query("INSERT INTO user_cosmetic_unlocks (user_id, item_id) VALUES ($1, $2)", [userId, itemId]);
    const finalRows = await client.query<{ coins: number }>("SELECT coins FROM user_economy WHERE user_id = $1", [userId]);
    return { ok: true, coinsBalance: finalRows.rows[0].coins };
  });
}
