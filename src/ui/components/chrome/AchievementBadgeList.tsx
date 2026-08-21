import { PaginatedGrid } from "lcano-react-ui";
import styled from "styled-components";
import type { AchievementStatus } from "../../hooks/useAchievements.js";
import AchievementFrame from "./AchievementFrame.js";

export default function AchievementBadgeList({
  achievements,
  frameId,
  effectId,
  emptyMessage,
}: {
  achievements: AchievementStatus[];
  frameId: string | null;
  effectId: string | null;
  emptyMessage: string;
}) {
  return (
    <PaginatedGrid
      items={achievements}
      keyExtractor={(achievement) => achievement.code}
      emptyMessage={emptyMessage}
      renderItem={(achievement) => (
        <AchievementFrame frameId={frameId} effectId={effectId}>
          <Card>
            <CardIcon>{achievement.icon}</CardIcon>
            <CardBody>
              <CardTitle>{achievement.name}</CardTitle>
              <CardDescription>{achievement.description}</CardDescription>
            </CardBody>
          </Card>
        </AchievementFrame>
      )}
    />
  );
}

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
