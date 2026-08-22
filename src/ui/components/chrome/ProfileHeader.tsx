import { useMediaQuery } from "lcano-react-ui";
import styled from "styled-components";
import { getBackgroundOption } from "../../cosmetics/backgroundCatalog.js";
import { getTagOption } from "../../cosmetics/tagCatalog.js";
import { LANDSCAPE_MEDIA_QUERY } from "../../responsive.js";
import AvatarBadge from "./AvatarBadge.js";

export interface ProfileHeaderProps {
  name: string;
  equippedAvatarId: string | null;
  equippedBorderId: string | null;
  equippedBackgroundId: string | null;
  equippedTagId: string | null;
  showName?: boolean;
  borderRadius?: string;
}

export default function ProfileHeader({
  name,
  equippedAvatarId,
  equippedBorderId,
  equippedBackgroundId,
  equippedTagId,
  showName = true,
  borderRadius = "12px",
}: ProfileHeaderProps) {
  const backgroundCss = equippedBackgroundId ? getBackgroundOption(equippedBackgroundId)?.css : undefined;
  const tag = equippedTagId ? getTagOption(equippedTagId) : undefined;
  const isLandscapePhone = useMediaQuery(LANDSCAPE_MEDIA_QUERY);

  return (
    <Wrapper $backgroundCss={backgroundCss} $borderRadius={borderRadius}>
      <AvatarBadge
        equippedAvatarId={equippedAvatarId}
        equippedBorderId={equippedBorderId}
        size={isLandscapePhone ? 40 : 64}
      />
      {showName && <Name>{name}</Name>}
      {tag && <TagPill>{tag.label}</TagPill>}
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $backgroundCss?: string; $borderRadius: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: ${({ $borderRadius }) => $borderRadius};
  ${({ $backgroundCss }) => $backgroundCss ?? ""}

  @media ${LANDSCAPE_MEDIA_QUERY} {
    padding: 8px;
    gap: 4px;
  }
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
