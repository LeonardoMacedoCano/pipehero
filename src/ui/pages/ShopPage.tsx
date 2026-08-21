import type { ReactNode } from "react";
import {
  Panel,
  Stack,
  HighlightBox,
  Button,
  useMessage,
  Tabs,
  OptionGridContainer,
  OptionGridCard,
  OptionGridSwatch,
  OptionGridSwatchSlice,
  OptionGridLabel,
  OptionGridDescription,
  OptionGridBadge,
} from "lcano-react-ui";
import styled from "styled-components";
import { useShop, type EquippableSlot, type EquippedCosmetics, type ShopItem } from "../hooks/useShop.js";
import { THEME_OPTIONS } from "../themes/registry.js";
import { getAvatarOption } from "../cosmetics/avatarCatalog.js";
import { getBorderOption } from "../cosmetics/borderCatalog.js";
import { getBackgroundOption } from "../cosmetics/backgroundCatalog.js";
import { getAchievementFrameOption } from "../cosmetics/achievementFrameCatalog.js";

const ACHIEVEMENT_EFFECT_PREVIEW_ICON: Record<string, string> = { shimmer: "✨", pulse: "💫" };

const SWATCH_BY_REF_ID = new Map(THEME_OPTIONS.map((option) => [option.id, [...option.swatch]]));

function themePreview(item: ShopItem): ReactNode {
  const swatch = SWATCH_BY_REF_ID.get(item.refId);
  if (!swatch) return null;
  return (
    <OptionGridSwatch>
      {swatch.map((color, i) => (
        <OptionGridSwatchSlice key={i} style={{ backgroundColor: color }} />
      ))}
    </OptionGridSwatch>
  );
}

function avatarPreview(item: ShopItem): ReactNode {
  const option = getAvatarOption(item.refId);
  if (!option) return null;
  return <AvatarPreviewCircle style={{ backgroundColor: option.bgColor }}>{option.emoji}</AvatarPreviewCircle>;
}

function borderPreview(item: ShopItem): ReactNode {
  const option = getBorderOption(item.refId);
  if (!option) return null;
  return <BorderPreviewCircle $css={option.css} />;
}

function backgroundPreview(item: ShopItem): ReactNode {
  const option = getBackgroundOption(item.refId);
  if (!option) return null;
  return <BackgroundPreviewRect $css={option.css} />;
}

function achievementFramePreview(item: ShopItem): ReactNode {
  const option = getAchievementFrameOption(item.refId);
  if (!option) return null;
  return <FramePreviewBox $css={option.css} />;
}

function achievementEffectPreview(item: ShopItem): ReactNode {
  const icon = ACHIEVEMENT_EFFECT_PREVIEW_ICON[item.refId];
  if (!icon) return null;
  return <AvatarPreviewCircle>{icon}</AvatarPreviewCircle>;
}

const VANITY_PREVIEW_ICON: Record<string, string> = { nepoBaby: "🤑" };

function vanityPreview(item: ShopItem): ReactNode {
  const icon = VANITY_PREVIEW_ICON[item.refId];
  if (!icon) return null;
  return <AvatarPreviewCircle>{icon}</AvatarPreviewCircle>;
}

function equippedIdForSlot(equipped: EquippedCosmetics, slot: EquippableSlot): string | null {
  if (slot === "avatar") return equipped.avatarId;
  if (slot === "border") return equipped.borderId;
  if (slot === "background") return equipped.backgroundId;
  if (slot === "tag") return equipped.tagId;
  if (slot === "achievementFrame") return equipped.achievementFrameId;
  return equipped.achievementEffectId;
}

function ShopGrid({
  items,
  coins,
  onBuy,
  renderPreview,
  equippedRefId,
  onToggleEquip,
}: {
  items: ShopItem[];
  coins: number;
  onBuy: (item: ShopItem) => void;
  renderPreview?: (item: ShopItem) => ReactNode;
  equippedRefId?: string | null;
  onToggleEquip?: (item: ShopItem) => void;
}) {
  return (
    <OptionGridContainer $minItemWidth="180px">
      {items.map((item) => {
        const isEquipped = onToggleEquip !== undefined && equippedRefId === item.refId;
        return (
          <OptionGridCard as="div" $active={false} key={item.id}>
            {renderPreview?.(item)}
            <OptionGridLabel>{item.name}</OptionGridLabel>
            <OptionGridDescription>{item.description}</OptionGridDescription>
            {!item.owned && (
              <Button
                description={`Buy — ${item.priceCoins} coins`}
                variant="quaternary"
                width="auto"
                disabled={coins < item.priceCoins}
                onClick={() => onBuy(item)}
              />
            )}
            {item.owned && onToggleEquip && (
              <Button
                description={isEquipped ? "Equipped ✓" : "Equip"}
                variant={isEquipped ? "secondary" : "quaternary"}
                width="auto"
                onClick={() => onToggleEquip(item)}
              />
            )}
            {item.owned && !onToggleEquip && <OptionGridBadge>Owned</OptionGridBadge>}
          </OptionGridCard>
        );
      })}
    </OptionGridContainer>
  );
}

