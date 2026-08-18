import { AccountSummary } from "lcano-react-ui";
import { useAuth } from "../hooks/useAuth.js";
import LockedMenuItem from "./LockedMenuItem.js";
import CalibrationControl from "./CalibrationControl.js";

export default function AccountTab() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return null;

  return (
    <>
      {user ? (
        <AccountSummary
          user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl ?? undefined }}
          onLogout={logout}
          showEmail
          locale="en"
        />
      ) : (
        <LockedMenuItem label="Account" hint="Log in with Google from the menu to see your account here." />
      )}
      <CalibrationControl />
    </>
  );
}
