import { useId } from "react";
import styled, { css, keyframes, useTheme, type DefaultTheme } from "styled-components";
import IronPipeFrame from "./IronPipeFrame.js";
import { STAR_POWER_ACTIVATION_THRESHOLD, STAR_POWER_METER_EPSILON } from "../../engine/gameEngine.js";

interface Shape {
  points: string;
  minY: number;
  maxY: number;
}

function buildShape(coords: { x: number; y: number }[]): Shape {
  const ys = coords.map((p) => p.y);
  return {
    points: coords.map((p) => `${p.x},${p.y}`).join(" "),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

const BOLT = buildShape([
  { x: 62, y: 4 },
  { x: 24, y: 54 },
  { x: 46, y: 54 },
  { x: 38, y: 96 },
  { x: 76, y: 42 },
  { x: 54, y: 42 },
]);

const BOLT_COLOR = "#9c6dff";
const BOLT_COLOR_LIGHT = "#d8c8ff";
const BONE_OUTLINE = "rgba(0, 0, 0, 0.55)";

function clamp01to100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

type RockTier = "red" | "yellow" | "green";

function rockTierFor(rockFill: number): RockTier {
  if (rockFill < 33) return "red";
  if (rockFill < 66) return "yellow";
  return "green";
}

function rockGlowColor(tier: RockTier, theme: DefaultTheme): string {
  if (tier === "red") return theme.colors.warning;
  if (tier === "yellow") return theme.colors.laneYellow;
  return theme.colors.success;
}

function Finger({
  originX,
  originY,
  angleDeg,
  width,
  length,
  color,
}: {
  originX: number;
  originY: number;
  angleDeg: number;
  width: number;
  length: number;
  color: string;
}) {
  return (
    <g transform={`translate(${originX}, ${originY}) rotate(${angleDeg})`}>
      <rect x={-width / 2} y={-length} width={width} height={length + width / 2} rx={width / 2} fill={color} stroke={BONE_OUTLINE} strokeWidth={2.2} />
    </g>
  );
}

function Palm({ color }: { color: string }) {
  return <rect x="22" y="58" width="56" height="34" rx="17" fill={color} stroke={BONE_OUTLINE} strokeWidth={2.2} />;
}

function RockHandGlyph({ color }: { color: string }) {
  return (
    <>
      <Palm color={color} />
      <Finger originX={37} originY={62} angleDeg={-12} width={17} length={52} color={color} />
      <Finger originX={63} originY={60} angleDeg={9} width={16} length={58} color={color} />
      <Finger originX={45} originY={60} angleDeg={0} width={10} length={26} color={color} />
      <Finger originX={55} originY={62} angleDeg={0} width={10} length={22} color={color} />
      <Finger originX={30} originY={68} angleDeg={-42} width={15} length={30} color={color} />
    </>
  );
}

export default function PowerGauge({
  rockMeter,
  starPowerMeter,
  starPowerActive,
}: {
  rockMeter: number;
  starPowerMeter: number;
  starPowerActive: boolean;
}) {
  const theme = useTheme();
  const boltClipId = useId();
  const boltGradientId = useId();

  const rockFill = clamp01to100(rockMeter);
  const rockTier = rockTierFor(rockFill);
  const rockGlow = rockGlowColor(rockTier, theme);
  const rockShaking = rockTier !== "yellow";

  const starFill = clamp01to100(starPowerMeter);
  const starReady = starFill >= STAR_POWER_ACTIVATION_THRESHOLD - STAR_POWER_METER_EPSILON;
  const boltClipY = BOLT.maxY - (BOLT.maxY - BOLT.minY) * (starFill / 100);

  return (
    <IronPipeFrame glow={starPowerActive}>
      <Layout>
        <HandWrapper $shake={rockShaking} style={{ color: rockGlow }}>
          <svg viewBox="0 0 100 100" width="80" height="80" role="img" aria-label="Rock Meter">
            <RockHandGlyph color={theme.colors.white} />
          </svg>
        </HandWrapper>

        <BoltWrapper $ready={starReady} $active={starPowerActive}>
          <svg viewBox="0 0 100 100" width="80" height="80" role="img" aria-label="Star Power">
            <defs>
              <linearGradient id={boltGradientId} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={BOLT_COLOR} />
                <stop offset="100%" stopColor={BOLT_COLOR_LIGHT} />
              </linearGradient>
              <clipPath id={boltClipId}>
                <rect x="0" y={boltClipY} width="100" height={120} />
              </clipPath>
            </defs>
            <polygon points={BOLT.points} fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth={3} strokeLinejoin="round" />
            <polygon points={BOLT.points} fill={`url(#${boltGradientId})`} clipPath={`url(#${boltClipId})`} strokeLinejoin="round" />
            <polygon points={BOLT.points} fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
        </BoltWrapper>
      </Layout>
    </IronPipeFrame>
  );
}

const flicker = keyframes`
  0%, 100% { filter: drop-shadow(0 0 5px currentColor); opacity: 1; }
  45% { filter: drop-shadow(0 0 12px currentColor); opacity: 0.85; }
  50% { filter: drop-shadow(0 0 3px currentColor); opacity: 1; }
`;

const shake = keyframes`
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-6deg); }
  50% { transform: rotate(5deg); }
  80% { transform: rotate(-3deg); }
`;

const Layout = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const HandWrapper = styled.div<{ $shake: boolean }>`
  filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 9px currentColor);
  transform-origin: 50% 85%;
  animation: ${({ $shake }) => ($shake ? shake : "none")} 0.45s ease-in-out infinite;
`;

const BoltWrapper = styled.div<{ $ready: boolean; $active: boolean }>`
  color: ${BOLT_COLOR};
  transform-origin: 50% 88%;
  animation: ${({ $ready, $active }) =>
    $ready || $active
      ? css`
          ${flicker} 1.4s ease-in-out infinite, ${shake} 0.45s ease-in-out infinite
        `
      : "none"};
`;
