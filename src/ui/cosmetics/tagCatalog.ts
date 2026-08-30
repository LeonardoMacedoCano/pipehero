export interface TagOption {
  id: string;
  label: string;
}

export const TAG_OPTIONS: readonly TagOption[] = [
  { id: "rockstar", label: "Rockstar" },
  { id: "perfectionist", label: "Perfectionist" },
  { id: "speedster", label: "Speed Demon" },
  { id: "completionist", label: "Completionist" },
  { id: "nightowl", label: "Night Owl" },
] as const;

const TAG_BY_ID = new Map(TAG_OPTIONS.map((option) => [option.id, option]));

export function getTagOption(id: string): TagOption | undefined {
  return TAG_BY_ID.get(id);
}
