import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACHIEVEMENTS,
  evaluateCompareUnlocks,
  evaluateFailureUnlocks,
  evaluateFriendAcceptedUnlocks,
  evaluateLoginUnlocks,
  evaluateScoreSubmissionUnlocks,
  evaluateSettingsUnlocks,
  isRockMeterSurvivor,
  type ScoreSubmissionStats,
} from "./achievements.js";

function baseStats(overrides: Partial<ScoreSubmissionStats> = {}): ScoreSubmissionStats {
  return {
    totalScoredCount: 2,
    distinctSongCount: 1,
    songHasAllDifficulties: false,
    scoredPairCount: 1,
    totalLibraryPairCount: 10,
    stars: 3,
    difficulty: "Medium",
    fullCombo: false,
    maxCombo: 10,
    starPowerPhraseBroken: [],
    survivedCritical: false,
    isLateNight: false,
    isGlobalRank1: false,
    ...overrides,
  };
}

const CODES = new Set(ACHIEVEMENTS.map((achievement) => achievement.code));

test("achievement catalog has 19 unique, fully-populated entries", () => {
  assert.equal(ACHIEVEMENTS.length, 19);
  assert.equal(CODES.size, ACHIEVEMENTS.length);
  for (const achievement of ACHIEVEMENTS) {
    assert.ok(achievement.code.length > 0);
    assert.ok(achievement.name.length > 0);
    assert.ok(achievement.description.length > 0);
    assert.ok(achievement.icon.length > 0);
  }
});

test("every achievement's name and description is documented in ACHIEVEMENTS.md", () => {
  const docs = readFileSync(new URL("../../ACHIEVEMENTS.md", import.meta.url), "utf-8");
  for (const achievement of ACHIEVEMENTS) {
    assert.ok(
      docs.includes(achievement.name),
      `ACHIEVEMENTS.md is missing the name "${achievement.name}" (code: ${achievement.code}) — update the doc when the catalog changes.`
    );
    assert.ok(
      docs.includes(achievement.description),
      `ACHIEVEMENTS.md is missing the description for "${achievement.name}" (code: ${achievement.code}) — update the doc when the catalog changes.`
    );
  }
});

test("a neutral score submission unlocks nothing", () => {
  assert.deepEqual(evaluateScoreSubmissionUnlocks(baseStats()), []);
});

test("first_song unlocks only on the first ever score", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ totalScoredCount: 1 })).includes("first_song"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ totalScoredCount: 2 })).includes("first_song"));
});

test("perfect_run unlocks on a full combo", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ fullCombo: true })).includes("perfect_run"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ fullCombo: false })).includes("perfect_run"));
});

test("setlist_regular unlocks at 5 distinct songs", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ distinctSongCount: 5 })).includes("setlist_regular"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ distinctSongCount: 4 })).includes("setlist_regular"));
});

test("difficulty_master unlocks when a song has all 4 difficulties scored", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ songHasAllDifficulties: true })).includes("difficulty_master"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ songHasAllDifficulties: false })).includes("difficulty_master"));
});

test("five_star unlocks at 5 stars on any difficulty", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ stars: 5 })).includes("five_star"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ stars: 4 })).includes("five_star"));
});

test("expert_five_star unlocks only at 5 stars on Expert", () => {
  const onExpert = evaluateScoreSubmissionUnlocks(baseStats({ stars: 5, difficulty: "Expert" }));
  assert.ok(onExpert.includes("expert_five_star"));
  assert.ok(onExpert.includes("five_star"));

  const onMedium = evaluateScoreSubmissionUnlocks(baseStats({ stars: 5, difficulty: "Medium" }));
  assert.ok(!onMedium.includes("expert_five_star"));
});

test("star_power_first_use unlocks when at least one phrase was collected", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ starPowerPhraseBroken: [false] })).includes("star_power_first_use"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ starPowerPhraseBroken: [true] })).includes("star_power_first_use"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ starPowerPhraseBroken: [] })).includes("star_power_first_use"));
});

test("star_power_flawless unlocks only when no phrase was ever broken and at least one existed", () => {
  assert.ok(
    evaluateScoreSubmissionUnlocks(baseStats({ starPowerPhraseBroken: [false, false] })).includes("star_power_flawless")
  );
  assert.ok(
    !evaluateScoreSubmissionUnlocks(baseStats({ starPowerPhraseBroken: [false, true] })).includes("star_power_flawless")
  );
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ starPowerPhraseBroken: [] })).includes("star_power_flawless"));
});

