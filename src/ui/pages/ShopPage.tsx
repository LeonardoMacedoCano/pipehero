import { Panel, Stack, HighlightBox, Button, useMessage } from "lcano-react-ui";
import styled from "styled-components";
import { useShop, type ShopItem } from "../hooks/useShop.js";

const SLOT_LABEL: Record<ShopItem["slot"], string> = { theme: "Themes", effect: "Effects" };

export default function ShopPage() {
  const { coins, items, purchase } = useShop();
  const { showSuccess, showError } = useMessage();

  async function handleBuy(item: ShopItem) {
    const result = await purchase(item.id);
    if (result.ok) {
      showSuccess(`Unlocked "${item.name}"! Equip it from Options → Appearance.`);
    } else if (result.error === "insufficient_coins") {
      showError(`Not enough coins for "${item.name}" yet.`);
    } else {
      showError(`Couldn't buy "${item.name}" — try again.`);
    }
  }

  const slots: ShopItem["slot"][] = ["theme", "effect"];

  return (
    <Panel title="Shop" maxWidth="720px" style={{ margin: "16px" }}>
      <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
        <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
          🪙 {coins} coins
        </HighlightBox>

        {slots.map((slot) => (
          <Stack key={slot} direction="column" gap="8px">
            <SectionTitle>{SLOT_LABEL[slot]}</SectionTitle>
            {items
              .filter((item) => item.slot === slot)
              .map((item) => (
                <ItemRow key={item.id}>
                  <ItemText>
                    <ItemName>{item.name}</ItemName>
                    <ItemDescription>{item.description}</ItemDescription>
                  </ItemText>
                  {item.owned ? (
                    <OwnedBadge>Owned</OwnedBadge>
                  ) : (
                    <Button
                      description={`Buy — ${item.priceCoins} coins`}
                      variant="quaternary"
                      width="auto"
                      disabled={coins < item.priceCoins}
                      onClick={() => handleBuy(item)}
                    />
                  )}
                </ItemRow>
              ))}
          </Stack>
        ))}
      </Stack>
    </Panel>
  );
}

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 0.85em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.gray};
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
`;

const ItemText = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemName = styled.p`
  margin: 0;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
`;

const ItemDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.85em;
`;

const OwnedBadge = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.success};
`;
