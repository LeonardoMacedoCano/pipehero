import { AccountSummary, GoogleSignInButton } from "lcano-react-ui";
import styled from "styled-components";
import { useAuth } from "../../hooks/useAuth.js";
import { useShop } from "../../hooks/useShop.js";
import LockedMenuItem from "../LockedMenuItem.js";
import ProfileHeader from "./ProfileHeader.js";

export default function AccountPopover() {
  const { user, googleClientId, isLoading, login, logout } = useAuth();
  const { equipped } = useShop();

  return (
    <Popover>
      {!isLoading && user && (
        <>
          <ProfileHeader
            name={user.name}
            equippedAvatarId={equipped.avatarId}
            equippedBorderId={equipped.borderId}
            equippedBackgroundId={equipped.backgroundId}
            equippedTagId={equipped.tagId}
            showName={false}
          />
          <AccountSummary user={{ name: user.name, email: user.email }} onLogout={logout} showEmail locale="en" />
        </>
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
