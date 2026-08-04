export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp01(t);
}
