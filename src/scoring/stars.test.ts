import test from "node:test";
import assert from "node:assert/strict";
import { computeStars } from "./stars.js";

test("no notes in the chart is 0 stars, never divides by zero", () => {
  assert.equal(computeStars(0, 0), 0);
});

test("hitting the ideal score exactly is 5 stars", () => {
  assert.equal(computeStars(1000, 1000), 5);
});

test("beating the ideal score (e.g. via Star Power) is still capped at 5 stars", () => {
  assert.equal(computeStars(1800, 1000), 5);
});

test("star cutoffs follow the score/idealScore ratio", () => {
  assert.equal(computeStars(950, 1000), 5);
  assert.equal(computeStars(800, 1000), 4);
  assert.equal(computeStars(600, 1000), 3);
  assert.equal(computeStars(400, 1000), 2);
  assert.equal(computeStars(1, 1000), 1);
  assert.equal(computeStars(0, 1000), 0);
});
