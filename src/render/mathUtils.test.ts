import test from "node:test";
import assert from "node:assert/strict";
import { clamp01, lerp } from "./mathUtils.js";

test("clamp01 keeps values already inside [0, 1]", () => {
  assert.equal(clamp01(0.42), 0.42);
});

test("clamp01 clamps values below 0 and above 1", () => {
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(3), 1);
});

test("lerp interpolates between from and to at t", () => {
  assert.equal(lerp(10, 20, 0.5), 15);
  assert.equal(lerp(-10, 10, 0.25), -5);
});

test("lerp clamps t outside [0, 1] before interpolating", () => {
  assert.equal(lerp(10, 20, -1), 10);
  assert.equal(lerp(10, 20, 2), 20);
});
