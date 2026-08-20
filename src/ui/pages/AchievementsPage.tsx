import { useMemo, useState } from "react";
import { Panel, Stack, Loading, HighlightBox, ToggleSwitch, Modal, BadgeCard, PaginatedGrid, GoogleSignInButton } from "lcano-react-ui";
import styled from "styled-components";
import { useAchievements, type AchievementStatus } from "../hooks/useAchievements.js";
import { useAuth } from "../hooks/useAuth.js";
import { useShop } from "../hooks/useShop.js";
import AchievementFrame from "../components/chrome/AchievementFrame.js";

type FilterTab = "unlocked" | "locked";

export default function AchievementsPage() {
  const { achievements, isLoading } = useAchievements();
  const { user, googleClientId, login } = useAuth();
  const { equipped } = useShop();
  const [tab, setTab] = useState<FilterTab>("unlocked");
  const [selected, setSelected] = useState<AchievementStatus | null>(null);

  const unlockedCount = achievements?.filter((achievement) => achievement.unlocked).length ?? 0;
  const totalCount = achievements?.length ?? 0;

  const visible = useMemo(() => {
    if (!achievements) return [];
    if (tab === "unlocked") {
      return achievements
        .filter((achievement) => achievement.unlocked)
        .sort((a, b) => new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime());
    }
    return achievements.filter((achievement) => !achievement.unlocked);
  }, [achievements, tab]);

  return (
    <Panel title="Achievements" maxWidth="720px" style={{ margin: "16px" }}>
      <Loading isLoading={isLoading} />
      {achievements && (
        <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
          {!user && (
            <LoginBanner>
              <span>Log in with Google to start tracking your achievements.</span>
              {googleClientId && <GoogleSignInButton clientId={googleClientId} onCredential={login} />}
            </LoginBanner>
          )}

          <HeaderRow>
            <ShrinkToFit>
              <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
                {unlockedCount} / {totalCount} unlocked
              </HighlightBox>
            </ShrinkToFit>
            <ToggleSwitch
              optionA={{ label: "Unlocked", value: "unlocked" }}
              optionB={{ label: "Locked", value: "locked" }}
              value={tab}
              onChange={setTab}
            />
          </HeaderRow>

          <PaginatedGrid<AchievementStatus>
            items={visible}
            keyExtractor={(achievement) => achievement.code}
            emptyMessage={tab === "unlocked" ? "No achievements unlocked yet — go play!" : "Nothing left to unlock. Well played."}
            minItemWidth="260px"
            rowsPerPage={2}
            renderItem={(achievement) => (
              <AchievementFrame
                frameId={achievement.unlocked ? equipped.achievementFrameId : null}
                effectId={achievement.unlocked ? equipped.achievementEffectId : null}
              >
                <BadgeCard
                  icon={achievement.unlocked ? achievement.icon : "🔒"}
                  title={achievement.name}
                  description={achievement.description}
                  active={achievement.unlocked}
                  onClick={() => setSelected(achievement)}
                  meta={
                    <>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <span>Unlocked {new Date(achievement.unlockedAt).toLocaleString()}</span>
                      )}
                      <span>{achievement.globalUnlockPercent}% of players</span>
                    </>
                  }
                />
              </AchievementFrame>
            )}
          />
        </Stack>
      )}

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        variant={selected?.unlocked ? "quaternary" : "secondary"}
        icon={selected ? (selected.unlocked ? selected.icon : "🔒") : undefined}
        content={
          selected && (
            <Stack direction="column" gap="12px">
              <ModalDescription>{selected.description}</ModalDescription>
              <CardMeta>
                {selected.unlocked && selected.unlockedAt && (
                  <span>Unlocked {new Date(selected.unlockedAt).toLocaleString()}</span>
                )}
                <span>{selected.globalUnlockPercent}% of players</span>
              </CardMeta>
            </Stack>
          )
        }
      />
    </Panel>
  );
}

const LoginBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.white};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`;

const ShrinkToFit = styled.div`
  display: inline-flex;
`;

const ModalDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.white};
`;

const CardMeta = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  min-height: 2.2em;
  font-size: 0.75em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-top: 6px;
`;
