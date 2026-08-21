import type { ReactNode } from "react";
import { OptionGridSwatch, OptionGridSwatchSlice } from "lcano-react-ui";
import styled from "styled-components";
import type { ShopItem, CosmeticSlot } from "../../hooks/useShop.js";
import { THEME_OPTIONS } from "../../themes/registry.js";
import { getAvatarOption } from "../../cosmetics/avatarCatalog.js";
import { getBorderOption } from "../../cosmetics/borderCatalog.js";
import { getBackgroundOption } from "../../cosmetics/backgroundCatalog.js";
import { getAchievementFrameOption } from "../../cosmetics/achievementFrameCatalog.js";

export type PreviewSize = "sm" | "lg";

const CIRCLE_PX: Record<PreviewSize, number> = { sm: 48, lg: 96 };
const SWATCH_HEIGHT_PX: Record<PreviewSize, number> = { sm: 32, lg: 56 };
const RECT_HEIGHT_PX: Record<PreviewSize, number> = { sm: 40, lg: 72 };

const SWATCH_BY_REF_ID = new Map(THEME_OPTIONS.map((option) => [option.id, [...option.swatch]]));
const ACHIEVEMENT_EFFECT_PREVIEW_ICON: Record<string, string> = { shimmer: "✨", pulse: "💫" };
const VANITY_PREVIEW_ICON: Record<string, string> = { nepoBaby: "🤑" };

function themePreview(item: ShopItem, size: PreviewSize): ReactNode {
  const swatch = SWATCH_BY_REF_ID.get(item.refId);
  if (!swatch) return null;
  return (
    <OptionGridSwatch style={{ width: "100%", height: SWATCH_HEIGHT_PX[size] }}>
      {swatch.map((color, i) => (
        <OptionGridSwatchSlice key={i} style={{ backgroundColor: color }} />
      ))}
    </OptionGridSwatch>
  );
}

function avatarPreview(item: ShopItem, size: PreviewSize): ReactNode {
  const option = getAvatarOption(item.refId);
  if (!option) return null;
  return (
    <AvatarPreviewCircle $size={CIRCLE_PX[size]} style={{ backgroundColor: option.bgColor }}>
      {option.emoji}
    </AvatarPreviewCircle>
  );
}

function borderPreview(item: ShopItem, size: PreviewSize): ReactNode {
  const option = getBorderOption(item.refId);
  if (!option) return null;
  return <BorderPreviewCircle $size={CIRCLE_PX[size]} $css={option.css} />;
}

function backgroundPreview(item: ShopItem, size: PreviewSize): ReactNode {
  const option = getBackgroundOption(item.refId);
  if (!option) return null;
  return <BackgroundPreviewRect $height={RECT_HEIGHT_PX[size]} $css={option.css} />;
}

function achievementFramePreview(item: ShopItem, size: PreviewSize): ReactNode {
  const option = getAchievementFrameOption(item.refId);
  if (!option) return null;
  return <FramePreviewBox $size={CIRCLE_PX[size]} $css={option.css} />;
}

function achievementEffectPreview(item: ShopItem, size: PreviewSize): ReactNode {
  const icon = ACHIEVEMENT_EFFECT_PREVIEW_ICON[item.refId];
  if (!icon) return null;
  return <AvatarPreviewCircle $size={CIRCLE_PX[size]}>{icon}</AvatarPreviewCircle>;
}

function vanityPreview(item: ShopItem, size: PreviewSize): ReactNode {
  const icon = VANITY_PREVIEW_ICON[item.refId];
  if (!icon) return null;
  return <AvatarPreviewCircle $size={CIRCLE_PX[size]}>{icon}</AvatarPreviewCircle>;
}

const PREVIEW_RENDERERS: Partial<Record<CosmeticSlot, (item: ShopItem, size: PreviewSize) => ReactNode>> = {
  theme: themePreview,
  avatar: avatarPreview,
  border: borderPreview,
  background: backgroundPreview,
  achievementFrame: achievementFramePreview,
  achievementEffect: achievementEffectPreview,
  vanity: vanityPreview,
};

export function hasItemPreview(slot: CosmeticSlot): boolean {
  return slot in PREVIEW_RENDERERS;
}

export function renderItemPreview(item: ShopItem, size: PreviewSize = "sm"): ReactNode {
  return PREVIEW_RENDERERS[item.slot]?.(item, size) ?? null;
}

const AvatarPreviewCircle = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => $size * 0.34}px;
  flex-shrink: 0;
`;

const BorderPreviewCircle = styled.div<{ $size: number; $css: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  margin: 0 auto;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.gray};
  flex-shrink: 0;
  ${({ $css }) => $css}
`;

const BackgroundPreviewRect = styled.div<{ $height: number; $css: string }>`
  width: 100%;
  height: ${({ $height }) => $height}px;
  border-radius: 6px;
  ${({ $css }) => $css}
`;

const FramePreviewBox = styled.div<{ $size: number; $css: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  margin: 0 auto;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.colors.gray};
  flex-shrink: 0;
  ${({ $css }) => $css}
`;
