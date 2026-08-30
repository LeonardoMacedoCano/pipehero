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
  { id: "theme", label: "Themes", icon: "palette", cardSize: "wide" },
  { id: "effect", label: "Effects", icon: "sparkles", cardSize: "compact" },
  { id: "avatar", label: "Avatars", icon: "face-smile", cardSize: "compact" },
  { id: "border", label: "Borders", icon: "border", cardSize: "compact" },
  { id: "background", label: "Backgrounds", icon: "image", cardSize: "compact" },
  { id: "tag", label: "Tags", icon: "tag", cardSize: "compact" },
  { id: "achievementFrame", label: "Frames", icon: "image", cardSize: "compact" },
  { id: "achievementEffect", label: "Card FX", icon: "wand", cardSize: "compact" },
  { id: "vanity", label: "Vanity", icon: "gem", cardSize: "compact" },
] as const;

export const SHOP_CARD_WIDTH_PX: Record<ShopCardSize, number> = {
  compact: 150,
  wide: 220,
};
