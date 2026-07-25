import test from "node:test";
import assert from "node:assert/strict";
import { getBindings, setBinding, resetToDefaults } from "./keymapStore.js";
import { DEFAULT_ACTION_BINDINGS, type InputBinding } from "./keymap.js";

function withFakeLocalStorage(fn: () => void): void {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => store.set(key, String(value)),
  } as unknown as Storage;
  try {
    fn();
  } finally {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  }
}

const KEY_Z: InputBinding = { source: "keyboard", code: "KeyZ" };
const GAMEPAD_BUTTON_0: InputBinding = { source: "gamepad", deviceId: "Fake Guitar", button: 0 };

test("without localStorage (non-browser environment), returns the defaults without breaking", () => {
  assert.deepEqual(getBindings(), DEFAULT_ACTION_BINDINGS);
});

test("no value saved yet, returns the defaults", () => {
  withFakeLocalStorage(() => {
    assert.deepEqual(getBindings(), DEFAULT_ACTION_BINDINGS);
  });
});

test("setBinding/getBindings round-trip with a keyboard binding", () => {
  withFakeLocalStorage(() => {
    setBinding("fretGreen", KEY_Z);
    assert.deepEqual(getBindings().fretGreen, KEY_Z);
  });
});

test("setBinding/getBindings round-trip with a gamepad binding", () => {
  withFakeLocalStorage(() => {
    setBinding("fretGreen", GAMEPAD_BUTTON_0);
    assert.deepEqual(getBindings().fretGreen, GAMEPAD_BUTTON_0);
  });
});

test("setBinding unbinds the action that previously used that input", () => {
  withFakeLocalStorage(() => {
    setBinding("fretGreen", GAMEPAD_BUTTON_0);
    setBinding("fretRed", GAMEPAD_BUTTON_0);
    const bindings = getBindings();
    assert.deepEqual(bindings.fretRed, GAMEPAD_BUTTON_0);
    assert.equal(bindings.fretGreen, null);
  });
});

test("resetToDefaults restores the default bindings", () => {
  withFakeLocalStorage(() => {
    setBinding("fretGreen", KEY_Z);
    resetToDefaults();
    assert.deepEqual(getBindings(), DEFAULT_ACTION_BINDINGS);
  });
});

test("corrupted value in localStorage doesn't break, returns the defaults", () => {
  withFakeLocalStorage(() => {
    globalThis.localStorage.setItem("pipehero:keyBindings", "not-json");
    assert.deepEqual(getBindings(), DEFAULT_ACTION_BINDINGS);
  });
});

test("old (pre-gamepad) plain-string binding format falls back to the default for that action", () => {
  withFakeLocalStorage(() => {
    globalThis.localStorage.setItem("pipehero:keyBindings", JSON.stringify({ fretGreen: "KeyZ" }));
    assert.deepEqual(getBindings().fretGreen, DEFAULT_ACTION_BINDINGS.fretGreen);
  });
});

test("a malformed gamepad entry (missing button) falls back to the default for that action", () => {
  withFakeLocalStorage(() => {
    globalThis.localStorage.setItem(
      "pipehero:keyBindings",
      JSON.stringify({ fretGreen: { source: "gamepad", deviceId: "Guitar" } })
    );
    assert.deepEqual(getBindings().fretGreen, DEFAULT_ACTION_BINDINGS.fretGreen);
  });
});
