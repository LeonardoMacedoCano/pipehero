import type { ReactNode } from "react";
import styled from "styled-components";

export default function IronPipeFrame({ glow, children }: { glow: boolean; children: ReactNode }) {
  return (
    <Frame $glow={glow}>
      <PipeRail>
        <PipeCap $side="left" />
        <PipeCap $side="right" />
      </PipeRail>
      <Panel>{children}</Panel>
    </Frame>
  );
}

const Frame = styled.div<{ $glow: boolean }>`
  position: relative;
  padding: 14px 14px 12px;
  filter: ${({ $glow, theme }) => ($glow ? `drop-shadow(0 0 16px ${theme.colors.info})` : "none")};
  transition: filter 0.3s ease;
`;

const PipeRail = styled.div`
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  height: 9px;
  border-radius: 5px;
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.black} 0%,
    ${({ theme }) => theme.colors.quaternary} 28%,
    ${({ theme }) => theme.colors.white} 50%,
    ${({ theme }) => theme.colors.quaternary} 72%,
    ${({ theme }) => theme.colors.black} 100%
  );
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
`;

const PipeCap = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  top: -5px;
  ${({ $side }) => ($side === "left" ? "left: -9px;" : "right: -9px;")}
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 30%,
    ${({ theme }) => theme.colors.white},
    ${({ theme }) => theme.colors.quaternary} 55%,
    ${({ theme }) => theme.colors.black} 100%
  );
  border: 1px solid ${({ theme }) => theme.colors.black};
`;

const Panel = styled.div`
  position: relative;
  margin-top: 9px;
  padding: 12px 14px 10px;
  border-radius: 8px;
  background: linear-gradient(
    160deg,
    ${({ theme }) => theme.colors.quaternary},
    ${({ theme }) => theme.colors.gray} 45%,
    ${({ theme }) => theme.colors.black} 100%
  );
  border: 1px solid ${({ theme }) => theme.colors.black};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -2px 4px rgba(0, 0, 0, 0.6),
    0 4px 10px rgba(0, 0, 0, 0.5);
  background-image:
    radial-gradient(circle 2.5px, rgba(255, 255, 255, 0.45) 40%, transparent 42%),
    radial-gradient(circle 2.5px, rgba(255, 255, 255, 0.45) 40%, transparent 42%);
  background-repeat: no-repeat;
  background-position:
    8px calc(100% - 8px),
    calc(100% - 8px) calc(100% - 8px);
`;
