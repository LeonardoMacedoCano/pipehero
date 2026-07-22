import test from "node:test";
import assert from "node:assert/strict";
import type { NoteEvent, ParsedChart, SimpleEvent, Timed } from "parsehero";
import { loadTrack } from "./chartTrack.js";

function fakeParsedChart(extraNotes: Timed<NoteEvent>[] = []): ParsedChart {
  const events: (Timed<NoteEvent> | Timed<SimpleEvent>)[] = [
    { type: "note", note: 2, duration: 0, isChord: false, isHOPO: false, forced: false, tap: false, tick: 384, assignedTime: 1.0 },
    { type: "note", note: 0, duration: 0, isChord: false, isHOPO: false, forced: false, tap: false, tick: 0, assignedTime: 0.0 },
    { type: "event", value: "section Intro", tick: 0, assignedTime: 0.0 },
    ...extraNotes,
  ];
  return {
    Song: { resolution: 192 },
    SyncTrack: { bpms: [{ tick: 0, bpm: 120, assignedTime: 0, type: "bpm" }], timeSignatures: [], allEvents: [] },
    ExpertSingle: events,
  } as ParsedChart;
}

test("loadTrack filters only note-type events and sorts by time", () => {
  const notes = loadTrack(fakeParsedChart(), "ExpertSingle");
  assert.equal(notes.length, 2);
  assert.equal(notes[0].time, 0.0);
  assert.equal(notes[1].time, 1.0);
});

test("loadTrack translates the fret number into a readable name", () => {
  const notes = loadTrack(fakeParsedChart(), "ExpertSingle");
  assert.equal(notes[0].fretName, "green");
  assert.equal(notes[1].fretName, "yellow");
});

test("loadTrack throws a clear error if the track doesn't exist in the chart", () => {
  assert.throws(() => loadTrack(fakeParsedChart(), "ExpertDoubleBass"), /not found/);
});

test("loadTrack converts duration from ticks to seconds (long note)", () => {
  const chart = fakeParsedChart([
    {
      type: "note",
      note: 3,
      duration: 192,
      isChord: false,
      isHOPO: false,
      forced: false,
      tap: false,
      tick: 768,
      assignedTime: 2.0,
    },
  ]);
  const notes = loadTrack(chart, "ExpertSingle");
  const sustain = notes.find((n) => n.fret === 3);
  assert.ok(sustain !== undefined);
  assert.ok(Math.abs(sustain!.duration - 0.5) < 1e-9, `expected 0.5s, got ${sustain!.duration}`);
});

test("loadTrack keeps duration=0 for notes without sustain", () => {
  const notes = loadTrack(fakeParsedChart(), "ExpertSingle");
  assert.equal(notes[0].duration, 0);
  assert.equal(notes[1].duration, 0);
});
