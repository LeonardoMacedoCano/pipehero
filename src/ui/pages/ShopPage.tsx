import { useState } from "react";
import { Panel, Stack, HighlightBox, useMessage } from "lcano-react-ui";
import styled, { ThemeProvider } from "styled-components";
import { MOBILE_LAYOUT_MEDIA_QUERY } from "../responsive.js";
import {
  useShop,
  isEquippableSlot,
  equippedIdForSlot,
  type EquippableSlot,
  type ShopItem,
  type CosmeticSlot,
} from "../hooks/useShop.js";
import { useThemeControl } from "../contexts/theme/ThemeControlProvider.js";
import { getThemeOption } from "../themes/registry.js";
import { SHOP_CATEGORIES, SHOP_CARD_WIDTH_PX } from "../components/shop/shopCategories.js";
import ShopCategoryNav from "../components/shop/ShopCategoryNav.js";
import ShopItemCard from "../components/shop/ShopItemCard.js";
import ShopItemGrid from "../components/shop/ShopItemGrid.js";
import ShopItemModal from "../components/shop/ShopItemModal.js";
import ShopEffectPreviewLayer from "../components/shop/ShopEffectPreviewLayer.js";

export default function ShopPage() {
  const { coins, items, equipped, purchase, equip } = useShop();
  const { showSuccess, showError } = useMessage();
  const { currentTheme, themeEffectId } = useThemeControl();

  const [activeCategory, setActiveCategory] = useState<CosmeticSlot>(SHOP_CATEGORIES[0].id);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [previewEffectId, setPreviewEffectId] = useState<string | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);

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

  function togglePreviewTheme(item: ShopItem) {
    setPreviewThemeId((current) => (current === item.refId ? null : item.refId));
  }

  function togglePreviewEffect(item: ShopItem) {
    setPreviewEffectId((current) => (current === item.refId ? null : item.refId));
  }

  function equipPropsFor(item: ShopItem) {
    return {
      equippedRefId: isEquippableSlot(item.slot) ? equippedIdForSlot(equipped, item.slot) : undefined,
      onToggleEquip: isEquippableSlot(item.slot) ? makeEquipHandler(item.slot) : undefined,
    };
  }

  function previewPropsFor(item: ShopItem) {
    if (item.slot === "theme") return { onTogglePreview: togglePreviewTheme, isPreviewing: previewThemeId === item.refId };
    if (item.slot === "effect") return { onTogglePreview: togglePreviewEffect, isPreviewing: previewEffectId === item.refId };
    return { onTogglePreview: undefined, isPreviewing: false };
  }

  const category = SHOP_CATEGORIES.find((entry) => entry.id === activeCategory) ?? SHOP_CATEGORIES[0];
  const categoryItems = items.filter((item) => item.slot === category.id);
  const categoryCounts = Object.fromEntries(
    SHOP_CATEGORIES.map((entry) => [entry.id, items.filter((item) => item.slot === entry.id).length])
  ) as Partial<Record<CosmeticSlot, number>>;

  const previewTheme = previewThemeId ? getThemeOption(previewThemeId).theme : currentTheme;
  const previewedEffectId = previewEffectId && previewEffectId !== themeEffectId ? previewEffectId : null;
  const openItem = items.find((item) => item.id === openItemId) ?? null;

  return (
    <Panel title="Shop" maxWidth="900px" style={{ margin: "16px" }}>
      <ThemeProvider theme={previewTheme}>
        <ShopEffectPreviewLayer effectId={previewedEffectId}>
          <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
            <CoinsRow>
              <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
                🪙 {coins} coins
              </HighlightBox>
            </CoinsRow>

            <Body>
              <ShopCategoryNav active={activeCategory} onChange={setActiveCategory} counts={categoryCounts} />

              <GridArea>
                <ShopItemGrid<ShopItem>
                  items={categoryItems}
                  keyExtractor={(item) => item.id}
                  emptyMessage="Nothing here yet."
                  resetKey={category.id}
                  cardWidthPx={SHOP_CARD_WIDTH_PX[category.cardSize]}
                  renderItem={(item) => (
                    <ShopItemCard
                      item={item}
                      coins={coins}
                      onBuy={handleBuy}
                      onOpenDetails={(clicked) => setOpenItemId(clicked.id)}
                      {...equipPropsFor(item)}
                    />
                  )}
                />
              </GridArea>
            </Body>
          </Stack>

          {openItem && (
            <ShopItemModal
              item={openItem}
              coins={coins}
              onClose={() => setOpenItemId(null)}
              onBuy={handleBuy}
              {...equipPropsFor(openItem)}
              {...previewPropsFor(openItem)}
            />
          )}
        </ShopEffectPreviewLayer>
      </ThemeProvider>
    </Panel>
  );
}

const CoinsRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const Body = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;

  @media ${MOBILE_LAYOUT_MEDIA_QUERY} {
    flex-direction: column;
    align-items: stretch;
  }
`;

const GridArea = styled.div`
  flex: 1;
  min-width: 0;
`;
