import { useState } from "react";
import { Button, Panel, Stack, Tabs } from "lcano-react-ui";
import styled from "styled-components";
import { useAuth } from "../hooks/useAuth.js";
import GoogleSignInButton from "../components/GoogleSignInButton.js";
import FriendsListPanel from "../components/friends/FriendsListPanel.js";
import FriendsFeedPanel from "../components/friends/FriendsFeedPanel.js";
import RankingsPanel from "../components/friends/RankingsPanel.js";
import FriendProfilePanel from "../components/friends/FriendProfilePanel.js";
import FriendComparePanel from "../components/friends/FriendComparePanel.js";

type Drilldown = { friendId: number; friendName: string; view: "profile" | "compare" } | null;

export default function FriendsPage() {
  const { user, googleClientId, login } = useAuth();
  const [drilldown, setDrilldown] = useState<Drilldown>(null);

  if (!user) {
    return (
      <Panel title="Friends" maxWidth="720px">
        <LoginBanner>
          <span>Log in with Google to add friends and compare scores.</span>
          {googleClientId && <GoogleSignInButton clientId={googleClientId} onCredential={login} />}
        </LoginBanner>
      </Panel>
    );
  }

  if (drilldown) {
    return (
      <Panel title={drilldown.friendName} maxWidth="900px">
        <Stack direction="column" gap="16px" style={{ padding: "16px" }}>
          <Button description="« Back to Friends" variant="secondary" onClick={() => setDrilldown(null)} />
          {drilldown.view === "profile" ? (
            <FriendProfilePanel friendId={drilldown.friendId} friendName={drilldown.friendName} />
          ) : (
            <FriendComparePanel friendId={drilldown.friendId} friendName={drilldown.friendName} />
          )}
        </Stack>
      </Panel>
    );
  }

  return (
    <Panel title="Friends" maxWidth="900px">
      <Tabs
        tabs={[
          { label: "Feed", content: <FriendsFeedPanel /> },
          {
            label: "Friends",
            content: (
              <FriendsListPanel
                onOpenProfile={(friendId, friendName) => setDrilldown({ friendId, friendName, view: "profile" })}
                onCompare={(friendId, friendName) => setDrilldown({ friendId, friendName, view: "compare" })}
              />
            ),
          },
          { label: "Rankings", content: <RankingsPanel /> },
        ]}
      />
    </Panel>
  );
}

const LoginBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  color: ${({ theme }) => theme.colors.white};
`;
