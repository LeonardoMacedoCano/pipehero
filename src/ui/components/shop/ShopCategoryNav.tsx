import styled from "styled-components";
import type { CosmeticSlot } from "../../hooks/useShop.js";
import { SHOP_CATEGORIES, type ShopCategory } from "./shopCategories.js";
import { MOBILE_LAYOUT_MEDIA_QUERY } from "../../responsive.js";

export default function ShopCategoryNav({
  active,
  onChange,
  counts,
  categories = SHOP_CATEGORIES,
}: {
  active: CosmeticSlot;
  onChange: (id: CosmeticSlot) => void;
  counts: Partial<Record<CosmeticSlot, number>>;
  categories?: readonly ShopCategory[];
}) {
  return (
    <Nav aria-label="Shop categories">
      {categories.map((category) => (
        <CategoryButton key={category.id} type="button" $active={category.id === active} onClick={() => onChange(category.id)}>
          <span aria-hidden>{category.icon}</span>
          <Label>{category.label}</Label>
          <Count>{counts[category.id] ?? 0}</Count>
        </CategoryButton>
      ))}
    </Nav>
  );
}

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  width: 180px;

  @media ${MOBILE_LAYOUT_MEDIA_QUERY} {
    flex-direction: row;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 4px;
  }
`;

const CategoryButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  background: ${({ theme, $active }) => ($active ? theme.colors.quaternary : theme.colors.secondary)};
  color: ${({ theme }) => theme.colors.white};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  white-space: nowrap;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.quaternary};
  }

  @media ${MOBILE_LAYOUT_MEDIA_QUERY} {
    flex-shrink: 0;
  }
`;

const Label = styled.span`
  flex: 1;
  text-align: left;

  @media ${MOBILE_LAYOUT_MEDIA_QUERY} {
    flex: none;
  }
`;

const Count = styled.span`
  opacity: 0.75;
  font-size: 0.85em;
`;
