import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button, ToggleSwitch } from "lcano-react-ui";
import {
  CONTROL_ACTIONS,
  bindingsEqual,
  describeBinding,
  type ControlAction,
  type InputBinding,
  type InputMode,
} from "../../game/keymap.js";
import { getBindings, setBinding, resetToDefaults, type ActionBindings } from "../../game/keymapStore.js";
import { getStrumModeEnabled, setStrumModeEnabled } from "../../game/strumModeStore.js";
import { useGamepadPolling } from "../hooks/useGamepadPolling.js";

export default function ControlsMappingPanel() {
  const [bindings, setBindings] = useState<ActionBindings>(() => getBindings());
  const [listeningAction, setListeningAction] = useState<ControlAction | null>(null);
  const [capturedBinding, setCapturedBinding] = useState<InputBinding | null>(null);
  const [conflictNote, setConflictNote] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>(() => (getStrumModeEnabled() ? "strum" : "tap"));

  function changeInputMode(mode: InputMode) {
    setStrumModeEnabled(mode === "strum");
    setInputMode(mode);
  }

  useEffect(() => {
    if (!listeningAction || capturedBinding) return;

    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === "Escape") {
        setListeningAction(null);
        return;
      }
      setCapturedBinding({ source: "keyboard", code: event.code });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [listeningAction, capturedBinding]);

  useGamepadPolling(
    (edges) => {
      const first = edges.pressed[0];
      if (!first) return;
      setCapturedBinding({ source: "gamepad", deviceId: first.deviceId, button: first.button });
    },
    listeningAction !== null && capturedBinding === null
  );

  function startListening(action: ControlAction) {
    setListeningAction(action);
    setCapturedBinding(null);
    setConflictNote(null);
  }

  function cancel() {
    setListeningAction(null);
    setCapturedBinding(null);
  }

  function confirm() {
    if (!listeningAction || !capturedBinding) return;
    const conflicting = CONTROL_ACTIONS.find(
      (action) => action.id !== listeningAction && bindingsEqual(bindings[action.id], capturedBinding)
    );
    setBindings(setBinding(listeningAction, capturedBinding));
    setConflictNote(conflicting ? `Was also bound to "${conflicting.label}" — unbound.` : null);
    setListeningAction(null);
    setCapturedBinding(null);
  }

  function restoreDefaults() {
    setBindings(resetToDefaults());
    setListeningAction(null);
    setCapturedBinding(null);
    setConflictNote(null);
  }

  return (
    <Wrapper>
      <ModeRow>
        <Label>Input mode</Label>
        <ToggleSwitch<InputMode>
          optionA={{ label: "Tap", value: "tap" }}
          optionB={{ label: "Strum bar", value: "strum" }}
          value={inputMode}
          onChange={changeInputMode}
        />
      </ModeRow>

      <List>
        {CONTROL_ACTIONS.filter((action) => action.modes.includes(inputMode)).map((action) => {
          const isListening = listeningAction === action.id;
          const isCapturing = isListening && capturedBinding !== null;

          return (
            <Row key={action.id}>
              <Swatch style={{ backgroundColor: action.color }} />
              <Label>{action.label}</Label>

              {isCapturing ? (
                <RowActions>
                  <KeyBadge>{describeBinding(capturedBinding)}</KeyBadge>
                  <Button description="Confirm" variant="success" onClick={confirm} />
                  <Button description="Cancel" variant="secondary" onClick={cancel} />
                </RowActions>
              ) : isListening ? (
                <RowActions>
                  <Listening>Press a key or guitar button...</Listening>
                  <Button description="Cancel" variant="secondary" onClick={cancel} />
                </RowActions>
              ) : (
                <RowActions>
                  <KeyBadge>{describeBinding(bindings[action.id])}</KeyBadge>
                  <Button description="Remap" variant="secondary" onClick={() => startListening(action.id)} />
                </RowActions>
              )}
            </Row>
          );
        })}
      </List>

      {conflictNote && <Note>{conflictNote}</Note>}

      <Footer>
        <Button description="Restore defaults" variant="secondary" onClick={restoreDefaults} />
      </Footer>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const Swatch = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const Label = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.colors.white};
  font-weight: bold;
`;

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const KeyBadge = styled.span`
  min-width: 90px;
  text-align: center;
  padding: 4px 10px;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.tertiary};
  font-family: monospace;
`;

const Listening = styled.span`
  min-width: 160px;
  color: ${({ theme }) => theme.colors.info};
  font-style: italic;
`;

const Note = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.warning};
  font-size: 0.9em;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
`;
