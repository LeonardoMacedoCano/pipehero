import styled, { keyframes, useTheme } from "styled-components";
import IronPipeFrame from "./IronPipeFrame.js";
import { rockTierFor } from "../../engine/rockMeter.js";

const DIAL_CX = 100;
const DIAL_CY = 95;
const DIAL_R = 88;
const NEEDLE_LENGTH = 78;

function arcPoints(fromDeg: number, toDeg: number, steps: number): string {
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = fromDeg + (toDeg - fromDeg) * (i / steps);
    const rad = (deg * Math.PI) / 180;
    points.push(`${DIAL_CX + DIAL_R * Math.cos(rad)},${DIAL_CY - DIAL_R * Math.sin(rad)}`);
  }
  return points.join(" ");
}

function wedgePoints(fromDeg: number, toDeg: number): string {
  return `${DIAL_CX},${DIAL_CY} ${arcPoints(fromDeg, toDeg, 16)}`;
}

const RED_WEDGE = wedgePoints(180, 120);
const YELLOW_WEDGE = wedgePoints(120, 60);
const GREEN_WEDGE = wedgePoints(60, 0);

function clamp01to100(value: number): number {
  return Math.max(0, Math.min(100, value));
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
  const needleAngleDeg = 180 * (1 - clamp01to100(rockMeter) / 100);
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const needleX = DIAL_CX + NEEDLE_LENGTH * Math.cos(needleRad);
  const needleY = DIAL_CY - NEEDLE_LENGTH * Math.sin(needleRad);
  const isCritical = rockTierFor(clamp01to100(rockMeter)) === "critical";

  const capsule1Fill = Math.min(100, (starPowerMeter / 50) * 100);
  const capsule2Fill = Math.max(0, Math.min(100, ((starPowerMeter - 50) / 50) * 100));

  return (
    <IronPipeFrame glow={starPowerActive}>
      <Layout>
        <DialWrapper $critical={isCritical}>
          <Label>Rock Meter</Label>
          <svg viewBox="0 0 200 100" width="110" height="55">
            <polygon points={RED_WEDGE} fill={theme.colors.warning} />
            <polygon points={YELLOW_WEDGE} fill={theme.colors.laneYellow} />
            <polygon points={GREEN_WEDGE} fill={theme.colors.success} />
            <line
              x1={DIAL_CX}
              y1={DIAL_CY}
              x2={needleX}
              y2={needleY}
              stroke={theme.colors.white}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <circle cx={DIAL_CX} cy={DIAL_CY} r={8} fill={theme.colors.black} stroke={theme.colors.white} strokeWidth={1.5} />
          </svg>
        </DialWrapper>

        <Capsules>
          <Label>Star Power</Label>
          <Capsule $fill={capsule1Fill} $charged={capsule1Fill >= 100} $active={starPowerActive} />
          <Capsule $fill={capsule2Fill} $charged={capsule2Fill >= 100} $active={starPowerActive} />
        </Capsules>
      </Layout>
    </IronPipeFrame>
  );
}

const flicker = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px currentColor; opacity: 1; }
  45% { box-shadow: 0 0 16px 4px currentColor; opacity: 0.85; }
  50% { box-shadow: 0 0 4px 1px currentColor; opacity: 1; }
`;

const criticalFlash = keyframes`
  0%, 100% { filter: drop-shadow(0 0 8px rgba(232, 68, 60, 0.9)); }
  50% { filter: drop-shadow(0 0 1px rgba(232, 68, 60, 0)); }
`;

const Label = styled.div`
  font-size: 0.7em;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.tertiary};
  text-align: center;
  margin-bottom: 4px;
`;

const Layout = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 14px;
`;

const DialWrapper = styled.div<{ $critical: boolean }>`
  width: 110px;
  animation: ${({ $critical }) => ($critical ? criticalFlash : "none")} 0.4s ease-in-out infinite;
`;

const Capsules = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 70px;
`;

const Capsule = styled.div<{ $fill: number; $charged: boolean; $active: boolean }>`
  position: relative;
  height: 14px;
  border-radius: 7px;
  background-color: rgba(0, 0, 0, 0.55);
  border: 2px solid ${({ theme }) => theme.colors.gray};
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  overflow: hidden;
  color: ${({ theme }) => theme.colors.info};
  animation: ${({ $charged, $active }) => ($charged || $active ? flicker : "none")} 1.4s ease-in-out infinite;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${({ $fill }) => $fill}%;
    background: linear-gradient(90deg, ${({ theme }) => theme.colors.info}, ${({ theme }) => theme.colors.laneOpen});
    transition: width 0.15s linear;
  }
`;