export default function ShopPage() {
  const { coins, items, equipped, purchase, equip } = useShop();
  const { showSuccess, showError } = useMessage();

  async function handleBuy(item: ShopItem) {
    const result = await purchase(item.id);
    if (result.ok) {
      const hint =
        item.slot === "theme" || item.slot === "effect"
          ? "Equip it from Options → Appearance."
          : item.slot === "vanity"
            ? "Nothing to equip — just bragging rights."
            : "Equip it right here in the Shop.";
      showSuccess(`Unlocked "${item.name}"! ${hint}`);
    } else if (result.error === "insufficient_coins") {
      showError(`Not enough coins for "${item.name}" yet.`);
    } else {
      showError(`Couldn't buy "${item.name}" — try again.`);
    }
  }

  function makeEquipHandler(slot: EquippableSlot) {
    return async (item: ShopItem) => {
      const currentlyEquipped = equippedIdForSlot(equipped, slot) === item.refId;
      const ok = await equip(slot, currentlyEquipped ? null : item.refId);
      if (!ok) showError(`Couldn't update your ${slot} — try again.`);
    };
  }

  const themeItems = items.filter((item) => item.slot === "theme");
  const effectItems = items.filter((item) => item.slot === "effect");
  const avatarItems = items.filter((item) => item.slot === "avatar");
  const borderItems = items.filter((item) => item.slot === "border");
  const backgroundItems = items.filter((item) => item.slot === "background");
  const tagItems = items.filter((item) => item.slot === "tag");
  const achievementFrameItems = items.filter((item) => item.slot === "achievementFrame");
  const achievementEffectItems = items.filter((item) => item.slot === "achievementEffect");
  const vanityItems = items.filter((item) => item.slot === "vanity");

  return (
    <Panel title="Shop" maxWidth="720px" style={{ margin: "16px" }}>
      <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
        <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
          🪙 {coins} coins
        </HighlightBox>

        <Tabs
          tabs={[
            { label: "Themes", content: <ShopGrid items={themeItems} coins={coins} onBuy={handleBuy} renderPreview={themePreview} /> },
            { label: "Effects", content: <ShopGrid items={effectItems} coins={coins} onBuy={handleBuy} /> },
            {
              label: "Avatars",
              content: (
                <ShopGrid
                  items={avatarItems}
                  coins={coins}
                  onBuy={handleBuy}
                  renderPreview={avatarPreview}
                  equippedRefId={equipped.avatarId}
                  onToggleEquip={makeEquipHandler("avatar")}
                />
              ),
            },
            {
              label: "Borders",
              content: (
                <ShopGrid
                  items={borderItems}
                  coins={coins}
                  onBuy={handleBuy}
                  renderPreview={borderPreview}
                  equippedRefId={equipped.borderId}
                  onToggleEquip={makeEquipHandler("border")}
                />
              ),
            },
            {
              label: "Backgrounds",
              content: (
                <ShopGrid
                  items={backgroundItems}
                  coins={coins}
                  onBuy={handleBuy}
                  renderPreview={backgroundPreview}
                  equippedRefId={equipped.backgroundId}
                  onToggleEquip={makeEquipHandler("background")}
                />
              ),
            },
            {
              label: "Tags",
              content: (
                <ShopGrid
                  items={tagItems}
                  coins={coins}
                  onBuy={handleBuy}
                  equippedRefId={equipped.tagId}
                  onToggleEquip={makeEquipHandler("tag")}
                />
              ),
            },
            {
              label: "Frames",
              content: (
                <ShopGrid
                  items={achievementFrameItems}
                  coins={coins}
                  onBuy={handleBuy}
                  renderPreview={achievementFramePreview}
                  equippedRefId={equipped.achievementFrameId}
                  onToggleEquip={makeEquipHandler("achievementFrame")}
                />
              ),
            },
            {
              label: "Card FX",
              content: (
                <ShopGrid
                  items={achievementEffectItems}
                  coins={coins}
                  onBuy={handleBuy}
                  renderPreview={achievementEffectPreview}
                  equippedRefId={equipped.achievementEffectId}
                  onToggleEquip={makeEquipHandler("achievementEffect")}
                />
              ),
            },
            {
              label: "Vanity",
              content: <ShopGrid items={vanityItems} coins={coins} onBuy={handleBuy} renderPreview={vanityPreview} />,
            },
          ]}
        />
      </Stack>
    </Panel>
  );
}

const AvatarPreviewCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6em;
`;

const BorderPreviewCircle = styled.div<{ $css: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.gray};
  ${({ $css }) => $css}
`;

const BackgroundPreviewRect = styled.div<{ $css: string }>`
  width: 100%;
  height: 40px;
  border-radius: 6px;
  ${({ $css }) => $css}
`;

const FramePreviewBox = styled.div<{ $css: string }>`
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.colors.gray};
  ${({ $css }) => $css}
`;
