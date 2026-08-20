import { AccountSummary, Button, GoogleSignInButton } from "lcano-react-ui";
import styled from "styled-components";
import { useAuth } from "../../hooks/useAuth.js";
import { useEconomy } from "../../hooks/useEconomy.js";
import LockedMenuItem from "../LockedMenuItem.js";

export default function AccountPopover({ onOpenMissions }: { onOpenMissions?: () => void }) {
  const { user, googleClientId, isLoading, login, logout } = useAuth();
  const { coins, currentStreak } = useEconomy();

  return (
    <Popover>
      {!isLoading && user && (
        <AccountSummary
          user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl ?? undefined }}
          onLogout={logout}
          showEmail
          locale="en"
        />
      )}
      {!isLoading && user && onOpenMissions && (
        <MissionsTrigger>
          <StreakSummary>
            🪙 {coins} · 🔥 Day {currentStreak}
          </StreakSummary>
          <Button description="Missions" variant="quaternary" width="auto" onClick={onOpenMissions} />
        </MissionsTrigger>
      )}
      {!isLoading && !user && googleClientId && <GoogleSignInButton clientId={googleClientId} onCredential={login} />}
      {!isLoading && !user && !googleClientId && (
        <LockedMenuItem
          label="Log in with Google"
          hint="Login isn't configured on this server yet — missing GOOGLE_CLIENT_ID/DATABASE_URL/SESSION_SECRET."
        />
      )}
    </Popover>
  );
}

const Popover = styled.div`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
`;

const MissionsTrigger = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.gray};
`;

const StreakSummary = styled.span`
  font-size: 0.85em;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
  white-space: nowrap;
`;
