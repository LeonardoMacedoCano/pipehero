import { Button, Panel, Stack } from "lcano-react-ui";
import LockedMenuItem, { MENU_BUTTON_STYLE } from "../components/LockedMenuItem.js";
import GoogleSignInButton from "../components/GoogleSignInButton.js";
import AccountSummary from "../components/AccountSummary.js";
import { useAuth } from "../hooks/useAuth.js";

export default function MainMenuPage({
  onPlaySingleplayer,
  onOpenOptions,
  onOpenAchievements,
}: {
  onPlaySingleplayer: () => void;
  onOpenOptions: () => void;
  onOpenAchievements: () => void;
}) {
  const { user, googleClientId, isLoading, login, logout } = useAuth();

  return (
    <Panel title="PipeHero" maxWidth="480px">
      <Stack direction="column" gap="10px" style={{ padding: "12px 0" }}>
        <Button description="Single Player" variant="secondary" width="100%" onClick={onPlaySingleplayer} style={MENU_BUTTON_STYLE} />

        <LockedMenuItem
          label="Multiplayer"
          hint="Coming soon — depends on a multiplayer server, not implemented yet."
        />

        {!isLoading && user && <AccountSummary user={user} onLogout={logout} />}

        {!isLoading && !user && googleClientId && <GoogleSignInButton clientId={googleClientId} onCredential={login} />}

        {!isLoading && !user && !googleClientId && (
          <LockedMenuItem
            label="Log in with Google"
            hint="Login isn't configured on this server yet — missing GOOGLE_CLIENT_ID/DATABASE_URL/SESSION_SECRET."
          />
        )}

        <LockedMenuItem
          label="Friends"
          hint="Coming soon — depends on login and an account system, not implemented yet."
        />

        <Button description="Achievements" variant="secondary" width="100%" onClick={onOpenAchievements} style={MENU_BUTTON_STYLE} />

        <Button description="Options" variant="secondary" width="100%" onClick={onOpenOptions} style={MENU_BUTTON_STYLE} />
      </Stack>
    </Panel>
  );
}
