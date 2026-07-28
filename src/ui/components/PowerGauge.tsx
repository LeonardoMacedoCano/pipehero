import styled, { keyframes } from "styled-components";
import IronPipeFrame from "./IronPipeFrame.js";

export default function PowerGauge({
  rockMeter,
  starPowerMeter,
  starPowerActive,
}: {
  rockMeter: number;
  starPowerMeter: number;
  starPowerActive: boolean;
}) {
  const needleAngle = (rockMeter / 100) * 180 - 90;
  const capsule1Fill = Math.min(100, (starPowerMeter / 50) * 100);
  const capsule2Fill = Math.max(0, Math.min(100, ((starPowerMeter - 50) / 50) * 100));

  return (
    <IronPipeFrame $glow={starPowerActive}>
      <Layout>
        <DialWrapper>
          <Label>Rock Meter</Label>
          <Dial>
            <DialInner />
            <Needle style={{ transform: `translateX(-50%) rotate(${needleAngle}deg)` }} />
          </Dial>
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

const DialWrapper = styled.div`
  width: 110px;
`;

const Dial = styled.div`
  position: relative;
  width: 100%;
  height: 55px;
  border-radius: 55px 55px 0 0;
  overflow: hidden;
  background: conic-gradient(
    from 180deg at 50% 100%,
    ${({ theme }) => theme.colors.warning} 0deg 60deg,
    ${({ theme }) => theme.colors.laneYellow} 60deg 120deg,
    ${({ theme }) => theme.colors.success} 120deg 180deg,
    transparent 180deg 360deg
  );
`;

const DialInner = styled.div`
  position: absolute;
  left: 12px;
  top: 12px;
  right: 12px;
  height: calc(100% - 12px);
  border-radius: 55px 55px 0 0;
  background: ${({ theme }) => theme.colors.black};
`;

const Needle = styled.div`
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 3px;
  height: 48px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.white};
  transform-origin: bottom center;
  transition: transform 0.2s ease-out;
`;

const Capsules = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 70px;
`;

const Capsule = styled.div<{ $fill: number; $charged: boolean; $active: boolean }>`
  position: relative;
  height: 14px;
  border-radius: 7px;
  background-color: rgba(0, 0, 0, 0.35);
  border: 1px solid ${({ theme }) => theme.colors.gray};
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
