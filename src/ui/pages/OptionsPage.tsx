import { Button, Panel, Tabs } from "lcano-react-ui";
import ControlsMappingPanel from "../components/ControlsMappingPanel.js";
import LockedMenuItem from "../components/LockedMenuItem.js";

export default function OptionsPage({ onBack }: { onBack: () => void }) {
  return (
    <Panel
      title="Opções"
      maxWidth="640px"
      actionButton={<Button description="« Menu" variant="secondary" onClick={onBack} />}
    >
      <Tabs
        tabs={[
          { label: "Controles", content: <ControlsMappingPanel /> },
          {
            label: "Conta",
            content: (
              <LockedMenuItem
                label="Conta"
                hint="Em breve — depende de login e sistema de contas, ainda não implementado."
              />
            ),
          },
        ]}
      />
    </Panel>
  );
}
