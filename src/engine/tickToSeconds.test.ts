import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseChart } from "../../node_modules/parsehero/dist/index.js";
import type { NoteEvent, Timed } from "parsehero";
import { tickToSeconds } from "./tickToSeconds.js";

test("matches the assignedTime ParseHero itself computes, with constant BPM", () => {
  const raw = readFileSync("test/fixtures/sample-song.chart", "utf-8");
  const { chart } = parseChart(raw);
  const { resolution } = chart.Song;
  const bpms = chart.SyncTrack.bpms;

  const notes = (chart.ExpertSingle ?? []).filter((e): e is Timed<NoteEvent> => e.type === "note");
  for (const note of notes) {
    const computed = tickToSeconds(note.tick, resolution, bpms);
    assert.ok(
      Math.abs(computed - note.assignedTime) < 1e-9,
      `tick=${note.tick}: expected ${note.assignedTime}, got ${computed}`
    );
  }
});

test("also matches the real assignedTime in a chart with several BPM changes", () => {
  const raw = readFileSync("test/fixtures/synthetic-complex.chart", "utf-8");
  const { chart } = parseChart(raw);
  const { resolution } = chart.Song;
  const bpms = chart.SyncTrack.bpms;

  const notes = (chart.ExpertSingle ?? []).filter((e): e is Timed<NoteEvent> => e.type === "note");
  for (const note of notes) {
    const computed = tickToSeconds(note.tick, resolution, bpms);
    assert.ok(
      Math.abs(computed - note.assignedTime) < 1e-6,
      `tick=${note.tick}: expected ${note.assignedTime}, got ${computed}`
    );
  }
});

test("duration in ticks becomes a small, plausible time difference (not hundreds of seconds)", () => {
  const raw = readFileSync("test/fixtures/synthetic-complex.chart", "utf-8");
  const { chart } = parseChart(raw);
  const { resolution } = chart.Song;
  const bpms = chart.SyncTrack.bpms;

  const sustainNote = (chart.ExpertSingle ?? []).filter(
    (e): e is Timed<NoteEvent> => e.type === "note" && e.duration > 0
  )[0];
  const endTime = tickToSeconds(sustainNote.tick + sustainNote.duration, resolution, bpms);
  const durationSeconds = endTime - sustainNote.assignedTime;

  assert.ok(durationSeconds > 0, "duration must be positive");
  assert.ok(durationSeconds < 5, `a note's duration shouldn't exceed a few seconds, got ${durationSeconds}`);
});
