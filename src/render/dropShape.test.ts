import test from "node:test";
import assert from "node:assert/strict";
import { dropPath } from "./dropShape.js";
import { fakeCtx } from "./testCanvas.js";

test("dropPath draws a circle when the radius already covers the tip", () => {
  const ctx = fakeCtx();
  dropPath(ctx, 10, 10, 100);
  assert.equal(ctx.arcCalls.length, 1);
  assert.deepEqual(ctx.arcCalls[0], { x: 10, y: 10, radius: 100 });
});

test("dropPath draws a tapered shape (triangle sides + rounded base) for a normal radius", () => {
  const ctx = fakeCtx();
  dropPath(ctx, 10, 10, 5);
  assert.equal(ctx.arcCalls.length, 1, "rounded base is still a single arc call");
  assert.ok(ctx.lineToCalls.length >= 2, "tapered sides are drawn with lineTo calls");
});
