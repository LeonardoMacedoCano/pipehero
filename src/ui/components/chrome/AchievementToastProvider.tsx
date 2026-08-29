import { useCallback } from "react";
import { ToastStack, ToastStackProvider, useToastStack, type ToastStackItem } from "lcano-react-ui";
import Emoji from "../Emoji.js";

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export { ToastStackProvider as AchievementToastProvider };

export function useAchievementToast(): { notify: (achievements: UnlockedAchievement[]) => void } {
  const { notify } = useToastStack();
  const notifyAchievements = useCallback(
    (achievements: UnlockedAchievement[]) =>
      notify(
        achievements.map((achievement) => ({
          icon: <Emoji glyph={achievement.icon} />,
          eyebrow: "Achievement Unlocked",
          title: achievement.name,
          description: achievement.description,
        }))
      ),
    [notify]
  );
  return { notify: notifyAchievements };
}

export function AchievementToastStack({ onView }: { onView: (item: ToastStackItem) => void }) {
  return <ToastStack locale="en" onItemClick={onView} />;
}
