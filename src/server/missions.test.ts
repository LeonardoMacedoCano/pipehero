import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DAILY_MISSIONS,
  WEEKLY_MISSIONS,
  evaluateScoreSubmissionMissions,
  evaluateScoreSubmissionWeeklyMissions,
  type DailyMissionStats,
  type WeeklyMissionStats,
} from "./missions.js";

function baseStats(overrides: Partial<DailyMissionStats> = {}): DailyMissionStats {
  return { failed: false, stars: 0, isFirstStarForSongDifficulty: false, ...overrides };
}

const CODES = new Set(DAILY_MISSIONS.map((mission) => mission.code));

test("daily mission catalog has 3 unique, fully-populated entries", () => {
  assert.equal(DAILY_MISSIONS.length, 3);
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

test("failing a song does not complete three_star_song", () => {
  const completed = evaluateScoreSubmissionMissions(baseStats({ failed: true, stars: 0 }));
  assert.ok(!completed.includes("three_star_song"));
});

test("3+ stars completes three_star_song, below that does not", () => {
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ stars: 3 })).includes("three_star_song"));
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ stars: 5 })).includes("three_star_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ stars: 2 })).includes("three_star_song"));
});

test("3+ stars on a failed run does not complete three_star_song", () => {
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ failed: true, stars: 5 })).includes("three_star_song"));
});

test("first_star_new_song only completes when the flag is set", () => {
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ isFirstStarForSongDifficulty: true })).includes("first_star_new_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ isFirstStarForSongDifficulty: false })).includes("first_star_new_song"));
});

test("a great run on a brand-new song completes every eligible daily mission at once", () => {
  const completed = evaluateScoreSubmissionMissions(baseStats({ failed: false, stars: 5, isFirstStarForSongDifficulty: true }));
  assert.deepEqual(new Set(completed), new Set(["play_any_song", "three_star_song", "first_star_new_song"]));
});

const WEEKLY_CODES = new Set(WEEKLY_MISSIONS.map((mission) => mission.code));

test("weekly mission catalog has 5 unique, fully-populated entries with a valid tier", () => {
  assert.equal(WEEKLY_MISSIONS.length, 5);
  assert.equal(WEEKLY_CODES.size, WEEKLY_MISSIONS.length);
  for (const mission of WEEKLY_MISSIONS) {
    assert.ok(mission.code.length > 0);
    assert.ok(mission.name.length > 0);
    assert.ok(mission.description.length > 0);
    assert.ok(mission.icon.length > 0);
    assert.ok(mission.rewardCoins > 0);
    assert.ok(["small", "medium", "large"].includes(mission.tier));
  }
});

test("the small tier has 3 missions (the days-played ladder plus the two migrated from daily)", () => {
  const smallCodes = WEEKLY_MISSIONS.filter((mission) => mission.tier === "small").map((mission) => mission.code);
  assert.deepEqual(
    new Set(smallCodes),
    new Set(["weekly_no_fail_finish", "weekly_three_distinct_songs", "weekly_play_2_days"])
  );
});

test("every weekly mission's name and description is documented in ECONOMY.md", () => {
  const docs = readFileSync(new URL("../../ECONOMY.md", import.meta.url), "utf-8");
  for (const mission of WEEKLY_MISSIONS) {
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

function weeklyStats(overrides: Partial<WeeklyMissionStats> = {}): WeeklyMissionStats {
  return { failed: false, distinctDaysPlayedThisWeek: 0, distinctSongsPlayedThisWeek: 0, ...overrides };
}

test("a non-failed submission completes weekly_no_fail_finish, a failed one does not", () => {
  assert.ok(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: false })).includes("weekly_no_fail_finish"));
  assert.ok(!evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: true })).includes("weekly_no_fail_finish"));
});

test("3+ distinct songs this week completes weekly_three_distinct_songs, below that does not", () => {
  assert.ok(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctSongsPlayedThisWeek: 3 })).includes("weekly_three_distinct_songs"));
  assert.ok(!evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctSongsPlayedThisWeek: 2 })).includes("weekly_three_distinct_songs"));
});

test("weekly play-day thresholds unlock at exactly 2, 4, and 6 distinct days played", () => {
  assert.deepEqual(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: true, distinctDaysPlayedThisWeek: 0 })), []);
  assert.deepEqual(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: true, distinctDaysPlayedThisWeek: 1 })), []);
  assert.deepEqual(
    evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: true, distinctDaysPlayedThisWeek: 2 })),
    ["weekly_play_2_days"]
  );
  assert.deepEqual(
    evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: true, distinctDaysPlayedThisWeek: 4 })),
    ["weekly_play_2_days", "weekly_play_4_days"]
  );
  assert.deepEqual(
    evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: true, distinctDaysPlayedThisWeek: 6 })),
    ["weekly_play_2_days", "weekly_play_4_days", "weekly_play_6_days"]
  );
  assert.deepEqual(
    evaluateScoreSubmissionWeeklyMissions(weeklyStats({ failed: true, distinctDaysPlayedThisWeek: 7 })),
    ["weekly_play_2_days", "weekly_play_4_days", "weekly_play_6_days"]
  );
});

test("a great week (no fail, 3+ distinct songs, 6+ distinct days) completes every weekly mission at once", () => {
  const completed = evaluateScoreSubmissionWeeklyMissions(
    weeklyStats({ failed: false, distinctSongsPlayedThisWeek: 3, distinctDaysPlayedThisWeek: 6 })
  );
  assert.deepEqual(
    new Set(completed),
    new Set(["weekly_no_fail_finish", "weekly_three_distinct_songs", "weekly_play_2_days", "weekly_play_4_days", "weekly_play_6_days"])
  );
});
