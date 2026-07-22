import test from "node:test";
import assert from "node:assert/strict";
import { toChartTime, toAudioTime } from "./syncOffset.js";

test("offset 0 doesn't change the time (common case — most real charts)", () => {
  assert.equal(toChartTime(5.0, 0), 5.0);
  assert.equal(toAudioTime(5.0, 0), 5.0);
});

test("spec example: Offset = 0.56", () => {
  assert.equal(toChartTime(9.44, 0.56), 10.0);
  assert.equal(toAudioTime(10.0, 0.56), 9.44);
});

test("toChartTime and toAudioTime are inverses of each other", () => {
  const offset = 0.37;
  const original = 12.345;
  assert.ok(Math.abs(toAudioTime(toChartTime(original, offset), offset) - original) < 1e-9);
});
