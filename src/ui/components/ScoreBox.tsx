import styled, { keyframes } from "styled-components";
import IronPipeFrame from "./IronPipeFrame.js";

const TIER_COLOR_KEYS = ["tertiary", "lane1", "lane3", "lane5"] as const;

function scoreFontSize(digits: number): string {
  if (digits <= 5) return "1.7em";
  if (digits === 6) return "1.45em";
  if (digits === 7) return "1.25em";
  return "1.05em";
}

export default function ScoreBox({
  score,
  combo,
  multiplier,
  starPowerActive,
}: {
  score: number;
  combo: number;
  multiplier: number;
  starPowerActive: boolean;
}) {
  const tier = Math.min(TIER_COLOR_KEYS.length, 1 + Math.floor(combo / 10));
  const tierColorKey = TIER_COLOR_KEYS[tier - 1];
  const digits = score.toString().length;

  return (
    <IronPipeFrame>
      <Layout>
        <Score $fontSize={scoreFontSize(digits)}>{score}</Score>
        <MultiplierBadge $colorKey={tierColorKey} $pulse={starPowerActive}>
          x{multiplier}
        </MultiplierBadge>
      </Layout>
    </IronPipeFrame>
  );
}

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px currentColor; }
  50% { box-shadow: 0 0 16px 4px currentColor; }
`;

const Layout = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const Score = styled.div<{ $fontSize: string }>`
  font-size: ${({ $fontSize }) => $fontSize};
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.white};
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
`;

const MultiplierBadge = styled.div<{ $colorKey: (typeof TIER_COLOR_KEYS)[number]; $pulse: boolean }>`
  display: inline-block;
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 6px;
  font-size: 1em;
  font-weight: bold;
  line-height: 1.3;
  color: ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  background: rgba(0, 0, 0, 0.4);
  border: 1.5px solid ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  animation: ${({ $pulse }) => ($pulse ? pulse : "none")} 1s ease-in-out infinite;
`;
