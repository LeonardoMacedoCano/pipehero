import type { ReactNode } from "react";
import styled from "styled-components";

export default function IconButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button type="button" onClick={onClick} title={label} aria-label={label} $active={!!active}>
      {icon}
    </Button>
  );
}

const Button = styled.button<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15em;
  background: ${({ theme, $active }) => ($active ? theme.colors.quaternary : theme.colors.secondary)};
  color: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  transition: background-color 0.2s ease, transform 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.quaternary};
    transform: translateY(-1px);
  }
`;
