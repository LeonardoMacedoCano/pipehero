import type { Fret, Note, StarPowerPhrase } from "../types.js";
import {
  RENDER_CONFIG,
  LANE_COLORS,
  laneX,
  highwayEdgeX,
  getVisibleNotes,
  noteRenderKey,
  progressFor,
  visualProgress,
  noteRadiusAt,
  type RenderConfig,
  type VisibleNote,
} from "./layout.js";
import { lighten, desaturate, mix } from "./colorUtils.js";
import { COLORS, STAR_POWER_COLORS, type Palette } from "../colors.js";
import { phraseIndexAt } from "../engine/starPower.js";

interface CanvasGradientLike {
  addColorStop(offset: number, color: string): void;
}

export interface CanvasLike2D {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  globalAlpha: number;
  shadowBlur: number;
  shadowColor: string;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradientLike;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  fill(): void;
  stroke(): void;
}

export const ABSORB_DURATION_SECONDS = 0.3;

export const MISS_DESATURATION_AMOUNT = 0.88;

const EMPTY_JUDGED_HITS: ReadonlyMap<string, number> = new Map();
const EMPTY_HOLDING_KEYS: ReadonlySet<string> = new Set();
const EMPTY_MISSED_KEYS: ReadonlySet<string> = new Set();
const EMPTY_ERROR_CLICKS: ReadonlyMap<Fret, number> = new Map();
const EMPTY_OPEN_HOLD_RELEASE: ReadonlyMap<string, number> = new Map();
const EMPTY_STAR_POWER_PHRASES: StarPowerPhrase[] = [];
const EMPTY_STAR_POWER_PHRASE_BROKEN: readonly boolean[] = [];
const EMPTY_STAR_POWER_COLLECT_AT: ReadonlyMap<string, number> = new Map();

const RAIL_MISS_FADE_SECONDS = 0.5;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp01(t);
}

function pipeHalfWidthAt(progress: number, config: RenderConfig): number {
  if (config.laneOrder.length < 2) return config.noteMaxRadius * 2.5;
  const spacing = Math.abs(laneX(config.laneOrder[1], progress, config) - laneX(config.laneOrder[0], progress, config));
  return spacing * 0.51;
}

const GRID_LINE_SPACING_SECONDS = 0.16;

interface FrameInvariantStyles {
  key: string;
  stageGlowGradient: CanvasGradientLike;
  laneBeamGradients: Map<Fret, CanvasGradientLike>;
  laneGridStrokeColors: Map<Fret, string>;
  gridLineStrokeColor: string;
}

const frameInvariantStylesByCtx = new WeakMap<CanvasLike2D, FrameInvariantStyles>();

const STAR_POWER_TINT_AMOUNT = 0.22;

function trackTint(hex: string, intense: boolean): string {
  return intense ? mix(hex, STAR_POWER_BOLT_GLOW_COLOR, STAR_POWER_TINT_AMOUNT) : hex;
}

function frameInvariantStylesKey(config: RenderConfig, palette: Palette, intense: boolean): string {
  return [
    config.canvasWidth,
    config.canvasHeight,
    config.hitLineY,
    config.highwayCenterX,
    config.highwayTopWidth,
    config.highwayBottomWidth,
    palette.canvasBackground,
    palette.info,
    palette.secondary,
    palette.tertiary,
    palette.quaternary,
    intense,
  ].join("|");
}

function getFrameInvariantStyles(
  ctx: CanvasLike2D,
  config: RenderConfig,
  palette: Palette,
  laneColors: Record<Fret, string>,
  intense: boolean
): FrameInvariantStyles {
  const key = frameInvariantStylesKey(config, palette, intense);
  const cached = frameInvariantStylesByCtx.get(ctx);
  if (cached && cached.key === key) return cached;

  const backgroundColor = trackTint(palette.canvasBackground, intense);

  const stageGlowGradient = ctx.createRadialGradient(
    config.highwayCenterX,
    config.hitLineY,
    0,
    config.highwayCenterX,
    config.hitLineY,
    config.canvasHeight * 0.85
  );
  stageGlowGradient.addColorStop(0, mix(backgroundColor, trackTint(palette.info, intense), 0.28));
  stageGlowGradient.addColorStop(0.45, mix(backgroundColor, trackTint(palette.secondary, intense), 0.55));
  stageGlowGradient.addColorStop(1, backgroundColor);

  const tertiary = trackTint(palette.tertiary, intense);
  const quaternary = trackTint(palette.quaternary, intense);

  const laneBeamGradients = new Map<Fret, CanvasGradientLike>();
  const laneGridStrokeColors = new Map<Fret, string>();
  for (const fret of config.laneOrder) {
    const baseColor = laneColors[fret] ?? palette.noteFallback;
    const beamGradient = ctx.createLinearGradient(0, 0, 0, config.hitLineY);
    beamGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    beamGradient.addColorStop(0.55, mix(backgroundColor, baseColor, 0.3));
    beamGradient.addColorStop(1, mix(backgroundColor, baseColor, 0.7));
    laneBeamGradients.set(fret, beamGradient);

    const laneColor = laneColors[fret] ?? tertiary;
    laneGridStrokeColors.set(fret, mix(tertiary, laneColor, 0.45));
  }

  const styles: FrameInvariantStyles = {
    key,
    stageGlowGradient,
    laneBeamGradients,
    laneGridStrokeColors,
    gridLineStrokeColor: mix(tertiary, quaternary, 0.35),
  };
  frameInvariantStylesByCtx.set(ctx, styles);
  return styles;
}

function drawStageGlow(ctx: CanvasLike2D, config: RenderConfig, gradient: CanvasGradientLike): void {
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
}

