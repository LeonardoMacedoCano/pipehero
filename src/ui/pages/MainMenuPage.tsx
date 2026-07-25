import { Panel, Stack } from "lcano-react-ui";
import LockedMenuItem, { MenuItem, MenuItemLabel } from "../components/LockedMenuItem.js";

export default function MainMenuPage({
  onPlaySingleplayer,
  onOpenOptions,
}: {
  onPlaySingleplayer: () => void;
  onOpenOptions: () => void;
}) {
  return (
    <Panel title="PipeHero" maxWidth="480px">
      <Stack direction="column" gap="10px" style={{ padding: "12px 0" }}>
        <MenuItem type="button" onClick={onPlaySingleplayer}>
          <MenuItemLabel>Um Jogador</MenuItemLabel>
        </MenuItem>

        <LockedMenuItem
          label="Multijogador"
          hint="Em breve — depende de servidor multiplayer, ainda não implementado."
        />

        <LockedMenuItem
          label="Entrar com Google"
          hint="Em breve — depende de integração com login do Google, ainda não implementado."
        />

        <LockedMenuItem
          label="Amigos"
          hint="Em breve — depende de login e sistema de contas, ainda não implementado."
        />

        <LockedMenuItem
          label="Conquistas"
          hint="Em breve — vai mostrar suas conquistas e pontuação máxima por música, e comparar com amigos; depende de sistema de progresso salvo, ainda não implementado."
        />

        <MenuItem type="button" onClick={onOpenOptions}>
          <MenuItemLabel>Opções</MenuItemLabel>
        </MenuItem>
      </Stack>
    </Panel>
  );
}
