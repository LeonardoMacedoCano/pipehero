import type { ReactNode } from "react";
import styled, { type DefaultTheme } from "styled-components";

export default function IronPipeFrame({ children }: { children: ReactNode }) {
  return (
    <Frame>
      <Stem />
      <CeilingMount />
      <CeilingMountBolt $side="left" />
      <CeilingMountBolt $side="right" />
      <Crossbar />
      <Elbow $side="left" />
      <Elbow $side="right" />
      <SidePipe $side="left" />
      <SidePipe $side="right" />
      <PipeMouth $side="left" />
      <PipeMouth $side="right" />
      <Panel>{children}</Panel>
    </Frame>
  );
}

const PIPE_THICKNESS = 10;
const ELBOW_SIZE = 26;
const SIDE_INSET = "-1px";
const BOTTOM_OVERSHOOT = "16px";
const FRAME_HORIZONTAL_PADDING = 20;
const PANEL_WIDTH = 220;
const PANEL_HEIGHT = 84;
const STEM_HEIGHT = 48;

export const FRAME_WIDTH = PANEL_WIDTH + FRAME_HORIZONTAL_PADDING * 2;

const Frame = styled.div`
  position: relative;
  margin-top: ${STEM_HEIGHT}px;
  padding: ${ELBOW_SIZE + 4}px ${FRAME_HORIZONTAL_PADDING}px calc(${BOTTOM_OVERSHOOT} + 4px);
`;

const cylinderGradientHorizontal = (theme: DefaultTheme) => `linear-gradient(
  90deg,
  ${theme.colors.black} 0%,
  ${theme.colors.quaternary} 22%,
  ${theme.colors.white} 50%,
  ${theme.colors.quaternary} 78%,
  ${theme.colors.black} 100%
)`;

export const cylinderGradientVertical = (theme: DefaultTheme) => `linear-gradient(
  180deg,
  ${theme.colors.black} 0%,
  ${theme.colors.quaternary} 22%,
  ${theme.colors.white} 50%,
  ${theme.colors.quaternary} 78%,
  ${theme.colors.black} 100%
)`;

const pipeShadow = "0 1px 4px rgba(0, 0, 0, 0.85), inset 0 0 0 1px rgba(0, 0, 0, 0.5)";

const Stem = styled.div`
  position: absolute;
  top: -${STEM_HEIGHT}px;
  left: 50%;
  transform: translateX(-50%);
  width: ${PIPE_THICKNESS}px;
  height: ${STEM_HEIGHT + 1}px;
  background: ${({ theme }) => cylinderGradientHorizontal(theme)};
  box-shadow: ${pipeShadow};
`;

const CEILING_MOUNT_WIDTH = 26;

const CeilingMount = styled.div`
  position: absolute;
  top: -${STEM_HEIGHT}px;
  left: 50%;
  transform: translateX(-50%);
  width: ${CEILING_MOUNT_WIDTH}px;
  height: 8px;
  border-radius: 2px;
  background: ${({ theme }) => cylinderGradientHorizontal(theme)};
  box-shadow: ${pipeShadow};
`;

const CeilingMountBolt = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: -${STEM_HEIGHT - 2}px;
  left: 50%;
  transform: translateX(${({ $side }) => ($side === "left" ? `-${CEILING_MOUNT_WIDTH / 2 + 1}px` : `${CEILING_MOUNT_WIDTH / 2 - 3}px`)});
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, ${({ theme }) => theme.colors.white}, ${({ theme }) => theme.colors.quaternary} 60%, ${({ theme }) => theme.colors.black} 100%);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.8);
`;

const Crossbar = styled.div`
  position: absolute;
  top: 0;
  left: calc(${SIDE_INSET} + ${ELBOW_SIZE}px);
  right: calc(${SIDE_INSET} + ${ELBOW_SIZE}px);
  height: ${PIPE_THICKNESS}px;
  background: ${({ theme }) => cylinderGradientVertical(theme)};
  box-shadow: ${pipeShadow};
`;

function elbowRingGradient(theme: DefaultTheme, cx: number, cy: number): string {
  const outer = ELBOW_SIZE;
  const inner = ELBOW_SIZE - PIPE_THICKNESS;
  const at = (t: number) => inner + (outer - inner) * t;
  return `radial-gradient(
    circle at ${cx}px ${cy}px,
    transparent ${Math.max(0, inner)}px,
    ${theme.colors.black} ${Math.max(0, inner)}px,
    ${theme.colors.quaternary} ${at(0.22)}px,
    ${theme.colors.white} ${at(0.5)}px,
    ${theme.colors.quaternary} ${at(0.78)}px,
    ${theme.colors.black} ${outer}px,
    transparent ${outer}px
  )`;
}

const Elbow = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: 0;
  ${({ $side }) => ($side === "left" ? `left: ${SIDE_INSET};` : `right: ${SIDE_INSET};`)}
  width: ${ELBOW_SIZE}px;
  height: ${ELBOW_SIZE}px;
  background: ${({ theme, $side }) => elbowRingGradient(theme, $side === "left" ? ELBOW_SIZE : 0, ELBOW_SIZE)};
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
`;

const SidePipe = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: ${ELBOW_SIZE}px;
  bottom: -${BOTTOM_OVERSHOOT};
  ${({ $side }) => ($side === "left" ? `left: ${SIDE_INSET};` : `right: ${SIDE_INSET};`)}
  width: ${PIPE_THICKNESS}px;
  background: ${({ theme }) => cylinderGradientHorizontal(theme)};
  box-shadow: ${pipeShadow};
`;

const PipeMouth = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  bottom: calc(-${BOTTOM_OVERSHOOT} - 3px);
  ${({ $side }) => ($side === "left" ? "left: calc(-1px - 3px);" : "right: calc(-1px - 3px);")}
  width: 16px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    ${({ theme }) => theme.colors.black} 0%,
    ${({ theme }) => theme.colors.black} 35%,
    ${({ theme }) => theme.colors.quaternary} 55%,
    ${({ theme }) => theme.colors.white} 72%,
    ${({ theme }) => theme.colors.quaternary} 100%
  );
  border: 1px solid ${({ theme }) => theme.colors.black};
`;

const Panel = styled.div`
  position: relative;
  width: ${PANEL_WIDTH}px;
  height: ${PANEL_HEIGHT}px;
  box-sizing: border-box;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

