import type { Fret, Note } from "../types.js";
import { COLORS, type Palette } from "../colors.js";

export interface RenderConfig {
  canvasWidth: number;
  canvasHeight: number;
  hitLineY: number;
  approachTime: number;
  despawnAfter: number;
  laneOrder: Fret[];
  highwayTopWidth: number;
  highwayBottomWidth: number;
  highwayCenterX: number;
  noteMinRadius: number;
  noteMaxRadius: number;
  pipeMouthRadius: number;
}

export interface SustainDrop {
  x: number;
  y: number;
  radius: number;
}

export interface VisibleNote extends Note {
  x: number;
  y: number;
  radius: number;
  sustainDrops: SustainDrop[];
}

const NOTE_MAX_RADIUS_WIDTH_RATIO = 0.032;
const NOTE_MAX_RADIUS_MIN_PX = 18;
const NOTE_MAX_RADIUS_MAX_PX = 48;
const NOTE_MIN_RADIUS_RATIO = 0.35;

const HIT_LINE_Y_RATIO = 0.95;

const APPROACH_TIME_SECONDS = 2.0;
const DESPAWN_AFTER_SECONDS = 0.3;

const LANE_ORDER: Fret[] = [0, 1, 2, 3, 4];
const HIGHWAY_TOP_WIDTH_RATIO = 0.26;
const HIGHWAY_BOTTOM_WIDTH_RATIO = 0.88;

const PIPE_MOUTH_RADIUS_RATIO = 1.25;

export function createRenderConfig(canvasWidth: number, canvasHeight: number): RenderConfig {
  const maxRadius = clamp(canvasWidth * NOTE_MAX_RADIUS_WIDTH_RATIO, NOTE_MAX_RADIUS_MIN_PX, NOTE_MAX_RADIUS_MAX_PX);
  return {
    canvasWidth,
    canvasHeight,
    hitLineY: canvasHeight * HIT_LINE_Y_RATIO,
    approachTime: APPROACH_TIME_SECONDS,
    despawnAfter: DESPAWN_AFTER_SECONDS,
    laneOrder: LANE_ORDER,
    highwayTopWidth: canvasWidth * HIGHWAY_TOP_WIDTH_RATIO,
    highwayBottomWidth: canvasWidth * HIGHWAY_BOTTOM_WIDTH_RATIO,
    highwayCenterX: canvasWidth / 2,
    noteMinRadius: maxRadius * NOTE_MIN_RADIUS_RATIO,
    noteMaxRadius: maxRadius,
    pipeMouthRadius: maxRadius * PIPE_MOUTH_RADIUS_RATIO,
  };
}

export const RENDER_CONFIG: RenderConfig = createRenderConfig(800, 600);

export function highwayBuildConfig(config: RenderConfig, buildProgress: number): RenderConfig {
  const t = clamp(buildProgress, 0, 1);
  if (t >= 1) return config;
  return {
    ...config,
    highwayTopWidth: config.highwayTopWidth * t,
    highwayBottomWidth: config.highwayBottomWidth * t,
    pipeMouthRadius: config.pipeMouthRadius * t,
  };
}

export function laneColorsFor(palette: Palette): Record<Fret, string> {
  return {
    0: palette.laneGreen,
    1: palette.laneRed,
    2: palette.laneYellow,
    3: palette.laneBlue,
    4: palette.laneOrange,
    7: palette.laneOpen,
  };
}

export const LANE_COLORS: Record<Fret, string> = laneColorsFor(COLORS);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp(t, 0, 1);
}

export function laneCenterOffset(fret: Fret, config: RenderConfig = RENDER_CONFIG): number {
  if (fret === 7) return 0;
  const index = config.laneOrder.indexOf(fret);
  if (index === -1) return 0;
  const lastIndex = config.laneOrder.length - 1;
  if (lastIndex <= 0) return 0;
  return (index / lastIndex) * 2 - 1;
}

function highwayHalfWidthAt(progress: number, config: RenderConfig): number {
  return lerp(config.highwayTopWidth, config.highwayBottomWidth, progress) / 2;
}

const HIGHWAY_EDGE_MARGIN_RATIO = 1.12;

export function highwayEdgeX(side: -1 | 1, progress: number, config: RenderConfig = RENDER_CONFIG): number {
  return config.highwayCenterX + side * highwayHalfWidthAt(progress, config) * HIGHWAY_EDGE_MARGIN_RATIO;
}

export function progressFor(time: number, currentTime: number, config: RenderConfig = RENDER_CONFIG): number {
  const timeUntilHit = time - currentTime;
  return 1 - timeUntilHit / config.approachTime;
}

export function visualProgress(rawProgress: number, config: RenderConfig = RENDER_CONFIG): number {
  const ratio = config.noteMinRadius / config.noteMaxRadius;
  return (2 * ratio * rawProgress + (1 - ratio) * rawProgress * rawProgress) / (1 + ratio);
}

export function laneX(fret: Fret, progress: number, config: RenderConfig = RENDER_CONFIG): number {
  return config.highwayCenterX + laneCenterOffset(fret, config) * highwayHalfWidthAt(progress, config);
}

export function noteY(note: { time: number }, currentTime: number, config: RenderConfig = RENDER_CONFIG): number {
  return visualProgress(progressFor(note.time, currentTime, config), config) * config.hitLineY;
}

export function noteRadiusAt(progress: number, config: RenderConfig = RENDER_CONFIG): number {
  return lerp(config.noteMinRadius, config.noteMaxRadius, progress);
}

const SUSTAIN_DROP_SPACING_SECONDS = 0.12;

function sustainDrops(note: Note, currentTime: number, config: RenderConfig): SustainDrop[] {
  const drops: SustainDrop[] = [];
  const endTime = note.time + note.duration;
  for (let t = note.time + SUSTAIN_DROP_SPACING_SECONDS; t <= endTime; t += SUSTAIN_DROP_SPACING_SECONDS) {
    const timeUntilHit = t - currentTime;
    if (timeUntilHit > config.approachTime || timeUntilHit < -config.despawnAfter) continue;
    const progress = visualProgress(progressFor(t, currentTime, config), config);
    drops.push({
      x: laneX(note.fret, progress, config),
      y: progress * config.hitLineY,
      radius: noteRadiusAt(progress, config) * 0.55,
    });
  }
  return drops;
}

export function noteRenderKey(fret: Fret, time: number): string {
  return `${fret}:${time}`;
}

export function getVisibleNotes(notes: Note[], currentTime: number, config: RenderConfig = RENDER_CONFIG): VisibleNote[] {
  return notes
    .filter((note) => {
      const timeUntilStart = note.time - currentTime;
      const timeUntilEnd = note.time + note.duration - currentTime;
      return timeUntilStart <= config.approachTime && timeUntilEnd >= -config.despawnAfter;
    })
    .map((note) => {
      const progress = visualProgress(progressFor(note.time, currentTime, config), config);
      return {
        ...note,
        x: laneX(note.fret, progress, config),
        y: progress * config.hitLineY,
        radius: noteRadiusAt(progress, config),
        sustainDrops: note.duration > 0 ? sustainDrops(note, currentTime, config) : [],
      };
    });
}
