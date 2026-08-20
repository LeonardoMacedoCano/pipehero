import { useToastStack } from "lcano-react-ui";

export interface MissionAward {
  icon: string;
  name: string;
  description: string;
  rewardCoins: number;
}

export function useCoinsToast() {
  const { notify } = useToastStack();
  return {
    notifyStreak: (coinsAwarded: number, currentStreak: number, streakSaved: boolean, milestoneHit: number | null) => {
      if (coinsAwarded <= 0) return;
      notify([
        {
          icon: "🔥",
          eyebrow: streakSaved ? "Streak Saved!" : "Daily Login",
          title: `Day ${currentStreak} streak — +${coinsAwarded} coins`,
          description: milestoneHit ? `Milestone bonus for day ${milestoneHit}!` : undefined,
        },
      ]);
    },
    notifyMissions: (missions: MissionAward[]) =>
      notify(
        missions.map((mission) => ({
          icon: mission.icon,
          eyebrow: "Daily Mission Complete",
          title: mission.name,
          description: `+${mission.rewardCoins} coins — ${mission.description}`,
        }))
      ),
  };
}
