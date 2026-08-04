import type { ReactNode } from "react";
import { useMessage } from "lcano-react-ui";
import styled from "styled-components";
import { cylinderGradientHorizontal } from "../../pipeStyles.js";

export default function GameModeCard({
  title,
  ctaLabel,
  onClick,
  locked,
  hint,
  thumbnail,
}: {
  title: string;
  ctaLabel: string;
  onClick?: () => void;
  locked?: boolean;
  hint?: string;
  thumbnail: ReactNode;
}) {
  const { showInfo } = useMessage();

  function handleClick() {
    if (locked) {
      if (hint) showInfo(hint);
      return;
    }
    onClick?.();
  }

  return (
    <Card type="button" onClick={handleClick}>
      <Title>{title}</Title>
      <ThumbnailFrame $locked={!!locked}>
        <Thumbnail>{thumbnail}</Thumbnail>
        {locked && (
          <LockOverlay>
            <LockIcon>🔒</LockIcon>
          </LockOverlay>
        )}
        <Beam />
        <Cta $locked={!!locked}>{locked ? "Locked" : ctaLabel}</Cta>
      </ThumbnailFrame>
    </Card>
  );
}

const Card = styled.button`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 0 1 220px;
  max-width: 240px;
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const Title = styled.div`
  text-align: center;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.white};
`;

const ThumbnailFrame = styled.div<{ $locked: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  opacity: ${({ $locked }) => ($locked ? 0.7 : 1)};
`;

const Thumbnail = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.secondary} 0%, ${({ theme }) => theme.colors.primary} 100%);
  overflow: hidden;
`;

const LockOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
`;

const LockIcon = styled.span`
  font-size: 1.8em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
`;

const Beam = styled.div`
  height: 5px;
  background: ${({ theme }) => cylinderGradientHorizontal(theme)};
`;

const Cta = styled.div<{ $locked: boolean }>`
  padding: 10px;
  text-align: center;
  font-weight: bold;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme, $locked }) => (($locked ? theme.colors.secondary : theme.colors.quaternary))};
`;
