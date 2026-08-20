import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth.js";
import { useEconomy } from "./useEconomy.js";

export interface ShopItem {
  id: string;
  slot: "theme" | "effect";
  refId: string;
  name: string;
  description: string;
  priceCoins: number;
  owned: boolean;
}

interface ShopMeResponse {
  coins: number;
  items: ShopItem[];
}

export type PurchaseOutcome = { ok: true } | { ok: false; error: string };

interface ShopContextValue {
  coins: number;
  items: ShopItem[];
  isLoading: boolean;
  purchase: (itemId: string) => Promise<PurchaseOutcome>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setCoinsBalance } = useEconomy();

  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setCoins(0);
      setItems([]);
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
      })
      .catch(() => {
        if (!cancelled) {
          setCoins(0);
          setItems([]);
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
      const data = (await response.json()) as { ok: boolean; coinsBalance?: number; error?: string };
      if (!data.ok || data.coinsBalance === undefined) {
        return { ok: false, error: data.error ?? "purchase_failed" };
      }
      setCoins(data.coinsBalance);
      setCoinsBalance(data.coinsBalance);
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, owned: true } : item)));
      return { ok: true };
    },
    [setCoinsBalance]
  );

  return <ShopContext.Provider value={{ coins, items, isLoading, purchase }}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a <ShopProvider>");
  }
  return context;
}
