import { useEffect, useState } from "react";
import { Column, Loading, PAGE_SIZE_DEFAULT, Stack, Table, ToggleSwitch, paginateClientSide } from "lcano-react-ui";
import styled from "styled-components";
import { useLeaderboard, type LeaderboardEntry, type LeaderboardScope } from "../../hooks/useLeaderboard.js";
import AvatarBadge from "../chrome/AvatarBadge.js";

export default function RankingsPanel() {
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const { leaderboard, isLoading } = useLeaderboard(scope);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [scope]);

  return (
    <Stack direction="column" gap="12px">
      <ToggleSwitch
        optionA={{ label: "Global", value: "global" }}
        optionB={{ label: "Friends", value: "friends" }}
        value={scope}
        onChange={setScope}
      />
      <Loading isLoading={isLoading} />
      {!isLoading && leaderboard.length === 0 && <Muted>Nobody has scored anything yet.</Muted>}
      {leaderboard.length > 0 && (
        <Table<LeaderboardEntry>
          values={paginateClientSide(leaderboard, pageIndex, PAGE_SIZE_DEFAULT)}
          keyExtractor={(entry) => entry.userId}
          rowSelected={(entry) => entry.isMe}
          loadPage={(nextPageIndex) => setPageIndex(nextPageIndex)}
          columns={[
            <Column<LeaderboardEntry> header="#" width="60px" align="center" value={(entry) => entry.rank} />,
            <Column<LeaderboardEntry>
              header="Player"
              value={(entry) => (
                <PlayerCell>
                  <AvatarBadge equippedAvatarId={entry.equippedAvatarId} equippedBorderId={entry.equippedBorderId} />
                  <span>
                    {entry.name}
                    {entry.isMe ? " (you)" : ""}
                  </span>
                </PlayerCell>
              )}
            />,
            <Column<LeaderboardEntry> header="Score" width="120px" align="center" value={(entry) => entry.weightedScore} />,
          ]}
        />
      )}
    </Stack>
  );
}

const Muted = styled.span`
  opacity: 0.6;
`;

const PlayerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;
