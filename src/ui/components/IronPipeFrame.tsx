import type { ReactNode } from "react";
import styled from "styled-components";
import { cylinderGradientHorizontal, cylinderGradientVertical, elbowRingGradient, pipeShadow } from "../pipeStyles.js";

export default function IronPipeFrame({ children }: { children: ReactNode }) {
  return (
    <Frame>
      <Stem />
      <CeilingMount />
      <CeilingMountBolt $side="left" />
      <CeilingMountBolt $side="right" />
      <Crossbar $vpos="top" />
      <Crossbar $vpos="bottom" />
      <Elbow $side="left" $vpos="top" />
      <Elbow $side="right" $vpos="top" />
      <Elbow $side="left" $vpos="bottom" />
      <Elbow $side="right" $vpos="bottom" />
      <SidePipe $side="left" />
      <SidePipe $side="right" />
      <Panel>{children}</Panel>
    </Frame>
  );
}

const PIPE_THICKNESS = 6;
const ELBOW_SIZE = 14;
const SIDE_INSET = "-1px";
const FRAME_HORIZONTAL_PADDING = 10;
const PANEL_WIDTH = 140;
const PANEL_HEIGHT = 46;
const STEM_HEIGHT = 14;

export const FRAME_WIDTH = PANEL_WIDTH + FRAME_HORIZONTAL_PADDING * 2;
export const FRAME_HEIGHT = STEM_HEIGHT + ELBOW_SIZE + PANEL_HEIGHT + ELBOW_SIZE;

const Frame = styled.div`
  position: relative;
  margin-top: ${STEM_HEIGHT}px;
  padding: ${ELBOW_SIZE}px ${FRAME_HORIZONTAL_PADDING}px;
`;

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

const CEILING_MOUNT_WIDTH = 14;

const CeilingMount = styled.div`
  position: absolute;
  top: -${STEM_HEIGHT}px;
  left: 50%;
  transform: translateX(-50%);
  width: ${CEILING_MOUNT_WIDTH}px;
  height: 5px;
  border-radius: 2px;
  background: ${({ theme }) => cylinderGradientHorizontal(theme)};
  box-shadow: ${pipeShadow};
`;

const CeilingMountBolt = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: -${STEM_HEIGHT - 2}px;
  left: 50%;
  transform: translateX(${({ $side }) => ($side === "left" ? `-${CEILING_MOUNT_WIDTH / 2 + 1}px` : `${CEILING_MOUNT_WIDTH / 2 - 3}px`)});
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, ${({ theme }) => theme.colors.white}, ${({ theme }) => theme.colors.gray} 60%, ${({ theme }) => theme.colors.black} 100%);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.8);
`;

const Crossbar = styled.div<{ $vpos: "top" | "bottom" }>`
  position: absolute;
  ${({ $vpos }) => ($vpos === "top" ? "top: 0;" : "bottom: 0;")}
  left: calc(${SIDE_INSET} + ${ELBOW_SIZE}px);
  right: calc(${SIDE_INSET} + ${ELBOW_SIZE}px);
  height: ${PIPE_THICKNESS}px;
  background: ${({ theme }) => cylinderGradientVertical(theme)};
  box-shadow: ${pipeShadow};
`;

const Elbow = styled.div<{ $side: "left" | "right"; $vpos: "top" | "bottom" }>`
  position: absolute;
  ${({ $vpos }) => ($vpos === "top" ? "top: 0;" : "bottom: 0;")}
  ${({ $side }) => ($side === "left" ? `left: ${SIDE_INSET};` : `right: ${SIDE_INSET};`)}
  width: ${ELBOW_SIZE}px;
  height: ${ELBOW_SIZE}px;
  background: ${({ theme, $side, $vpos }) =>
    elbowRingGradient(theme, ELBOW_SIZE, PIPE_THICKNESS, $side === "left" ? ELBOW_SIZE : 0, $vpos === "top" ? ELBOW_SIZE : 0)};
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
`;

const SidePipe = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: ${ELBOW_SIZE}px;
  bottom: ${ELBOW_SIZE}px;
  ${({ $side }) => ($side === "left" ? `left: ${SIDE_INSET};` : `right: ${SIDE_INSET};`)}
  width: ${PIPE_THICKNESS}px;
  background: ${({ theme }) => cylinderGradientHorizontal(theme)};
  box-shadow: ${pipeShadow};
`;

const Panel = styled.div`
  position: relative;
  width: ${PANEL_WIDTH}px;
  height: ${PANEL_HEIGHT}px;
  box-sizing: border-box;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
