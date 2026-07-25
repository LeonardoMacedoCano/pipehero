import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTROL_ACTIONS,
  DEFAULT_ACTION_BINDINGS,
  bindingsEqual,
  actionForBinding,
  fretForBinding,
  isStarPowerBinding,
  describeKeyCode,
  describeBinding,
  type InputBinding,
} from "./keymap.js";

test("all 7 control actions have a unique default binding (no collision)", () => {
  const bindings = Object.values(DEFAULT_ACTION_BINDINGS);
  const serialized = bindings.map((b) => JSON.stringify(b));
  assert.equal(new Set(serialized).size, serialized.length);
  assert.equal(bindings.length, CONTROL_ACTIONS.length);
});

test("bindingsEqual: two keyboard bindings with the same code are equal", () => {
  const a: InputBinding = { source: "keyboard", code: "KeyA" };
  const b: InputBinding = { source: "keyboard", code: "KeyA" };
  assert.equal(bindingsEqual(a, b), true);
});

test("bindingsEqual: two gamepad bindings need the same deviceId and button", () => {
  const a: InputBinding = { source: "gamepad", deviceId: "Guitar", button: 2 };
  const b: InputBinding = { source: "gamepad", deviceId: "Guitar", button: 2 };
  const c: InputBinding = { source: "gamepad", deviceId: "Guitar", button: 3 };
  assert.equal(bindingsEqual(a, b), true);
  assert.equal(bindingsEqual(a, c), false);
});

test("bindingsEqual: different sources are never equal", () => {
  const keyboard: InputBinding = { source: "keyboard", code: "KeyA" };
  const gamepad: InputBinding = { source: "gamepad", deviceId: "Guitar", button: 0 };
  assert.equal(bindingsEqual(keyboard, gamepad), false);
});

test("bindingsEqual: null is only equal to null", () => {
  assert.equal(bindingsEqual(null, null), true);
  assert.equal(bindingsEqual(null, { source: "keyboard", code: "KeyA" }), false);
});

test("actionForBinding finds the action bound to a keyboard code", () => {
  assert.equal(actionForBinding({ source: "keyboard", code: "KeyA" }, DEFAULT_ACTION_BINDINGS), "fretGreen");
  assert.equal(actionForBinding({ source: "keyboard", code: "Space" }, DEFAULT_ACTION_BINDINGS), "fretOpen");
});

test("actionForBinding finds the action bound to a gamepad button", () => {
  const bindings = { ...DEFAULT_ACTION_BINDINGS, fretGreen: { source: "gamepad" as const, deviceId: "Guitar", button: 0 } };
  assert.equal(actionForBinding({ source: "gamepad", deviceId: "Guitar", button: 0 }, bindings), "fretGreen");
});

test("actionForBinding returns null for an unbound input", () => {
  assert.equal(actionForBinding({ source: "keyboard", code: "KeyQ" }, DEFAULT_ACTION_BINDINGS), null);
});

test("fretForBinding resolves the fret for a bound action, null otherwise", () => {
  assert.equal(fretForBinding({ source: "keyboard", code: "KeyA" }, DEFAULT_ACTION_BINDINGS), 0);
  assert.equal(fretForBinding({ source: "keyboard", code: "Space" }, DEFAULT_ACTION_BINDINGS), 7);
  assert.equal(fretForBinding({ source: "keyboard", code: "KeyQ" }, DEFAULT_ACTION_BINDINGS), null);
});

test("fretForBinding returns null for the starPower action (it has no fret)", () => {
  assert.equal(fretForBinding({ source: "keyboard", code: "ShiftLeft" }, DEFAULT_ACTION_BINDINGS), null);
});

test("isStarPowerBinding matches only the configured star power binding", () => {
  assert.equal(isStarPowerBinding({ source: "keyboard", code: "ShiftLeft" }, DEFAULT_ACTION_BINDINGS), true);
  assert.equal(isStarPowerBinding({ source: "keyboard", code: "ShiftRight" }, DEFAULT_ACTION_BINDINGS), false);
});

test("describeKeyCode gives human-readable names", () => {
  assert.equal(describeKeyCode("KeyA"), "A");
  assert.equal(describeKeyCode("Digit3"), "3");
  assert.equal(describeKeyCode("Space"), "Space");
  assert.equal(describeKeyCode("ShiftLeft"), "Left Shift");
  assert.equal(describeKeyCode("F1"), "F1");
});

test("describeBinding formats keyboard and gamepad bindings, and a null binding", () => {
  assert.equal(describeBinding({ source: "keyboard", code: "KeyA" }), "A");
  assert.equal(describeBinding({ source: "gamepad", deviceId: "Guitar", button: 0 }), "Button 1");
  assert.equal(describeBinding({ source: "gamepad", deviceId: "Guitar", button: 4 }), "Button 5");
  assert.equal(describeBinding(null), "—");
});
