import { useEffect, useState } from "react";
import { Panel, Stack, HighlightBox, Tabs, Modal } from "lcano-react-ui";
import styled from "styled-components";
import { useEconomy, type EconomyMission, type EconomyWeeklyMission } from "../hooks/useEconomy.js";
import { useAuth } from "../hooks/useAuth.js";
import { nextDailyResetMs, nextWeeklyResetMs } from "../../timeZone.js";
import StreakExplainer from "../components/chrome/StreakExplainer.js";
import GuestLoginBanner from "../components/chrome/GuestLoginBanner.js";
import Emoji from "../components/Emoji.js";

const DAILY_LOGIN_CODE = "daily_login";

type SelectedMission = { kind: "daily"; mission: EconomyMission } | { kind: "weekly"; mission: EconomyWeeklyMission };

function formatCountdown(targetMs: number): string {
  const diffMs = Math.max(0, targetMs - Date.now());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(hours)}h${pad(minutes)}m`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

type ResetComputer = (now: Date, timeZone: string) => number;

function useCountdownTo(timeZone: string, computeTargetMs: ResetComputer): string {
  const [label, setLabel] = useState(() => formatCountdown(computeTargetMs(new Date(), timeZone)));

  useEffect(() => {
    const tick = () => setLabel(formatCountdown(computeTargetMs(new Date(), timeZone)));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timeZone, computeTargetMs]);

  return label;
}

function ResetCountdown({ timeZone, computeTargetMs }: { timeZone: string; computeTargetMs: ResetComputer }) {
  const label = useCountdownTo(timeZone, computeTargetMs);
  return (
    <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
      <Emoji glyph="⏳" /> Resets in {label}
    </HighlightBox>
  );
}

export default function MissionsPage() {
  const { user, googleClientId, login } = useAuth();
  const {
    timeZone,
    currentStreak,
    longestStreak,
    streakGraceAvailable,
    missionsToday,
    allClearBonusCoins,
    allClearCompletedToday,
    missionsThisWeek,
    weeklyAllClearBonusCoins,
    weeklyAllClearCompletedThisWeek,
  } = useEconomy();

  const [selectedMission, setSelectedMission] = useState<SelectedMission | null>(null);
  const dailyResetLabel = useCountdownTo(timeZone, nextDailyResetMs);
  const weeklyResetLabel = useCountdownTo(timeZone, nextWeeklyResetMs);

  return (
    <Panel title="Missions" maxWidth="720px" style={{ margin: "16px" }}>
      <Stack direction="column" gap="0">
        {!user && (
          <BannerArea>
            <GuestLoginBanner
              message="Log in with Google to track your streak and claim mission rewards."
              googleClientId={googleClientId}
              onLogin={login}
            />
          </BannerArea>
        )}
        <Tabs
          tabs={[
            {
              label: "Daily",
              content: (
                <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
                  <StreakRow>
                    <HighlightBox variant="quaternary" bordered width="auto" style={{ padding: "6px 18px" }}>
                      <Emoji glyph="🔥" /> Day {currentStreak} streak
                    </HighlightBox>
                    <StreakDetail>
                      Best streak: {longestStreak} · {streakGraceAvailable ? "grace available" : "grace already used"}
                    </StreakDetail>
                    <ResetCountdown timeZone={timeZone} computeTargetMs={nextDailyResetMs} />
                  </StreakRow>

                  <Stack direction="column" gap="8px">
                    {missionsToday.map((mission) => (
                      <MissionRow
                        key={mission.code}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMission({ kind: "daily", mission })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedMission({ kind: "daily", mission });
                          }
                        }}
                      >
                        <MissionIcon aria-hidden>
                          <Emoji glyph={mission.icon} />
                        </MissionIcon>
                        <MissionText>
                          <MissionName>{mission.name}</MissionName>
                          <MissionDescription>{mission.description}</MissionDescription>
                          {mission.progress && !mission.completed ? (
                            <MissionProgressRow>
                              <MissionProgressBar>
                                <MissionProgressFill
                                  style={{ width: `${(mission.progress.current / mission.progress.target) * 100}%` }}
                                />
                              </MissionProgressBar>
                              <MissionProgressLabel>
                                {mission.progress.current}/{mission.progress.target}
                              </MissionProgressLabel>
                            </MissionProgressRow>
                          ) : null}
                        </MissionText>
                        <MissionReward>+{mission.rewardCoins}</MissionReward>
                        <StatusBadge $completed={mission.completed}>{mission.completed ? "✓ Done" : "Pending"}</StatusBadge>
                      </MissionRow>
                    ))}
                  </Stack>

                  <AllClearRow $completed={allClearCompletedToday}>
                    All-clear bonus: +{allClearBonusCoins} coins for finishing every mission today
                    {allClearCompletedToday ? " — claimed!" : ""}
                  </AllClearRow>
                </Stack>
              ),
            },
            {
              label: "Weekly",
              content: (
                <Stack direction="column" gap="16px" style={{ padding: "12px 16px" }}>
                  <StreakRow>
                    <ResetCountdown timeZone={timeZone} computeTargetMs={nextWeeklyResetMs} />
                  </StreakRow>

                  <Stack direction="column" gap="8px">
                    {missionsThisWeek.map((mission) => (
                      <MissionRow
                        key={mission.code}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMission({ kind: "weekly", mission })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedMission({ kind: "weekly", mission });
                          }
                        }}
                      >
                        <MissionIcon aria-hidden>
                          <Emoji glyph={mission.icon} />
                        </MissionIcon>
                        <MissionText>
                          <MissionName>
                            {mission.name} <TierBadge $tier={mission.tier}>{mission.tier}</TierBadge>
                          </MissionName>
                          <MissionDescription>{mission.description}</MissionDescription>
                          {mission.progress && !mission.completed ? (
                            <MissionProgressRow>
                              <MissionProgressBar>
                                <MissionProgressFill
                                  style={{ width: `${(mission.progress.current / mission.progress.target) * 100}%` }}
                                />
                              </MissionProgressBar>
                              <MissionProgressLabel>
                                {mission.progress.current}/{mission.progress.target}
                              </MissionProgressLabel>
                            </MissionProgressRow>
                          ) : null}
                        </MissionText>
                        <MissionReward>+{mission.rewardCoins}</MissionReward>
                        <StatusBadge $completed={mission.completed}>{mission.completed ? "✓ Done" : "Pending"}</StatusBadge>
                      </MissionRow>
                    ))}
                  </Stack>

                  <AllClearRow $completed={weeklyAllClearCompletedThisWeek}>
                    All-clear bonus: +{weeklyAllClearBonusCoins} coins for finishing every mission this week
                    {weeklyAllClearCompletedThisWeek ? " — claimed!" : ""}
                  </AllClearRow>
                </Stack>
              ),
            },
          ]}
        />
      </Stack>

      <Modal
        isOpen={selectedMission !== null}
        onClose={() => setSelectedMission(null)}
        title={selectedMission?.mission.name ?? ""}
        icon={selectedMission ? <Emoji glyph={selectedMission.mission.icon} /> : undefined}
        variant={selectedMission?.mission.completed ? "quaternary" : "secondary"}
        modalWidth="420px"
        content={
          selectedMission && (
            <ModalBody>
              <ModalDescription>{selectedMission.mission.description}</ModalDescription>

              {selectedMission.kind === "daily" && selectedMission.mission.code === DAILY_LOGIN_CODE ? (
                <StreakExplainer
                  currentStreak={currentStreak}
                  longestStreak={longestStreak}
                  graceAvailable={streakGraceAvailable}
                />
              ) : (
                <>
                  <DetailRow>
                    <DetailLabel>Reward</DetailLabel>
                    <MissionReward>+{selectedMission.mission.rewardCoins} coins</MissionReward>
                  </DetailRow>

                  {selectedMission.kind === "weekly" && (
                    <DetailRow>
                      <DetailLabel>Tier</DetailLabel>
                      <TierBadge $tier={selectedMission.mission.tier}>{selectedMission.mission.tier}</TierBadge>
                    </DetailRow>
                  )}

                  {selectedMission.mission.progress && (
                    <DetailRow>
                      <DetailLabel>Progress</DetailLabel>
                      <MissionProgressRow style={{ marginTop: 0, flex: 1 }}>
                        <MissionProgressBar>
                          <MissionProgressFill
                            style={{
                              width: `${(selectedMission.mission.progress.current / selectedMission.mission.progress.target) * 100}%`,
                            }}
                          />
                        </MissionProgressBar>
                        <MissionProgressLabel>
                          {selectedMission.mission.progress.current}/{selectedMission.mission.progress.target}
                        </MissionProgressLabel>
                      </MissionProgressRow>
                    </DetailRow>
                  )}

                  <DetailRow>
                    <DetailLabel>Status</DetailLabel>
                    <StatusBadge $completed={selectedMission.mission.completed}>
                      {selectedMission.mission.completed ? "✓ Done" : "Pending"}
                    </StatusBadge>
                  </DetailRow>

                  <DetailRow>
                    <DetailLabel>Resets</DetailLabel>
                    <span>
                      in {selectedMission.kind === "daily" ? dailyResetLabel : weeklyResetLabel} ({timeZone})
                    </span>
                  </DetailRow>

                  <ExplainerText>
                    Completing every {selectedMission.kind} mission also pays out an all-clear bonus of +
                    {selectedMission.kind === "daily" ? allClearBonusCoins : weeklyAllClearBonusCoins} coins
                    {(selectedMission.kind === "daily" ? allClearCompletedToday : weeklyAllClearCompletedThisWeek)
                      ? " — already claimed."
                      : "."}
                  </ExplainerText>
                </>
              )}
            </ModalBody>
          )
        }
      />
    </Panel>
  );
}

const BannerArea = styled.div`
  padding: 12px 16px 0;
  margin-bottom: 16px;
