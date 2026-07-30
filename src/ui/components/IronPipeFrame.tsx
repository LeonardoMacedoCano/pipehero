import type { ReactNode } from "react";
import styled, { type DefaultTheme } from "styled-components";

export default function IronPipeFrame({ glow, children }: { glow: boolean; children: ReactNode }) {
  return (
    <Frame $glow={glow}>
      <Stem />
      <CeilingMount />
      <CeilingMountBolt $side="left" />
      <CeilingMountBolt $side="right" />
      <Crossbar />
      <Elbow $side="left" />
      <Elbow $side="right" />
      <ElbowHighlight $side="left" />
      <ElbowHighlight $side="right" />
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
const PANEL_WIDTH = 260;
const PANEL_HEIGHT = 100;
const STEM_HEIGHT = 48;

export const FRAME_WIDTH = PANEL_WIDTH + FRAME_HORIZONTAL_PADDING * 2;

const Frame = styled.div<{ $glow: boolean }>`
  position: relative;
  margin-top: ${STEM_HEIGHT}px;
  padding: ${ELBOW_SIZE + 4}px ${FRAME_HORIZONTAL_PADDING}px calc(${BOTTOM_OVERSHOOT} + 4px);
  filter: ${({ $glow, theme }) => ($glow ? `drop-shadow(0 0 16px ${theme.colors.info})` : "none")};
  transition: filter 0.3s ease;
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

const Elbow = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: 0;
  ${({ $side }) => ($side === "left" ? `left: ${SIDE_INSET};` : `right: ${SIDE_INSET};`)}
  width: ${ELBOW_SIZE}px;
  height: ${ELBOW_SIZE}px;
  border-radius: ${({ $side }) => ($side === "left" ? `${ELBOW_SIZE}px 0 0 0` : `0 ${ELBOW_SIZE}px 0 0`)};
  border-style: solid;
  border-color: ${({ theme }) => theme.colors.quaternary};
  border-width: ${({ $side }) =>
    $side === "left" ? `${PIPE_THICKNESS}px 0 0 ${PIPE_THICKNESS}px` : `${PIPE_THICKNESS}px ${PIPE_THICKNESS}px 0 0`};
  box-shadow: ${pipeShadow};
`;

const ElbowHighlight = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: 3px;
  ${({ $side }) => ($side === "left" ? `left: calc(${SIDE_INSET} + 3px);` : `right: calc(${SIDE_INSET} + 3px);`)}
  width: ${ELBOW_SIZE - 3}px;
  height: ${ELBOW_SIZE - 3}px;
  border-radius: ${({ $side }) => ($side === "left" ? `${ELBOW_SIZE}px 0 0 0` : `0 ${ELBOW_SIZE}px 0 0`)};
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.55);
  border-width: ${({ $side }) => ($side === "left" ? "2px 0 0 2px" : "2px 2px 0 0")};
  pointer-events: none;
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
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
`;

