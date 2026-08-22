import styled from "styled-components";
import { useAuth } from "../hooks/useAuth.js";
import { useEconomy } from "../hooks/useEconomy.js";
import { useAchievements } from "../hooks/useAchievements.js";
import GameModeCard from "../components/chrome/GameModeCard.js";
import { NoteLaneThumbnail, FriendsThumbnail } from "../components/chrome/thumbnails.js";
import PipeBeam from "../components/chrome/PipeBeam.js";

export default function MainMenuPage({
  onPlaySingleplayer,
  onViewFriends,
  onViewMissions,
  onViewAchievements,
}: {
  onPlaySingleplayer: () => void;
  onViewFriends: () => void;
  onViewMissions: () => void;
  onViewAchievements: () => void;
}) {
  const { user } = useAuth();
  const { currentStreak, missionsToday } = useEconomy();
  const { achievements } = useAchievements();

  const completedMissions = missionsToday.filter((mission) => mission.completed).length;
  const unlockedAchievements = achievements?.filter((achievement) => achievement.unlocked).length ?? 0;

  return (
    <Wrapper>
      <Brand>
        <LogoRow>
          <Logo src="/pipehero-icon.png" alt="" width={56} height={56} />
          <Wordmark>PipeHero</Wordmark>
        </LogoRow>
        <VersionTag>Rhythm game &middot; v{__APP_VERSION__}</VersionTag>
        <PipeBeam width="clamp(200px, 60vw, 420px)" />
      </Brand>

      {user && (
        <ProgressStrip>
          <ProgressChip type="button" onClick={onViewMissions} title="Streak">
            🔥 {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </ProgressChip>
          <ProgressChip type="button" onClick={onViewMissions} title="Daily missions">
            🎯 {completedMissions}/{missionsToday.length}
          </ProgressChip>
          <ProgressChip type="button" onClick={onViewAchievements} title="Achievements">
            🏆 {unlockedAchievements}/{achievements?.length ?? 0}
          </ProgressChip>
        </ProgressStrip>
      )}

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
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(16px, 3vh, 24px);
  width: 100%;
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Logo = styled.img`
  width: clamp(36px, 7vw, 52px);
  height: clamp(36px, 7vw, 52px);
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
`;

const Wordmark = styled.span`
  font-size: clamp(1.3rem, 4.5vw, 1.9rem);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.white};
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
`;

const VersionTag = styled.div`
  font-size: 0.75em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.tertiary};
`;

const ProgressStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const ProgressChip = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.85;
  }
`;

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: clamp(16px, 3vw, 28px);
  width: 100%;
  max-width: 820px;
`;
