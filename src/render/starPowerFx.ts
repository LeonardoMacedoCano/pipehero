import { highwayEdgeX, type RenderConfig } from "./layout.js";
import type { CanvasGradientLike, CanvasLike2D } from "./canvasLike.js";
import { dropPath } from "./dropShape.js";
import { hexToRgbTriplet, lighten } from "./colorUtils.js";
import { clamp01, lerp } from "./mathUtils.js";

export const STAR_POWER_BOLT_CORE_COLOR = "#f6efff";

const rgbTripletCache = new Map<string, string>();
function cachedRgbTriplet(hex: string): string {
  let triplet = rgbTripletCache.get(hex);
  if (triplet === undefined) {
    triplet = hexToRgbTriplet(hex);
    rgbTripletCache.set(hex, triplet);
  }
  return triplet;
}

export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export interface BoltPoint {
  x: number;
  y: number;
}

function midpointDisplace(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  displacement: number,
  seed: number,
  depth: number,
  out: BoltPoint[]
): void {
  if (depth <= 0) {
    out.push({ x: x1, y: y1 });
    return;
  }
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const normalX = -dy / len;
  const normalY = dx / len;
  const offset = (pseudoRandom(seed) - 0.5) * 2 * displacement;
  const midX = (x0 + x1) / 2 + normalX * offset;
  const midY = (y0 + y1) / 2 + normalY * offset;
  midpointDisplace(x0, y0, midX, midY, displacement * 0.55, seed * 2.13 + 1.7, depth - 1, out);
  midpointDisplace(midX, midY, x1, y1, displacement * 0.55, seed * 2.13 + 5.9, depth - 1, out);
}

export function jaggedBoltPath(
  x: number,
  y: number,
  angle: number,
  length: number,
  seed: number,
  displacementRatio: number,
  depth: number = 3
): BoltPoint[] {
  const tipX = x + Math.cos(angle) * length;
  const tipY = y + Math.sin(angle) * length;
  const points: BoltPoint[] = [{ x, y }];
  midpointDisplace(x, y, tipX, tipY, length * displacementRatio, seed, depth, points);
  return points;
}

