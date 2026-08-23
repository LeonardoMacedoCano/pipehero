import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DAILY_MISSIONS_PER_DAY,
  DAILY_MISSION_POOL,
  WEEKLY_MISSIONS,
  computeMissionProgress,
  evaluateScoreSubmissionMissions,
  evaluateScoreSubmissionWeeklyMissions,
  selectDailyMissions,
  type DailyMissionStats,
  type MissionDefinition,
  type WeeklyMissionDefinition,
  type WeeklyMissionStats,
} from "./missions.js";

function baseStats(overrides: Partial<DailyMissionStats> = {}): DailyMissionStats {
  return {
    failed: false,
    stars: 0,
    isFirstStarForSongDifficulty: false,
    isHardOrExpert: false,
    distinctSongsPlayedToday: 0,
    fullCombo: false,
    ...overrides,
  };
}

const ALL_POOL_CODES = new Set(DAILY_MISSION_POOL.map((mission) => mission.code));

function activeCodes(...codes: string[]): Set<string> {
  return new Set(codes);
}

test("daily mission pool has 7 unique, fully-populated entries", () => {
  assert.equal(DAILY_MISSION_POOL.length, 7);
  assert.equal(ALL_POOL_CODES.size, DAILY_MISSION_POOL.length);
  for (const mission of DAILY_MISSION_POOL) {
    assert.ok(mission.code.length > 0);
    assert.ok(mission.name.length > 0);
    assert.ok(mission.description.length > 0);
    assert.ok(mission.icon.length > 0);
    assert.ok(mission.rewardCoins > 0);
  }
});

test("every daily mission's name and description is documented in ECONOMY.md", () => {
  const docs = readFileSync(new URL("../../ECONOMY.md", import.meta.url), "utf-8");
  for (const mission of DAILY_MISSION_POOL) {
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

test("selectDailyMissions picks DAILY_MISSIONS_PER_DAY unique missions from the pool", () => {
  const picked = selectDailyMissions(1, "2026-08-22");
  assert.equal(picked.length, DAILY_MISSIONS_PER_DAY);
  assert.equal(new Set(picked.map((mission) => mission.code)).size, picked.length);
  for (const mission of picked) assert.ok(ALL_POOL_CODES.has(mission.code));
});

test("selectDailyMissions is deterministic for the same user and day", () => {
  const a = selectDailyMissions(42, "2026-08-22").map((mission) => mission.code);
  const b = selectDailyMissions(42, "2026-08-22").map((mission) => mission.code);
  assert.deepEqual(a, b);
});

test("selectDailyMissions varies across different users on the same day", () => {
  const combos = new Set(
    Array.from({ length: 10 }, (_, userId) => selectDailyMissions(userId, "2026-08-22").map((mission) => mission.code).join(","))
  );
  assert.ok(combos.size > 1, "expected variety across different users on the same day");
});

test("evaluateScoreSubmissionMissions only completes missions that are active today", () => {
  const completed = evaluateScoreSubmissionMissions(baseStats({ stars: 5 }), activeCodes("first_star_new_song"));
  assert.deepEqual(completed, []);
});

test("play_any_song completes on a clean finish but not on a failed run", () => {
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ failed: false }), activeCodes("play_any_song")).includes("play_any_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ failed: true }), activeCodes("play_any_song")).includes("play_any_song"));
});

test("four_star_song requires 4+ stars and no fail", () => {
  const active = activeCodes("four_star_song");
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ stars: 4 }), active).includes("four_star_song"));
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ stars: 5 }), active).includes("four_star_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ stars: 3 }), active).includes("four_star_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ stars: 5, failed: true }), active).includes("four_star_song"));
});

test("five_star_song requires a perfect 5 stars and no fail", () => {
  const active = activeCodes("five_star_song");
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ stars: 5 }), active).includes("five_star_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ stars: 4 }), active).includes("five_star_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ stars: 5, failed: true }), active).includes("five_star_song"));
});

