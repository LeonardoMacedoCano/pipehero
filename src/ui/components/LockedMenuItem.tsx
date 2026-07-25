import type { CSSProperties } from "react";
import { Button, useMessage } from "lcano-react-ui";

export const MENU_BUTTON_STYLE: CSSProperties = {
  justifyContent: "flex-start",
  padding: "16px 20px",
  borderRadius: "8px",
  fontWeight: "bold",
  fontSize: "1.1em",
};

export default function LockedMenuItem({ label, hint }: { label: string; hint: string }) {
  const { showInfo } = useMessage();

  return (
    <Button
      description={`${label}  🔒`}
      variant="secondary"
      width="100%"
      onClick={() => showInfo(hint)}
      style={{ ...MENU_BUTTON_STYLE, opacity: 0.55 }}
    />
  );
}
