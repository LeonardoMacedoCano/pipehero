import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DAILY_MISSIONS, evaluateScoreSubmissionMissions, type DailyMissionStats } from "./missions.js";

function baseStats(overrides: Partial<DailyMissionStats> = {}): DailyMissionStats {
  return { failed: false, stars: 0, isFirstStarForSongDifficulty: false, distinctSongsPlayedToday: 1, ...overrides };
}

const CODES = new Set(DAILY_MISSIONS.map((mission) => mission.code));

test("daily mission catalog has 5 unique, fully-populated entries", () => {
  assert.equal(DAILY_MISSIONS.length, 5);
  assert.equal(CODES.size, DAILY_MISSIONS.length);
  for (const mission of DAILY_MISSIONS) {
    assert.ok(mission.code.length > 0);
    assert.ok(mission.name.length > 0);
    assert.ok(mission.description.length > 0);
    assert.ok(mission.icon.length > 0);
    assert.ok(mission.rewardCoins > 0);
  }
});

test("every daily mission's name and description is documented in ECONOMY.md", () => {
  const docs = readFileSync(new URL("../../ECONOMY.md", import.meta.url), "utf-8");
  for (const mission of DAILY_MISSIONS) {
    assert.ok(
      docs.includes(mission.name),
      `ECONOMY.md is missing the name "${mission.name}" (code: ${mission.code}) — update the doc when the catalog changes.`
    );
    assert.ok(
      docs.includes(mission.description),
      `ECONOMY.md is missing the description for "${mission.name}" (code: ${mission.code}) — update the doc when the catalog changes.`
    );
  }
});

test("every submission always completes play_any_song", () => {
  assert.deepEqual(evaluateScoreSubmissionMissions(baseStats({ failed: true })), ["play_any_song"]);
});

test("failing a song does not complete no_fail_finish or three_star_song", () => {
  const completed = evaluateScoreSubmissionMissions(baseStats({ failed: true, stars: 0 }));
  assert.ok(!completed.includes("no_fail_finish"));
  assert.ok(!completed.includes("three_star_song"));
});

test("finishing without failing completes no_fail_finish", () => {
  const completed = evaluateScoreSubmissionMissions(baseStats({ failed: false, stars: 1 }));
  assert.ok(completed.includes("no_fail_finish"));
});

test("3+ stars completes three_star_song, below that does not", () => {
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ stars: 3 })).includes("three_star_song"));
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ stars: 5 })).includes("three_star_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ stars: 2 })).includes("three_star_song"));
});

test("3+ distinct songs today completes three_distinct_songs, below that does not", () => {
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ distinctSongsPlayedToday: 3 })).includes("three_distinct_songs"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ distinctSongsPlayedToday: 2 })).includes("three_distinct_songs"));
});

test("first_star_new_song only completes when the flag is set", () => {
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ isFirstStarForSongDifficulty: true })).includes("first_star_new_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ isFirstStarForSongDifficulty: false })).includes("first_star_new_song"));
});

test("a great run on a brand-new song completes every eligible mission at once", () => {
  const completed = evaluateScoreSubmissionMissions(
    baseStats({ failed: false, stars: 5, isFirstStarForSongDifficulty: true, distinctSongsPlayedToday: 3 })
  );
  assert.deepEqual(new Set(completed), new Set(["play_any_song", "no_fail_finish", "three_star_song", "three_distinct_songs", "first_star_new_song"]));
});