test("first_star_new_song only completes when the flag is set", () => {
  const active = activeCodes("first_star_new_song");
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ isFirstStarForSongDifficulty: true }), active).includes("first_star_new_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ isFirstStarForSongDifficulty: false }), active).includes("first_star_new_song"));
});

test("hard_or_expert_clear requires Hard/Expert difficulty and no fail", () => {
  const active = activeCodes("hard_or_expert_clear");
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ isHardOrExpert: true }), active).includes("hard_or_expert_clear"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ isHardOrExpert: false }), active).includes("hard_or_expert_clear"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ isHardOrExpert: true, failed: true }), active).includes("hard_or_expert_clear"));
});

test("three_songs_today requires 3+ distinct songs played today", () => {
  const active = activeCodes("three_songs_today");
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ distinctSongsPlayedToday: 3 }), active).includes("three_songs_today"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ distinctSongsPlayedToday: 2 }), active).includes("three_songs_today"));
});

test("full_combo_song requires a full combo and no fail", () => {
  const active = activeCodes("full_combo_song");
  assert.ok(evaluateScoreSubmissionMissions(baseStats({ fullCombo: true }), active).includes("full_combo_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ fullCombo: false }), active).includes("full_combo_song"));
  assert.ok(!evaluateScoreSubmissionMissions(baseStats({ fullCombo: true, failed: true }), active).includes("full_combo_song"));
});

test("a great run on a brand-new song completes every eligible active daily mission at once", () => {
  const active = activeCodes("play_any_song", "four_star_song", "five_star_song", "first_star_new_song", "hard_or_expert_clear");
  const completed = evaluateScoreSubmissionMissions(
    baseStats({ failed: false, stars: 5, isFirstStarForSongDifficulty: true, isHardOrExpert: true }),
    active
  );
  assert.deepEqual(
    new Set(completed),
    new Set(["play_any_song", "four_star_song", "five_star_song", "first_star_new_song", "hard_or_expert_clear"])
  );
});

function dailyMission(code: string): MissionDefinition {
  const mission = DAILY_MISSION_POOL.find((candidate) => candidate.code === code);
  assert.ok(mission, `expected a daily mission with code "${code}"`);
  return mission!;
}

test("three_songs_today has a progress spec, other daily missions don't (they're single-run, not cumulative)", () => {
  assert.deepEqual(
    computeMissionProgress(dailyMission("three_songs_today"), { distinctSongsPlayedToday: 0 }),
    { current: 0, target: 3 }
  );
  assert.deepEqual(
    computeMissionProgress(dailyMission("three_songs_today"), { distinctSongsPlayedToday: 1 }),
    { current: 1, target: 3 }
  );
  assert.deepEqual(
    computeMissionProgress(dailyMission("three_songs_today"), { distinctSongsPlayedToday: 5 }),
    { current: 3, target: 3 }
  );
  assert.equal(computeMissionProgress(dailyMission("play_any_song"), { distinctSongsPlayedToday: 5 }), null);
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

test("each tier has the expected missions", () => {
  const codesByTier = (tier: "small" | "medium" | "large") =>
    new Set(WEEKLY_MISSIONS.filter((mission) => mission.tier === tier).map((mission) => mission.code));
  assert.deepEqual(codesByTier("small"), new Set(["weekly_play_2_days", "weekly_full_combo_once"]));
  assert.deepEqual(codesByTier("medium"), new Set(["weekly_play_4_days", "weekly_hard_expert_no_fail"]));
  assert.deepEqual(codesByTier("large"), new Set(["weekly_play_6_days"]));
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
  return { failed: false, distinctDaysPlayedThisWeek: 0, isHardOrExpert: false, fullCombo: false, ...overrides };
}

test("weekly_play_2_days and weekly_play_4_days unlock at exactly 2 and 4 distinct days played", () => {
  assert.deepEqual(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctDaysPlayedThisWeek: 0 })), []);
  assert.deepEqual(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctDaysPlayedThisWeek: 1 })), []);
  assert.deepEqual(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctDaysPlayedThisWeek: 2 })), ["weekly_play_2_days"]);
  assert.deepEqual(
    evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctDaysPlayedThisWeek: 4 })),
    ["weekly_play_2_days", "weekly_play_4_days"]
  );
});

