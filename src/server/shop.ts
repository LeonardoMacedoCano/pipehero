import { query, withTransaction } from "./db.js";

export type CosmeticSlot =
  | "theme"
  | "effect"
  | "avatar"
  | "border"
  | "background"
  | "tag"
  | "achievementFrame"
  | "achievementEffect"
  | "vanity";

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
    description: "Brushed carbon with a warm amber glow along the edges.",
    priceCoins: 300,
  },
  {
    id: "theme_draculaDark",
    slot: "theme",
    refId: "draculaDark",
    name: "Dracula Dark",
    description: "The cult-classic Dracula palette, tuned for late-night sessions.",
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
    description: "Front and center on a green badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_drums",
    slot: "avatar",
    refId: "drums",
    name: "Drummer",
    description: "Keeps the whole band on time, on a red badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_mic",
    slot: "avatar",
    refId: "mic",
    name: "Vocalist",
    description: "Steals the spotlight on a yellow badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_keys",
    slot: "avatar",
    refId: "keys",
    name: "Keyboardist",
    description: "Holds the harmony together on a blue badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_bolt",
    slot: "avatar",
    refId: "bolt",
    name: "Shredder",
    description: "Lightning fingers on an orange badge.",
    priceCoins: 100,
  },
  {
    id: "avatar_star",
    slot: "avatar",
    refId: "star",
    name: "Star Performer",
    description: "Headliner status on a purple badge.",
    priceCoins: 100,
  },
  {
    id: "border_gold",
    slot: "border",
    refId: "gold",
    name: "Gold Ring",
    description: "Solid gold, no gradient tricks — just pure shine.",
    priceCoins: 200,
  },
  {
    id: "border_neon",
    slot: "border",
    refId: "neon",
    name: "Neon Ring",
    description: "A glowing cyan-to-pink gradient ring that never sits still.",
    priceCoins: 200,
  },
  {
    id: "border_fire",
    slot: "border",
    refId: "fire",
    name: "Fire Ring",
    description: "A glowing orange-to-red ring, like your avatar's on fire.",
    priceCoins: 200,
  },
  {
    id: "background_stage",
    slot: "background",
    refId: "stage",
    name: "Stage Lights",
    description: "A warm spotlight glow, like you just walked on stage.",
    priceCoins: 200,
  },
  {
    id: "background_sunset",
    slot: "background",
    refId: "sunset",
    name: "Sunset",
    description: "An orange-to-purple gradient straight off a tour poster.",
    priceCoins: 200,
  },
  {
    id: "background_circuit",
    slot: "background",
    refId: "circuit",
    name: "Circuit Grid",
    description: "A subtle dark grid — clean, technical, understated.",
    priceCoins: 200,
  },
  {
    id: "tag_rockstar",
    slot: "tag",
    refId: "rockstar",
    name: "Rockstar",
    description: "🎸 For those who never stop shredding.",
    priceCoins: 80,
  },
  {
    id: "tag_perfectionist",
    slot: "tag",
    refId: "perfectionist",
    name: "Perfectionist",
    description: "💯 Perfect runs, perfectly flexed.",
    priceCoins: 80,
  },
  {
    id: "tag_speedster",
    slot: "tag",
    refId: "speedster",
    name: "Speed Demon",
    description: "⚡ Built for speed, allergic to slow songs.",
    priceCoins: 80,
  },
  {
    id: "tag_completionist",
    slot: "tag",
    refId: "completionist",
    name: "Completionist",
    description: "🏆 Every song, every difficulty, no exceptions.",
    priceCoins: 80,
  },
  {
    id: "tag_nightowl",
    slot: "tag",
    refId: "nightowl",
    name: "Night Owl",
    description: "🌙 Peak performance after midnight.",
    priceCoins: 80,
  },
  {
    id: "achievementFrame_bronze",
    slot: "achievementFrame",
    refId: "bronze",
    name: "Bronze Frame",
    description: "A warm bronze border for your unlocked achievement cards.",
    priceCoins: 150,
  },
  {
    id: "achievementFrame_silver",
    slot: "achievementFrame",
    refId: "silver",
    name: "Silver Frame",
    description: "A cool silver border for your unlocked achievement cards.",
    priceCoins: 150,
  },
  {
    id: "achievementFrame_gold",
    slot: "achievementFrame",
    refId: "goldFrame",
    name: "Gold Frame",
    description: "A gleaming gold border — top shelf, top tier.",
    priceCoins: 150,
  },
  {
    id: "achievementEffect_shimmer",
    slot: "achievementEffect",
    refId: "shimmer",
    name: "Shimmer",
    description: "A light sweep that catches the eye on every unlocked card.",
    priceCoins: 150,
  },
  {
    id: "achievementEffect_pulse",
    slot: "achievementEffect",
    refId: "pulse",
    name: "Pulse",
    description: "A slow, steady glow pulse on every card you've unlocked.",
    priceCoins: 150,
  },
  {
    id: "vanity_nepoBaby",
    slot: "vanity",
    refId: "nepoBaby",
    name: "Nepo Baby",
    description: "Skip the grind entirely — buy this and the achievement is yours, no talent required.",
    priceCoins: 2000,
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
