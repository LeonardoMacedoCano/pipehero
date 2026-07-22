export function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const lr = clamp(r + (255 - r) * amount);
  const lg = clamp(g + (255 - g) * amount);
  const lb = clamp(b + (255 - b) * amount);

  return `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}
