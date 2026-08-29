import styled from "styled-components";
import { getBorderOption } from "../../cosmetics/borderCatalog.js";
import { resolveAvatarOption } from "../../cosmetics/resolveAvatar.js";
import Emoji from "../Emoji.js";

export default function AvatarBadge({
  equippedAvatarId,
  equippedBorderId,
  size = 28,
}: {
  equippedAvatarId: string | null;
  equippedBorderId?: string | null;
  size?: number;
}) {
  const avatar = resolveAvatarOption(equippedAvatarId);
  const borderCss = equippedBorderId ? getBorderOption(equippedBorderId)?.css : undefined;

  return (
    <Ring $size={size} $borderCss={borderCss}>
      {avatar ? (
        <Face $size={size} style={{ backgroundColor: avatar.bgColor }}>
          <Emoji glyph={avatar.emoji} />
        </Face>
      ) : (
        <Img src="/pipehero-icon.png" alt="" />
      )}
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

const Face = styled.div<{ $size: number }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => $size * 0.62}px;
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
