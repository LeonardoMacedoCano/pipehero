import styled from "styled-components";
import { useMessage } from "lcano-react-ui";

export default function LockedMenuItem({ label, hint }: { label: string; hint: string }) {
  const { showInfo } = useMessage();

  return (
    <MenuItem type="button" $locked onClick={() => showInfo(hint)}>
      <MenuItemLabel>{label}</MenuItemLabel>
      <LockIcon aria-hidden="true">🔒</LockIcon>
    </MenuItem>
  );
}

export const MenuItem = styled.button<{ $locked?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  padding: 16px 20px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.white};
  font: inherit;
  font-size: 1.1em;
  cursor: pointer;
  opacity: ${({ $locked }) => ($locked ? 0.55 : 1)};

  &:hover {
    border-color: ${({ theme }) => theme.colors.quaternary};
  }
`;

export const MenuItemLabel = styled.span`
  font-weight: bold;
`;

const LockIcon = styled.span`
  font-size: 0.9em;
  flex-shrink: 0;
`;
