export interface AvatarOption {
  id: string;
  icon: string;
  bgColor: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: "guitar", icon: "guitar", bgColor: "#2ed22e" },
  { id: "drums", icon: "drum", bgColor: "#e8443c" },
  { id: "mic", icon: "microphone", bgColor: "#f5d033" },
  { id: "keys", icon: "piano", bgColor: "#3d8ee8" },
  { id: "bolt", icon: "bolt", bgColor: "#f58a33" },
  { id: "star", icon: "star", bgColor: "#9b59b6" },
] as const;

const AVATAR_BY_ID = new Map(AVATAR_OPTIONS.map((option) => [option.id, option]));

export function getAvatarOption(id: string): AvatarOption | undefined {
  return AVATAR_BY_ID.get(id);
}
