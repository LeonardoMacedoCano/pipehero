import test from "node:test";
import assert from "node:assert/strict";
import { playMissClank } from "./missSound.js";

test("no-ops silently when there's no AudioContext (Node/test environment)", () => {
  assert.doesNotThrow(() => playMissClank());
});
