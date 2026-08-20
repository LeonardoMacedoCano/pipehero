export interface TagOption {
  id: string;
  label: string;
  emoji: string;
}

export const TAG_OPTIONS: readonly TagOption[] = [
  { id: "rockstar", label: "Rockstar", emoji: "🎸" },
  { id: "perfectionist", label: "Perfectionist", emoji: "💯" },
  { id: "speedster", label: "Speed Demon", emoji: "⚡" },
  { id: "completionist", label: "Completionist", emoji: "🏆" },
  { id: "nightowl", label: "Night Owl", emoji: "🌙" },
] as const;

const TAG_BY_ID = new Map(TAG_OPTIONS.map((option) => [option.id, option]));

export function getTagOption(id: string): TagOption | undefined {
  return TAG_BY_ID.get(id);
}
