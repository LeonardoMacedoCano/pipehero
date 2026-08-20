import styled from "styled-components";
import { getAvatarOption, avatarDataUri } from "../../cosmetics/avatarCatalog.js";
import { getBorderOption } from "../../cosmetics/borderCatalog.js";
import { getBackgroundOption } from "../../cosmetics/backgroundCatalog.js";
import { getTagOption } from "../../cosmetics/tagCatalog.js";

export interface ProfileHeaderProps {
  name: string;
  avatarUrl: string | null;
  equippedAvatarId: string | null;
  equippedBorderId: string | null;
  equippedBackgroundId: string | null;
  equippedTagId: string | null;
  showName?: boolean;
}

export default function ProfileHeader({
  name,
  avatarUrl,
  equippedAvatarId,
  equippedBorderId,
  equippedBackgroundId,
  equippedTagId,
  showName = true,
}: ProfileHeaderProps) {
  const avatarOption = equippedAvatarId ? getAvatarOption(equippedAvatarId) : undefined;
  const resolvedAvatarSrc = avatarOption ? avatarDataUri(avatarOption) : avatarUrl;
  const borderCss = equippedBorderId ? getBorderOption(equippedBorderId)?.css : undefined;
  const backgroundCss = equippedBackgroundId ? getBackgroundOption(equippedBackgroundId)?.css : undefined;
  const tag = equippedTagId ? getTagOption(equippedTagId) : undefined;

  return (
    <Wrapper $backgroundCss={backgroundCss}>
      <AvatarRing $borderCss={borderCss}>
        {resolvedAvatarSrc ? (
          <AvatarImg src={resolvedAvatarSrc} alt="" />
        ) : (
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        )}
      </AvatarRing>
      {showName && <Name>{name}</Name>}
      {tag && (
        <TagPill>
          {tag.emoji} {tag.label}
        </TagPill>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $backgroundCss?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  ${({ $backgroundCss }) => $backgroundCss ?? ""}
`;

const AvatarRing = styled.div<{ $borderCss?: string }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid transparent;
  ${({ $borderCss }) => $borderCss ?? ""}
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6em;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.gray};
`;

const Name = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
`;

const TagPill = styled.span`
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.black};
  background-color: ${({ theme }) => theme.colors.quaternary};
`;
