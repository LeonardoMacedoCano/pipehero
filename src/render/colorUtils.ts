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

export function mix(hexA: string, hexB: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const ar = parseInt(hexA.slice(1, 3), 16);
  const ag = parseInt(hexA.slice(3, 5), 16);
  const ab = parseInt(hexA.slice(5, 7), 16);
  const br = parseInt(hexB.slice(1, 3), 16);
  const bg = parseInt(hexB.slice(3, 5), 16);
  const bb = parseInt(hexB.slice(5, 7), 16);

  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(ar + (br - ar) * t);
  const g = clamp(ag + (bg - ag) * t);
  const b = clamp(ab + (bb - ab) * t);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}
