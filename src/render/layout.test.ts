import test from "node:test";
import assert from "node:assert/strict";
import type { Note } from "../types.js";
import {
  RENDER_CONFIG,
  createRenderConfig,
  laneX,
  laneCenterOffset,
  noteY,
  noteRadiusAt,
  progressFor,
  visualProgress,
  noteRenderKey,
  getVisibleNotes,
} from "./layout.js";

function note(overrides: Partial<Note> = {}): Note {
  return { id: 0, time: 1, fret: 0, fretName: "green", duration: 0, isChord: false, isHOPO: false, forced: false, tap: false, ...overrides };
}

test("progressFor: 0 at the top (approachTime seconds before), 1 at the hit line", () => {
  assert.equal(progressFor(5.0, 5.0 - RENDER_CONFIG.approachTime), 0);
  assert.equal(progressFor(5.0, 5.0), 1);
});

test("noteY: a note exactly at the current time sits on the hit line", () => {
  const n = note({ time: 5.0 });
  assert.ok(Math.abs(noteY(n, 5.0) - RENDER_CONFIG.hitLineY) < 1e-9);
});

test("noteY: a note 'approachTime' seconds in the future starts at the top (y=0)", () => {
  const n = note({ time: 5.0 });
  const y = noteY(n, 5.0 - RENDER_CONFIG.approachTime);
  assert.equal(y, 0);
});

test("noteY: correct order — the note closer to the current time is closer to the hit line", () => {
  const near = note({ time: 5.0 });
  const far = note({ time: 6.0 });
  const currentTime = 4.5;
  assert.ok(noteY(near, currentTime) > noteY(far, currentTime));
});

test("visualProgress: preserves the endpoints — 0 stays at the top, 1 stays at the hit line", () => {
  assert.equal(visualProgress(0), 0);
  assert.ok(Math.abs(visualProgress(1) - 1) < 1e-9);
});

test("visualProgress: warps progress so equal steps take up more screen space near the hit line than at the top", () => {
  const gapFar = visualProgress(0.1) - visualProgress(0.0);
  const gapNear = visualProgress(1.0) - visualProgress(0.9);
  assert.ok(gapNear > gapFar, `expected the gap near the hit line (${gapNear}) to be bigger than far away (${gapFar})`);
});

test("noteY: the pixel gap between two notes a fixed time apart grows as they approach the hit line, compensating for their growing radius", () => {
  const a = note({ time: 5.0 });
  const b = note({ time: 5.1 });
  const gapFar = noteY(a, 3.0) - noteY(b, 3.0);
  const gapNear = noteY(a, 4.9) - noteY(b, 4.9);
  assert.ok(gapNear > gapFar, `expected the gap near the hit line (${gapNear}) to be bigger than far away (${gapFar})`);
});

test("noteRadiusAt: grows from noteMinRadius (far) to noteMaxRadius (at the hit line)", () => {
  assert.equal(noteRadiusAt(0), RENDER_CONFIG.noteMinRadius);
  assert.equal(noteRadiusAt(1), RENDER_CONFIG.noteMaxRadius);
  const middle = noteRadiusAt(0.5);
  assert.ok(middle > RENDER_CONFIG.noteMinRadius && middle < RENDER_CONFIG.noteMaxRadius);
});

test("laneCenterOffset: lanes range from -1 (leftmost) to 1 (rightmost), open note sits at 0", () => {
  assert.equal(laneCenterOffset(0), -1);
  assert.equal(laneCenterOffset(4), 1);
  assert.equal(laneCenterOffset(2), 0);
  assert.equal(laneCenterOffset(7), 0);
});

test("laneX: different frets land on different x positions, at the same depth", () => {
  const xs = new Set(([0, 1, 2, 3, 4] as const).map((fret) => laneX(fret, 1)));
  assert.equal(xs.size, 5);
});

test("laneX: the open note (fret 7) is centered relative to the other lanes", () => {
  const x0 = laneX(0, 1);
  const x4 = laneX(4, 1);
  const xOpen = laneX(7, 1);
  assert.ok(Math.abs(xOpen - (x0 + x4) / 2) < 1e-9);
});

test("laneX: the track is narrower far away (progress=0) than close up (progress=1) — depth effect", () => {
  const spreadFar = laneX(4, 0) - laneX(0, 0);
  const spreadNear = laneX(4, 1) - laneX(0, 1);
  assert.ok(spreadNear > spreadFar, `expected the track to be wider near (${spreadNear}) than far (${spreadFar})`);
});

test("createRenderConfig: generates a config proportional to the given canvas size", () => {
  const small = createRenderConfig(400, 300);
  const big = createRenderConfig(1600, 1200);
  assert.ok(big.highwayBottomWidth > small.highwayBottomWidth);
  assert.ok(big.hitLineY > small.hitLineY);
  assert.equal(small.canvasWidth, 400);
  assert.equal(small.canvasHeight, 300);
});

test("noteRenderKey: the same fret+time combination always generates the same key", () => {
  assert.equal(noteRenderKey(0, 1.234), noteRenderKey(0, 1.234));
  assert.notEqual(noteRenderKey(0, 1.234), noteRenderKey(1, 1.234));
  assert.notEqual(noteRenderKey(0, 1.234), noteRenderKey(0, 5.678));
});

test("getVisibleNotes: hides notes too far in the future or too far in the past", () => {
  const notes = [
    note({ id: 0, time: 100 }),
    note({ id: 1, time: 5.0 }),
    note({ id: 2, time: 0.0 }),
  ];
  const visible = getVisibleNotes(notes, 4.0);
  assert.deepEqual(visible.map((n) => n.id), [1]);
});

test("getVisibleNotes: a note with duration>0 gets a non-empty drop line (sustainDrops)", () => {
  const notes = [note({ id: 0, time: 5.0, fret: 0, duration: 1.0 })];
  const [visible] = getVisibleNotes(notes, 4.0);
  assert.ok(visible.sustainDrops.length > 0);
  for (const drop of visible.sustainDrops) {
    assert.ok(drop.y <= visible.y);
  }
});

test("getVisibleNotes: a long sustain stays visible well after its head crosses the hit line", () => {
  const notes = [note({ id: 0, time: 1, duration: 5 })];
  const visible = getVisibleNotes(notes, 3);
  assert.deepEqual(visible.map((n) => n.id), [0]);
});

test("getVisibleNotes: a note without duration has no sustain drops", () => {
  const notes = [note({ id: 0, time: 5.0, fret: 0, duration: 0 })];
  const [visible] = getVisibleNotes(notes, 4.0);
  assert.deepEqual(visible.sustainDrops, []);
});

test("getVisibleNotes: keeps the original chart's time order and appends x/y/radius", () => {
  const notes = [note({ id: 0, time: 4.2 }), note({ id: 1, time: 4.8, fret: 2 })];
  const visible = getVisibleNotes(notes, 4.0);
  assert.equal(visible.length, 2);
  assert.equal(visible[0].id, 0);
  assert.ok(typeof visible[0].x === "number");
  assert.ok(typeof visible[0].y === "number");
  assert.ok(typeof visible[0].radius === "number");
});
