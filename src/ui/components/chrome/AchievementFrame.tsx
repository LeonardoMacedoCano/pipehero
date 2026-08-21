import type { ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { getAchievementFrameOption } from "../../cosmetics/achievementFrameCatalog.js";

const shimmerSweep = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
  50% { box-shadow: 0 0 14px rgba(255, 255, 255, 0.5); }
`;

export default function AchievementFrame({
  frameId,
  effectId,
  children,
}: {
  frameId: string | null;
  effectId: string | null;
  children: ReactNode;
}) {
  if (!frameId && !effectId) return <>{children}</>;

  const frameCss = frameId ? getAchievementFrameOption(frameId)?.css : undefined;

  return (
    <Wrapper $frameCss={frameCss} $pulse={effectId === "pulse"}>
      {children}
      {effectId === "shimmer" && (
        <ShimmerLayer>
          <ShimmerSweep />
        </ShimmerLayer>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $frameCss?: string; $pulse: boolean }>`
  position: relative;
  border-radius: 8px;
  ${({ $frameCss }) => $frameCss ?? ""}

  ${({ $frameCss }) =>
    $frameCss &&
    css`
      > *:first-child {
        border: none;
        border-radius: inherit;
      }
    `}

  @media (prefers-reduced-motion: no-preference) {
    ${({ $pulse }) =>
      $pulse &&
      css`
        animation: ${pulseGlow} 2.4s ease-in-out infinite;
      `}
  }
`;

const ShimmerLayer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  border-radius: inherit;
`;

const ShimmerSweep = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  opacity: 0;

  @media (prefers-reduced-motion: no-preference) {
    opacity: 1;
    animation: ${shimmerSweep} 2.2s ease-in-out infinite;
  }
`;
