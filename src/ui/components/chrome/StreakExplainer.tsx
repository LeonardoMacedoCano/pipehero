import styled from "styled-components";

export default function StreakExplainer({
  currentStreak,
  longestStreak,
  graceAvailable,
}: {
  currentStreak: number;
  longestStreak: number;
  graceAvailable: boolean;
}) {
  return (
    <Wrapper>
      <StatsRow>
        <StatBox>
          <StatValue>{currentStreak}</StatValue>
          <StatLabel>Current streak</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{longestStreak}</StatValue>
          <StatLabel>Best streak</StatLabel>
        </StatBox>
      </StatsRow>
      <ExplainerText>
        Open the game once a day to keep the streak going — the coin reward grows with it (day 3, 7, 14, 30, and
        every 30 days after that). Missing exactly one day doesn't break it as long as your grace is available
        ({graceAvailable ? "available right now" : "already used — it recharges on your next consecutive login"}
        ); missing two or more days in a row resets the streak back to day 1.
      </ExplainerText>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 12px;
`;

const StatBox = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
`;

const StatValue = styled.span`
  font-size: 1.6em;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
`;

const StatLabel = styled.span`
  font-size: 0.75em;
  color: ${({ theme }) => theme.colors.gray};
`;

const ExplainerText = styled.p`
  margin: 0;
  font-size: 0.85em;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.gray};
`;
