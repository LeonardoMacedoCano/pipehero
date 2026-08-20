import { ToastStack, ToastStackProvider, useToastStack, type ToastStackItem } from "lcano-react-ui";

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export { ToastStackProvider as AchievementToastProvider };

export function useAchievementToast(): { notify: (achievements: UnlockedAchievement[]) => void } {
  const { notify } = useToastStack();
  return {
    notify: (achievements) =>
      notify(
        achievements.map((achievement) => ({
          icon: achievement.icon,
          eyebrow: "Achievement Unlocked",
          title: achievement.name,
          description: achievement.description,
        }))
      ),
  };
}

export function AchievementToastStack({ onView }: { onView: (item: ToastStackItem) => void }) {
  return <ToastStack locale="en" onItemClick={onView} />;
}
