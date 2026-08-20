import { Panel, Stack, HighlightBox, Tabs } from "lcano-react-ui";
import styled from "styled-components";
import { useEconomy } from "../hooks/useEconomy.js";

export default function MissionsPage() {
  const {
    currentStreak,
    longestStreak,
    streakGraceAvailable,
    missionsToday,
    allClearBonusCoins,
    allClearCompletedToday,
    missionsThisWeek,
    weeklyAllClearBonusCoins,
    weeklyAllClearCompletedThisWeek,
  } = useEconomy();

  return (
    <Panel title="Missions" maxWidth="720px" style={{ margin: "16px" }}>
      <Tabs
        tabs={[
          {
            label: "Daily",
            content: (
              <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
                <StreakRow>
                  <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
                    🔥 Day {currentStreak} streak
                  </HighlightBox>
                  <StreakDetail>
                    Best streak: {longestStreak} · {streakGraceAvailable ? "grace available" : "grace already used"}
                  </StreakDetail>
                </StreakRow>

                <Stack direction="column" gap="8px">
                  {missionsToday.map((mission) => (
                    <MissionRow key={mission.code}>
                      <MissionIcon aria-hidden>{mission.icon}</MissionIcon>
                      <MissionText>
                        <MissionName>{mission.name}</MissionName>
                        <MissionDescription>{mission.description}</MissionDescription>
                      </MissionText>
                      <MissionReward>+{mission.rewardCoins}</MissionReward>
                      <StatusBadge $completed={mission.completed}>{mission.completed ? "✓ Done" : "Pending"}</StatusBadge>
                    </MissionRow>
                  ))}
                </Stack>

                <AllClearRow $completed={allClearCompletedToday}>
                  All-clear bonus: +{allClearBonusCoins} coins for finishing every mission today
                  {allClearCompletedToday ? " — claimed!" : ""}
                </AllClearRow>
              </Stack>
            ),
          },
          {
            label: "Weekly",
            content: (
              <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
                <Stack direction="column" gap="8px">
                  {missionsThisWeek.map((mission) => (
                    <MissionRow key={mission.code}>
                      <MissionIcon aria-hidden>{mission.icon}</MissionIcon>
                      <MissionText>
                        <MissionName>
                          {mission.name} <TierBadge $tier={mission.tier}>{mission.tier}</TierBadge>
                        </MissionName>
                        <MissionDescription>{mission.description}</MissionDescription>
                      </MissionText>
                      <MissionReward>+{mission.rewardCoins}</MissionReward>
                      <StatusBadge $completed={mission.completed}>{mission.completed ? "✓ Done" : "Pending"}</StatusBadge>
                    </MissionRow>
                  ))}
                </Stack>

                <AllClearRow $completed={weeklyAllClearCompletedThisWeek}>
                  All-clear bonus: +{weeklyAllClearBonusCoins} coins for finishing every mission this week
                  {weeklyAllClearCompletedThisWeek ? " — claimed!" : ""}
                </AllClearRow>
              </Stack>
            ),
          },
        ]}
      />
    </Panel>
  );
}

const TIER_COLORS: Record<"small" | "medium" | "large", (theme: import("styled-components").DefaultTheme) => string> = {
  small: (theme) => theme.colors.gray,
  medium: (theme) => theme.colors.info,
  large: (theme) => theme.colors.warning,
};

const TierBadge = styled.span<{ $tier: "small" | "medium" | "large" }>`
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.7em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.black};
  background-color: ${({ theme, $tier }) => TIER_COLORS[$tier](theme)};
`;

const StreakRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const StreakDetail = styled.span`
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.9em;
`;

const MissionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
`;

const MissionIcon = styled.span`
  font-size: 1.4em;
`;

const MissionText = styled.div`
  flex: 1;
  min-width: 0;
`;

const MissionName = styled.p`
  margin: 0;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
`;

const MissionDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.85em;
`;

const MissionReward = styled.span`
  color: ${({ theme }) => theme.colors.warning};
  font-weight: 700;
  white-space: nowrap;
`;

const StatusBadge = styled.span<{ $completed: boolean }>`
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme, $completed }) => ($completed ? theme.colors.success : theme.colors.gray)};
`;

const AllClearRow = styled.p<{ $completed: boolean }>`
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme, $completed }) => ($completed ? theme.colors.success : theme.colors.primary)};
`;
