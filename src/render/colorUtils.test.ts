import test from "node:test";
import assert from "node:assert/strict";
import { lighten, mix } from "./colorUtils.js";

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

test("mix: amount=0 returns the first color", () => {
  assert.equal(mix("#3ddc46", "#e8443c", 0), "#3ddc46");
});

test("mix: amount=1 returns the second color", () => {
  assert.equal(mix("#3ddc46", "#e8443c", 1), "#e8443c");
});

test("mix: amount=0.5 falls halfway between both colors", () => {
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
});

test("mix: clamps amount outside [0,1]", () => {
  assert.equal(mix("#000000", "#ffffff", -1), "#000000");
  assert.equal(mix("#000000", "#ffffff", 2), "#ffffff");
});
