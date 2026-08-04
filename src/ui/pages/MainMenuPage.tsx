import styled from "styled-components";
import GameModeCard from "../components/chrome/GameModeCard.js";
import { NoteLaneThumbnail, DuoPipesThumbnail, FriendsThumbnail } from "../components/chrome/thumbnails.js";

export default function MainMenuPage({ onPlaySingleplayer }: { onPlaySingleplayer: () => void }) {
  return (
    <CardRow>
      <GameModeCard
        title="Single Player"
        ctaLabel="Play"
        thumbnail={<NoteLaneThumbnail />}
        onClick={onPlaySingleplayer}
      />
      <GameModeCard
        title="Multiplayer"
        ctaLabel="Play"
        thumbnail={<DuoPipesThumbnail />}
        locked
        hint="Coming soon — depends on a multiplayer server, not implemented yet."
      />
      <GameModeCard
        title="Friends"
        ctaLabel="View"
        thumbnail={<FriendsThumbnail />}
        locked
        hint="Coming soon — depends on login and an account system, not implemented yet."
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
