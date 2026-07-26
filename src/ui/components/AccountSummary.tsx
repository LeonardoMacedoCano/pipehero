import { Button, Stack } from "lcano-react-ui";
import type { AuthUser } from "../hooks/useAuth.js";

export default function AccountSummary({
  user,
  onLogout,
  showEmail,
}: {
  user: AuthUser;
  onLogout: () => void;
  showEmail?: boolean;
}) {
  return (
    <Stack direction="row" gap="10px" alignCenter justifyBetween style={{ padding: "10px 20px" }}>
      <Stack direction="row" gap="10px" alignCenter width="auto">
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt="" width={40} height={40} style={{ borderRadius: "50%", flexShrink: 0 }} />
        )}
        <Stack direction="column" gap="2px" width="auto">
          <span style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.name}
          </span>
          {showEmail && <span style={{ fontSize: "0.85em", opacity: 0.7 }}>{user.email}</span>}
        </Stack>
      </Stack>
      <Button description="Log out" variant="secondary" onClick={onLogout} />
    </Stack>
  );
}
