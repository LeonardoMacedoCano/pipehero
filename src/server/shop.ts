import { query, withTransaction } from "./db.js";

export type CosmeticSlot = "theme" | "effect";

export interface ShopItem {
  id: string;
  slot: CosmeticSlot;
  refId: string;
  name: string;
  description: string;
  priceCoins: number;
}

const FREE_THEME_ID = "darkCarbonGreen";
const FREE_THEME_EFFECT_ID = "none";

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
];

const SHOP_ITEM_BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

export function isValidThemeId(id: string): boolean {
  return id === FREE_THEME_ID || SHOP_ITEMS.some((item) => item.slot === "theme" && item.refId === id);
}

export function isValidThemeEffectId(id: string): boolean {
  return id === FREE_THEME_EFFECT_ID || SHOP_ITEMS.some((item) => item.slot === "effect" && item.refId === id);
}

async function ownsItem(userId: number, itemId: string): Promise<boolean> {
  const rows = await query("SELECT 1 FROM user_cosmetic_unlocks WHERE user_id = $1 AND item_id = $2", [userId, itemId]);
  return rows.length > 0;
}

export async function ownsThemeId(userId: number, id: string): Promise<boolean> {
  if (id === FREE_THEME_ID) return true;
  return ownsItem(userId, `theme_${id}`);
}

export async function ownsThemeEffectId(userId: number, id: string): Promise<boolean> {
  if (id === FREE_THEME_EFFECT_ID) return true;
  return ownsItem(userId, `effect_${id}`);
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
