import { useMemo, useState } from "react";
import { Loading, Stack, Tabs, ToggleSwitch } from "lcano-react-ui";
import styled from "styled-components";
import type { Difficulty } from "../../../types.js";
import { DIFFICULTY_ORDER } from "../../../engine/availableTracks.js";
import { useFriendCompare, type CompareRow } from "../../hooks/useFriendCompare.js";
import { useSongs } from "../../hooks/useSongs.js";
import PaginatedGrid from "./PaginatedGrid.js";
import CompareStarRow from "./CompareStarRow.js";

const STAR_TIERS = [5, 4, 3, 2, 1];

type CompareFilter = "comparable" | "all";

export default function FriendComparePanel({ friendId, friendName }: { friendId: number; friendName: string }) {
  const { compare, isLoading } = useFriendCompare(friendId);
  const { songs } = useSongs();
  const songNameById = useMemo(() => new Map((songs ?? []).map((song) => [song.id, song.name])), [songs]);
  const [filter, setFilter] = useState<CompareFilter>("comparable");

  const rows = useMemo(() => {
    if (!compare) return [];
    const source =
      filter === "comparable" ? compare.rows.filter((row) => row.myStars !== null && row.friendStars !== null) : compare.rows;
    return [...source].sort((a, b) => {
      const difficultyDelta = DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty);
      if (difficultyDelta !== 0) return difficultyDelta;
      const nameA = songNameById.get(a.songId) ?? a.songId;
      const nameB = songNameById.get(b.songId) ?? b.songId;
      return nameA.localeCompare(nameB);
    });
  }, [compare, filter, songNameById]);

  return (
    <Stack direction="column" gap="16px">
      <Loading isLoading={isLoading} />
      {compare && (
        <>
          <SummaryRow>
            <StatCard $accent="quaternary">
              <StatLabel>You</StatLabel>
              <StatValue>{compare.myWeightedScore} pts</StatValue>
            </StatCard>
            <StatCard $accent="tertiary">
              <StatLabel>{friendName}</StatLabel>
              <StatValue>{compare.friendWeightedScore} pts</StatValue>
            </StatCard>
          </SummaryRow>

          <Tabs
            tabs={[
              {
                label: "Comparisons",
                content: (
                  <Stack direction="column" gap="12px">
                    <ToggleSwitch
                      optionA={{ label: "Comparable", value: "comparable" }}
                      optionB={{ label: "All", value: "all" }}
                      value={filter}
                      onChange={setFilter}
                    />
                    <PaginatedGrid<CompareRow>
                      items={rows}
                      keyExtractor={(row) => `${row.songId}-${row.difficulty}`}
                      emptyMessage={
                        filter === "comparable"
                          ? "Neither of you has a song/difficulty in common yet."
                          : "Neither of you has played anything yet."
                      }
                      minItemWidth="260px"
                      rowsPerPage={2}
                      renderItem={(row) => (
                        <CompareStarRow songName={songNameById.get(row.songId) ?? row.songId} row={row} />
                      )}
                    />
                  </Stack>
                ),
              },
              {
                label: "Star Distribution",
                content: (
                  <PaginatedGrid<Difficulty>
                    items={DIFFICULTY_ORDER}
                    keyExtractor={(difficulty) => difficulty}
                    emptyMessage="No distribution data."
                    minItemWidth="200px"
                    rowsPerPage={1}
                    renderItem={(difficulty) => (
                      <DistributionCard
                        difficulty={difficulty}
                        friendName={friendName}
                        mine={compare.distribution.me[difficulty]}
                        friend={compare.distribution.friend[difficulty]}
                      />
                    )}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </Stack>
  );
}

function DistributionCard({
  difficulty,
  friendName,
  mine,
  friend,
}: {
  difficulty: Difficulty;
  friendName: string;
  mine: number[];
  friend: number[];
}) {
  const max = Math.max(1, ...STAR_TIERS.map((star) => mine[star]), ...STAR_TIERS.map((star) => friend[star]));
  return (
    <DistCard>
      <DistTitle>{difficulty}</DistTitle>
      <DistBars label="You" counts={mine} max={max} />
      <DistBars label={friendName} counts={friend} max={max} />
    </DistCard>
  );
}

function DistBars({ label, counts, max }: { label: string; counts: number[]; max: number }) {
  return (
    <BarsGroup>
      <BarsGroupLabel>{label}</BarsGroupLabel>
      {STAR_TIERS.map((star) => (
        <BarRow key={star}>
          <BarStarLabel>{star}★</BarStarLabel>
          <BarTrack>
            <BarFill style={{ width: `${(counts[star] / max) * 100}%` }} />
          </BarTrack>
          <BarCount>{counts[star]}</BarCount>
        </BarRow>
      ))}
    </BarsGroup>
  );
}

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const StatCard = styled.div<{ $accent: "quaternary" | "tertiary" }>`
  flex: 1;
  min-width: 180px;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid ${({ theme, $accent }) => theme.colors[$accent]};
  background-color: ${({ theme }) => theme.colors.primary};
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.gray};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
`;

const DistCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  padding: 10px 14px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const DistTitle = styled.div`
  font-weight: bold;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.white};
`;

const BarsGroup = styled.div`
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const BarsGroupLabel = styled.div`
  font-size: 0.78em;
  opacity: 0.75;
  margin-bottom: 2px;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
`;

const BarStarLabel = styled.span`
  min-width: 2em;
  opacity: 0.8;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ theme }) => theme.colors.gray};
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  background-color: ${({ theme }) => theme.colors.quaternary};
`;

const BarCount = styled.span`
  min-width: 1.4em;
  text-align: right;
  opacity: 0.8;
`;
