import { Button, Panel, Stack } from "lcano-react-ui";
import LockedMenuItem, { MENU_BUTTON_STYLE } from "../components/LockedMenuItem.js";

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
        <Button description="Um Jogador" variant="secondary" width="100%" onClick={onPlaySingleplayer} style={MENU_BUTTON_STYLE} />

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

        <Button description="Opções" variant="secondary" width="100%" onClick={onOpenOptions} style={MENU_BUTTON_STYLE} />
      </Stack>
    </Panel>
  );
}
