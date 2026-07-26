import styled from "styled-components";
import type { Difficulty } from "../../types.js";
import { DIFFICULTY_ORDER } from "../../engine/availableTracks.js";

const MAX_STARS = 5;

export default function DifficultyStars({ stars }: { stars: Partial<Record<Difficulty, number>> | undefined }) {
  const played = DIFFICULTY_ORDER.filter((difficulty) => stars?.[difficulty] !== undefined);
  if (played.length === 0) return null;

  return (
    <Rows>
      {played.map((difficulty) => (
        <Row key={difficulty}>
          <DifficultyLabel>{difficulty}</DifficultyLabel>
          <Stars>
            {Array.from({ length: MAX_STARS }, (_, i) => (
              <Star key={i} $filled={i < (stars?.[difficulty] ?? 0)}>
                ★
              </Star>
            ))}
          </Stars>
        </Row>
      ))}
    </Rows>
  );
}

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
`;

const DifficultyLabel = styled.span`
  color: ${({ theme }) => theme.colors.tertiary};
  min-width: 4.5em;
`;

const Stars = styled.span`
  letter-spacing: 1px;
`;

const Star = styled.span<{ $filled: boolean }>`
  color: ${({ theme, $filled }) => ($filled ? theme.colors.quaternary : theme.colors.gray)};
`;
