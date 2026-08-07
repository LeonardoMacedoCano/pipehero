export interface BoltShape {
  points: string;
  minY: number;
  maxY: number;
}

function buildBoltShape(coords: { x: number; y: number }[]): BoltShape {
  const ys = coords.map((p) => p.y);
  return {
    points: coords.map((p) => `${p.x},${p.y}`).join(" "),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export const STAR_POWER_BOLT: BoltShape = buildBoltShape([
  { x: 62, y: 4 },
  { x: 24, y: 54 },
  { x: 46, y: 54 },
  { x: 38, y: 96 },
  { x: 76, y: 42 },
  { x: 54, y: 42 },
]);
