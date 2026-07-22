import test from "node:test";
import assert from "node:assert/strict";
import { lighten } from "./colorUtils.js";

test("amount=0 returns the same color", () => {
  assert.equal(lighten("#3ddc46", 0), "#3ddc46");
});

test("amount=1 returns white", () => {
  assert.equal(lighten("#000000", 1), "#ffffff");
});

test("intermediate amount falls between the original color and white", () => {
  const result = lighten("#000000", 0.5);
  assert.equal(result, "#808080");
});

test("doesn't overflow byte bounds (0-255) even with an already light color", () => {
  const result = lighten("#f5d033", 0.5);
  assert.match(result, /^#[0-9a-f]{6}$/);
});
