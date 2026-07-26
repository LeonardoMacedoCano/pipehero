import { Button, Panel, Tabs } from "lcano-react-ui";
import ControlsMappingPanel from "../components/ControlsMappingPanel.js";
import AccountTab from "../components/AccountTab.js";

export default function OptionsPage({ onBack }: { onBack: () => void }) {
  return (
    <Panel
      title="Options"
      maxWidth="640px"
      actionButton={<Button description="« Menu" variant="secondary" onClick={onBack} />}
    >
      <Tabs
        tabs={[
          { label: "Controls", content: <ControlsMappingPanel /> },
          { label: "Account", content: <AccountTab /> },
        ]}
      />
    </Panel>
  );
}
