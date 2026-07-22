import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_JUDGMENT_WINDOWS, JUDGMENT_WINDOWS_BY_DIFFICULTY, classifyTiming, judgmentWindowsForDifficulty } from "./judge.js";

test("classifyTiming without an explicit window uses the default window (Expert)", () => {
  assert.equal(classifyTiming(0), "perfect");
  assert.equal(classifyTiming(0.035), "perfect");
  assert.equal(classifyTiming(0.036), "good");
  assert.equal(classifyTiming(0.09), "good");
  assert.equal(classifyTiming(0.091), "miss");
});

test("classifyTiming accepts a custom window (more forgiving difficulty)", () => {
  const easy = JUDGMENT_WINDOWS_BY_DIFFICULTY.Easy;
  assert.equal(classifyTiming(0.12, DEFAULT_JUDGMENT_WINDOWS), "miss");
  assert.equal(classifyTiming(0.12, easy), "good");
});

test("classifyTiming works the same for negative and positive deltas (uses absolute value)", () => {
  const windows = JUDGMENT_WINDOWS_BY_DIFFICULTY.Medium;
  assert.equal(classifyTiming(0.05, windows), classifyTiming(-0.05, windows));
});

test("JUDGMENT_WINDOWS_BY_DIFFICULTY has all 4 difficulties, each more forgiving than the last", () => {
  const { Expert, Hard, Medium, Easy } = JUDGMENT_WINDOWS_BY_DIFFICULTY;
  assert.ok(Expert.perfect < Hard.perfect && Hard.perfect < Medium.perfect && Medium.perfect < Easy.perfect);
  assert.ok(Expert.good < Hard.good && Hard.good < Medium.good && Medium.good < Easy.good);
});

test("DEFAULT_JUDGMENT_WINDOWS (default) equals the Expert window", () => {
  assert.deepEqual(DEFAULT_JUDGMENT_WINDOWS, JUDGMENT_WINDOWS_BY_DIFFICULTY.Expert);
});

test("judgmentWindowsForDifficulty resolves the right window per difficulty", () => {
  assert.deepEqual(judgmentWindowsForDifficulty("Easy"), JUDGMENT_WINDOWS_BY_DIFFICULTY.Easy);
  assert.deepEqual(judgmentWindowsForDifficulty("Expert"), JUDGMENT_WINDOWS_BY_DIFFICULTY.Expert);
});

test("judgmentWindowsForDifficulty without a difficulty (null/undefined) falls back to the default", () => {
  assert.deepEqual(judgmentWindowsForDifficulty(null), DEFAULT_JUDGMENT_WINDOWS);
  assert.deepEqual(judgmentWindowsForDifficulty(undefined), DEFAULT_JUDGMENT_WINDOWS);
});
