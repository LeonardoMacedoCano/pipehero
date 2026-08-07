import { Panel, Tabs } from "lcano-react-ui";
import ControlsMappingPanel from "../components/ControlsMappingPanel.js";
import ThemeAppearancePanel from "../components/ThemeAppearancePanel.js";
import GraphicsSettingsPanel from "../components/GraphicsSettingsPanel.js";
import AccountTab from "../components/AccountTab.js";

export default function OptionsPage() {
  return (
    <Panel title="Options" maxWidth="680px">
      <Tabs
        tabs={[
          { label: "Controls", content: <ControlsMappingPanel /> },
          { label: "Appearance", content: <ThemeAppearancePanel /> },
          { label: "Graphics", content: <GraphicsSettingsPanel /> },
          { label: "Account", content: <AccountTab /> },
        ]}
      />
    </Panel>
  );
}
