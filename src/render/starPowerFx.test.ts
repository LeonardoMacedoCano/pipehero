import test from "node:test";
import assert from "node:assert/strict";
import {
  pseudoRandom,
  jaggedBoltPath,
  pickArchetype,
  BOLT_ARCHETYPES,
  ambientStrikeEnvelope,
  drawAmbientLightningBolts,
  drawStarPowerCollectBurst,
  drawStarPowerDropAura,
  drawStarPowerDropHalo,
  drawStarPowerDropRim,
  drawStarPowerDropRimCheap,
  drawStarPowerSparks,
  drawStarPowerHighwayWash,
  starPowerHighwayPulse,
} from "./starPowerFx.js";
import { RENDER_CONFIG } from "./layout.js";
import { fakeCtx } from "./testCanvas.js";

test("pseudoRandom is deterministic and stays within [0, 1)", () => {
  for (const seed of [0, 1, 42, 1000.5, -7]) {
    const value = pseudoRandom(seed);
    assert.ok(value >= 0 && value < 1, `seed ${seed} produced ${value}`);
    assert.equal(value, pseudoRandom(seed), "same seed must produce the same value");
  }
});

test("jaggedBoltPath starts at the origin and ends near the straight-line tip", () => {
  const points = jaggedBoltPath(0, 0, 0, 100, 5, 0.2, 3);
  assert.deepEqual(points[0], { x: 0, y: 0 });
  const tip = points[points.length - 1];
  assert.ok(Math.abs(tip.x - 100) < 1e-9 && Math.abs(tip.y - 0) < 1e-9);
});

test("jaggedBoltPath produces more points for a deeper subdivision", () => {
  const shallow = jaggedBoltPath(0, 0, 0, 100, 5, 0.2, 1);
  const deep = jaggedBoltPath(0, 0, 0, 100, 5, 0.2, 4);
  assert.ok(deep.length > shallow.length);
});

test("jaggedBoltPath is deterministic for the same seed and displaces off-axis for depth > 0", () => {
  const a = jaggedBoltPath(0, 0, 0, 100, 5, 0.3, 2);
  const b = jaggedBoltPath(0, 0, 0, 100, 5, 0.3, 2);
  assert.deepEqual(a, b);
  assert.ok(a.some((p) => Math.abs(p.y) > 1e-6), "expected at least one point displaced off the straight line");
});

test("pickArchetype always returns one of the known archetypes", () => {
  for (const seed of [0, 1, 17.3, 500, -12]) {
    assert.ok(BOLT_ARCHETYPES.includes(pickArchetype(seed)));
  }
});

test("ambientStrikeEnvelope alpha stays within [0, 1]", () => {
  for (let t = 0; t < 5; t += 0.1) {
    const { alpha } = ambientStrikeEnvelope(0, t);
    assert.ok(alpha >= 0 && alpha <= 1, `t=${t} produced alpha ${alpha}`);
  }
});

const GLOW_COLOR = "#6dff9c";

test("drawAmbientLightningBolts does not throw across a range of times", () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => {
    for (let t = 0; t < 3; t += 0.2) drawAmbientLightningBolts(ctx, GLOW_COLOR, RENDER_CONFIG, t);
  });
});

test("drawStarPowerCollectBurst draws a burst that travels upward from its origin", () => {
  const ctx = fakeCtx();
  drawStarPowerCollectBurst(ctx, GLOW_COLOR, 100, 500, RENDER_CONFIG, 0.1);
  assert.ok(ctx.lineToCalls.some((p) => p.y < 500), "expected the burst to reach above its origin y");
});

test("drawStarPowerDropAura and drawStarPowerDropRim do not throw", () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => drawStarPowerDropAura(ctx, GLOW_COLOR, 10, 10, 20, 0.5));
  assert.doesNotThrow(() => drawStarPowerDropRim(ctx, GLOW_COLOR, 10, 10, 20, 0.5));
});

test("drawStarPowerDropAura and drawStarPowerDropHalo leave the canvas transform where they found it", () => {
  const ctx = fakeCtx();
  drawStarPowerDropAura(ctx, GLOW_COLOR, 137, 421, 22, 0.5);
  drawStarPowerDropHalo(ctx, GLOW_COLOR, 88, 260, 18, 0.9);
  drawStarPowerDropAura(ctx, GLOW_COLOR, 44, 900, 31, 1.7);
  assert.equal(ctx.translateNet.x, 0);
  assert.equal(ctx.translateNet.y, 0);
});

test("drawStarPowerCollectBurst grows one cached bolt shape over time instead of re-rolling it", () => {
  const early = fakeCtx();
  const late = fakeCtx();
  drawStarPowerCollectBurst(early, GLOW_COLOR, 200, 600, RENDER_CONFIG, 0.12);
  drawStarPowerCollectBurst(late, GLOW_COLOR, 200, 600, RENDER_CONFIG, 0.45);
  assert.equal(early.lineToCalls.length, late.lineToCalls.length, "same vertex count each frame (shape cached, only scaled)");
  const reach = (ctx: ReturnType<typeof fakeCtx>) => Math.max(...ctx.lineToCalls.map((p) => Math.hypot(p.x - 200, p.y - 600)));
  assert.ok(reach(late) > reach(early), "the later frame's bolts reach further from the origin");
});

test("drawStarPowerDropRimCheap does not throw and never touches shadowBlur", () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => drawStarPowerDropRimCheap(ctx, GLOW_COLOR, 10, 10, 20, 0.5));
  assert.equal(ctx.shadowBlur, 0);
});

test("drawStarPowerSparks does not throw", () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => drawStarPowerSparks(ctx, GLOW_COLOR, 10, 10, 20, 0.5, 3));
});

test("starPowerHighwayPulse stays within [0, 1]", () => {
  for (let t = 0; t < 5; t += 0.1) {
    const pulse = starPowerHighwayPulse(t);
    assert.ok(pulse >= 0 && pulse <= 1, `t=${t} produced pulse ${pulse}`);
  }
});

test("drawStarPowerHighwayWash fills the highway trapezoid without throwing", () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => drawStarPowerHighwayWash(ctx, GLOW_COLOR, RENDER_CONFIG, 0.3));
  assert.ok(ctx.fillStyles.length > 0, "expected a fill to have been issued");
});
