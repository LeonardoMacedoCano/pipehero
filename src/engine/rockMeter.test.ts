import test from "node:test";
import assert from "node:assert/strict";
import { rockTierFor } from "./rockMeter.js";

test("rockTierFor: below the critical threshold is 'critical' (GH3's flashing red)", () => {
  assert.equal(rockTierFor(0), "critical");
  assert.equal(rockTierFor(9.99), "critical");
});

test("rockTierFor: below the red threshold is 'red'", () => {
  assert.equal(rockTierFor(10), "red");
  assert.equal(rockTierFor(32.99), "red");
});

test("rockTierFor: below the yellow threshold is 'yellow', including the starting value of 50", () => {
  assert.equal(rockTierFor(33), "yellow");
  assert.equal(rockTierFor(50), "yellow");
  assert.equal(rockTierFor(65.99), "yellow");
});

test("rockTierFor: at or above the yellow threshold is 'green'", () => {
  assert.equal(rockTierFor(66), "green");
  assert.equal(rockTierFor(100), "green");
});
