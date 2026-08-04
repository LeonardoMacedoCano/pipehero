import styled from "styled-components";
import { useAuth } from "../../hooks/useAuth.js";
import AccountSummary from "../AccountSummary.js";
import GoogleSignInButton from "../GoogleSignInButton.js";
import LockedMenuItem from "../LockedMenuItem.js";

export default function AccountPopover() {
  const { user, googleClientId, isLoading, login, logout } = useAuth();

  return (
    <Popover>
      {!isLoading && user && <AccountSummary user={user} onLogout={logout} showEmail />}
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
