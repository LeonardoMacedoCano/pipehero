import styled from "styled-components";
import { Button, Tabs } from "lcano-react-ui";
import ControlsMappingPanel from "../components/ControlsMappingPanel.js";
import LockedMenuItem from "../components/LockedMenuItem.js";

export default function OptionsPage({ onBack }: { onBack: () => void }) {
  return (
    <Screen>
      <TopBar>
        <Title>Opções</Title>
        <Button description="« Menu" variant="secondary" onClick={onBack} />
      </TopBar>

      <Content>
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
      </Content>
    </Screen>
  );
}

const Screen = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.black};
`;

const TopBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.colors.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.05em;
  color: ${({ theme }) => theme.colors.white};
`;

const Content = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
`;
