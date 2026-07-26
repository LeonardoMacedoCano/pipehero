import { Button, Panel, Stack } from "lcano-react-ui";
import LockedMenuItem, { MENU_BUTTON_STYLE } from "../components/LockedMenuItem.js";
import GoogleSignInButton from "../components/GoogleSignInButton.js";
import { useAuth } from "../hooks/useAuth.js";

export default function MainMenuPage({
  onPlaySingleplayer,
  onOpenOptions,
}: {
  onPlaySingleplayer: () => void;
  onOpenOptions: () => void;
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

        {!isLoading && user && (
          <Stack direction="row" gap="10px" alignCenter justifyBetween style={{ padding: "10px 20px" }}>
            <Stack direction="row" gap="10px" alignCenter width="auto">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  style={{ borderRadius: "50%", flexShrink: 0 }}
                />
              )}
              <span style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name}
              </span>
            </Stack>
            <Button description="Log out" variant="secondary" onClick={logout} />
          </Stack>
        )}

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

        <LockedMenuItem
          label="Achievements"
          hint="Coming soon — will show your achievements and high score per song, and let you compare with friends; depends on a saved-progress system, not implemented yet."
        />

        <Button description="Options" variant="secondary" width="100%" onClick={onOpenOptions} style={MENU_BUTTON_STYLE} />
      </Stack>
    </Panel>
  );
}
