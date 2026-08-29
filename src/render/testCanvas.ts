import type { CanvasLike2D } from "./canvasLike.js";

export function fakeCtx(): CanvasLike2D & {
  fillStyles: unknown[];
  arcCalls: { x: number; y: number; radius: number }[];
  lineToCalls: { x: number; y: number }[];
  translateNet: { x: number; y: number };
  maxShadowBlur: number;
  drawImageCalls: number;
} {
  const fillStyles: unknown[] = [];
  const arcCalls: { x: number; y: number; radius: number }[] = [];
  const lineToCalls: { x: number; y: number }[] = [];
  const translateNet = { x: 0, y: 0 };
  const counters = { drawImage: 0 };
  const shadow = { blur: 0, max: 0 };
  const gradient = { addColorStop() {} };
  return {
    fillStyles,
    arcCalls,
    lineToCalls,
    translateNet,
    get maxShadowBlur() {
      return shadow.max;
    },
    get drawImageCalls() {
      return counters.drawImage;
    },
    lineWidth: 0,
    lineCap: "butt",
    lineJoin: "miter",
    globalAlpha: 1,
    get shadowBlur() {
      return shadow.blur;
    },
    set shadowBlur(value: number) {
      shadow.blur = value;
      if (value > shadow.max) shadow.max = value;
    },
    shadowColor: "",
    strokeStyle: "",
    get fillStyle() {
      return fillStyles[fillStyles.length - 1];
    },
    set fillStyle(value: unknown) {
      fillStyles.push(value);
    },
    translate(x: number, y: number) {
      translateNet.x += x;
      translateNet.y += y;
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
    drawImage() {
      counters.drawImage++;
    },
  };
}
