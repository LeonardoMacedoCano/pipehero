import { useMemo, useState } from "react";
import { Panel, Stack, Loading, HighlightBox, ToggleSwitch } from "lcano-react-ui";
import styled from "styled-components";
import { useAchievements, type AchievementStatus } from "../hooks/useAchievements.js";
import { useAuth } from "../hooks/useAuth.js";
import GoogleSignInButton from "../components/GoogleSignInButton.js";

type FilterTab = "unlocked" | "locked";

export default function AchievementsPage() {
  const { achievements, isLoading } = useAchievements();
  const { user, googleClientId, login } = useAuth();
  const [tab, setTab] = useState<FilterTab>("unlocked");

  const unlockedCount = achievements?.filter((achievement) => achievement.unlocked).length ?? 0;
  const totalCount = achievements?.length ?? 0;

  const visible = useMemo(() => {
    if (!achievements) return [];
    if (tab === "unlocked") {
      return achievements
        .filter((achievement) => achievement.unlocked)
        .sort((a, b) => new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime());
    }
    return achievements.filter((achievement) => !achievement.unlocked);
  }, [achievements, tab]);

  return (
    <Panel title="Achievements" maxWidth="720px" style={{ margin: "16px" }}>
      <Loading isLoading={isLoading} />
      {achievements && (
        <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
          {!user && (
            <LoginBanner>
              <span>Log in with Google to start tracking your achievements.</span>
              {googleClientId && <GoogleSignInButton clientId={googleClientId} onCredential={login} />}
            </LoginBanner>
          )}

          <HeaderRow>
            <ShrinkToFit>
              <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
                {unlockedCount} / {totalCount} unlocked
              </HighlightBox>
            </ShrinkToFit>
            <ToggleSwitch
              optionA={{ label: "Unlocked", value: "unlocked" }}
              optionB={{ label: "Locked", value: "locked" }}
              value={tab}
              onChange={setTab}
            />
          </HeaderRow>

          {visible.length === 0 ? (
            <EmptyState>
              {tab === "unlocked" ? "No achievements unlocked yet — go play!" : "Nothing left to unlock. Well played."}
            </EmptyState>
          ) : (
            <Grid>
              {visible.map((achievement) => (
                <AchievementCard key={achievement.code} achievement={achievement} />
              ))}
            </Grid>
          )}
        </Stack>
      )}
    </Panel>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementStatus }) {
  return (
    <Card $unlocked={achievement.unlocked}>
      <CardIcon>{achievement.unlocked ? achievement.icon : "🔒"}</CardIcon>
      <CardBody>
        <CardTitle>{achievement.name}</CardTitle>
        <CardDescription>{achievement.description}</CardDescription>
        <CardMeta>
          {achievement.unlocked && achievement.unlockedAt && <span>Unlocked {new Date(achievement.unlockedAt).toLocaleString()}</span>}
          <span>{achievement.globalUnlockPercent}% of players</span>
        </CardMeta>
      </CardBody>
    </Card>
  );
}

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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`;

const ShrinkToFit = styled.div`
  display: inline-flex;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 0;
  color: ${({ theme }) => theme.colors.tertiary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
`;

const CARD_HEIGHT = "150px";

const Card = styled.div<{ $unlocked: boolean }>`
  display: flex;
  align-items: stretch;
  height: ${CARD_HEIGHT};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  opacity: ${({ $unlocked }) => ($unlocked ? 1 : 0.55)};
  overflow: hidden;
`;

const CardIcon = styled.div`
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.6rem;
  line-height: 1;
  background-color: ${({ theme }) => theme.colors.primary};
  border-right: 1px solid ${({ theme }) => theme.colors.gray};
`;

const CardBody = styled.div`
  min-width: 0;
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
`;

const CardTitle = styled.div`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardDescription = styled.div`
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.white};
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardMeta = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  min-height: 2.2em;
  font-size: 0.75em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-top: 6px;
`;
