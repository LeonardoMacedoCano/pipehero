import type { CanvasLike2D } from "./canvasLike.js";

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

export function dropPath(ctx: CanvasLike2D, x: number, y: number, radius: number): void {
  taperedDropPath(ctx, x, y, radius, x, y - radius * 1.8);
}