function drawLaneBeams(ctx: CanvasLike2D, config: RenderConfig, laneBeamGradients: Map<Fret, CanvasGradientLike>): void {
  for (const fret of config.laneOrder) {
    const beamGradient = laneBeamGradients.get(fret);
    if (!beamGradient) continue;
    const topX = laneX(fret, 0, config);
    const bottomX = laneX(fret, 1, config);
    const topHalf = pipeHalfWidthAt(0, config) * 0.85;
    const bottomHalf = pipeHalfWidthAt(1, config) * 0.85;

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = beamGradient;
    ctx.beginPath();
    ctx.moveTo(topX - topHalf, 0);
    ctx.lineTo(topX + topHalf, 0);
    ctx.lineTo(bottomX + bottomHalf, config.hitLineY);
    ctx.lineTo(bottomX - bottomHalf, config.hitLineY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFretboardGrid(
  ctx: CanvasLike2D,
  config: RenderConfig,
  currentTime: number,
  laneGridStrokeColors: Map<Fret, string>,
  gridLineStrokeColor: string
): void {
  const lastFret = config.laneOrder[config.laneOrder.length - 1];
  const firstFret = config.laneOrder[0];

  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.75;
  for (const fret of config.laneOrder) {
    ctx.strokeStyle = laneGridStrokeColors.get(fret) ?? gridLineStrokeColor;
    ctx.beginPath();
    ctx.moveTo(laneX(fret, 0, config), 0);
    ctx.lineTo(laneX(fret, 1, config), config.hitLineY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = gridLineStrokeColor;
  const firstLineTime = Math.ceil(currentTime / GRID_LINE_SPACING_SECONDS) * GRID_LINE_SPACING_SECONDS;
  for (let t = firstLineTime; t <= currentTime + config.approachTime; t += GRID_LINE_SPACING_SECONDS) {
    const progress = visualProgress(progressFor(t, currentTime, config), config);
    const y = progress * config.hitLineY;
    ctx.beginPath();
    ctx.moveTo(laneX(firstFret, progress, config), y);
    ctx.lineTo(laneX(lastFret, progress, config), y);
    ctx.stroke();
  }
}

const RAIL_CYLINDER_BANDS = 18;
const RAIL_CYLINDER_ANCHORS = [0, 0.3, 0.5, 0.7, 1];

function railBandColor(stops: readonly string[], f: number): string {
  for (let i = 0; i < RAIL_CYLINDER_ANCHORS.length - 1; i++) {
    const a0 = RAIL_CYLINDER_ANCHORS[i];
    const a1 = RAIL_CYLINDER_ANCHORS[i + 1];
    if (f <= a1 || i === RAIL_CYLINDER_ANCHORS.length - 2) {
      return mix(stops[i], stops[i + 1], clamp01((f - a0) / (a1 - a0)));
    }
  }
  return stops[stops.length - 1];
}

function drawEdgeRail(ctx: CanvasLike2D, side: -1 | 1, config: RenderConfig, missIntensity: number, palette: Palette): void {
  const topX = highwayEdgeX(side, 0, config);
  const bottomX = highwayEdgeX(side, 1, config);
  const topHalf = config.noteMinRadius * 0.42;
  const bottomHalf = config.noteMaxRadius * 0.58;

  const normalStops = palette.pipeGradientStops;
  const missStops = palette.pipeMissGradientStops;
  const stops = missIntensity > 0 ? normalStops.map((stop, i) => mix(stop, missStops[i], missIntensity)) : normalStops;

  const inward = -side;
  const shadowTopStart = topX + inward * topHalf;
  const shadowBottomStart = bottomX + inward * bottomHalf;
  const shadowTopEnd = shadowTopStart + inward * topHalf * 2.2;
  const shadowBottomEnd = shadowBottomStart + inward * bottomHalf * 2.2;

  const shadowGradient = ctx.createLinearGradient(shadowBottomStart, 0, shadowBottomEnd, 0);
  shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0.55)");
  shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadowGradient;
  ctx.beginPath();
  ctx.moveTo(shadowTopStart, 0);
  ctx.lineTo(shadowTopEnd, 0);
  ctx.lineTo(shadowBottomEnd, config.hitLineY);
  ctx.lineTo(shadowBottomStart, config.hitLineY);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < RAIL_CYLINDER_BANDS; i++) {
    const f0 = i / RAIL_CYLINDER_BANDS;
    const f1 = (i + 1) / RAIL_CYLINDER_BANDS;
    const offset0 = f0 * 2 - 1;
    const offset1 = f1 * 2 - 1;

    ctx.fillStyle = railBandColor(stops, (f0 + f1) / 2);
    ctx.beginPath();
    ctx.moveTo(topX + offset0 * topHalf, 0);
    ctx.lineTo(topX + offset1 * topHalf, 0);
    ctx.lineTo(bottomX + offset1 * bottomHalf, config.hitLineY);
    ctx.lineTo(bottomX + offset0 * bottomHalf, config.hitLineY);
    ctx.closePath();
    ctx.fill();
  }

  const glossOffset = -0.35 * inward;
  ctx.fillStyle = lighten(railBandColor(stops, 0.5), 0.35);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(topX + (glossOffset - 0.06) * topHalf, 0);
  ctx.lineTo(topX + (glossOffset + 0.06) * topHalf, 0);
  ctx.lineTo(bottomX + (glossOffset + 0.06) * bottomHalf, config.hitLineY);
  ctx.lineTo(bottomX + (glossOffset - 0.06) * bottomHalf, config.hitLineY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPipeBarrelAndMouth(
  ctx: CanvasLike2D,
  fret: Fret,
  config: RenderConfig,
  laneColors: Record<Fret, string>,
  palette: Palette
): void {
  const baseColor = laneColors[fret] ?? palette.noteFallback;
  const x = laneX(fret, 1, config);
  const halfWidth = pipeHalfWidthAt(1, config);
  const y = config.hitLineY;

  const barrelGradient = ctx.createLinearGradient(x - halfWidth, 0, x + halfWidth, 0);
  barrelGradient.addColorStop(0, lighten(baseColor, -0.6));
  barrelGradient.addColorStop(0.5, baseColor);
  barrelGradient.addColorStop(1, lighten(baseColor, -0.6));
  ctx.fillStyle = barrelGradient;
  ctx.fillRect(x - halfWidth, y, halfWidth * 2, config.canvasHeight - y);

  const depthFade = ctx.createLinearGradient(0, y, 0, config.canvasHeight);
  depthFade.addColorStop(0, "rgba(0, 0, 0, 0)");
  depthFade.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = depthFade;
  ctx.fillRect(x - halfWidth, y, halfWidth * 2, config.canvasHeight - y);

  const mouthRx = config.pipeMouthRadius;
  const mouthRy = config.pipeMouthRadius * 0.4;

  const rimGradient = ctx.createLinearGradient(x, y - mouthRy, x, y + mouthRy);
  rimGradient.addColorStop(0, lighten(baseColor, 0.35));
  rimGradient.addColorStop(0.55, baseColor);
  rimGradient.addColorStop(1, lighten(baseColor, -0.5));
  ctx.fillStyle = rimGradient;
  ctx.beginPath();
  ctx.ellipse(x, y, mouthRx, mouthRy, 0, 0, Math.PI * 2);
  ctx.fill();

  const holeGradient = ctx.createRadialGradient(x, y - mouthRy * 0.15, 0, x, y, mouthRx * 0.72);
  holeGradient.addColorStop(0, lighten(baseColor, -0.55));
  holeGradient.addColorStop(1, lighten(baseColor, -0.88));
  ctx.fillStyle = holeGradient;
  ctx.beginPath();
  ctx.ellipse(x, y, mouthRx * 0.7, mouthRy * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = lighten(baseColor, 0.55);
  ctx.lineWidth = Math.max(1, mouthRy * 0.3);
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.ellipse(x, y, mouthRx * 0.94, mouthRy * 0.94, 0, -Math.PI * 0.92, -Math.PI * 0.08);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function taperedDropPath(
  ctx: CanvasLike2D,
  bottomX: number,
  bottomY: number,
  bottomRadius: number,
  tipX: number,
  tipY: number
): void {
  const dx = tipX - bottomX;
  const dy = tipY - bottomY;
  const tipDistance = Math.hypot(dx, dy);
  if (tipDistance <= bottomRadius) {
    ctx.beginPath();
    ctx.arc(bottomX, bottomY, bottomRadius, 0, Math.PI * 2);
    return;
  }
  const axisAngle = Math.atan2(dy, dx);
  const beta = Math.acos(bottomRadius / tipDistance);
  const rightAngle = axisAngle - beta;
  const leftAngle = axisAngle + beta;
  const rightX = bottomX + bottomRadius * Math.cos(rightAngle);
  const rightY = bottomY + bottomRadius * Math.sin(rightAngle);
  const leftX = bottomX + bottomRadius * Math.cos(leftAngle);
  const leftY = bottomY + bottomRadius * Math.sin(leftAngle);

  ctx.beginPath();
  ctx.moveTo(rightX, rightY);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.arc(bottomX, bottomY, bottomRadius, leftAngle, rightAngle, false);
  ctx.closePath();
}

function dropPath(ctx: CanvasLike2D, x: number, y: number, radius: number): void {
  taperedDropPath(ctx, x, y, radius, x, y - radius * 1.8);
}

function sustainTrailPath(
  ctx: CanvasLike2D,
  bottomX: number,
  bottomY: number,
  radius: number,
  tipX: number,
  tipY: number
): void {
  const dx = tipX - bottomX;
  const dy = tipY - bottomY;
  const totalLength = Math.hypot(dx, dy);
  if (totalLength <= radius * 1.05) {
    ctx.beginPath();
    ctx.arc(bottomX, bottomY, radius, 0, Math.PI * 2);
    return;
  }

  const axisAngle = Math.atan2(dy, dx);
  const equatorAngle = axisAngle + Math.PI / 2;

  ctx.beginPath();
  ctx.ellipse(bottomX, bottomY, totalLength, radius, axisAngle, -Math.PI / 2, Math.PI / 2);
  ctx.arc(bottomX, bottomY, radius, equatorAngle, equatorAngle + Math.PI, false);
  ctx.closePath();
}

const STAR_POWER_BOLT_GLOW_COLOR = STAR_POWER_COLORS.info;
const STAR_POWER_BOLT_CORE_COLOR = "#f6efff";

interface BoltPoint {
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

function jaggedBoltPath(
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
  ctx.shadowBlur = glowBlur;
  ctx.shadowColor = STAR_POWER_BOLT_GLOW_COLOR;
  ctx.strokeStyle = STAR_POWER_BOLT_GLOW_COLOR;
  ctx.lineWidth = glowWidth;
  ctx.globalAlpha = alpha * glowAlphaScale;
  strokePolyline(ctx, points);

  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.shadowBlur = glowBlur * 0.35;
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

const BOLT_ARCHETYPES: readonly BoltArchetype[] = [
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

function pickArchetype(seed: number): BoltArchetype {
  const index = Math.floor(pseudoRandom(seed) * BOLT_ARCHETYPES.length) % BOLT_ARCHETYPES.length;
  return BOLT_ARCHETYPES[index];
}

const BOLT_REROLL_HZ_DEFAULT = 5.5;

function drawCrackleBolt(
  ctx: CanvasLike2D,
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
    const archetype = pickArchetype(seedBase * 3.1 + gen * 971.3);
    const seed = seedBase * 17.7 + gen * 53.1;
    const rawPoints = jaggedBoltPath(x, y, angle, length, seed, archetype.displacementRatio, archetype.depth);
    const jitterAmp = glowScale * 0.03;
    const jitterPhase = currentTime * 20 + seed;
    const points = rawPoints.map((p, i) => {
      if (i === 0 || i === rawPoints.length - 1) return p;
      const phase = jitterPhase + i * 2.1;
      return { x: p.x + Math.sin(phase) * jitterAmp, y: p.y + Math.cos(phase * 1.4) * jitterAmp * 0.6 };
    });

    const alpha = envelopeAlpha * genAlpha;
    strokeBoltPath(
      ctx,
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

    if (pseudoRandom(seed + 31.4) < archetype.forkChance && points.length > 3) {
      const forkOrigin = points[Math.floor(points.length * (0.35 + pseudoRandom(seed + 9) * 0.3))];
      const forkAngle = angle + (pseudoRandom(seed + 12) - 0.5) * 1.7;
      const forkLength = length * (0.35 + pseudoRandom(seed + 14) * 0.25);
      const forkPoints = jaggedBoltPath(
        forkOrigin.x,
        forkOrigin.y,
        forkAngle,
        forkLength,
        seed + 88,
        archetype.displacementRatio * 1.1,
        Math.max(1, archetype.depth - 1)
      );
      strokeBoltPath(
        ctx,
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

const STAR_POWER_DROP_GLOW_RGB = "156, 109, 255";
const STAR_POWER_GLOW_PULSE_HZ = 3.2;

function drawStarPowerDropAura(ctx: CanvasLike2D, x: number, y: number, radius: number, currentTime: number): void {
  const pulse = 0.7 + 0.3 * Math.sin(currentTime * STAR_POWER_GLOW_PULSE_HZ * Math.PI * 2);
  const auraRadius = radius * 1.9;
  const aura = ctx.createRadialGradient(x, y, 0, x, y, auraRadius);
  aura.addColorStop(0, `rgba(${STAR_POWER_DROP_GLOW_RGB}, ${0.32 * pulse})`);
  aura.addColorStop(0.55, `rgba(${STAR_POWER_DROP_GLOW_RGB}, ${0.13 * pulse})`);
  aura.addColorStop(1, `rgba(${STAR_POWER_DROP_GLOW_RGB}, 0)`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarPowerDropRim(ctx: CanvasLike2D, x: number, y: number, radius: number, currentTime: number): void {
  const pulse = 0.7 + 0.3 * Math.sin(currentTime * STAR_POWER_GLOW_PULSE_HZ * Math.PI * 2 + 1.5);
  ctx.shadowBlur = radius * 0.4;
  ctx.shadowColor = STAR_POWER_BOLT_GLOW_COLOR;
  ctx.strokeStyle = STAR_POWER_BOLT_CORE_COLOR;
  ctx.lineWidth = Math.max(1, radius * 0.07);
  ctx.globalAlpha = 0.2 + 0.25 * pulse;
  dropPath(ctx, x, y, radius);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

const STAR_POWER_SPARK_COUNT = 3;
const STAR_POWER_SPARK_ANGLE_SPREAD = Math.PI * 1.7;
const STAR_POWER_SPARK_REROLL_HZ = 4.2;

function drawStarPowerSparks(ctx: CanvasLike2D, x: number, y: number, radius: number, currentTime: number, seed: number): void {
  for (let i = 0; i < STAR_POWER_SPARK_COUNT; i++) {
    const boltSeed = seed * 17.3 + i * 91.7;
    const baseAngle = -Math.PI / 2 + (pseudoRandom(boltSeed) - 0.5) * STAR_POWER_SPARK_ANGLE_SPREAD;
    const length = radius * (1.15 + pseudoRandom(boltSeed + 3.1) * 0.85);
    drawCrackleBolt(ctx, x, y, baseAngle, length, boltSeed, currentTime + i * 0.37, radius, 0.85, STAR_POWER_SPARK_REROLL_HZ);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export const STAR_POWER_COLLECT_DURATION_SECONDS = 0.5;
const STAR_POWER_COLLECT_BOLT_COUNT: number = 5;
const STAR_POWER_COLLECT_FLASH_DURATION_SECONDS = 0.16;

function drawStarPowerCollectBurst(ctx: CanvasLike2D, x: number, y: number, config: RenderConfig, elapsedSeconds: number): void {
  const t = clamp01(elapsedSeconds / STAR_POWER_COLLECT_DURATION_SECONDS);
  const growT = 1 - (1 - t) * (1 - t);
  const fadeT = t * t * t;
  const travel = config.noteMaxRadius * 6.5;

  const flashT = clamp01(elapsedSeconds / STAR_POWER_COLLECT_FLASH_DURATION_SECONDS);
  if (flashT < 1) {
    ctx.shadowBlur = config.noteMaxRadius * 0.9;
    ctx.shadowColor = STAR_POWER_BOLT_GLOW_COLOR;
    ctx.fillStyle = STAR_POWER_BOLT_CORE_COLOR;
    ctx.globalAlpha = (1 - flashT) * 0.85;
    ctx.beginPath();
    ctx.arc(x, y, config.noteMaxRadius * lerp(0.35, 1.4, flashT), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < STAR_POWER_COLLECT_BOLT_COUNT; i++) {
    const seed = i * 41.3;
    const spread = STAR_POWER_COLLECT_BOLT_COUNT === 1 ? 0 : (i / (STAR_POWER_COLLECT_BOLT_COUNT - 1)) * 2 - 1;
    const startX = x + spread * config.noteMaxRadius * 1.2;
    const baseAngle = -Math.PI / 2 + spread * 0.4 + (pseudoRandom(seed + 5) - 0.5) * 0.3;
    const length = travel * growT * (0.85 + pseudoRandom(seed + 8.2) * 0.3);
    const displacementRatio = 0.2 + pseudoRandom(seed + 12) * 0.1;
    const alpha = (1 - fadeT) * 0.95;

    const points = jaggedBoltPath(startX, y, baseAngle, length, seed, displacementRatio, 4);
    strokeBoltPath(
      ctx,
      points,
      Math.max(1.5, config.noteMaxRadius * 0.13),
      Math.max(1, config.noteMaxRadius * 0.075),
      Math.max(0.4, config.noteMaxRadius * 0.025),
      config.noteMaxRadius * 1.0,
      alpha,
      0.7
    );

    if (pseudoRandom(seed + 13.1) > 0.4 && points.length > 2) {
      const forkOrigin = points[Math.floor(points.length / 2)];
      const forkAngle = baseAngle + (pseudoRandom(seed + 27.4) - 0.5) * 1.6;
      const forkPoints = jaggedBoltPath(forkOrigin.x, forkOrigin.y, forkAngle, length * 0.4, seed + 60, 0.22, 3);
      strokeBoltPath(
        ctx,
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

function drawDropShadow(ctx: CanvasLike2D, x: number, y: number, radius: number, alpha: number): void {
  const shadowY = y + radius * 0.55;
  const shadow = ctx.createRadialGradient(x, shadowY, 0, x, shadowY, radius * 0.95);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.35)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(x, shadowY, radius * 0.85, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function applyGlossyShading(
  ctx: CanvasLike2D,
  drawPath: () => void,
  x: number,
  y: number,
  radius: number,
  baseColor: string,
  alpha: number,
  highlightOffsetX: number = -0.3,
  highlightOffsetY: number = -0.4
): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;

  ctx.fillStyle = baseColor;
  drawPath();
  ctx.fill();

  const shadeX = x - highlightOffsetX * radius;
  const shadeY = y - highlightOffsetY * radius;
  const shade = ctx.createRadialGradient(shadeX, shadeY, 0, shadeX, shadeY, radius * 1.15);
  shade.addColorStop(0, mix(baseColor, "#000000", 0.4));
  shade.addColorStop(0.75, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shade;
  drawPath();
  ctx.fill();

  const highlightX = x + highlightOffsetX * radius;
  const highlightY = y + highlightOffsetY * radius;
  const highlight = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, radius * 0.8);
  highlight.addColorStop(0, lighten(baseColor, 0.8));
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highlight;
  drawPath();
  ctx.fill();

  const specular = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, radius * 0.3);
  specular.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  specular.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = specular;
  drawPath();
  ctx.fill();

  const rimGradient = ctx.createLinearGradient(highlightX, highlightY, shadeX, shadeY);
  rimGradient.addColorStop(0, lighten(baseColor, 0.2));
  rimGradient.addColorStop(1, lighten(baseColor, -0.55));
  ctx.strokeStyle = rimGradient;
  ctx.lineWidth = Math.max(1, radius * 0.06);
  drawPath();
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawDrop(ctx: CanvasLike2D, x: number, y: number, radius: number, baseColor: string, alpha: number): void {
  if (alpha <= 0) return;
  drawDropShadow(ctx, x, y, radius, alpha);
  applyGlossyShading(ctx, () => dropPath(ctx, x, y, radius), x, y, radius, baseColor, alpha);
}

const HOLD_SHAKE_FREQUENCY_HZ = 14;
const HOLD_SHAKE_AMPLITUDE_RATIO = 0.06;

function drawSustainTrail(
  ctx: CanvasLike2D,
  note: Note,
  config: RenderConfig,
  currentTime: number,
  baseColor: string,
  isHolding: boolean
): void {
  const endTime = note.time + note.duration;
  const bottomTime = Math.min(Math.max(currentTime, note.time), endTime);
  const topTime = Math.min(endTime, currentTime + config.approachTime);
  if (bottomTime >= topTime) return;

  const bottomProgress = visualProgress(progressFor(bottomTime, currentTime, config), config);
  const topProgress = visualProgress(progressFor(topTime, currentTime, config), config);
  let bottomX = laneX(note.fret, bottomProgress, config);
  let bottomY = bottomProgress * config.hitLineY;
  const bottomRadius = noteRadiusAt(bottomProgress, config);
  let topX = laneX(note.fret, topProgress, config);
  let topY = topProgress * config.hitLineY;

  if (isHolding) {
    const seed = note.fret * 3.7 + note.time * 11.0;
    const phase = currentTime * HOLD_SHAKE_FREQUENCY_HZ * Math.PI * 2 + seed;
    const amplitude = bottomRadius * HOLD_SHAKE_AMPLITUDE_RATIO;
    const jitterX = Math.sin(phase) * amplitude;
    const jitterY = Math.cos(phase * 1.3) * amplitude * 0.6;
    bottomX += jitterX;
    bottomY += jitterY;
    topX += jitterX;
    topY += jitterY;
  }

  const fillColor = isHolding ? lighten(baseColor, 0.15) : baseColor;

  applyGlossyShading(
    ctx,
    () => sustainTrailPath(ctx, bottomX, bottomY, bottomRadius, topX, topY),
    bottomX,
    bottomY,
    bottomRadius,
    fillColor,
    1
  );
}

function openBarPath(ctx: CanvasLike2D, x: number, y: number, halfWidth: number, halfHeight: number): void {
  const left = x - halfWidth;
  const right = x + halfWidth;
  ctx.beginPath();
  ctx.moveTo(left + halfHeight, y - halfHeight);
  ctx.lineTo(right - halfHeight, y - halfHeight);
  ctx.arc(right - halfHeight, y, halfHeight, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(left + halfHeight, y + halfHeight);
  ctx.arc(left + halfHeight, y, halfHeight, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
}

function drawOpenNoteBar(
  ctx: CanvasLike2D,
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  baseColor: string,
  alpha: number
): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;

  ctx.fillStyle = baseColor;
  openBarPath(ctx, x, y, halfWidth, halfHeight);
  ctx.fill();

  const highlight = ctx.createLinearGradient(x, y - halfHeight, x, y + halfHeight);
  highlight.addColorStop(0, lighten(baseColor, 0.6));
  highlight.addColorStop(0.55, "rgba(255, 255, 255, 0)");
  highlight.addColorStop(1, mix(baseColor, "#000000", 0.3));
  ctx.fillStyle = highlight;
  openBarPath(ctx, x, y, halfWidth, halfHeight);
  ctx.fill();

  ctx.strokeStyle = lighten(baseColor, -0.4);
  ctx.lineWidth = Math.max(1, halfHeight * 0.12);
  openBarPath(ctx, x, y, halfWidth, halfHeight);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawSustainDrop(ctx: CanvasLike2D, x: number, y: number, radius: number, baseColor: string, alpha: number): void {
  if (alpha <= 0 || radius <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

const ABSORB_DROPLET_COUNT: number = 20;
const ABSORB_FLASH_FRACTION = 0.35;
const ABSORB_INNER_RING_FRACTION = 0.6;

const OPEN_RESIDUE_RISE_SECONDS = 0.22;
export const OPEN_RESIDUE_FALL_SECONDS = 0.28;

function drawSplashDroplets(
  ctx: CanvasLike2D,
  x: number,
  y: number,
  config: RenderConfig,
  baseColor: string,
  seed: number,
  heightFraction: number,
  bobTime: number = 0,
  intensity: number = 1
): void {
  if (heightFraction <= 0.02) return;

  const dropletCount = Math.round(ABSORB_DROPLET_COUNT * intensity);
  const dropletColor = lighten(baseColor, 0.5);
  const dropletHighlight = lighten(baseColor, 0.92);
  for (let i = 0; i < dropletCount; i++) {
    const spread = dropletCount === 1 ? 0 : (i / (dropletCount - 1)) * 2 - 1;
    const px = x + spread * config.pipeMouthRadius * 0.6 + Math.sin(seed * 4.1 + i * 1.3) * config.pipeMouthRadius * 0.18;
    let localArc = 1;
    if (bobTime !== 0) {
      const cycleSeconds = 0.3 + 0.25 * Math.abs(Math.sin(seed * 1.3 + i * 0.7));
      const cyclePhase = (((bobTime + i * 0.11 + seed * 0.05) % cycleSeconds) + cycleSeconds) % cycleSeconds;
      localArc = Math.sin((cyclePhase / cycleSeconds) * Math.PI);
    }
    const liveHeightFraction = clamp01(heightFraction * localArc);
    const maxHeight = config.pipeMouthRadius * intensity * (0.115 + 0.8 * Math.abs(Math.sin(seed * 2.7 + i * 1.7)));
    const py = y - maxHeight * liveHeightFraction;
    const radius =
      config.noteMinRadius *
      intensity *
      (0.065 + 0.08 * Math.abs(Math.sin(seed * 3.3 + i * 2.1))) *
      lerp(0.5, 1, liveHeightFraction);
    const alpha = Math.pow(liveHeightFraction, 0.5);
    if (radius <= 0.2 || alpha <= 0.03) continue;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = dropletColor;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = dropletHighlight;
    ctx.beginPath();
    ctx.arc(px - radius * 0.3, py - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawClickFlash(
  ctx: CanvasLike2D,
  fret: Fret,
  config: RenderConfig,
  elapsedSeconds: number,
  seed: number,
  withParticles: boolean,
  drawBurstDroplets: boolean = withParticles,
  laneColors: Record<Fret, string> = LANE_COLORS,
  palette: Palette = COLORS,
  intensity: number = 1
): void {
  const t = clamp01(elapsedSeconds / ABSORB_DURATION_SECONDS);
  const laneColor = laneColors[fret] ?? palette.noteFallback;
  const baseColor = withParticles ? laneColor : mix(laneColor, palette.pipeMissGradientStops[2], 0.6);
  const x = laneX(fret, 1, config);
  const y = config.hitLineY;

  const flashT = clamp01(elapsedSeconds / (ABSORB_DURATION_SECONDS * ABSORB_FLASH_FRACTION));
  if (flashT < 1) {
    const flashRx = config.pipeMouthRadius * intensity * lerp(0.5, 0.95, flashT);
    const flashRy = flashRx * 0.4;
    ctx.globalAlpha = (1 - flashT) * 0.9;
    ctx.fillStyle = lighten(baseColor, 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y, flashRx, flashRy, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const outerRx = lerp(config.pipeMouthRadius * 0.55, config.pipeMouthRadius * intensity * 1.6, t);
  const outerRy = outerRx * 0.4;
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = lighten(baseColor, 0.5);
  ctx.lineWidth = Math.max(2, config.pipeMouthRadius * 0.12);
  ctx.beginPath();
  ctx.ellipse(x, y, outerRx, outerRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  const innerT = clamp01(elapsedSeconds / (ABSORB_DURATION_SECONDS * ABSORB_INNER_RING_FRACTION));
  const innerRx = lerp(config.pipeMouthRadius * 0.3, config.pipeMouthRadius * intensity * 1.05, innerT);
  const innerRy = innerRx * 0.4;
  ctx.globalAlpha = (1 - innerT) * 0.8;
  ctx.strokeStyle = lighten(baseColor, 0.75);
  ctx.lineWidth = Math.max(1.5, config.pipeMouthRadius * 0.07);
  ctx.beginPath();
  ctx.ellipse(x, y, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (!withParticles) {
    ctx.globalAlpha = 1;
    return;
  }

  if (drawBurstDroplets) {
    const arc = Math.sin(clamp01(t) * Math.PI);
    drawSplashDroplets(ctx, x, y, config, baseColor, seed, arc, 0, intensity);
  }

  ctx.globalAlpha = 1;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const AMBIENT_LIGHTNING_BOLT_COUNT = 4;

function ambientStrikeEnvelope(index: number, currentTime: number): { alpha: number; strikeIndex: number } {
  const cycleLength = 0.8 + pseudoRandom(index * 9.13 + 4) * 1.3;
  const cyclePos = ((currentTime % cycleLength) + cycleLength) % cycleLength;
  const strikeIndex = Math.floor(currentTime / cycleLength);
  const activeWindow = cycleLength * (0.22 + pseudoRandom(strikeIndex * 7.7 + index * 3.3) * 0.2);
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

function drawAmbientLightningBolt(ctx: CanvasLike2D, config: RenderConfig, index: number, currentTime: number): void {
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

function drawAmbientLightningBolts(ctx: CanvasLike2D, config: RenderConfig, currentTime: number): void {
  for (let i = 0; i < AMBIENT_LIGHTNING_BOLT_COUNT; i++) {
    drawAmbientLightningBolt(ctx, config, i, currentTime);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

const STAR_POWER_HIT_BOLT_DURATION_SECONDS = 0.22;
const STAR_POWER_HIT_BOLT_COUNT: number = 5;

function drawStarPowerHitBolt(ctx: CanvasLike2D, fret: Fret, config: RenderConfig, elapsedSeconds: number): void {
  const t = clamp01(elapsedSeconds / STAR_POWER_HIT_BOLT_DURATION_SECONDS);
  if (elapsedSeconds < 0 || t >= 1) return;
  const x = laneX(fret, 1, config);
  const y = config.hitLineY;
  const alpha = (1 - t) * 0.9;

  for (let i = 0; i < STAR_POWER_HIT_BOLT_COUNT; i++) {
    const seed = fret * 13.7 + i * 29.3;
    const spread = STAR_POWER_HIT_BOLT_COUNT === 1 ? 0 : (i / (STAR_POWER_HIT_BOLT_COUNT - 1)) * 2 - 1;
    const angle = -Math.PI / 2 + spread * 0.8 + (pseudoRandom(seed) - 0.5) * 0.4;
    const length = config.noteMaxRadius * (2.3 + pseudoRandom(seed + 3) * 1.1) * (1 - t * 0.2);

    const points = jaggedBoltPath(x, y, angle, length, seed, 0.26, 3);
    strokeBoltPath(
      ctx,
      points,
      Math.max(1.5, config.noteMaxRadius * 0.13),
      Math.max(0.8, config.noteMaxRadius * 0.065),
      Math.max(0.35, config.noteMaxRadius * 0.024),
      config.noteMaxRadius * 0.65,
      alpha,
      0.6
    );
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export function drawFrame(
  ctx: CanvasLike2D,
  notes: Note[],
  currentTime: number,
  config: RenderConfig = RENDER_CONFIG,
  judgedHits: ReadonlyMap<string, number> = EMPTY_JUDGED_HITS,
  holdingKeys: ReadonlySet<string> = EMPTY_HOLDING_KEYS,
  missedKeys: ReadonlySet<string> = EMPTY_MISSED_KEYS,
  errorClicks: ReadonlyMap<Fret, number> = EMPTY_ERROR_CLICKS,
  lastErrorAt: number | null = null,
  openHoldReleaseAt: ReadonlyMap<string, number> = EMPTY_OPEN_HOLD_RELEASE,
  palette: Palette = COLORS,
  intense: boolean = false,
  starPowerPhrases: StarPowerPhrase[] = EMPTY_STAR_POWER_PHRASES,
  starPowerPhraseBroken: readonly boolean[] = EMPTY_STAR_POWER_PHRASE_BROKEN,
  starPowerCollectAt: ReadonlyMap<string, number> = EMPTY_STAR_POWER_COLLECT_AT
): VisibleNote[] {
  const laneColors = LANE_COLORS;
  const intensity = intense ? 1.6 : 1;
  const frameStyles = getFrameInvariantStyles(ctx, config, palette, laneColors, intense);

  ctx.fillStyle = trackTint(palette.canvasBackground, intense);
  ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
  drawStageGlow(ctx, config, frameStyles.stageGlowGradient);

  const railMissIntensity =
    lastErrorAt === null ? 0 : 1 - clamp01((currentTime - lastErrorAt) / RAIL_MISS_FADE_SECONDS);

  drawLaneBeams(ctx, config, frameStyles.laneBeamGradients);
  drawFretboardGrid(ctx, config, currentTime, frameStyles.laneGridStrokeColors, frameStyles.gridLineStrokeColor);
  drawEdgeRail(ctx, -1, config, railMissIntensity, palette);
  drawEdgeRail(ctx, 1, config, railMissIntensity, palette);
  for (const fret of config.laneOrder) {
    drawPipeBarrelAndMouth(ctx, fret, config, laneColors, palette);
  }

  for (const [fret, pressedAt] of errorClicks) {
    const elapsed = currentTime - pressedAt;
    if (elapsed >= 0 && elapsed <= ABSORB_DURATION_SECONDS) {
      const flashFrets = fret === 7 ? config.laneOrder : [fret];
      for (const flashFret of flashFrets) {
        drawClickFlash(ctx, flashFret, config, elapsed, pressedAt, false, false, laneColors, palette, intensity);
      }
    }
  }

  const visible = getVisibleNotes(notes, currentTime, config);

  for (const note of visible) {
    if (note.fret !== 7 || note.sustainDrops.length === 0) continue;
    const baseColor = intense ? STAR_POWER_BOLT_GLOW_COLOR : laneColors[note.fret] ?? palette.noteFallback;
    for (const drop of note.sustainDrops) {
      drawSustainDrop(ctx, drop.x, drop.y, drop.radius, baseColor, 0.75);
    }
  }

  for (const note of visible) {
    const key = noteRenderKey(note.fret, note.time);
    const isMissed = missedKeys.has(key);

    const judgedAt = judgedHits.get(key);

    const collectAt = starPowerCollectAt.get(key);
    if (collectAt !== undefined) {
      const collectElapsed = currentTime - collectAt;
      if (collectElapsed >= 0 && collectElapsed <= STAR_POWER_COLLECT_DURATION_SECONDS) {
        drawStarPowerCollectBurst(ctx, laneX(note.fret, 1, config), config.hitLineY, config, collectElapsed);
      }
    }

    if (judgedAt !== undefined) {
      const isHeldOpen = note.fret === 7 && note.duration > 0;
      const elapsed = currentTime - judgedAt;
      const flashFrets = note.fret === 7 ? config.laneOrder : [note.fret];

      if (elapsed >= 0 && elapsed <= ABSORB_DURATION_SECONDS) {
        for (const flashFret of flashFrets) {
          drawClickFlash(ctx, flashFret, config, elapsed, note.time, true, !isHeldOpen && !intense, laneColors, palette, intensity);
          if (intense) drawStarPowerHitBolt(ctx, flashFret, config, elapsed);
        }
      }

      if (isHeldOpen && currentTime >= judgedAt) {
        const naturalEnd = note.time + note.duration;
        const naturalAnchor = currentTime >= naturalEnd ? naturalEnd : Infinity;
        const detectedAnchor = openHoldReleaseAt.get(key) ?? Infinity;
        const anchor = Math.min(naturalAnchor, detectedAnchor);
        const releasedAt = anchor === Infinity ? undefined : anchor;
        const rise = clamp01(elapsed / OPEN_RESIDUE_RISE_SECONDS);
        const heightFraction =
          releasedAt !== undefined ? Math.min(rise, clamp01(1 - (currentTime - releasedAt) / OPEN_RESIDUE_FALL_SECONDS)) : rise;
        if (heightFraction > 0.02) {
          for (const flashFret of flashFrets) {
            const laneColor = laneColors[flashFret] ?? palette.noteFallback;
            drawSplashDroplets(
              ctx,
              laneX(flashFret, 1, config),
              config.hitLineY,
              config,
              laneColor,
              note.time,
              heightFraction,
              currentTime,
              intensity
            );
          }
        }
      }
    }

    const notePhraseIndex = phraseIndexAt(starPowerPhrases, note.time);
    const inActiveStarPowerPhrase =
      judgedAt === undefined && !isMissed && notePhraseIndex !== -1 && !starPowerPhraseBroken[notePhraseIndex];
    const noteGlowing = judgedAt === undefined && !isMissed && (intense || inActiveStarPowerPhrase);
    const sparkOriginY = note.y + note.radius * 0.1;

    if (noteGlowing) drawStarPowerDropAura(ctx, note.x, note.y, note.radius, currentTime);

    const isSustain = note.fret !== 7 && note.duration > 0;
    if (isSustain) {
      const baseColor = intense ? STAR_POWER_BOLT_GLOW_COLOR : laneColors[note.fret] ?? palette.noteFallback;
      const color = isMissed ? desaturate(baseColor, MISS_DESATURATION_AMOUNT) : baseColor;
      drawSustainTrail(ctx, note, config, currentTime, color, !isMissed && holdingKeys.has(key));
      if (inActiveStarPowerPhrase) drawStarPowerSparks(ctx, note.x, sparkOriginY, note.radius, currentTime, note.time);
      continue;
    }

    if (judgedAt !== undefined) continue;

    const progress = note.y / config.hitLineY;
    const fadeEnd = 1 + config.despawnAfter / config.approachTime;
    const alpha = progress <= 1 ? 1 : 1 - clamp01((progress - 1) / (fadeEnd - 1));
    const baseColor = intense ? STAR_POWER_BOLT_GLOW_COLOR : laneColors[note.fret] ?? palette.noteFallback;
    const color = isMissed ? desaturate(baseColor, MISS_DESATURATION_AMOUNT) : baseColor;

    if (note.fret === 7) {
      const firstFret = config.laneOrder[0];
      const lastFret = config.laneOrder[config.laneOrder.length - 1];
      const halfWidth = Math.abs(laneX(lastFret, progress, config) - laneX(firstFret, progress, config)) / 2;
      drawOpenNoteBar(ctx, note.x, note.y, halfWidth, note.radius * 0.7, color, alpha);
    } else {
      drawDrop(ctx, note.x, note.y, note.radius, color, alpha);
      if (noteGlowing) drawStarPowerDropRim(ctx, note.x, note.y, note.radius, currentTime);
    }
    if (inActiveStarPowerPhrase) drawStarPowerSparks(ctx, note.x, sparkOriginY, note.radius, currentTime, note.time);
  }

  if (intense) drawAmbientLightningBolts(ctx, config, currentTime);

  return visible;
}
