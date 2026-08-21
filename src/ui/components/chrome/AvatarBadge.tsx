import styled from "styled-components";
import { getBorderOption } from "../../cosmetics/borderCatalog.js";
import { resolveAvatarSrc } from "../../cosmetics/resolveAvatar.js";

export default function AvatarBadge({
  equippedAvatarId,
  equippedBorderId,
  size = 28,
}: {
  equippedAvatarId: string | null;
  equippedBorderId?: string | null;
  size?: number;
}) {
  const src = resolveAvatarSrc(equippedAvatarId);
  const borderCss = equippedBorderId ? getBorderOption(equippedBorderId)?.css : undefined;

  return (
    <Ring $size={size} $borderCss={borderCss}>
      <Img src={src} alt="" />
    </Ring>
  );
}

const Ring = styled.div<{ $size: number; $borderCss?: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid transparent;
  ${({ $borderCss }) => $borderCss ?? ""}
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
