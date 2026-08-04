import { Panel, Stack, Loading, HighlightBox } from "lcano-react-ui";
import styled from "styled-components";
import { useAchievements } from "../hooks/useAchievements.js";

export default function AchievementsPage() {
  const { achievements, isLoading } = useAchievements();
  const unlockedCount = achievements?.filter((a) => a.unlocked).length ?? 0;

  return (
    <Panel title="Achievements" maxWidth="720px">
      <Loading isLoading={isLoading} />
      {achievements && (
        <Stack direction="column" gap="16px" style={{ padding: "12px 0" }}>
          <Stack direction="row" justifyCenter>
            <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
              {unlockedCount} / {achievements.length} unlocked
            </HighlightBox>
          </Stack>

          <Grid>
            {achievements.map((achievement) => (
              <Card key={achievement.code} $unlocked={achievement.unlocked}>
                <CardTitle>
                  {achievement.unlocked ? "🏆" : "🔒"} {achievement.name}
                </CardTitle>
                <CardDescription>{achievement.description}</CardDescription>
                {achievement.unlocked && achievement.unlockedAt && (
                  <CardDate>Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}</CardDate>
                )}
              </Card>
            ))}
          </Grid>
        </Stack>
      )}
    </Panel>
  );
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;

const Card = styled.div<{ $unlocked: boolean }>`
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  opacity: ${({ $unlocked }) => ($unlocked ? 1 : 0.55)};
`;

const CardTitle = styled.div`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
`;

const CardDescription = styled.div`
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-top: 4px;
`;

const CardDate = styled.div`
  font-size: 0.75em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-top: 4px;
`;
