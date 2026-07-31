import styled, { keyframes } from "styled-components";
import IronPipeFrame from "./IronPipeFrame.js";

const TIER_COLOR_KEYS = ["tertiary", "laneGreen", "laneYellow", "laneOrange"] as const;

function scoreFontSize(digits: number): string {
  if (digits <= 5) return "2.2em";
  if (digits === 6) return "1.85em";
  if (digits === 7) return "1.55em";
  return "1.2em";
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
    <IronPipeFrame glow={starPowerActive}>
      <Grille>
        <Rivet $corner="top-left" />
        <Rivet $corner="top-right" />
        <Rivet $corner="bottom-left" />
        <Rivet $corner="bottom-right" />

        <Score $fontSize={scoreFontSize(digits)}>{score}</Score>
        <MultiplierBadge $colorKey={tierColorKey} $pulse={starPowerActive}>
          x{multiplier}
        </MultiplierBadge>
      </Grille>
    </IronPipeFrame>
  );
}

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px currentColor; }
  50% { box-shadow: 0 0 16px 4px currentColor; }
`;

const Grille = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 6px 14px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.black};
  background-image:
    linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 45%),
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 1px, transparent 1px, transparent 3px);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7);
`;

const RIVET_INSET = 5;

const Rivet = styled.div<{ $corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" }>`
  position: absolute;
  ${({ $corner }) => ($corner.includes("top") ? `top: ${RIVET_INSET}px;` : `bottom: ${RIVET_INSET}px;`)}
  ${({ $corner }) => ($corner.includes("left") ? `left: ${RIVET_INSET}px;` : `right: ${RIVET_INSET}px;`)}
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, ${({ theme }) => theme.colors.white}, ${({ theme }) => theme.colors.quaternary} 60%, ${({ theme }) => theme.colors.black} 100%);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.85);
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
  padding: 2px 6px;
  border-radius: 7px;
  font-size: 1.3em;
  font-weight: bold;
  line-height: 1.3;
  color: ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  background: rgba(0, 0, 0, 0.4);
  border: 1.5px solid ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  animation: ${({ $pulse }) => ($pulse ? pulse : "none")} 1s ease-in-out infinite;
`;
