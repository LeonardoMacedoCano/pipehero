import type { CanvasLike2D } from "./canvasLike.js";

export function fakeCtx(): CanvasLike2D & {
  fillStyles: unknown[];
  arcCalls: { x: number; y: number; radius: number }[];
  lineToCalls: { x: number; y: number }[];
} {
  const fillStyles: unknown[] = [];
  const arcCalls: { x: number; y: number; radius: number }[] = [];
  const lineToCalls: { x: number; y: number }[] = [];
  const gradient = { addColorStop() {} };
  return {
    fillStyles,
    arcCalls,
    lineToCalls,
    lineWidth: 0,
    lineCap: "butt",
    lineJoin: "miter",
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: "",
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
    lineTo(x: number, y: number) {
      lineToCalls.push({ x, y });
    },
    bezierCurveTo() {},
    fill() {},
    stroke() {},
  };
}
