import { useAuth } from "../hooks/useAuth.js";
import AccountSummary from "./AccountSummary.js";
import LockedMenuItem from "./LockedMenuItem.js";
import CalibrationControl from "./CalibrationControl.js";

export default function AccountTab() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return null;

  return (
    <>
      {user ? (
        <AccountSummary user={user} onLogout={logout} showEmail />
      ) : (
        <LockedMenuItem label="Account" hint="Log in with Google from the main menu to see your account here." />
      )}
      <CalibrationControl />
    </>
  );
}
