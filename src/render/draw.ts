import type { Fret, Note } from "../types.js";
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
import { COLORS } from "../colors.js";

interface CanvasGradientLike {
  addColorStop(offset: number, color: string): void;
}

export interface CanvasLike2D {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  globalAlpha: number;
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

function drawFretboardGrid(ctx: CanvasLike2D, config: RenderConfig, currentTime: number): void {
  const lastFret = config.laneOrder[config.laneOrder.length - 1];
  const firstFret = config.laneOrder[0];

  ctx.strokeStyle = COLORS.tertiary;
  ctx.lineWidth = 2;

  for (const fret of config.laneOrder) {
    ctx.beginPath();
    ctx.moveTo(laneX(fret, 0, config), 0);
    ctx.lineTo(laneX(fret, 1, config), config.hitLineY);
    ctx.stroke();
  }

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

function drawEdgeRail(ctx: CanvasLike2D, side: -1 | 1, config: RenderConfig, missIntensity: number): void {
  const topX = highwayEdgeX(side, 0, config);
  const bottomX = highwayEdgeX(side, 1, config);
  const topHalf = config.noteMinRadius * 0.42;
  const bottomHalf = config.noteMaxRadius * 0.58;

  const normalStops = COLORS.pipeGradientStops;
  const missStops = COLORS.pipeMissGradientStops;
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

  const gradient = ctx.createLinearGradient(bottomX - bottomHalf, 0, bottomX + bottomHalf, 0);
  gradient.addColorStop(0, stops[0]);
  gradient.addColorStop(0.3, stops[1]);
  gradient.addColorStop(0.5, stops[2]);
  gradient.addColorStop(0.7, stops[3]);
  gradient.addColorStop(1, stops[4]);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(topX - topHalf, 0);
  ctx.lineTo(topX + topHalf, 0);
  ctx.lineTo(bottomX + bottomHalf, config.hitLineY);
  ctx.lineTo(bottomX - bottomHalf, config.hitLineY);
  ctx.closePath();
  ctx.fill();

  const glossOffset = 0.18;
  ctx.strokeStyle = lighten(stops[2], 0.4);
  ctx.lineWidth = Math.max(1, topHalf * 0.35);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(topX - inward * topHalf * glossOffset, topHalf * 0.5);
  ctx.lineTo(bottomX - inward * bottomHalf * glossOffset, config.hitLineY - bottomHalf * 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = lighten(stops[0], -0.3);
  ctx.lineWidth = Math.max(1, topHalf * 0.25);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(topX + inward * topHalf * 0.85, topHalf * 0.5);
  ctx.lineTo(bottomX + inward * bottomHalf * 0.85, config.hitLineY - bottomHalf * 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPipeBarrelAndMouth(ctx: CanvasLike2D, fret: Fret, config: RenderConfig): void {
  const baseColor = LANE_COLORS[fret] ?? COLORS.noteFallback;
  const x = laneX(fret, 1, config);
  const halfWidth = pipeHalfWidthAt(1, config);

  const barrelGradient = ctx.createLinearGradient(x - halfWidth, 0, x + halfWidth, 0);
  barrelGradient.addColorStop(0, lighten(baseColor, -0.6));
  barrelGradient.addColorStop(0.5, baseColor);
  barrelGradient.addColorStop(1, lighten(baseColor, -0.6));
  ctx.fillStyle = barrelGradient;
  ctx.fillRect(x - halfWidth, config.hitLineY, halfWidth * 2, config.canvasHeight - config.hitLineY);

  const mouthRx = config.pipeMouthRadius;
  const mouthRy = config.pipeMouthRadius * 0.4;

  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(x, config.hitLineY, mouthRx, mouthRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = lighten(baseColor, -0.8);
  ctx.beginPath();
  ctx.ellipse(x, config.hitLineY, mouthRx * 0.7, mouthRy * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
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

function drawDrop(ctx: CanvasLike2D, x: number, y: number, radius: number, baseColor: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;

  ctx.fillStyle = baseColor;
  dropPath(ctx, x, y, radius);
  ctx.fill();

  const highlightX = x - radius * 0.3;
  const highlightY = y - radius * 0.4;
  const highlight = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, radius * 0.8);
  highlight.addColorStop(0, lighten(baseColor, 0.8));
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highlight;
  dropPath(ctx, x, y, radius);
  ctx.fill();

  ctx.strokeStyle = lighten(baseColor, -0.4);
  ctx.lineWidth = Math.max(1, radius * 0.06);
  dropPath(ctx, x, y, radius);
  ctx.stroke();

  ctx.globalAlpha = 1;
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

  ctx.fillStyle = fillColor;
  sustainTrailPath(ctx, bottomX, bottomY, bottomRadius, topX, topY);
  ctx.fill();

  const highlightX = bottomX - bottomRadius * 0.3;
  const highlightY = bottomY - bottomRadius * 0.4;
  const highlight = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, bottomRadius * 0.8);
  highlight.addColorStop(0, lighten(fillColor, 0.8));
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highlight;
  sustainTrailPath(ctx, bottomX, bottomY, bottomRadius, topX, topY);
  ctx.fill();

  ctx.strokeStyle = lighten(fillColor, -0.4);
  ctx.lineWidth = Math.max(1, bottomRadius * 0.06);
  sustainTrailPath(ctx, bottomX, bottomY, bottomRadius, topX, topY);
  ctx.stroke();
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
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
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

const ABSORB_PARTICLE_COUNT = 7;
const ABSORB_FLASH_FRACTION = 0.35;
const ABSORB_INNER_RING_FRACTION = 0.6;

function drawClickFlash(
  ctx: CanvasLike2D,
  fret: Fret,
  config: RenderConfig,
  elapsedSeconds: number,
  seed: number,
  withParticles: boolean
): void {
  const t = clamp01(elapsedSeconds / ABSORB_DURATION_SECONDS);
  const laneColor = LANE_COLORS[fret] ?? COLORS.noteFallback;
  const baseColor = withParticles ? laneColor : mix(laneColor, COLORS.pipeMissGradientStops[2], 0.6);
  const x = laneX(fret, 1, config);
  const y = config.hitLineY;

  const flashT = clamp01(elapsedSeconds / (ABSORB_DURATION_SECONDS * ABSORB_FLASH_FRACTION));
  if (flashT < 1) {
    const flashRx = config.pipeMouthRadius * lerp(0.5, 0.95, flashT);
    const flashRy = flashRx * 0.4;
    ctx.globalAlpha = (1 - flashT) * 0.9;
    ctx.fillStyle = lighten(baseColor, 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y, flashRx, flashRy, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const outerRx = lerp(config.pipeMouthRadius * 0.55, config.pipeMouthRadius * 1.6, t);
  const outerRy = outerRx * 0.4;
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = lighten(baseColor, 0.5);
  ctx.lineWidth = Math.max(2, config.pipeMouthRadius * 0.12);
  ctx.beginPath();
  ctx.ellipse(x, y, outerRx, outerRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  const innerT = clamp01(elapsedSeconds / (ABSORB_DURATION_SECONDS * ABSORB_INNER_RING_FRACTION));
  const innerRx = lerp(config.pipeMouthRadius * 0.3, config.pipeMouthRadius * 1.05, innerT);
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

  const particleColor = lighten(baseColor, 0.3);
  for (let i = 0; i < ABSORB_PARTICLE_COUNT; i++) {
    const angle = (i / ABSORB_PARTICLE_COUNT) * Math.PI * 2 + seed;
    const reach = config.pipeMouthRadius * (0.9 + 0.4 * Math.sin(seed * 3.1 + i));
    const px = x + Math.cos(angle) * reach * t;
    const py = y - Math.abs(Math.sin(angle)) * reach * t * 0.7 + reach * 1.4 * t * t;
    const particleRadius = config.noteMinRadius * 0.22 * (1 - t);
    if (particleRadius <= 0) continue;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = particleColor;
    ctx.beginPath();
    ctx.arc(px, py, particleRadius, 0, Math.PI * 2);
    ctx.fill();
  }

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
  lastErrorAt: number | null = null
): VisibleNote[] {
  ctx.fillStyle = COLORS.canvasBackground;
  ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

  const railMissIntensity =
    lastErrorAt === null ? 0 : 1 - clamp01((currentTime - lastErrorAt) / RAIL_MISS_FADE_SECONDS);

  drawFretboardGrid(ctx, config, currentTime);
  drawEdgeRail(ctx, -1, config, railMissIntensity);
  drawEdgeRail(ctx, 1, config, railMissIntensity);
  for (const fret of config.laneOrder) {
    drawPipeBarrelAndMouth(ctx, fret, config);
  }

  for (const [fret, pressedAt] of errorClicks) {
    const elapsed = currentTime - pressedAt;
    if (elapsed >= 0 && elapsed <= ABSORB_DURATION_SECONDS) {
      drawClickFlash(ctx, fret, config, elapsed, pressedAt, false);
    }
  }

  const visible = getVisibleNotes(notes, currentTime, config);

  for (const note of visible) {
    if (note.fret !== 7 || note.sustainDrops.length === 0) continue;
    const baseColor = LANE_COLORS[note.fret] ?? COLORS.noteFallback;
    for (const drop of note.sustainDrops) {
      drawSustainDrop(ctx, drop.x, drop.y, drop.radius, baseColor, 0.75);
    }
  }

  for (const note of visible) {
    const key = noteRenderKey(note.fret, note.time);
    const isMissed = missedKeys.has(key);

    const judgedAt = judgedHits.get(key);

    if (judgedAt !== undefined) {
      const elapsed = currentTime - judgedAt;
      if (elapsed >= 0 && elapsed <= ABSORB_DURATION_SECONDS) {
        drawClickFlash(ctx, note.fret, config, elapsed, note.time, true);
      }
    }

    const isSustain = note.fret !== 7 && note.duration > 0;
    if (isSustain) {
      const baseColor = LANE_COLORS[note.fret] ?? COLORS.noteFallback;
      const color = isMissed ? desaturate(baseColor, MISS_DESATURATION_AMOUNT) : baseColor;
      drawSustainTrail(ctx, note, config, currentTime, color, !isMissed && holdingKeys.has(key));
      continue;
    }

    if (judgedAt !== undefined) continue;

    const progress = note.y / config.hitLineY;
    const fadeEnd = 1 + config.despawnAfter / config.approachTime;
    const alpha = progress <= 1 ? 1 : 1 - clamp01((progress - 1) / (fadeEnd - 1));
    const baseColor = LANE_COLORS[note.fret] ?? COLORS.noteFallback;
    const color = isMissed ? desaturate(baseColor, MISS_DESATURATION_AMOUNT) : baseColor;

    if (note.fret === 7) {
      const firstFret = config.laneOrder[0];
      const lastFret = config.laneOrder[config.laneOrder.length - 1];
      const halfWidth = Math.abs(laneX(lastFret, progress, config) - laneX(firstFret, progress, config)) / 2;
      drawOpenNoteBar(ctx, note.x, note.y, halfWidth, note.radius * 0.7, color, alpha);
    } else {
      drawDrop(ctx, note.x, note.y, note.radius, color, alpha);
    }
  }

  return visible;
}
