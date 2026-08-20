export interface BorderOption {
  id: string;
  label: string;
  css: string;
}

export const BORDER_OPTIONS: readonly BorderOption[] = [
  { id: "gold", label: "Gold Ring", css: "border: 3px solid #ffd700; box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);" },
  {
    id: "neon",
    label: "Neon Ring",
    css: "border: 3px solid #00e5ff; box-shadow: 0 0 10px rgba(0, 229, 255, 0.7), 0 0 16px rgba(255, 47, 208, 0.5);",
  },
  { id: "fire", label: "Fire Ring", css: "border: 3px solid #ff8a00; box-shadow: 0 0 10px rgba(255, 45, 45, 0.7);" },
] as const;

const BORDER_BY_ID = new Map(BORDER_OPTIONS.map((option) => [option.id, option]));

export function getBorderOption(id: string): BorderOption | undefined {
  return BORDER_BY_ID.get(id);
}
