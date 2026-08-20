import styled from "styled-components";
import { useAuth } from "../../hooks/useAuth.js";
import { useEconomy } from "../../hooks/useEconomy.js";

export default function CoinBalanceBadge() {
  const { user } = useAuth();
  const { coins } = useEconomy();

  if (!user) return null;

  return (
    <Badge title="Coins">
      <span aria-hidden>🪙</span>
      {coins}
    </Badge>
  );
}

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  white-space: nowrap;
`;
