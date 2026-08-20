export interface AchievementFrameOption {
  id: string;
  label: string;
  css: string;
}

export const ACHIEVEMENT_FRAME_OPTIONS: readonly AchievementFrameOption[] = [
  { id: "bronze", label: "Bronze Frame", css: "border: 3px solid #cd7f32; box-shadow: 0 0 6px rgba(205, 127, 50, 0.5);" },
  { id: "silver", label: "Silver Frame", css: "border: 3px solid #c0c0c0; box-shadow: 0 0 6px rgba(192, 192, 192, 0.5);" },
  { id: "goldFrame", label: "Gold Frame", css: "border: 3px solid #ffd700; box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);" },
] as const;

const FRAME_BY_ID = new Map(ACHIEVEMENT_FRAME_OPTIONS.map((option) => [option.id, option]));

export function getAchievementFrameOption(id: string): AchievementFrameOption | undefined {
  return FRAME_BY_ID.get(id);
}
