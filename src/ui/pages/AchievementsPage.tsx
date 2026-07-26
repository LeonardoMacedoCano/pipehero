import { Panel, Stack, Loading, Button } from "lcano-react-ui";
import styled from "styled-components";
import { useAchievements } from "../hooks/useAchievements.js";

export default function AchievementsPage({ onBack }: { onBack: () => void }) {
  const { achievements, isLoading } = useAchievements();

  return (
    <Panel
      title="Achievements"
      maxWidth="640px"
      actionButton={<Button description="« Menu" variant="secondary" onClick={onBack} />}
    >
      <Loading isLoading={isLoading} />
      {achievements && (
        <Stack direction="column" gap="10px" style={{ padding: "12px 0" }}>
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
        </Stack>
      )}
    </Panel>
  );
}

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
