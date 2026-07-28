import styled, { keyframes } from "styled-components";
import IronPipeFrame from "./IronPipeFrame.js";

const TIER_COLOR_KEYS = ["tertiary", "laneGreen", "laneYellow", "laneOrange"] as const;

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

  return (
    <IronPipeFrame glow={starPowerActive}>
      <Grille>
        <Score>{score}</Score>
        <Row>
          <MultiplierBadge $colorKey={tierColorKey} $pulse={starPowerActive}>
            x{multiplier}
          </MultiplierBadge>
          {combo > 0 && <ComboLabel>{combo} combo</ComboLabel>}
        </Row>
      </Grille>
    </IronPipeFrame>
  );
}

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px currentColor; }
  50% { box-shadow: 0 0 16px 4px currentColor; }
`;

const Grille = styled.div`
  padding: 10px 14px;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.colors.black};
  background-image: repeating-radial-gradient(circle at center, rgba(255, 255, 255, 0.12) 0 1px, transparent 1px 7px);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7);
`;

const Score = styled.div`
  font-size: 2.1em;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.white};
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
  line-height: 1;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
`;

const MultiplierBadge = styled.div<{ $colorKey: (typeof TIER_COLOR_KEYS)[number]; $pulse: boolean }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 1em;
  font-weight: bold;
  line-height: 1.4;
  color: ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  background: rgba(0, 0, 0, 0.4);
  border: 1.5px solid ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  animation: ${({ $pulse }) => ($pulse ? pulse : "none")} 1s ease-in-out infinite;
`;

const ComboLabel = styled.div`
  margin-top: 2px;
  font-size: 0.7em;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.tertiary};
`;
