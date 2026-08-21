import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth.js";
import { useEconomy } from "./useEconomy.js";
import { useAchievementToast, type UnlockedAchievement } from "../components/chrome/AchievementToastProvider.js";

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
export type EquippableSlot = "avatar" | "border" | "background" | "tag" | "achievementFrame" | "achievementEffect";

export interface ShopItem {
  id: string;
  slot: CosmeticSlot;
  refId: string;
  name: string;
  description: string;
  priceCoins: number;
  owned: boolean;
}

export interface EquippedCosmetics {
  avatarId: string | null;
  borderId: string | null;
  backgroundId: string | null;
  tagId: string | null;
  achievementFrameId: string | null;
  achievementEffectId: string | null;
}

const EQUIPPABLE_SLOTS = new Set<CosmeticSlot>(["avatar", "border", "background", "tag", "achievementFrame", "achievementEffect"]);

export function isEquippableSlot(slot: CosmeticSlot): slot is EquippableSlot {
  return EQUIPPABLE_SLOTS.has(slot);
}

export function equippedIdForSlot(equipped: EquippedCosmetics, slot: EquippableSlot): string | null {
  if (slot === "avatar") return equipped.avatarId;
  if (slot === "border") return equipped.borderId;
  if (slot === "background") return equipped.backgroundId;
  if (slot === "tag") return equipped.tagId;
  if (slot === "achievementFrame") return equipped.achievementFrameId;
  return equipped.achievementEffectId;
}

const EMPTY_EQUIPPED: EquippedCosmetics = {
  avatarId: null,
  borderId: null,
  backgroundId: null,
  tagId: null,
  achievementFrameId: null,
  achievementEffectId: null,
};

interface ShopMeResponse {
  coins: number;
  items: ShopItem[];
  equipped: EquippedCosmetics;
}

export type PurchaseOutcome = { ok: true } | { ok: false; error: string };

const SLOT_TO_SETTINGS_FIELD: Record<EquippableSlot, string> = {
  avatar: "equippedAvatarId",
  border: "equippedBorderId",
  background: "equippedBackgroundId",
  tag: "equippedTagId",
  achievementFrame: "equippedAchievementFrameId",
  achievementEffect: "equippedAchievementEffectId",
};

const SLOT_TO_EQUIPPED_KEY: Record<EquippableSlot, keyof EquippedCosmetics> = {
  avatar: "avatarId",
  border: "borderId",
  background: "backgroundId",
  tag: "tagId",
  achievementFrame: "achievementFrameId",
  achievementEffect: "achievementEffectId",
};

interface ShopContextValue {
  coins: number;
  items: ShopItem[];
  equipped: EquippedCosmetics;
  isLoading: boolean;
  purchase: (itemId: string) => Promise<PurchaseOutcome>;
  equip: (slot: EquippableSlot, refId: string | null) => Promise<boolean>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setCoinsBalance } = useEconomy();
  const { notify } = useAchievementToast();
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [equipped, setEquipped] = useState<EquippedCosmetics>(EMPTY_EQUIPPED);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setCoins(0);
      setItems([]);
      setEquipped(EMPTY_EQUIPPED);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch("/api/shop/me")
      .then((response) => response.json() as Promise<ShopMeResponse>)
      .then((data) => {
        if (cancelled) return;
        setCoins(data.coins);
        setItems(data.items);
        setEquipped(data.equipped);
      })
      .catch(() => {
        if (!cancelled) {
          setCoins(0);
          setItems([]);
          setEquipped(EMPTY_EQUIPPED);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const purchase = useCallback(
    async (itemId: string): Promise<PurchaseOutcome> => {
      const response = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        coinsBalance?: number;
        error?: string;
        unlockedAchievements?: UnlockedAchievement[];
      };
      if (!data.ok || data.coinsBalance === undefined) {
        return { ok: false, error: data.error ?? "purchase_failed" };
      }
      setCoins(data.coinsBalance);
      setCoinsBalance(data.coinsBalance);
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, owned: true } : item)));
      notifyRef.current(data.unlockedAchievements ?? []);
      return { ok: true };
    },
    [setCoinsBalance]
  );

  const equip = useCallback(async (slot: EquippableSlot, refId: string | null): Promise<boolean> => {
    const response = await fetch("/api/settings/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [SLOT_TO_SETTINGS_FIELD[slot]]: refId }),
    });
    if (!response.ok) return false;
    setEquipped((prev) => ({ ...prev, [SLOT_TO_EQUIPPED_KEY[slot]]: refId }));
    return true;
  }, []);

  return (
    <ShopContext.Provider value={{ coins, items, equipped, isLoading, purchase, equip }}>{children}</ShopContext.Provider>
  );
}

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a <ShopProvider>");
  }
  return context;
}
