import test from "node:test";
import assert from "node:assert/strict";
import { computeStreakUpdate, type StreakState } from "./economy.js";

function state(overrides: Partial<StreakState> = {}): StreakState {
  return { currentStreak: 0, longestStreak: 0, lastLoginDate: null, graceAvailable: true, ...overrides };
}

test("first login starts a streak of 1 and awards the base reward", () => {
  const result = computeStreakUpdate(state(), "2026-08-20");
  assert.equal(result.state.currentStreak, 1);
  assert.equal(result.state.longestStreak, 1);
  assert.equal(result.state.lastLoginDate, "2026-08-20");
  assert.equal(result.state.graceAvailable, true);
  assert.equal(result.coinsAwarded, 5);
  assert.equal(result.milestoneHit, null);
  assert.equal(result.alreadyCreditedToday, false);
});

test("checking in again the same day is a no-op", () => {
  const s = state({ currentStreak: 3, longestStreak: 3, lastLoginDate: "2026-08-20", graceAvailable: true });
  const result = computeStreakUpdate(s, "2026-08-20");
  assert.equal(result.alreadyCreditedToday, true);
  assert.equal(result.coinsAwarded, 0);
  assert.deepEqual(result.state, s);
});

test("consecutive day extends the streak and recharges the grace", () => {
  const s = state({ currentStreak: 1, longestStreak: 1, lastLoginDate: "2026-08-20", graceAvailable: false });
  const result = computeStreakUpdate(s, "2026-08-21");
  assert.equal(result.state.currentStreak, 2);
  assert.equal(result.state.longestStreak, 2);
  assert.equal(result.state.graceAvailable, true);
  assert.equal(result.streakSaved, false);
  assert.equal(result.alreadyCreditedToday, false);
});

test("missing exactly one day with grace available saves the streak", () => {
  const s = state({ currentStreak: 5, longestStreak: 8, lastLoginDate: "2026-08-20", graceAvailable: true });
  const result = computeStreakUpdate(s, "2026-08-22");
  assert.equal(result.state.currentStreak, 6);
  assert.equal(result.state.longestStreak, 8);
  assert.equal(result.state.graceAvailable, false);
  assert.equal(result.streakSaved, true);
  assert.equal(result.alreadyCreditedToday, false);
});

test("missing one day with grace already spent breaks the streak", () => {
  const s = state({ currentStreak: 5, longestStreak: 8, lastLoginDate: "2026-08-20", graceAvailable: false });
  const result = computeStreakUpdate(s, "2026-08-22");
  assert.equal(result.state.currentStreak, 1);
  assert.equal(result.state.longestStreak, 8);
  assert.equal(result.state.graceAvailable, true);
  assert.equal(result.streakSaved, false);
});

test("missing two or more days breaks the streak regardless of grace", () => {
  const s = state({ currentStreak: 10, longestStreak: 10, lastLoginDate: "2026-08-15", graceAvailable: true });
  const result = computeStreakUpdate(s, "2026-08-20");
  assert.equal(result.state.currentStreak, 1);
  assert.equal(result.state.graceAvailable, true);
  assert.equal(result.streakSaved, false);
});

test("milestones award a bonus on top of the base reward", () => {
  const milestoneDays: Array<[number, number]> = [
    [3, 5 + 15],
    [7, 5 + 30],
    [14, 5 + 60],
    [30, 5 + 150],
  ];
  for (const [streak, expectedCoins] of milestoneDays) {
    const s = state({ currentStreak: streak - 1, longestStreak: streak - 1, lastLoginDate: "2026-08-20", graceAvailable: true });
    const result = computeStreakUpdate(s, "2026-08-21");
    assert.equal(result.state.currentStreak, streak);
    assert.equal(result.coinsAwarded, expectedCoins, `streak ${streak}`);
    assert.equal(result.milestoneHit, streak, `streak ${streak}`);
  }
});

test("day 31 has no milestone bonus, but day 60 has the recurring bonus", () => {
  const s31 = state({ currentStreak: 30, longestStreak: 30, lastLoginDate: "2026-08-20", graceAvailable: true });
  const r31 = computeStreakUpdate(s31, "2026-08-21");
  assert.equal(r31.state.currentStreak, 31);
  assert.equal(r31.coinsAwarded, 5);
  assert.equal(r31.milestoneHit, null);

  const s60 = state({ currentStreak: 59, longestStreak: 59, lastLoginDate: "2026-08-20", graceAvailable: true });
  const r60 = computeStreakUpdate(s60, "2026-08-21");
  assert.equal(r60.state.currentStreak, 60);
  assert.equal(r60.coinsAwarded, 5 + 150);
  assert.equal(r60.milestoneHit, 60);
});

test("streak math works across a month/year boundary", () => {
  const s = state({ currentStreak: 4, longestStreak: 4, lastLoginDate: "2025-12-31", graceAvailable: true });
  const result = computeStreakUpdate(s, "2026-01-01");
  assert.equal(result.state.currentStreak, 5);
  assert.equal(result.streakSaved, false);
  assert.equal(result.alreadyCreditedToday, false);
});
