import type { MouseEvent } from "react";
import { Button, OptionGridLabel, OptionGridBadge } from "lcano-react-ui";
import styled from "styled-components";
import type { ShopItem } from "../../hooks/useShop.js";
import { renderItemPreview } from "./shopItemPreview.js";

export default function ShopItemCard({
  item,
  coins,
  onBuy,
  equippedRefId,
  onToggleEquip,
  onOpenDetails,
}: {
  item: ShopItem;
  coins: number;
  onBuy: (item: ShopItem) => void;
  equippedRefId?: string | null;
  onToggleEquip?: (item: ShopItem) => void;
  onOpenDetails: (item: ShopItem) => void;
}) {
  const isEquipped = onToggleEquip !== undefined && equippedRefId === item.refId;
  const preview = renderItemPreview(item, "sm");

  function stopPropagation(handler: () => void) {
    return (event: MouseEvent) => {
      event.stopPropagation();
      handler();
    };
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails(item);
        }
      }}
    >
      {preview && <PreviewArea>{preview}</PreviewArea>}
      <Name>{item.name}</Name>
      <Actions>
        {!item.owned && (
          <Button
            description={String(item.priceCoins)}
            icon={<span aria-hidden>🪙</span>}
            variant="quaternary"
            width="100%"
            disabled={coins < item.priceCoins}
            onClick={stopPropagation(() => onBuy(item))}
          />
        )}
        {item.owned && onToggleEquip && (
          <Button
            description={isEquipped ? "Equipped ✓" : "Equip"}
            variant={isEquipped ? "secondary" : "quaternary"}
            width="100%"
            onClick={stopPropagation(() => onToggleEquip(item))}
          />
        )}
        {item.owned && !onToggleEquip && <OptionGridBadge>Owned</OptionGridBadge>}
      </Actions>
    </Card>
  );
}

const Card = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 170px;
  padding: 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.quaternary};
  }
`;

const PreviewArea = styled.div`
  min-height: 48px;
  display: flex;
  align-items: center;
`;

const Name = styled(OptionGridLabel)`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Actions = styled.div`
  margin-top: auto;
`;
