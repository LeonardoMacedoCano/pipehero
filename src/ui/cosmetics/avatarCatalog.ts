export interface AvatarOption {
  id: string;
  emoji: string;
  bgColor: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: "guitar", emoji: "🎸", bgColor: "#2ed22e" },
  { id: "drums", emoji: "🥁", bgColor: "#e8443c" },
  { id: "mic", emoji: "🎤", bgColor: "#f5d033" },
  { id: "keys", emoji: "🎹", bgColor: "#3d8ee8" },
  { id: "bolt", emoji: "⚡", bgColor: "#f58a33" },
  { id: "star", emoji: "🌟", bgColor: "#9b59b6" },
] as const;

const AVATAR_BY_ID = new Map(AVATAR_OPTIONS.map((option) => [option.id, option]));

export function getAvatarOption(id: string): AvatarOption | undefined {
  return AVATAR_BY_ID.get(id);
}
