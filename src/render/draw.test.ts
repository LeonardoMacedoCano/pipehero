import test from "node:test";
import assert from "node:assert/strict";
import { drawFrame } from "./draw.js";
import { RENDER_CONFIG } from "./layout.js";
import { COLORS, DRACULA_DARK } from "../colors.js";
import type { Note } from "../types.js";
import { fakeCtx } from "./testCanvas.js";

function note(overrides: Partial<Note> = {}): Note {
  return { id: 0, time: 1, fret: 0, fretName: "green", duration: 0, isChord: false, isHOPO: false, forced: false, tap: false, ...overrides };
}

test("drawFrame fills the background with the default palette's canvasBackground when no palette is given", () => {
  const ctx = fakeCtx();
  drawFrame(ctx, [], 0, RENDER_CONFIG);
  assert.equal(ctx.fillStyles[0], COLORS.canvasBackground);
});

test("drawFrame fills the background with the given palette's canvasBackground", () => {
  const ctx = fakeCtx();
  drawFrame(
    ctx,
    [],
    0,
    RENDER_CONFIG,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    undefined,
    DRACULA_DARK
  );
  assert.equal(ctx.fillStyles[0], DRACULA_DARK.canvasBackground);
});

test("drawFrame doesn't throw when intense (Star Power) mode draws the extra lightning pass", () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => {
    drawFrame(ctx, [], 0.5, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, DRACULA_DARK, true);
  });
});

test("drawFrame sparks a note that falls inside an unbroken star power phrase", () => {
  const notes = [note({ time: 1 })];

  const withoutPhrase = fakeCtx();
  drawFrame(withoutPhrase, notes, 0.9, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, COLORS, false, []);

  const withPhrase = fakeCtx();
  drawFrame(
    withPhrase,
    notes,
    0.9,
    RENDER_CONFIG,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    undefined,
    COLORS,
    false,
    [{ startTime: 0, endTime: 2 }]
  );

  assert.ok(
    withPhrase.lineToCalls.length > withoutPhrase.lineToCalls.length,
    `expected more lineTo calls (spark bolts) when in an unbroken star power phrase (${withPhrase.lineToCalls.length} vs ${withoutPhrase.lineToCalls.length})`
  );
});

test("drawFrame caps how many notes spark per frame in a dense star power phrase", () => {
  const phrase = [{ startTime: 0, endTime: 3 }];
  const makeNotes = (n: number) => Array.from({ length: n }, (_, i) => note({ id: i, time: 0.85 + i * 0.02, fret: (i % 5) as Note["fret"] }));

  const sparkCost = (notes: Note[]) => {
    const withPhrase = fakeCtx();
    drawFrame(withPhrase, notes, 0.9, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, COLORS, false, phrase);
    const withoutPhrase = fakeCtx();
    drawFrame(withoutPhrase, notes, 0.9, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, COLORS, false, []);
    return withPhrase.lineToCalls.length - withoutPhrase.lineToCalls.length;
  };

  const costFew = sparkCost(makeNotes(5));
  const costMany = sparkCost(makeNotes(14));
  assert.ok(costFew > 0, "a handful of phrase notes should still spark");
  assert.ok(costMany <= costFew * 1.15, `14 phrase notes must not cost much more spark work than 5 (got ${costMany} vs ${costFew})`);
});

test("drawFrame doesn't spark a note outside any star power phrase", () => {
  const notes = [note({ time: 1 })];

  const outsidePhrase = fakeCtx();
  drawFrame(
    outsidePhrase,
    notes,
    0.9,
    RENDER_CONFIG,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    undefined,
    COLORS,
    false,
    [{ startTime: 5, endTime: 6 }]
  );

  const noPhrase = fakeCtx();
  drawFrame(noPhrase, notes, 0.9, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, COLORS, false, []);

  assert.equal(outsidePhrase.lineToCalls.length, noPhrase.lineToCalls.length);
});

test("drawFrame doesn't spark a note whose phrase has been broken", () => {
  const notes = [note({ time: 1 })];
  const starPowerPhrases = [{ startTime: 0, endTime: 2 }];

  const broken = fakeCtx();
  drawFrame(
    broken,
    notes,
    0.9,
    RENDER_CONFIG,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    undefined,
    COLORS,
    false,
    starPowerPhrases,
    [true]
  );

  const noPhrase = fakeCtx();
  drawFrame(noPhrase, notes, 0.9, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, COLORS, false, []);

  assert.equal(broken.lineToCalls.length, noPhrase.lineToCalls.length);
});

test("drawFrame draws an upward-fading collect burst for a note flagged in starPowerCollectAt", () => {
  const notes = [note({ time: 1 })];
  const ctx = fakeCtx();

  drawFrame(
    ctx,
    notes,
    1.0,
    RENDER_CONFIG,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    undefined,
    COLORS,
    false,
    [],
    [],
    new Map([["0:1", 1.0]])
  );

  const hitLineY = RENDER_CONFIG.hitLineY;
  assert.ok(
    ctx.lineToCalls.some((c) => c.y < hitLineY - RENDER_CONFIG.noteMaxRadius),
    "expected at least one collect-burst point to travel upward from the pipe mouth"
  );
});
