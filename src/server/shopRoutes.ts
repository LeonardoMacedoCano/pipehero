import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody, sendJson } from "./authRoutes.js";
import { getRequestUser } from "./requestUser.js";
import { query } from "./db.js";
import { SHOP_ITEMS, getOwnedItemIds, purchaseItem } from "./shop.js";
import { evaluateShopPurchaseUnlocks, unlockMany } from "./achievements.js";

interface PurchaseBody {
  itemId?: string;
}

interface EquippedCosmetics {
  avatarId: string | null;
  borderId: string | null;
  backgroundId: string | null;
  tagId: string | null;
  achievementFrameId: string | null;
  achievementEffectId: string | null;
}

const EMPTY_EQUIPPED: EquippedCosmetics = {
  avatarId: null,
  borderId: null,
  backgroundId: null,
  tagId: null,
  achievementFrameId: null,
  achievementEffectId: null,
};

const PURCHASE_ERROR_STATUS: Record<string, number> = {
  not_found: 400,
  already_owned: 400,
  insufficient_coins: 402,
};

export async function handleShopRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0];

  if (url === "/api/shop/me" && req.method === "GET") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 200, { coins: 0, items: SHOP_ITEMS.map((item) => ({ ...item, owned: false })), equipped: EMPTY_EQUIPPED });
      return true;
    }

    const [walletRow] = await query<{ coins: number }>("SELECT coins FROM user_economy WHERE user_id = $1", [user.id]);
    const [settingsRow] = await query<{
      equipped_avatar_id: string | null;
      equipped_border_id: string | null;
      equipped_background_id: string | null;
      equipped_tag_id: string | null;
      equipped_achievement_frame_id: string | null;
      equipped_achievement_effect_id: string | null;
    }>(
      `SELECT equipped_avatar_id, equipped_border_id, equipped_background_id, equipped_tag_id,
              equipped_achievement_frame_id, equipped_achievement_effect_id
       FROM user_settings WHERE user_id = $1`,
      [user.id]
    );
    const ownedIds = await getOwnedItemIds(user.id);
    sendJson(res, 200, {
      coins: walletRow?.coins ?? 0,
      items: SHOP_ITEMS.map((item) => ({ ...item, owned: ownedIds.has(item.id) })),
      equipped: {
        avatarId: settingsRow?.equipped_avatar_id ?? null,
        borderId: settingsRow?.equipped_border_id ?? null,
        backgroundId: settingsRow?.equipped_background_id ?? null,
        tagId: settingsRow?.equipped_tag_id ?? null,
        achievementFrameId: settingsRow?.equipped_achievement_frame_id ?? null,
        achievementEffectId: settingsRow?.equipped_achievement_effect_id ?? null,
      },
    });
    return true;
  }

  if (url === "/api/shop/purchase" && req.method === "POST") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Not logged in" });
      return true;
    }

    let body: PurchaseBody;
    try {
      body = await readJsonBody<PurchaseBody>(req);
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return true;
    }
    if (typeof body.itemId !== "string" || !body.itemId) {
      sendJson(res, 400, { error: "Invalid itemId" });
      return true;
    }

    const result = await purchaseItem(user.id, body.itemId);
    if (!result.ok) {
      sendJson(res, PURCHASE_ERROR_STATUS[result.error] ?? 400, { ok: false, error: result.error });
      return true;
    }
    const unlockedAchievements = await unlockMany(user.id, evaluateShopPurchaseUnlocks());
    sendJson(res, 200, { ok: true, coinsBalance: result.coinsBalance, unlockedAchievements });
    return true;
  }

  return false;
}