`;

const TIER_COLORS: Record<"small" | "medium" | "large", (theme: import("styled-components").DefaultTheme) => string> = {
  small: (theme) => theme.colors.gray,
  medium: (theme) => theme.colors.info,
  large: (theme) => theme.colors.warning,
};

const TierBadge = styled.span<{ $tier: "small" | "medium" | "large" }>`
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.7em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.black};
  background-color: ${({ theme, $tier }) => TIER_COLORS[$tier](theme)};
`;

const StreakRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  & > div {
    width: auto !important;
    flex: 0 0 auto;
  }
`;

const StreakDetail = styled.span`
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.9em;
`;

const MissionProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
`;

const MissionProgressBar = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.gray};
  overflow: hidden;
`;

const MissionProgressFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.success};
`;

const MissionProgressLabel = styled.span`
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.8em;
  font-weight: 700;
  white-space: nowrap;
`;

const MissionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.quaternary};
  }
`;

const MissionIcon = styled.span`
  font-size: 1.4em;
`;

const MissionText = styled.div`
  flex: 1;
  min-width: 0;
`;

const MissionName = styled.p`
  margin: 0;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
`;

const MissionDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.85em;
`;

const MissionReward = styled.span`
  color: ${({ theme }) => theme.colors.warning};
  font-weight: 700;
  white-space: nowrap;
`;

const StatusBadge = styled.span<{ $completed: boolean }>`
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme, $completed }) => ($completed ? theme.colors.success : theme.colors.gray)};
`;

const AllClearRow = styled.p<{ $completed: boolean }>`
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme, $completed }) => ($completed ? theme.colors.success : theme.colors.primary)};
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ModalDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.white};
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const DetailLabel = styled.span`
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.85em;
`;

const ExplainerText = styled.p`
  margin: 0;
  font-size: 0.85em;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.gray};
`;
