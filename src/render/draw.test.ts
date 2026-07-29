import test from "node:test";
import assert from "node:assert/strict";
import { drawFrame, type CanvasLike2D } from "./draw.js";
import { RENDER_CONFIG } from "./layout.js";
import { COLORS, STAR_POWER_COLORS } from "../colors.js";
import type { Note } from "../types.js";

function fakeCtx(): CanvasLike2D & { fillStyles: unknown[]; arcCalls: { x: number; y: number; radius: number }[] } {
  const fillStyles: unknown[] = [];
  const arcCalls: { x: number; y: number; radius: number }[] = [];
  const gradient = { addColorStop() {} };
  return {
    fillStyles,
    arcCalls,
    lineWidth: 0,
    globalAlpha: 1,
    strokeStyle: "",
    get fillStyle() {
      return fillStyles[fillStyles.length - 1];
    },
    set fillStyle(value: unknown) {
      fillStyles.push(value);
    },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillRect() {},
    beginPath() {},
    closePath() {},
    arc(x: number, y: number, radius: number) {
      arcCalls.push({ x, y, radius });
    },
    ellipse() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    fill() {},
    stroke() {},
  };
}

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
    STAR_POWER_COLORS
  );
  assert.equal(ctx.fillStyles[0], STAR_POWER_COLORS.canvasBackground);
});

test("drawFrame doesn't throw when intense (Star Power) mode draws the extra lightning pass", () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => {
    drawFrame(ctx, [], 0.5, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, STAR_POWER_COLORS, true);
  });
});

test("drawFrame highlights a note that falls inside a star power phrase with a larger halo ring", () => {
  const notes = [note({ time: 1 })];

  const withoutPhrase = fakeCtx();
  drawFrame(withoutPhrase, notes, 0.9, RENDER_CONFIG, undefined, undefined, undefined, undefined, null, undefined, COLORS, false, []);
  const maxRadiusWithoutPhrase = Math.max(...withoutPhrase.arcCalls.map((c) => c.radius));

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
  const maxRadiusWithPhrase = Math.max(...withPhrase.arcCalls.map((c) => c.radius));

  assert.ok(
    maxRadiusWithPhrase > maxRadiusWithoutPhrase,
    `expected a larger halo arc when in a star power phrase (${maxRadiusWithPhrase} vs ${maxRadiusWithoutPhrase})`
  );
});

test("drawFrame doesn't halo a note outside any star power phrase", () => {
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

  assert.equal(
    Math.max(...outsidePhrase.arcCalls.map((c) => c.radius)),
    Math.max(...noPhrase.arcCalls.map((c) => c.radius))
  );
});
