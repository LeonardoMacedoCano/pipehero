import { useEffect, useState, type CSSProperties } from "react";
import styled from "styled-components";
import { Button, ToggleSwitch } from "lcano-react-ui";
import {
  CONTROL_ACTIONS,
  bindingsEqual,
  describeBinding,
  type ControlAction,
  type InputBinding,
  type InputMode,
  type ThemeColorKey,
} from "../../game/keymap.js";
import {
  getBindings,
  setBinding,
  resetToDefaults,
  saveBindings,
  parseBindingsFromServer,
  type ActionBindings,
} from "../../game/keymapStore.js";
import { getStrumModeEnabled, setStrumModeEnabled } from "../../game/strumModeStore.js";
import type { ControlSchemeOverride } from "../../game/controlSchemeStore.js";
import { useGamepadPolling } from "../hooks/useGamepadPolling.js";
import { useSyncedPreference } from "../hooks/useSyncedPreference.js";
import { useControlScheme } from "../hooks/useControlScheme.js";

const COMPACT_BUTTON_STYLE: CSSProperties = { padding: "5px 14px" };

const SCHEME_OPTIONS: { value: ControlSchemeOverride; label: string }[] = [
  { value: "auto", label: "Automatic" },
  { value: "touch", label: "Touch" },
  { value: "keyboard", label: "Keyboard" },
];

export default function ControlsMappingPanel() {
  const { value: bindings, updateValue: setBindingsSynced } = useSyncedPreference<ActionBindings>({
    field: "keyBindings",
    get: getBindings,
    set: saveBindings,
    toPayload: (value) => value,
    fromPayload: parseBindingsFromServer,
  });
  const { value: strumModeEnabled, updateValue: setStrumModeSynced } = useSyncedPreference<boolean>({
    field: "strumModeEnabled",
    get: getStrumModeEnabled,
    set: setStrumModeEnabled,
    toPayload: (value) => value,
    fromPayload: (raw) => raw === true,
  });
  const [listeningAction, setListeningAction] = useState<ControlAction | null>(null);
  const [capturedBinding, setCapturedBinding] = useState<InputBinding | null>(null);
  const [conflictNote, setConflictNote] = useState<string | null>(null);
  const inputMode: InputMode = strumModeEnabled ? "strum" : "tap";

  const { preferences, updatePreferences } = useControlScheme();

  function changeInputMode(mode: InputMode) {
    setStrumModeSynced(mode === "strum");
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
    setBindingsSynced(setBinding(listeningAction, capturedBinding));
    setConflictNote(conflicting ? `Was also bound to "${conflicting.label}" — unbound.` : null);
    setListeningAction(null);
    setCapturedBinding(null);
  }

  function restoreDefaults() {
    setBindingsSynced(resetToDefaults());
    setListeningAction(null);
    setCapturedBinding(null);
    setConflictNote(null);
  }

  return (
    <Wrapper>
      <SectionTitle>Input device</SectionTitle>
      <ModeRow>
        <Label>Method</Label>
        <SegmentedGroup>
          {SCHEME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              description={option.label}
              variant={preferences.overrideScheme === option.value ? "success" : "secondary"}
              onClick={() => updatePreferences({ ...preferences, overrideScheme: option.value })}
              style={COMPACT_BUTTON_STYLE}
            />
          ))}
        </SegmentedGroup>
      </ModeRow>

      <SectionTitle>Key mapping</SectionTitle>
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
              <Swatch $colorKey={action.colorKey} />
              <Label>{action.label}</Label>

              {isCapturing ? (
                <RowActions>
                  <KeyBadge>{describeBinding(capturedBinding)}</KeyBadge>
                  <Button description="Confirm" variant="success" onClick={confirm} style={COMPACT_BUTTON_STYLE} />
                  <Button description="Cancel" variant="secondary" onClick={cancel} style={COMPACT_BUTTON_STYLE} />
                </RowActions>
              ) : isListening ? (
                <RowActions>
                  <Listening>Press a key or guitar button...</Listening>
                  <Button description="Cancel" variant="secondary" onClick={cancel} style={COMPACT_BUTTON_STYLE} />
                </RowActions>
              ) : (
                <RowActions>
                  <KeyBadge>{describeBinding(bindings[action.id])}</KeyBadge>
                  <Button description="Remap" variant="secondary" onClick={() => startListening(action.id)} style={COMPACT_BUTTON_STYLE} />
                </RowActions>
              )}
            </Row>
          );
        })}
      </List>

      {conflictNote && <Note>{conflictNote}</Note>}

      <Footer>
        <Button description="Restore defaults" variant="secondary" onClick={restoreDefaults} style={COMPACT_BUTTON_STYLE} />
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

const SectionTitle = styled.h3`
  margin: 4px 0 -4px;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.tertiary};

  &:first-child {
    margin-top: 0;
  }
`;

const SegmentedGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const Swatch = styled.span<{ $colorKey: ThemeColorKey }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: ${({ theme, $colorKey }) => theme.colors[$colorKey]};
`;

const Label = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.colors.white};
  font-weight: bold;
`;

const RowActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
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
