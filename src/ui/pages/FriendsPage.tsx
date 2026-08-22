import { useState } from "react";
import { Button, Panel, Stack, Tabs } from "lcano-react-ui";
import styled from "styled-components";
import { useAuth } from "../hooks/useAuth.js";
import FriendsListPanel from "../components/friends/FriendsListPanel.js";
import FriendsFeedPanel from "../components/friends/FriendsFeedPanel.js";
import RankingsPanel from "../components/friends/RankingsPanel.js";
import FriendProfilePanel from "../components/friends/FriendProfilePanel.js";
import FriendComparePanel from "../components/friends/FriendComparePanel.js";
import GuestLoginBanner from "../components/chrome/GuestLoginBanner.js";

type Drilldown = { friendId: number; friendName: string; view: "profile" | "compare" } | null;

export default function FriendsPage() {
  const { user, googleClientId, login } = useAuth();
  const [drilldown, setDrilldown] = useState<Drilldown>(null);

  if (user && drilldown && drilldown.view === "profile") {
    return (
      <FriendProfilePanel
        friendId={drilldown.friendId}
        friendName={drilldown.friendName}
        onBack={() => setDrilldown(null)}
      />
    );
  }

  if (user && drilldown) {
    return (
      <Panel title={drilldown.friendName} maxWidth="900px">
        <Stack direction="column" gap="16px" style={{ padding: "16px" }}>
          <Button description="« Back to Friends" variant="secondary" onClick={() => setDrilldown(null)} />
          <FriendComparePanel friendId={drilldown.friendId} friendName={drilldown.friendName} />
        </Stack>
      </Panel>
    );
  }

  return (
    <Panel title="Friends" maxWidth="900px">
      <Stack direction="column" gap="0">
        {!user && (
          <BannerArea>
            <GuestLoginBanner
              message="Log in with Google to add friends and compare scores."
              googleClientId={googleClientId}
              onLogin={login}
            />
          </BannerArea>
        )}
        <Tabs
          tabs={[
            { label: "Feed", content: <FriendsFeedPanel /> },
            {
              label: "Friends",
              content: (
                <FriendsListPanel
                  canManage={!!user}
                  onOpenProfile={(friendId, friendName) => setDrilldown({ friendId, friendName, view: "profile" })}
                  onCompare={(friendId, friendName) => setDrilldown({ friendId, friendName, view: "compare" })}
                />
              ),
            },
            { label: "Rankings", content: <RankingsPanel /> },
          ]}
        />
      </Stack>
    </Panel>
  );
}

const BannerArea = styled.div`
  padding: 12px 16px 0;
  margin-bottom: 16px;
`;