test("weekly_full_combo_once requires a full combo and no fail, any day this week", () => {
  assert.ok(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ fullCombo: true })).includes("weekly_full_combo_once"));
  assert.ok(!evaluateScoreSubmissionWeeklyMissions(weeklyStats({ fullCombo: false })).includes("weekly_full_combo_once"));
  assert.ok(!evaluateScoreSubmissionWeeklyMissions(weeklyStats({ fullCombo: true, failed: true })).includes("weekly_full_combo_once"));
});

test("weekly_hard_expert_no_fail requires Hard/Expert difficulty and no fail, any day this week", () => {
  assert.ok(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ isHardOrExpert: true })).includes("weekly_hard_expert_no_fail"));
  assert.ok(!evaluateScoreSubmissionWeeklyMissions(weeklyStats({ isHardOrExpert: false })).includes("weekly_hard_expert_no_fail"));
  assert.ok(
    !evaluateScoreSubmissionWeeklyMissions(weeklyStats({ isHardOrExpert: true, failed: true })).includes("weekly_hard_expert_no_fail")
  );
});

test("weekly_play_6_days unlocks at 6+ distinct days played, regardless of full combo", () => {
  assert.ok(!evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctDaysPlayedThisWeek: 5 })).includes("weekly_play_6_days"));
  assert.ok(evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctDaysPlayedThisWeek: 6 })).includes("weekly_play_6_days"));
  assert.deepEqual(
    evaluateScoreSubmissionWeeklyMissions(weeklyStats({ distinctDaysPlayedThisWeek: 6 })),
    ["weekly_play_2_days", "weekly_play_4_days", "weekly_play_6_days"]
  );
});

test("a great week (6+ distinct days, full combo, Hard/Expert clear, no fail) completes every weekly mission at once", () => {
  const completed = evaluateScoreSubmissionWeeklyMissions(
    weeklyStats({ failed: false, distinctDaysPlayedThisWeek: 6, isHardOrExpert: true, fullCombo: true })
  );
  assert.deepEqual(
    new Set(completed),
    new Set(["weekly_play_2_days", "weekly_full_combo_once", "weekly_play_4_days", "weekly_hard_expert_no_fail", "weekly_play_6_days"])
  );
});

function weeklyMission(code: string): WeeklyMissionDefinition {
  const mission = WEEKLY_MISSIONS.find((candidate) => candidate.code === code);
  assert.ok(mission, `expected a weekly mission with code "${code}"`);
  return mission!;
}

test("weekly_full_combo_once and weekly_hard_expert_no_fail have no progress, since they aren't quantity-based", () => {
  assert.equal(computeMissionProgress(weeklyMission("weekly_full_combo_once"), weeklyStats()), null);
  assert.equal(computeMissionProgress(weeklyMission("weekly_hard_expert_no_fail"), weeklyStats()), null);
});

test("progress for the days-played ladder tracks distinctDaysPlayedThisWeek, capped at the target", () => {
  const stats = weeklyStats({ distinctDaysPlayedThisWeek: 3 });
  assert.deepEqual(computeMissionProgress(weeklyMission("weekly_play_4_days"), stats), { current: 3, target: 4 });
  assert.deepEqual(computeMissionProgress(weeklyMission("weekly_play_6_days"), stats), { current: 3, target: 6 });
  assert.deepEqual(
    computeMissionProgress(weeklyMission("weekly_play_6_days"), weeklyStats({ distinctDaysPlayedThisWeek: 9 })),
    { current: 6, target: 6 }
  );
});
