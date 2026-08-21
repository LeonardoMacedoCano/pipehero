import { useMemo, useState, type ReactNode } from "react";
import { Column, GoogleSignInButton, Loading, Panel, Stack, Table, Tabs, paginateClientSide } from "lcano-react-ui";
import styled from "styled-components";
import { useSongs } from "../../hooks/useSongs.js";
import type { AchievementStatus } from "../../hooks/useAchievements.js";
import type { Difficulty } from "../../../types.js";
import ProfileHeader from "./ProfileHeader.js";
import AchievementBadgeList from "./AchievementBadgeList.js";

const SCORES_PAGE_SIZE = 5;

export interface ProfileScoreRow {
  songId: string;
  difficulty: Difficulty;
  stars: number;
}

export interface ProfileScreenProps {
  title: string;
  actionButton?: ReactNode;
  isLoading: boolean;
  notLoggedIn?: boolean;
  googleClientId?: string | null;
  onLogin?: (credential: string) => void;
  name: string | null;
  equippedAvatarId: string | null;
  equippedBorderId: string | null;
  equippedBackgroundId: string | null;
  equippedTagId: string | null;
  equippedAchievementFrameId: string | null;
  equippedAchievementEffectId: string | null;
  scores: ProfileScoreRow[];
  achievements: AchievementStatus[];
  emptyScoresMessage: string;
  customizeContent?: ReactNode;
}

export default function ProfileScreen({
  title,
  actionButton,
  isLoading,
  notLoggedIn = false,
  googleClientId,
  onLogin,
  name,
  equippedAvatarId,
  equippedBorderId,
  equippedBackgroundId,
  equippedTagId,
  equippedAchievementFrameId,
  equippedAchievementEffectId,
  scores,
  achievements,
  emptyScoresMessage,
  customizeContent,
}: ProfileScreenProps) {
  const { songs } = useSongs();
  const songNameById = useMemo(() => new Map((songs ?? []).map((song) => [song.id, song.name])), [songs]);
  const [scoresPageIndex, setScoresPageIndex] = useState(0);

  const unlockedAchievements = useMemo(
    () =>
      achievements
        .filter((achievement) => achievement.unlocked)
        .sort((a, b) => new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime()),
    [achievements]
  );

  const tabs = [
    ...(customizeContent ? [{ label: "Customize", content: <TabPane>{customizeContent}</TabPane> }] : []),
    {
      label: "Scores",
      content: (
        <TabPane>
          {scores.length === 0 ? (
            <Muted>{emptyScoresMessage}</Muted>
          ) : (
            <Table<ProfileScoreRow>
              values={paginateClientSide(scores, scoresPageIndex, SCORES_PAGE_SIZE)}
              keyExtractor={(score) => `${score.songId}-${score.difficulty}`}
              loadPage={(nextPageIndex) => setScoresPageIndex(nextPageIndex)}
              columns={[
                <Column<ProfileScoreRow> header="Song" value={(score) => songNameById.get(score.songId) ?? score.songId} />,
                <Column<ProfileScoreRow> header="Difficulty" width="110px" align="center" value={(score) => score.difficulty} />,
                <Column<ProfileScoreRow>
                  header="Stars"
                  width="140px"
                  align="center"
                  value={(score) => (
                    <Stars>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} $filled={i < score.stars}>
                          ★
                        </Star>
                      ))}
                    </Stars>
                  )}
                />,
              ]}
            />
          )}
        </TabPane>
      ),
    },
    {
      label: "Achievements",
      content: (
        <TabPane>
          <AchievementBadgeList
            achievements={unlockedAchievements}
            frameId={equippedAchievementFrameId}
            effectId={equippedAchievementEffectId}
            emptyMessage="No achievements unlocked yet."
          />
        </TabPane>
      ),
    },
  ];

  return (
    <Panel title={title} maxWidth="900px" style={{ margin: "16px" }} actionButton={actionButton}>
      <Loading isLoading={isLoading} />
      {!isLoading && notLoggedIn && (
        <PaddedArea style={{ padding: "16px" }}>
          <LoginBanner>
            <span>Log in with Google to customize and view your profile.</span>
            {googleClientId && onLogin && <GoogleSignInButton clientId={googleClientId} onCredential={onLogin} />}
          </LoginBanner>
        </PaddedArea>
      )}
      {!isLoading && !notLoggedIn && name !== null && (
        <Stack direction="column" gap="0">
          <ProfileHeader
            name={name}
            equippedAvatarId={equippedAvatarId}
            equippedBorderId={equippedBorderId}
            equippedBackgroundId={equippedBackgroundId}
            equippedTagId={equippedTagId}
            borderRadius="5px 5px 0 0"
          />
          <Tabs tabs={tabs} />
        </Stack>
      )}
    </Panel>
  );
}

const PaddedArea = styled.div`
  width: 100%;
`;

const TabPane = styled.div`
  margin-bottom: -8px;
`;

const LoginBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.white};
`;

const Muted = styled.div`
  opacity: 0.6;
  padding: 16px;
`;

const Stars = styled.span`
  letter-spacing: 1px;
`;

const Star = styled.span<{ $filled: boolean }>`
  opacity: ${({ $filled }) => ($filled ? 1 : 0.3)};
`;
