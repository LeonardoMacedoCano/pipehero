import { useState } from "react";
import styled from "styled-components";
import { MOBILE_LAYOUT_MEDIA_QUERY } from "../responsive.js";
import {
  useShop,
  isEquippableSlot,
  equippedIdForSlot,
  type EquippableSlot,
  type ShopItem,
} from "../hooks/useShop.js";
import { useAuth } from "../hooks/useAuth.js";
import { useScores } from "../hooks/useScores.js";
import { useAchievements } from "../hooks/useAchievements.js";
import { useMessage } from "lcano-react-ui";
import { SHOP_CATEGORIES, SHOP_CARD_WIDTH_PX, type ShopCategory } from "../components/shop/shopCategories.js";
import ShopCategoryNav from "../components/shop/ShopCategoryNav.js";
import ShopItemCard from "../components/shop/ShopItemCard.js";
import ShopItemGrid from "../components/shop/ShopItemGrid.js";
import ShopItemModal from "../components/shop/ShopItemModal.js";
import ProfileScreen, { type ProfileScoreRow } from "../components/chrome/ProfileScreen.js";
import type { Difficulty } from "../../types.js";

function isEquippableCategory(category: ShopCategory): category is ShopCategory & { id: EquippableSlot } {
  return isEquippableSlot(category.id);
}

const PROFILE_CATEGORIES = SHOP_CATEGORIES.filter(isEquippableCategory);

export default function ProfilePage() {
  const { user, googleClientId, isLoading: authLoading, login } = useAuth();
  const { equipped, items, equip } = useShop();
  const { scoresBySong, isLoading: scoresLoading } = useScores();
  const { achievements, isLoading: achievementsLoading } = useAchievements();
  const { showError } = useMessage();

  const [activeCategory, setActiveCategory] = useState<EquippableSlot>(PROFILE_CATEGORIES[0].id);
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const scoreRows: ProfileScoreRow[] = [];
  for (const [songId, byDifficulty] of scoresBySong) {
    for (const [difficulty, stars] of Object.entries(byDifficulty) as [Difficulty, number][]) {
      scoreRows.push({ songId, difficulty, stars });
    }
  }

  const category = PROFILE_CATEGORIES.find((entry) => entry.id === activeCategory) ?? PROFILE_CATEGORIES[0];
  const categoryItems = items.filter((item) => item.owned && item.slot === category.id);
  const categoryCounts = Object.fromEntries(
    PROFILE_CATEGORIES.map((entry) => [entry.id, items.filter((item) => item.owned && item.slot === entry.id).length])
  );
  const openItem = items.find((item) => item.id === openItemId) ?? null;

  async function handleToggleEquip(item: ShopItem) {
    if (!isEquippableSlot(item.slot)) return;
    const currentlyEquipped = equippedIdForSlot(equipped, item.slot) === item.refId;
    const ok = await equip(item.slot, currentlyEquipped ? null : item.refId);
    if (!ok) showError(`Couldn't update your ${item.slot} — try again.`);
  }

  const isLoading = authLoading || scoresLoading || achievementsLoading;

  return (
    <>
      <ProfileScreen
        title="Profile"
        isLoading={isLoading}
        notLoggedIn={!user}
        googleClientId={googleClientId}
        onLogin={login}
        name={user?.name ?? null}
        equippedAvatarId={equipped.avatarId}
        equippedBorderId={equipped.borderId}
        equippedBackgroundId={equipped.backgroundId}
        equippedTagId={equipped.tagId}
        equippedAchievementFrameId={equipped.achievementFrameId}
        equippedAchievementEffectId={equipped.achievementEffectId}
        scores={scoreRows}
        achievements={achievements ?? []}
        emptyScoresMessage="You haven't played anything yet."
        customizeContent={
          <Body>
            <ShopCategoryNav
              categories={PROFILE_CATEGORIES}
              active={activeCategory}
              onChange={(id) => setActiveCategory(id as EquippableSlot)}
              counts={categoryCounts}
            />
            <GridArea>
              <ShopItemGrid<ShopItem>
                items={categoryItems}
                keyExtractor={(item) => item.id}
                emptyMessage="You don't own anything in this category yet — check the Shop."
                resetKey={category.id}
                cardWidthPx={SHOP_CARD_WIDTH_PX[category.cardSize]}
                renderItem={(item) => (
                  <ShopItemCard
                    item={item}
                    coins={0}
                    onBuy={() => {}}
                    onOpenDetails={(clicked) => setOpenItemId(clicked.id)}
                    equippedRefId={equippedIdForSlot(equipped, category.id)}
                    onToggleEquip={handleToggleEquip}
                  />
                )}
              />
            </GridArea>
          </Body>
        }
      />

      {openItem && (
        <ShopItemModal
          item={openItem}
          coins={0}
          onClose={() => setOpenItemId(null)}
          onBuy={() => {}}
          equippedRefId={isEquippableSlot(openItem.slot) ? equippedIdForSlot(equipped, openItem.slot) : undefined}
          onToggleEquip={isEquippableSlot(openItem.slot) ? handleToggleEquip : undefined}
        />
      )}
    </>
  );
}

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
