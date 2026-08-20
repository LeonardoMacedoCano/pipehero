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
import { useShop, type ShopItem } from "../hooks/useShop.js";
import { THEME_OPTIONS } from "../themes/registry.js";

const SWATCH_BY_REF_ID = new Map(THEME_OPTIONS.map((option) => [option.id, [...option.swatch]]));

function ShopGrid({
  items,
  showSwatch,
  coins,
  onBuy,
}: {
  items: ShopItem[];
  showSwatch: boolean;
  coins: number;
  onBuy: (item: ShopItem) => void;
}) {
  return (
    <OptionGridContainer $minItemWidth="180px">
      {items.map((item) => {
        const swatch = showSwatch ? SWATCH_BY_REF_ID.get(item.refId) : undefined;
        return (
          <OptionGridCard as="div" $active={false} key={item.id}>
            {swatch && (
              <OptionGridSwatch>
                {swatch.map((color, i) => (
                  <OptionGridSwatchSlice key={i} style={{ backgroundColor: color }} />
                ))}
              </OptionGridSwatch>
            )}
            <OptionGridLabel>{item.name}</OptionGridLabel>
            <OptionGridDescription>{item.description}</OptionGridDescription>
            {item.owned ? (
              <OptionGridBadge>Owned</OptionGridBadge>
            ) : (
              <Button
                description={`Buy — ${item.priceCoins} coins`}
                variant="quaternary"
                width="auto"
                disabled={coins < item.priceCoins}
                onClick={() => onBuy(item)}
              />
            )}
          </OptionGridCard>
        );
      })}
    </OptionGridContainer>
  );
}

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

  const themeItems = items.filter((item) => item.slot === "theme");
  const effectItems = items.filter((item) => item.slot === "effect");

  return (
    <Panel title="Shop" maxWidth="720px" style={{ margin: "16px" }}>
      <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
        <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
          🪙 {coins} coins
        </HighlightBox>

        <Tabs
          tabs={[
            { label: "Themes", content: <ShopGrid items={themeItems} showSwatch coins={coins} onBuy={handleBuy} /> },
            { label: "Effects", content: <ShopGrid items={effectItems} showSwatch={false} coins={coins} onBuy={handleBuy} /> },
          ]}
        />
      </Stack>
    </Panel>
  );
}
