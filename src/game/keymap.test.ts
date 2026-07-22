import test from "node:test";
import assert from "node:assert/strict";
import type { Fret } from "../types.js";
import { fretForKeyCode, DEFAULT_KEY_BINDINGS } from "./keymap.js";

test("mapped keys return the correct fret", () => {
  assert.equal(fretForKeyCode("KeyA"), 0);
  assert.equal(fretForKeyCode("KeyS"), 1);
  assert.equal(fretForKeyCode("KeyJ"), 2);
  assert.equal(fretForKeyCode("KeyK"), 3);
  assert.equal(fretForKeyCode("KeyL"), 4);
  assert.equal(fretForKeyCode("Space"), 7);
});

test("unmapped key returns null", () => {
  assert.equal(fretForKeyCode("KeyQ"), null);
});

test("accepts custom bindings", () => {
  const custom: Record<string, Fret> = { KeyZ: 0 };
  assert.equal(fretForKeyCode("KeyZ", custom), 0);
  assert.equal(fretForKeyCode("KeyA", custom), null);
});

test("all 5 lanes + open note have a unique default binding (no collision)", () => {
  const frets = Object.values(DEFAULT_KEY_BINDINGS);
  assert.equal(new Set(frets).size, frets.length);
});
