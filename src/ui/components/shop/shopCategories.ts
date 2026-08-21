import type { CosmeticSlot } from "../../hooks/useShop.js";

export type ShopCardSize = "compact" | "wide";

export interface ShopCategory {
  id: CosmeticSlot;
  label: string;
  icon: string;
  cardSize: ShopCardSize;
}

// "wide" is reserved for categories whose preview needs real horizontal room to read
// (today just the theme color-swatch bar). Everything else is a small icon/text tile.
export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  { id: "theme", label: "Themes", icon: "🎨", cardSize: "wide" },
  { id: "effect", label: "Effects", icon: "✨", cardSize: "compact" },
  { id: "avatar", label: "Avatars", icon: "😀", cardSize: "compact" },
  { id: "border", label: "Borders", icon: "🔲", cardSize: "compact" },
  { id: "background", label: "Backgrounds", icon: "🖼️", cardSize: "compact" },
  { id: "tag", label: "Tags", icon: "🏷️", cardSize: "compact" },
  { id: "achievementFrame", label: "Frames", icon: "🖼️", cardSize: "compact" },
  { id: "achievementEffect", label: "Card FX", icon: "💫", cardSize: "compact" },
  { id: "vanity", label: "Vanity", icon: "🎉", cardSize: "compact" },
] as const;

export const SHOP_CARD_WIDTH_PX: Record<ShopCardSize, number> = {
  compact: 150,
  wide: 220,
};
