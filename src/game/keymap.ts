import type { Fret } from "../types.js";

export const DEFAULT_KEY_BINDINGS: Record<string, Fret> = {
  KeyA: 0,
  KeyS: 1,
  KeyJ: 2,
  KeyK: 3,
  KeyL: 4,
  Space: 7,
};

export function fretForKeyCode(code: string, bindings: Record<string, Fret> = DEFAULT_KEY_BINDINGS): Fret | null {
  return code in bindings ? bindings[code] : null;
}
