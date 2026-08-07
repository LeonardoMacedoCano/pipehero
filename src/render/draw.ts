import type { Fret, Note, StarPowerPhrase } from "../types.js";
import {
  RENDER_CONFIG,
  LANE_COLORS,
  laneColorsFor,
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
import { COLORS, type Palette } from "../colors.js";
import { phraseIndexAt } from "../engine/starPower.js";
import type { CanvasGradientLike, CanvasLike2D } from "./canvasLike.js";
import { dropPath } from "./dropShape.js";
import { clamp01, lerp } from "./mathUtils.js";
import { DEFAULT_GRAPHICS_QUALITY, graphicsSettingsFor, type GraphicsSettings } from "./graphicsQuality.js";
import {
  STAR_POWER_COLLECT_DURATION_SECONDS,
  drawAmbientLightningBolts,
  drawStarPowerCollectBurst,
  drawStarPowerDropAura,
  drawStarPowerDropHalo,
  drawStarPowerDropRim,
  drawStarPowerHitBolt,
  drawStarPowerSparks,
} from "./starPowerFx.js";

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

function pipeHalfWidthAt(progress: number, config: RenderConfig): number {
  if (config.laneOrder.length < 2) return config.noteMaxRadius * 2.5;
  const spacing = Math.abs(laneX(config.laneOrder[1], progress, config) - laneX(config.laneOrder[0], progress, config));
  return spacing * 0.51;
}

function pipeBarrelXRange(fret: Fret, config: RenderConfig): [number, number] {
  const order = config.laneOrder;
  const index = order.indexOf(fret);
  const x = laneX(fret, 1, config);
  const left = index > 0 ? (x + laneX(order[index - 1], 1, config)) / 2 : 0;
  const right = index < order.length - 1 ? (x + laneX(order[index + 1], 1, config)) / 2 : config.canvasWidth;
  return [left, right];
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

const INTENSE_TINT_BRIGHTEN_AMOUNT = 0.45;

function intenseDropColor(laneColor: string, intense: boolean, graphicsSettings: GraphicsSettings, glowColor: string): string {
  if (!intense) return laneColor;
  return graphicsSettings.intenseDropStyle === "tint" ? lighten(laneColor, INTENSE_TINT_BRIGHTEN_AMOUNT) : glowColor;
}

function frameInvariantStylesKey(config: RenderConfig, palette: Palette): string {
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
    palette.lane1,
    palette.lane2,
    palette.lane3,
    palette.lane4,
    palette.lane5,
    palette.laneOpen,
  ].join("|");
}

function getFrameInvariantStyles(
  ctx: CanvasLike2D,
  config: RenderConfig,
  palette: Palette,
  laneColors: Record<Fret, string>
): FrameInvariantStyles {
  const key = frameInvariantStylesKey(config, palette);
  const cached = frameInvariantStylesByCtx.get(ctx);
  if (cached && cached.key === key) return cached;

  const backgroundColor = palette.canvasBackground;

  const stageGlowGradient = ctx.createRadialGradient(
    config.highwayCenterX,
    config.hitLineY,
    0,
    config.highwayCenterX,
    config.hitLineY,
    config.canvasHeight * 0.85
  );
  stageGlowGradient.addColorStop(0, mix(backgroundColor, palette.info, 0.28));
  stageGlowGradient.addColorStop(0.45, mix(backgroundColor, palette.secondary, 0.55));
  stageGlowGradient.addColorStop(1, backgroundColor);

  const tertiary = palette.tertiary;
  const quaternary = palette.quaternary;

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
  const y = config.hitLineY;
  const [barrelLeft, barrelRight] = pipeBarrelXRange(fret, config);

  const barrelGradient = ctx.createLinearGradient(barrelLeft, 0, barrelRight, 0);
  barrelGradient.addColorStop(0, lighten(baseColor, -0.6));
  barrelGradient.addColorStop(0.5, baseColor);
  barrelGradient.addColorStop(1, lighten(baseColor, -0.6));
  ctx.fillStyle = barrelGradient;
  ctx.fillRect(barrelLeft, y, barrelRight - barrelLeft, config.canvasHeight - y);

  const depthFade = ctx.createLinearGradient(0, y, 0, config.canvasHeight);
  depthFade.addColorStop(0, "rgba(0, 0, 0, 0)");
  depthFade.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = depthFade;
  ctx.fillRect(barrelLeft, y, barrelRight - barrelLeft, config.canvasHeight - y);

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
  starPowerCollectAt: ReadonlyMap<string, number> = EMPTY_STAR_POWER_COLLECT_AT,
  graphicsSettings: GraphicsSettings = graphicsSettingsFor(DEFAULT_GRAPHICS_QUALITY)
): VisibleNote[] {
  const laneColors = laneColorsFor(palette);
  const intensity = intense ? 1.6 : 1;
  const frameStyles = getFrameInvariantStyles(ctx, config, palette, laneColors);

  ctx.fillStyle = palette.canvasBackground;
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
    const baseColor = intenseDropColor(laneColors[note.fret] ?? palette.noteFallback, intense, graphicsSettings, palette.info);
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
      if (collectElapsed >= 0 && collectElapsed <= STAR_POWER_COLLECT_DURATION_SECONDS && graphicsSettings.lightningEffectsEnabled) {
        drawStarPowerCollectBurst(
          ctx,
          palette.info,
          laneX(note.fret, 1, config),
          config.hitLineY,
          config,
          collectElapsed,
          graphicsSettings.boltCountMultiplier
        );
      }
    }

    if (judgedAt !== undefined) {
      const isHeldOpen = note.fret === 7 && note.duration > 0;
      const elapsed = currentTime - judgedAt;
      const flashFrets = note.fret === 7 ? config.laneOrder : [note.fret];

      if (elapsed >= 0 && elapsed <= ABSORB_DURATION_SECONDS) {
        for (const flashFret of flashFrets) {
          drawClickFlash(
            ctx,
            flashFret,
            config,
            elapsed,
            note.time,
            true,
            !isHeldOpen && !intense && graphicsSettings.hitResidueEnabled,
            laneColors,
            palette,
            intensity
          );
          if (intense && graphicsSettings.lightningEffectsEnabled) {
            drawStarPowerHitBolt(ctx, palette.info, flashFret, config, elapsed, graphicsSettings.boltCountMultiplier);
          }
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
        if (heightFraction > 0.02 && graphicsSettings.hitResidueEnabled) {
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

    if (noteGlowing) {
      if (graphicsSettings.intenseDropStyle === "tint") {
        drawStarPowerDropHalo(ctx, palette.info, note.x, note.y, note.radius, currentTime);
      } else {
        drawStarPowerDropAura(ctx, palette.info, note.x, note.y, note.radius, currentTime);
      }
    }

    const isSustain = note.fret !== 7 && note.duration > 0;
    if (isSustain) {
      const baseColor = intenseDropColor(laneColors[note.fret] ?? palette.noteFallback, intense, graphicsSettings, palette.info);
      const color = isMissed ? desaturate(baseColor, MISS_DESATURATION_AMOUNT) : baseColor;
      drawSustainTrail(ctx, note, config, currentTime, color, !isMissed && holdingKeys.has(key));
      if (inActiveStarPowerPhrase && graphicsSettings.lightningEffectsEnabled) {
        drawStarPowerSparks(ctx, palette.info, note.x, sparkOriginY, note.radius, currentTime, note.time, graphicsSettings.boltCountMultiplier);
      }
      continue;
    }

    if (judgedAt !== undefined) continue;

    const progress = note.y / config.hitLineY;
    const fadeEnd = 1 + config.despawnAfter / config.approachTime;
    const alpha = progress <= 1 ? 1 : 1 - clamp01((progress - 1) / (fadeEnd - 1));
    const baseColor = intenseDropColor(laneColors[note.fret] ?? palette.noteFallback, intense, graphicsSettings, palette.info);
    const color = isMissed ? desaturate(baseColor, MISS_DESATURATION_AMOUNT) : baseColor;

    if (note.fret === 7) {
      const firstFret = config.laneOrder[0];
      const lastFret = config.laneOrder[config.laneOrder.length - 1];
      const halfWidth = Math.abs(laneX(lastFret, progress, config) - laneX(firstFret, progress, config)) / 2;
      drawOpenNoteBar(ctx, note.x, note.y, halfWidth, note.radius * 0.7, color, alpha);
    } else {
      drawDrop(ctx, note.x, note.y, note.radius, color, alpha);
      if (noteGlowing) drawStarPowerDropRim(ctx, palette.info, note.x, note.y, note.radius, currentTime);
    }
    if (inActiveStarPowerPhrase && graphicsSettings.lightningEffectsEnabled) {
      drawStarPowerSparks(ctx, palette.info, note.x, sparkOriginY, note.radius, currentTime, note.time, graphicsSettings.boltCountMultiplier);
    }
  }

  if (intense && graphicsSettings.lightningEffectsEnabled) {
    drawAmbientLightningBolts(ctx, palette.info, config, currentTime, graphicsSettings.boltCountMultiplier);
  }

  return visible;
}
