import { useId } from "react";
import styled, { css, keyframes, useTheme, type DefaultTheme } from "styled-components";
import IronPipeFrame from "./IronPipeFrame.js";
import { STAR_POWER_ACTIVATION_THRESHOLD, STAR_POWER_METER_EPSILON } from "../../engine/gameEngine.js";
import { rockTierFor, type RockTier } from "../../engine/rockMeter.js";

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

function rockGlowColor(tier: RockTier, theme: DefaultTheme): string {
  if (tier === "critical" || tier === "red") return theme.colors.warning;
  if (tier === "yellow") return theme.colors.laneYellow;
  return theme.colors.success;
}

function lobeD(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const cosBeta = Math.max(-1, Math.min(1, (r1 - r2) / dist));
  const beta = Math.acos(cosBeta);
  const axisAngle = Math.atan2(dy, dx);
  const a1 = axisAngle + beta;
  const a2 = axisAngle - beta;
  const p1x = x1 + r1 * Math.cos(a1);
  const p1y = y1 + r1 * Math.sin(a1);
  const p2x = x2 + r2 * Math.cos(a1);
  const p2y = y2 + r2 * Math.sin(a1);
  const p3x = x2 + r2 * Math.cos(a2);
  const p3y = y2 + r2 * Math.sin(a2);
  const p4x = x1 + r1 * Math.cos(a2);
  const p4y = y1 + r1 * Math.sin(a2);
  return `M ${p1x} ${p1y} L ${p2x} ${p2y} A ${r2} ${r2} 0 0 0 ${p3x} ${p3y} L ${p4x} ${p4y} A ${r1} ${r1} 0 0 0 ${p1x} ${p1y} Z`;
}

function Lobe({ x1, y1, r1, x2, y2, r2, color }: { x1: number; y1: number; r1: number; x2: number; y2: number; r2: number; color: string }) {
  return <path d={lobeD(x1, y1, r1, x2, y2, r2)} fill={color} />;
}

function Palm({ color }: { color: string }) {
  return <rect x="20" y="46" width="60" height="46" rx="22" fill={color} />;
}

function Wrist({ color }: { color: string }) {
  return <rect x="36" y="86" width="28" height="18" rx="8" fill={color} />;
}

function RockHandGlyph({ color }: { color: string }) {
  return (
    <>
      <Wrist color={color} />
      <Palm color={color} />
      <Lobe x1={34} y1={48} r1={10} x2={26} y2={12} r2={7} color={color} />
      <Lobe x1={66} y1={48} r1={9.5} x2={74} y2={16} r2={6.5} color={color} />
      <Lobe x1={30} y1={64} r1={11} x2={11} y2={55} r2={7.5} color={color} />
    </>
  );
}

export default function PowerGauge({
  rockMeter,
  starPowerMeter,
  starPowerActive,
  starPowerGainNonce,
}: {
  rockMeter: number;
  starPowerMeter: number;
  starPowerActive: boolean;
  starPowerGainNonce: number;
}) {
  const theme = useTheme();
  const boltClipId = useId();
  const boltGradientId = useId();
  const handOutlineId = useId();

  const rockFill = clamp01to100(rockMeter);
  const rockTier = rockTierFor(rockFill);
  const rockGlow = rockGlowColor(rockTier, theme);
  const rockShaking = rockTier !== "yellow";
  const rockCritical = rockTier === "critical";

  const starFill = clamp01to100(starPowerMeter);
  const starReady = starFill >= STAR_POWER_ACTIVATION_THRESHOLD - STAR_POWER_METER_EPSILON;
  const boltClipY = BOLT.maxY - (BOLT.maxY - BOLT.minY) * (starFill / 100);

  return (
    <IronPipeFrame>
      <Layout>
        <HandWrapper $shake={rockShaking} $critical={rockCritical} style={{ color: rockGlow }}>
          <svg viewBox="0 0 100 100" width="64" height="64" role="img" aria-label="Rock Meter">
            <defs>
              <filter id={handOutlineId} x="-30%" y="-30%" width="160%" height="160%">
                <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="dilated" />
                <feFlood floodColor={BONE_OUTLINE} result="outlineColor" />
                <feComposite in="outlineColor" in2="dilated" operator="in" result="outline" />
                <feMerge>
                  <feMergeNode in="outline" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g filter={`url(#${handOutlineId})`}>
              <RockHandGlyph color={theme.colors.white} />
            </g>
          </svg>
        </HandWrapper>

        <BoltBump key={starPowerGainNonce} $pulse={starPowerGainNonce > 0}>
          <BoltWrapper $ready={starReady} $active={starPowerActive}>
            <svg viewBox="0 0 100 100" width="64" height="64" role="img" aria-label="Star Power">
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
        </BoltBump>
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

const criticalFlash = keyframes`
  0%, 100% { filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 9px currentColor); }
  50% { filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor); }
`;

const bump = keyframes`
  0% { transform: scale(1); }
  35% { transform: scale(1.3); filter: drop-shadow(0 0 16px ${BOLT_COLOR_LIGHT}); }
  100% { transform: scale(1); }
`;

const Layout = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HandWrapper = styled.div<{ $shake: boolean; $critical: boolean }>`
  filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 9px currentColor);
  transform-origin: 50% 85%;
  animation: ${({ $shake }) => ($shake ? shake : "none")} 0.45s ease-in-out infinite${({ $critical }) =>
    $critical
      ? css`
          , ${criticalFlash} 0.4s ease-in-out infinite
        `
      : ""};
`;

const BoltBump = styled.div<{ $pulse: boolean }>`
  animation: ${({ $pulse }) => ($pulse ? css`${bump} 0.35s ease-out` : "none")};
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
