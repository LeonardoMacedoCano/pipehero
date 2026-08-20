export interface BackgroundOption {
  id: string;
  label: string;
  css: string;
}

export const BACKGROUND_OPTIONS: readonly BackgroundOption[] = [
  {
    id: "stage",
    label: "Stage Lights",
    css: "background: radial-gradient(circle at 50% 0%, rgba(255, 196, 0, 0.35), transparent 70%);",
  },
  {
    id: "sunset",
    label: "Sunset",
    css: "background: linear-gradient(135deg, rgba(255, 138, 0, 0.35), rgba(155, 89, 182, 0.35));",
  },
  {
    id: "circuit",
    label: "Circuit Grid",
    css: "background-image: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 2px, transparent 2px, transparent 8px);",
  },
] as const;

const BACKGROUND_BY_ID = new Map(BACKGROUND_OPTIONS.map((option) => [option.id, option]));

export function getBackgroundOption(id: string): BackgroundOption | undefined {
  return BACKGROUND_BY_ID.get(id);
}