test("rock_meter_survivor unlocks when the run survived a critical Rock Meter dip", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ survivedCritical: true })).includes("rock_meter_survivor"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ survivedCritical: false })).includes("rock_meter_survivor"));
});

test("isRockMeterSurvivor requires a critical dip without failing", () => {
  assert.equal(isRockMeterSurvivor(5, false), true);
  assert.equal(isRockMeterSurvivor(9.9, false), true);
  assert.equal(isRockMeterSurvivor(10, false), false);
  assert.equal(isRockMeterSurvivor(5, true), false);
  assert.equal(isRockMeterSurvivor(50, false), false);
});

test("combo_100 and combo_300 unlock at their respective combo thresholds", () => {
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ maxCombo: 99 })).includes("combo_100"));
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ maxCombo: 100 })).includes("combo_100"));

  const at299 = evaluateScoreSubmissionUnlocks(baseStats({ maxCombo: 299 }));
  assert.ok(at299.includes("combo_100"));
  assert.ok(!at299.includes("combo_300"));

  const at300 = evaluateScoreSubmissionUnlocks(baseStats({ maxCombo: 300 }));
  assert.ok(at300.includes("combo_100"));
  assert.ok(at300.includes("combo_300"));
});

test("completionist unlocks only once every library pair is scored, and never against an empty library", () => {
  assert.ok(
    evaluateScoreSubmissionUnlocks(baseStats({ scoredPairCount: 10, totalLibraryPairCount: 10 })).includes("completionist")
  );
  assert.ok(
    !evaluateScoreSubmissionUnlocks(baseStats({ scoredPairCount: 9, totalLibraryPairCount: 10 })).includes("completionist")
  );
  assert.ok(
    !evaluateScoreSubmissionUnlocks(baseStats({ scoredPairCount: 0, totalLibraryPairCount: 0 })).includes("completionist")
  );
});

test("night_owl unlocks only for late-night submissions", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ isLateNight: true })).includes("night_owl"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ isLateNight: false })).includes("night_owl"));
});

test("global_first unlocks only when the submission puts the player at rank 1", () => {
  assert.ok(evaluateScoreSubmissionUnlocks(baseStats({ isGlobalRank1: true })).includes("global_first"));
  assert.ok(!evaluateScoreSubmissionUnlocks(baseStats({ isGlobalRank1: false })).includes("global_first"));
});

test("login/settings/failure triggers each resolve to a single known code", () => {
  assert.deepEqual(evaluateLoginUnlocks(), ["first_login"]);
  assert.deepEqual(evaluateSettingsUnlocks(), ["personal_touch"]);
  assert.deepEqual(evaluateFailureUnlocks(), ["first_fail"]);
});

test("evaluateFriendAcceptedUnlocks always resolves to squad_goals", () => {
  assert.deepEqual(evaluateFriendAcceptedUnlocks(), ["squad_goals"]);
});

test("evaluateCompareUnlocks unlocks friendly_rival only with more wins and at least 3 compared rows", () => {
  assert.deepEqual(evaluateCompareUnlocks(3, 1, 4), ["friendly_rival"]);
  assert.deepEqual(evaluateCompareUnlocks(2, 1, 2), []);
  assert.deepEqual(evaluateCompareUnlocks(1, 3, 4), []);
  assert.deepEqual(evaluateCompareUnlocks(2, 2, 4), []);
});

test("every code produced by the evaluators exists in the catalog", () => {
  const produced = [
    ...evaluateScoreSubmissionUnlocks(
      baseStats({
        totalScoredCount: 1,
        fullCombo: true,
        distinctSongCount: 5,
        songHasAllDifficulties: true,
        stars: 5,
        difficulty: "Expert",
        starPowerPhraseBroken: [false, false],
        survivedCritical: true,
        maxCombo: 300,
        scoredPairCount: 10,
        totalLibraryPairCount: 10,
        isLateNight: true,
        isGlobalRank1: true,
      })
    ),
    ...evaluateLoginUnlocks(),
    ...evaluateSettingsUnlocks(),
    ...evaluateFailureUnlocks(),
    ...evaluateFriendAcceptedUnlocks(),
    ...evaluateCompareUnlocks(3, 0, 3),
  ];
  for (const code of produced) assert.ok(CODES.has(code), `unknown achievement code: ${code}`);
});
