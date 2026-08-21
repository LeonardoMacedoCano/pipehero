import { Modal, Button, OptionGridBadge } from "lcano-react-ui";
import styled from "styled-components";
import type { ShopItem } from "../../hooks/useShop.js";
import { renderItemPreview } from "./shopItemPreview.js";

const ACTION_BUTTON_WIDTH = "140px";
const ACTION_BUTTON_HEIGHT = "40px";

export default function ShopItemModal({
  item,
  coins,
  onClose,
  onBuy,
  equippedRefId,
  onToggleEquip,
  onTogglePreview,
  isPreviewing,
}: {
  item: ShopItem;
  coins: number;
  onClose: () => void;
  onBuy: (item: ShopItem) => void;
  equippedRefId?: string | null;
  onToggleEquip?: (item: ShopItem) => void;
  onTogglePreview?: (item: ShopItem) => void;
  isPreviewing?: boolean;
}) {
  const isEquipped = onToggleEquip !== undefined && equippedRefId === item.refId;
  const preview = renderItemPreview(item, "lg");

  return (
    <Modal
      isOpen
      title={item.name}
      icon={null}
      variant="secondary"
      onClose={onClose}
      modalWidth="360px"
      content={
        <Content>
          {preview && <PreviewArea>{preview}</PreviewArea>}
          <Description>{item.description}</Description>
          {item.owned && !onToggleEquip && <OptionGridBadge>Owned</OptionGridBadge>}
        </Content>
      }
      actions={
        <ActionsRow>
          {onTogglePreview && (
            <Button
              description={isPreviewing ? "Previewing…" : "Preview"}
              variant={isPreviewing ? "secondary" : "tertiary"}
              width={ACTION_BUTTON_WIDTH}
              height={ACTION_BUTTON_HEIGHT}
              onClick={() => onTogglePreview(item)}
            />
          )}
          {!item.owned && (
            <Button
              description={String(item.priceCoins)}
              icon={<span aria-hidden>🪙</span>}
              variant="quaternary"
              width={ACTION_BUTTON_WIDTH}
              height={ACTION_BUTTON_HEIGHT}
              disabled={coins < item.priceCoins}
              onClick={() => onBuy(item)}
            />
          )}
          {item.owned && onToggleEquip && (
            <Button
              description={isEquipped ? "Equipped ✓" : "Equip"}
              variant={isEquipped ? "secondary" : "quaternary"}
              width={ACTION_BUTTON_WIDTH}
              height={ACTION_BUTTON_HEIGHT}
              onClick={() => onToggleEquip(item)}
            />
          )}
        </ActionsRow>
      }
    />
  );
}

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PreviewArea = styled.div`
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Description = styled.span`
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.white};
`;

const ActionsRow = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 10px;
`;
