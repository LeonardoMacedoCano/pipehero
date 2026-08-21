import { Button } from "lcano-react-ui";
import { useFriendProfile } from "../../hooks/useFriendProfile.js";
import ProfileScreen from "../chrome/ProfileScreen.js";

export default function FriendProfilePanel({
  friendId,
  friendName,
  onBack,
}: {
  friendId: number;
  friendName: string;
  onBack: () => void;
}) {
  const { profile, isLoading } = useFriendProfile(friendId);

  return (
    <ProfileScreen
      title={friendName}
      actionButton={
        <Button description="« Back to Friends" onClick={onBack} style={{ border: "none", backgroundColor: "transparent" }} />
      }
      isLoading={isLoading}
      name={profile?.friend.name ?? null}
      equippedAvatarId={profile?.friend.equippedAvatarId ?? null}
      equippedBorderId={profile?.friend.equippedBorderId ?? null}
      equippedBackgroundId={profile?.friend.equippedBackgroundId ?? null}
      equippedTagId={profile?.friend.equippedTagId ?? null}
      equippedAchievementFrameId={profile?.friend.equippedAchievementFrameId ?? null}
      equippedAchievementEffectId={profile?.friend.equippedAchievementEffectId ?? null}
      scores={profile?.scores ?? []}
      achievements={profile?.achievements ?? []}
      emptyScoresMessage="Hasn't played anything yet."
    />
  );
}
