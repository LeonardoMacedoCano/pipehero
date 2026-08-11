import { useEffect, useMemo, useState } from "react";
import { Column, Loading, Stack, Table, Tabs } from "lcano-react-ui";
import styled from "styled-components";
import { useFriendProfile, type FriendProfileScore } from "../../hooks/useFriendProfile.js";
import { useSongs } from "../../hooks/useSongs.js";
import { toPage } from "../../utils/paginate.js";
import PaginatedGrid from "./PaginatedGrid.js";
import type { AchievementStatus } from "../../hooks/useAchievements.js";

const SCORES_PAGE_SIZE = 5;

export default function FriendProfilePanel({ friendId }: { friendId: number; friendName: string }) {
  const { profile, isLoading } = useFriendProfile(friendId);
  const { songs } = useSongs();
  const songNameById = useMemo(() => new Map((songs ?? []).map((song) => [song.id, song.name])), [songs]);
  const [scoresPageIndex, setScoresPageIndex] = useState(0);

  useEffect(() => {
    setScoresPageIndex(0);
  }, [friendId]);

  const unlockedAchievements = useMemo(() => {
    if (!profile) return [];
    return profile.achievements
      .filter((achievement) => achievement.unlocked)
      .sort((a, b) => new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime());
  }, [profile]);

  return (
    <Stack direction="column" gap="12px">
      <Loading isLoading={isLoading} />
      {profile && (
        <Tabs
          tabs={[
            {
              label: "Scores",
              content:
                profile.scores.length === 0 ? (
                  <Muted>Hasn't played anything yet.</Muted>
                ) : (
                  <Table<FriendProfileScore>
                    values={toPage(profile.scores, scoresPageIndex, SCORES_PAGE_SIZE)}
                    keyExtractor={(score) => `${score.songId}-${score.difficulty}`}
                    loadPage={(nextPageIndex) => setScoresPageIndex(nextPageIndex)}
                    columns={[
                      <Column<FriendProfileScore>
                        header="Song"
                        value={(score) => songNameById.get(score.songId) ?? score.songId}
                      />,
                      <Column<FriendProfileScore> header="Difficulty" width="110px" align="center" value={(score) => score.difficulty} />,
                      <Column<FriendProfileScore>
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
                ),
            },
            {
              label: "Achievements",
              content: (
                <PaginatedGrid
                  items={unlockedAchievements}
                  keyExtractor={(achievement) => achievement.code}
                  emptyMessage="No achievements unlocked yet."
                  renderItem={(achievement) => <AchievementCard achievement={achievement} />}
                />
              ),
            },
          ]}
        />
      )}
    </Stack>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementStatus }) {
  return (
    <Card>
      <CardIcon>{achievement.icon}</CardIcon>
      <CardBody>
        <CardTitle>{achievement.name}</CardTitle>
        <CardDescription>{achievement.description}</CardDescription>
      </CardBody>
    </Card>
  );
}

const Muted = styled.div`
  opacity: 0.6;
  padding: 16px;
`;

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const CardIcon = styled.div`
  font-size: 1.6em;
  flex-shrink: 0;
`;

const CardBody = styled.div`
  min-width: 0;
`;

const CardTitle = styled.div`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardDescription = styled.div`
  font-size: 0.78em;
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Stars = styled.span`
  letter-spacing: 1px;
`;

const Star = styled.span<{ $filled: boolean }>`
  opacity: ${({ $filled }) => ($filled ? 1 : 0.3)};
`;
