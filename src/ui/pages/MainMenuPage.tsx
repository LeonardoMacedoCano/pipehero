import styled from "styled-components";
import GameModeCard from "../components/chrome/GameModeCard.js";
import { NoteLaneThumbnail, FriendsThumbnail } from "../components/chrome/thumbnails.js";

export default function MainMenuPage({
  onPlaySingleplayer,
  onViewFriends,
}: {
  onPlaySingleplayer: () => void;
  onViewFriends: () => void;
}) {
  return (
    <CardRow>
      <GameModeCard
        title="Single Player"
        ctaLabel="Play"
        thumbnail={<NoteLaneThumbnail />}
        onClick={onPlaySingleplayer}
      />
      <GameModeCard
        title="Friends"
        ctaLabel="View"
        thumbnail={<FriendsThumbnail />}
        onClick={onViewFriends}
      />
    </CardRow>
  );
}

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: clamp(16px, 3vw, 28px);
  width: 100%;
  max-width: 820px;
`;