function strokePolyline(ctx: CanvasLike2D, points: BoltPoint[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

function strokeBoltPath(
  ctx: CanvasLike2D,
  glowColor: string,
  points: BoltPoint[],
  glowWidth: number,
  coreWidthBase: number,
  coreWidthTip: number,
  glowBlur: number,
  alpha: number,
  glowAlphaScale: number = 0.5,
  coreColor: string = STAR_POWER_BOLT_CORE_COLOR,
  coreWidthMid: number = (coreWidthBase + coreWidthTip) / 2
): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = glowColor;

  ctx.globalAlpha = alpha * glowAlphaScale * 0.3;
  ctx.lineWidth = glowWidth + glowBlur * 1.4;
  strokePolyline(ctx, points);

  ctx.globalAlpha = alpha * glowAlphaScale * 0.7;
  ctx.lineWidth = glowWidth + glowBlur * 0.5;
  strokePolyline(ctx, points);

  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.strokeStyle = coreColor;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = coreWidthTip;
  strokePolyline(ctx, points);

  const midCount = Math.max(2, Math.ceil(points.length * 0.7));
  ctx.lineWidth = coreWidthMid;
  strokePolyline(ctx, points.slice(0, midCount));

  const baseCount = Math.max(2, Math.ceil(points.length * 0.4));
  ctx.lineWidth = coreWidthBase;
  strokePolyline(ctx, points.slice(0, baseCount));
}

const BOLT_HAIR_CHANCE = 0.22;

function drawBoltHairs(
  ctx: CanvasLike2D,
  points: BoltPoint[],
  seed: number,
  baseWidth: number,
  alpha: number,
  coreColor: string
): void {
  ctx.shadowBlur = 0;
  ctx.strokeStyle = coreColor;
  ctx.lineCap = "round";
  for (let i = 1; i < points.length - 1; i++) {
    const hairSeed = seed + i * 19.7;
    if (pseudoRandom(hairSeed) > BOLT_HAIR_CHANCE) continue;
    const p = points[i];
    const prev = points[i - 1];
    const dirAngle = Math.atan2(p.y - prev.y, p.x - prev.x);
    const side = pseudoRandom(hairSeed + 1) > 0.5 ? 1 : -1;
    const hairAngle = dirAngle + side * (0.6 + pseudoRandom(hairSeed + 2) * 0.7);
    const hairLen = baseWidth * (2.5 + pseudoRandom(hairSeed + 3) * 3.5);
    ctx.globalAlpha = alpha * (0.35 + pseudoRandom(hairSeed + 4) * 0.3);
    ctx.lineWidth = Math.max(0.5, baseWidth * 0.3);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(hairAngle) * hairLen, p.y + Math.sin(hairAngle) * hairLen);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
}

interface BoltArchetype {
  depth: number;
  displacementRatio: number;
  glowWidthRatio: number;
  coreBaseRatio: number;
  coreMidRatio: number;
  coreTipRatio: number;
  glowBlurRatio: number;
  forkChance: number;
  coreColor: string;
  glowAlphaScale: number;
}

export const BOLT_ARCHETYPES: readonly BoltArchetype[] = [
  {
    depth: 5,
    displacementRatio: 0.1,
    glowWidthRatio: 0.14,
    coreBaseRatio: 0.06,
    coreMidRatio: 0.035,
    coreTipRatio: 0.016,
    glowBlurRatio: 0.55,
    forkChance: 0.2,
    coreColor: "#f6efff",
    glowAlphaScale: 0.5,
  },
  {
    depth: 2,
    displacementRatio: 0.24,
    glowWidthRatio: 0.3,
    coreBaseRatio: 0.13,
    coreMidRatio: 0.08,
    coreTipRatio: 0.045,
    glowBlurRatio: 0.95,
    forkChance: 0.15,
    coreColor: "#e7dcff",
    glowAlphaScale: 0.62,
  },
  {
    depth: 4,
    displacementRatio: 0.17,
    glowWidthRatio: 0.19,
    coreBaseRatio: 0.075,
    coreMidRatio: 0.045,
    coreTipRatio: 0.02,
    glowBlurRatio: 0.68,
    forkChance: 0.8,
    coreColor: "#eaf5ff",
    glowAlphaScale: 0.55,
  },
  {
    depth: 3,
    displacementRatio: 0.13,
    glowWidthRatio: 0.16,
    coreBaseRatio: 0.06,
    coreMidRatio: 0.037,
    coreTipRatio: 0.018,
    glowBlurRatio: 0.6,
    forkChance: 0.4,
    coreColor: "#fff6ea",
    glowAlphaScale: 0.55,
  },
];

export function pickArchetype(seed: number): BoltArchetype {
  const index = Math.floor(pseudoRandom(seed) * BOLT_ARCHETYPES.length) % BOLT_ARCHETYPES.length;
  return BOLT_ARCHETYPES[index];
}

const BOLT_REROLL_HZ_DEFAULT = 5.5;

interface CachedBoltPath {
  archetype: BoltArchetype;
  localPoints: BoltPoint[];
  forkLocalPoints: BoltPoint[] | null;
}

const BOLT_PATH_CACHE_LIMIT = 96;
const boltPathCache = new Map<string, CachedBoltPath>();

function getCachedBoltPath(seedBase: number, gen: number, angle: number, length: number): CachedBoltPath {
  const key = `${seedBase}|${gen}`;
  const cached = boltPathCache.get(key);
  if (cached) return cached;

  const archetype = pickArchetype(seedBase * 3.1 + gen * 971.3);
  const seed = seedBase * 17.7 + gen * 53.1;
  const localPoints = jaggedBoltPath(0, 0, angle, length, seed, archetype.displacementRatio, archetype.depth);

  let forkLocalPoints: BoltPoint[] | null = null;
  if (pseudoRandom(seed + 31.4) < archetype.forkChance && localPoints.length > 3) {
    const forkOrigin = localPoints[Math.floor(localPoints.length * (0.35 + pseudoRandom(seed + 9) * 0.3))];
    const forkAngle = angle + (pseudoRandom(seed + 12) - 0.5) * 1.7;
    const forkLength = length * (0.35 + pseudoRandom(seed + 14) * 0.25);
    forkLocalPoints = jaggedBoltPath(
      forkOrigin.x,
      forkOrigin.y,
      forkAngle,
      forkLength,
      seed + 88,
      archetype.displacementRatio * 1.1,
      Math.max(1, archetype.depth - 1)
    );
  }

  const entry: CachedBoltPath = { archetype, localPoints, forkLocalPoints };
  if (boltPathCache.size >= BOLT_PATH_CACHE_LIMIT) {
    const oldestKey = boltPathCache.keys().next().value;
    if (oldestKey !== undefined) boltPathCache.delete(oldestKey);
  }
  boltPathCache.set(key, entry);
  return entry;
}

function drawCrackleBolt(
  ctx: CanvasLike2D,
  glowColor: string,
  x: number,
  y: number,
  angle: number,
  length: number,
  seedBase: number,
  currentTime: number,
  glowScale: number,
  envelopeAlpha: number,
  rerollHz: number = BOLT_REROLL_HZ_DEFAULT
): void {
  if (envelopeAlpha <= 0.005 || length <= 0) return;

  const period = 1 / rerollHz;
  const rawPhase = currentTime / period;
  const genA = Math.floor(rawPhase);
  const cyclePos = rawPhase - genA;
  const fadeT = cyclePos * cyclePos * (3 - 2 * cyclePos);

  for (const [gen, genAlpha] of [
    [genA, 1 - fadeT],
    [genA + 1, fadeT],
  ] as const) {
    if (genAlpha <= 0.01) continue;
    const { archetype, localPoints, forkLocalPoints } = getCachedBoltPath(seedBase, gen, angle, length);
    const seed = seedBase * 17.7 + gen * 53.1;
    const jitterAmp = glowScale * 0.03;
    const jitterPhase = currentTime * 20 + seed;
    const points = localPoints.map((p, i) => {
      if (i === 0 || i === localPoints.length - 1) return { x: p.x + x, y: p.y + y };
      const phase = jitterPhase + i * 2.1;
      return { x: p.x + x + Math.sin(phase) * jitterAmp, y: p.y + y + Math.cos(phase * 1.4) * jitterAmp * 0.6 };
    });

    const alpha = envelopeAlpha * genAlpha;
    strokeBoltPath(
      ctx,
      glowColor,
      points,
      Math.max(1.5, glowScale * archetype.glowWidthRatio),
      Math.max(0.8, glowScale * archetype.coreBaseRatio),
      Math.max(0.3, glowScale * archetype.coreTipRatio),
      glowScale * archetype.glowBlurRatio,
      alpha,
      archetype.glowAlphaScale,
      archetype.coreColor,
      Math.max(0.5, glowScale * archetype.coreMidRatio)
    );

    drawBoltHairs(ctx, points, seed + 7, glowScale * archetype.coreBaseRatio, alpha, archetype.coreColor);

    if (forkLocalPoints) {
      const forkPoints = forkLocalPoints.map((p) => ({ x: p.x + x, y: p.y + y }));
      strokeBoltPath(
        ctx,
        glowColor,
        forkPoints,
        Math.max(1, glowScale * archetype.glowWidthRatio * 0.6),
        Math.max(0.5, glowScale * archetype.coreBaseRatio * 0.6),
        Math.max(0.25, glowScale * archetype.coreTipRatio * 0.6),
        glowScale * archetype.glowBlurRatio * 0.6,
        alpha * 0.75,
        archetype.glowAlphaScale,
        archetype.coreColor
      );
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export const STAR_POWER_GLOW_PULSE_HZ = 3.2;

export function starPowerGlowPulse(currentTime: number): number {
  return 0.7 + 0.3 * Math.sin(currentTime * STAR_POWER_GLOW_PULSE_HZ * Math.PI * 2);
}

export const STAR_POWER_AURA_RADIUS_RATIO = 1.9;
export const STAR_POWER_HALO_RADIUS_RATIO = 2.6;

export function drawStarPowerDropAura(ctx: CanvasLike2D, glowColor: string, x: number, y: number, radius: number, alpha: number = 1): void {
  const glowRgb = cachedRgbTriplet(glowColor);
  const auraRadius = radius * STAR_POWER_AURA_RADIUS_RATIO;
  const aura = ctx.createRadialGradient(x, y, 0, x, y, auraRadius);
  aura.addColorStop(0, `rgba(${glowRgb}, 0.32)`);
  aura.addColorStop(0.55, `rgba(${glowRgb}, 0.13)`);
  aura.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawStarPowerDropHalo(ctx: CanvasLike2D, glowColor: string, x: number, y: number, radius: number, alpha: number = 1): void {
  const glowRgb = cachedRgbTriplet(glowColor);
  const ringRgb = cachedRgbTriplet(lighten(glowColor, 0.2));

  const bloomRadius = radius * STAR_POWER_HALO_RADIUS_RATIO;
  const bloom = ctx.createRadialGradient(x, y, radius, x, y, bloomRadius);
  bloom.addColorStop(0, `rgba(${glowRgb}, 0.3)`);
  bloom.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(x, y, bloomRadius, 0, Math.PI * 2);
  ctx.fill();

  const ringOuter = radius * 1.4;
  const ring = ctx.createRadialGradient(x, y, radius * 1.02, x, y, ringOuter);
  ring.addColorStop(0, `rgba(${ringRgb}, 0.85)`);
  ring.addColorStop(1, `rgba(${ringRgb}, 0)`);
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(x, y, ringOuter, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawStarPowerDropRim(ctx: CanvasLike2D, glowColor: string, x: number, y: number, radius: number, currentTime: number): void {
  const pulse = 0.7 + 0.3 * Math.sin(currentTime * STAR_POWER_GLOW_PULSE_HZ * Math.PI * 2 + 1.5);
  const baseAlpha = 0.2 + 0.25 * pulse;
  ctx.shadowBlur = 0;

  ctx.strokeStyle = glowColor;
  ctx.globalAlpha = baseAlpha * 0.5;
  ctx.lineWidth = Math.max(2, radius * 0.3);
  dropPath(ctx, x, y, radius);
  ctx.stroke();

  ctx.strokeStyle = STAR_POWER_BOLT_CORE_COLOR;
  ctx.globalAlpha = baseAlpha;
  ctx.lineWidth = Math.max(1, radius * 0.07);
  dropPath(ctx, x, y, radius);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

export function drawStarPowerDropRimCheap(ctx: CanvasLike2D, glowColor: string, x: number, y: number, radius: number, currentTime: number): void {
  const pulse = 0.7 + 0.3 * Math.sin(currentTime * STAR_POWER_GLOW_PULSE_HZ * Math.PI * 2 + 1.5);
  const baseAlpha = 0.2 + 0.25 * pulse;

  ctx.strokeStyle = glowColor;
  ctx.globalAlpha = baseAlpha * 0.35;
  ctx.lineWidth = Math.max(2, radius * 0.22);
  dropPath(ctx, x, y, radius);
  ctx.stroke();

  ctx.globalAlpha = baseAlpha * 0.6;
  ctx.lineWidth = Math.max(1.5, radius * 0.13);
  dropPath(ctx, x, y, radius);
  ctx.stroke();

  ctx.strokeStyle = STAR_POWER_BOLT_CORE_COLOR;
  ctx.globalAlpha = baseAlpha;
  ctx.lineWidth = Math.max(1, radius * 0.07);
  dropPath(ctx, x, y, radius);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

const STAR_POWER_SPARK_COUNT = 3;
const STAR_POWER_SPARK_ANGLE_SPREAD = Math.PI * 1.7;
const STAR_POWER_SPARK_REROLL_HZ = 4.2;

export function drawStarPowerSparks(
  ctx: CanvasLike2D,
  glowColor: string,
  x: number,
  y: number,
  radius: number,
  currentTime: number,
  seed: number,
  richness: number = 1
): void {
  const count = Math.max(1, Math.round(STAR_POWER_SPARK_COUNT * richness));
  for (let i = 0; i < count; i++) {
    const boltSeed = seed * 17.3 + i * 91.7;
    const baseAngle = -Math.PI / 2 + (pseudoRandom(boltSeed) - 0.5) * STAR_POWER_SPARK_ANGLE_SPREAD;
    const length = radius * (1.15 + pseudoRandom(boltSeed + 3.1) * 0.85);
    drawCrackleBolt(ctx, glowColor, x, y, baseAngle, length, boltSeed, currentTime + i * 0.37, radius, 0.85, STAR_POWER_SPARK_REROLL_HZ);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export const STAR_POWER_COLLECT_DURATION_SECONDS = 0.5;
const STAR_POWER_COLLECT_BOLT_COUNT: number = 5;
const STAR_POWER_COLLECT_FLASH_DURATION_SECONDS = 0.16;

interface CollectBoltShape {
  startXOffsetRatio: number;
  local: BoltPoint[];
  forkLocal: BoltPoint[] | null;
}
const collectBoltShapeCache = new Map<string, CollectBoltShape>();

function getCollectBoltShape(boltCount: number, i: number): CollectBoltShape {
  const key = `${boltCount}|${i}`;
  const cached = collectBoltShapeCache.get(key);
  if (cached) return cached;

  const seed = i * 41.3;
  const spread = boltCount === 1 ? 0 : (i / (boltCount - 1)) * 2 - 1;
  const baseAngle = -Math.PI / 2 + spread * 0.4 + (pseudoRandom(seed + 5) - 0.5) * 0.3;
  const displacementRatio = 0.2 + pseudoRandom(seed + 12) * 0.1;
  const local = jaggedBoltPath(0, 0, baseAngle, 1, seed, displacementRatio, 4);

  let forkLocal: BoltPoint[] | null = null;
  if (pseudoRandom(seed + 13.1) > 0.4 && local.length > 2) {
    const forkOrigin = local[Math.floor(local.length / 2)];
    const forkAngle = baseAngle + (pseudoRandom(seed + 27.4) - 0.5) * 1.6;
    forkLocal = jaggedBoltPath(forkOrigin.x, forkOrigin.y, forkAngle, 0.4, seed + 60, 0.22, 3);
  }

  const shape: CollectBoltShape = { startXOffsetRatio: spread * 1.2, local, forkLocal };
  collectBoltShapeCache.set(key, shape);
  return shape;
}

export function drawStarPowerCollectBurst(
  ctx: CanvasLike2D,
  glowColor: string,
  x: number,
  y: number,
  config: RenderConfig,
  elapsedSeconds: number,
  richness: number = 1
): void {
  const t = clamp01(elapsedSeconds / STAR_POWER_COLLECT_DURATION_SECONDS);
  const growT = 1 - (1 - t) * (1 - t);
  const fadeT = t * t * t;
  const travel = config.noteMaxRadius * 6.5;

  const flashT = clamp01(elapsedSeconds / STAR_POWER_COLLECT_FLASH_DURATION_SECONDS);
  if (flashT < 1) {
    const flashAlpha = (1 - flashT) * 0.85;
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(${cachedRgbTriplet(glowColor)}, 1)`;
    ctx.globalAlpha = flashAlpha * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, config.noteMaxRadius * lerp(0.9, 2.3, flashT), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = STAR_POWER_BOLT_CORE_COLOR;
    ctx.globalAlpha = flashAlpha;
    ctx.beginPath();
    ctx.arc(x, y, config.noteMaxRadius * lerp(0.35, 1.4, flashT), 0, Math.PI * 2);
    ctx.fill();
  }

  const boltCount = Math.max(1, Math.round(STAR_POWER_COLLECT_BOLT_COUNT * richness));
  const alpha = (1 - fadeT) * 0.95;
  for (let i = 0; i < boltCount; i++) {
    const seed = i * 41.3;
    const shape = getCollectBoltShape(boltCount, i);
    const startX = x + shape.startXOffsetRatio * config.noteMaxRadius;
    const length = travel * growT * (0.85 + pseudoRandom(seed + 8.2) * 0.3);

    const points = shape.local.map((p) => ({ x: startX + p.x * length, y: y + p.y * length }));
    strokeBoltPath(
      ctx,
      glowColor,
      points,
      Math.max(1.5, config.noteMaxRadius * 0.13),
      Math.max(1, config.noteMaxRadius * 0.075),
      Math.max(0.4, config.noteMaxRadius * 0.025),
      config.noteMaxRadius * 1.0,
      alpha,
      0.7
    );

    if (shape.forkLocal) {
      const forkPoints = shape.forkLocal.map((p) => ({ x: startX + p.x * length, y: y + p.y * length }));
      strokeBoltPath(
        ctx,
        glowColor,
        forkPoints,
        Math.max(1, config.noteMaxRadius * 0.07),
        Math.max(0.6, config.noteMaxRadius * 0.045),
        Math.max(0.35, config.noteMaxRadius * 0.018),
        config.noteMaxRadius * 0.55,
        alpha * 0.75,
        0.7
      );
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

const AMBIENT_LIGHTNING_BOLT_COUNT = 3;

export function ambientStrikeEnvelope(index: number, currentTime: number): { alpha: number; strikeIndex: number } {
  const cycleLength = 1.4 + pseudoRandom(index * 9.13 + 4) * 2.0;
  const cyclePos = ((currentTime % cycleLength) + cycleLength) % cycleLength;
  const strikeIndex = Math.floor(currentTime / cycleLength);
  const activeWindow = cycleLength * (0.14 + pseudoRandom(strikeIndex * 7.7 + index * 3.3) * 0.12);
  if (cyclePos >= activeWindow) return { alpha: 0, strikeIndex };

  const localT = cyclePos / activeWindow;
  const fadeInEnd = 0.25;
  const fadeOutStart = 0.65;
  const alpha =
    localT < fadeInEnd
      ? localT / fadeInEnd
      : localT < fadeOutStart
        ? 1
        : 1 - (localT - fadeOutStart) / (1 - fadeOutStart);
  return { alpha, strikeIndex };
}

function drawAmbientLightningBolt(ctx: CanvasLike2D, glowColor: string, config: RenderConfig, index: number, currentTime: number): void {
  const { alpha: envelopeAlpha, strikeIndex } = ambientStrikeEnvelope(index, currentTime);
  if (envelopeAlpha <= 0.005) return;

  const side: -1 | 1 = index % 2 === 0 ? -1 : 1;
  const startX = highwayEdgeX(side, 0, config) + side * config.noteMaxRadius * 1.5;
  const startY = config.canvasHeight * (0.05 + pseudoRandom(index * 3.1 + strikeIndex * 1.7) * 0.1);
  const endX = highwayEdgeX(side, 1, config) + side * config.noteMaxRadius * 2;
  const endY = config.hitLineY * (0.7 + pseudoRandom(index * 5.7 + strikeIndex * 2.3) * 0.3);
  const angle = Math.atan2(endY - startY, endX - startX);
  const length = Math.hypot(endX - startX, endY - startY);

  drawCrackleBolt(
    ctx,
    glowColor,
    startX,
    startY,
    angle,
    length,
    index * 53.7 + strikeIndex * 91.3,
    currentTime,
    config.noteMaxRadius,
    envelopeAlpha * 0.9
  );
}

export function drawAmbientLightningBolts(
  ctx: CanvasLike2D,
  glowColor: string,
  config: RenderConfig,
  currentTime: number,
  richness: number = 1
): void {
  const count = Math.max(1, Math.round(AMBIENT_LIGHTNING_BOLT_COUNT * richness));
  for (let i = 0; i < count; i++) {
    drawAmbientLightningBolt(ctx, glowColor, config, i, currentTime);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

const STAR_POWER_HIGHWAY_PULSE_HZ = 1.6;

export function starPowerHighwayPulse(currentTime: number): number {
  return 0.55 + 0.35 * Math.sin(currentTime * STAR_POWER_HIGHWAY_PULSE_HZ * Math.PI * 2);
}

const highwayWashGradientCache = new Map<string, CanvasGradientLike>();

export function drawStarPowerHighwayWash(ctx: CanvasLike2D, glowColor: string, config: RenderConfig, currentTime: number): void {
  const pulse = starPowerHighwayPulse(currentTime);
  const key = `${glowColor}|${config.hitLineY}`;
  let wash = highwayWashGradientCache.get(key);
  if (!wash) {
    const glowRgb = cachedRgbTriplet(glowColor);
    wash = ctx.createLinearGradient(0, 0, 0, config.hitLineY);
    wash.addColorStop(0, `rgba(${glowRgb}, 0)`);
    wash.addColorStop(0.5, `rgba(${glowRgb}, 0.06)`);
    wash.addColorStop(1, `rgba(${glowRgb}, 0.24)`);
    highwayWashGradientCache.set(key, wash);
  }

  ctx.globalAlpha = pulse;
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.moveTo(highwayEdgeX(-1, 0, config), 0);
  ctx.lineTo(highwayEdgeX(1, 0, config), 0);
  ctx.lineTo(highwayEdgeX(1, 1, config), config.hitLineY);
  ctx.lineTo(highwayEdgeX(-1, 1, config), config.hitLineY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
