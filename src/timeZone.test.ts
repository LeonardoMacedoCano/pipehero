import test from "node:test";
import assert from "node:assert/strict";
import {
  dateStringInTimeZone,
  isValidTimeZone,
  nextDailyResetMs,
  nextWeeklyResetMs,
  resolveConfiguredTimeZone,
  weekStartDateStringInTimeZone,
} from "./timeZone.js";

test("isValidTimeZone accepts real IANA zones and UTC, rejects garbage", () => {
  assert.ok(isValidTimeZone("UTC"));
  assert.ok(isValidTimeZone("America/Sao_Paulo"));
  assert.ok(isValidTimeZone("Asia/Tokyo"));
  assert.ok(!isValidTimeZone("Not/A_Zone"));
  assert.ok(!isValidTimeZone(""));
});

test("resolveConfiguredTimeZone defaults to UTC when unset or blank, with no warning", () => {
  assert.deepEqual(resolveConfiguredTimeZone(undefined), { timeZone: "UTC", warning: null });
  assert.deepEqual(resolveConfiguredTimeZone(""), { timeZone: "UTC", warning: null });
  assert.deepEqual(resolveConfiguredTimeZone("   "), { timeZone: "UTC", warning: null });
});

test("resolveConfiguredTimeZone accepts a valid zone as-is", () => {
  assert.deepEqual(resolveConfiguredTimeZone("America/Sao_Paulo"), { timeZone: "America/Sao_Paulo", warning: null });
  assert.deepEqual(resolveConfiguredTimeZone("  Asia/Tokyo  "), { timeZone: "Asia/Tokyo", warning: null });
});

test("resolveConfiguredTimeZone falls back to UTC with a warning for an invalid zone", () => {
  const resolved = resolveConfiguredTimeZone("Mars/Olympus_Mons");
  assert.equal(resolved.timeZone, "UTC");
  assert.ok(resolved.warning?.includes("Mars/Olympus_Mons"));
});

test("dateStringInTimeZone can disagree across zones for the same instant", () => {
  const instant = new Date("2026-08-22T23:30:00Z");
  assert.equal(dateStringInTimeZone(instant, "UTC"), "2026-08-22");
  assert.equal(dateStringInTimeZone(instant, "Asia/Tokyo"), "2026-08-23");
  assert.equal(dateStringInTimeZone(instant, "America/Sao_Paulo"), "2026-08-22");
});

test("weekStartDateStringInTimeZone returns the Sunday that starts the calendar week", () => {
  const wednesday = new Date("2026-08-19T12:00:00Z");
  assert.equal(weekStartDateStringInTimeZone(wednesday, "UTC"), "2026-08-16");
  const monday = new Date("2026-08-17T00:00:01Z");
  assert.equal(weekStartDateStringInTimeZone(monday, "UTC"), "2026-08-16");
  const saturday = new Date("2026-08-22T23:00:00Z");
  assert.equal(weekStartDateStringInTimeZone(saturday, "UTC"), "2026-08-16");
  const sunday = new Date("2026-08-23T00:00:01Z");
  assert.equal(weekStartDateStringInTimeZone(sunday, "UTC"), "2026-08-23");
});

test("nextDailyResetMs lands on the next local midnight, converted to a UTC instant", () => {
  const now = new Date("2026-08-22T19:55:00Z");
  assert.equal(new Date(nextDailyResetMs(now, "UTC")).toISOString(), "2026-08-23T00:00:00.000Z");
  assert.equal(new Date(nextDailyResetMs(now, "America/Sao_Paulo")).toISOString(), "2026-08-23T03:00:00.000Z");
  assert.equal(new Date(nextDailyResetMs(now, "Asia/Kolkata")).toISOString(), "2026-08-23T18:30:00.000Z");
});

test("nextWeeklyResetMs lands on next Sunday local midnight, 7 days after this week's Sunday", () => {
  const wednesday = new Date("2026-08-19T12:00:00Z");
  assert.equal(new Date(nextWeeklyResetMs(wednesday, "UTC")).toISOString(), "2026-08-23T00:00:00.000Z");
  assert.equal(new Date(nextWeeklyResetMs(wednesday, "America/Sao_Paulo")).toISOString(), "2026-08-23T03:00:00.000Z");
});

test("nextDailyResetMs is always in the future relative to the instant it's computed from", () => {
  const now = new Date();
  for (const tz of ["UTC", "America/Sao_Paulo", "Asia/Tokyo", "Pacific/Kiritimati"]) {
    assert.ok(nextDailyResetMs(now, tz) > now.getTime());
  }
});
