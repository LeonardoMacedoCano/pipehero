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
    notifyMissions: (missions: MissionAward[], eyebrow: string = "Daily Mission Complete") =>
      notify(
        missions.map((mission) => ({
          icon: mission.icon,
          eyebrow,
          title: mission.name,
          description: `+${mission.rewardCoins} coins — ${mission.description}`,
        }))
      ),
  };
}
