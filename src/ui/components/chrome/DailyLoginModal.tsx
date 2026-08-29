import { Modal, HighlightBox } from "lcano-react-ui";
import styled from "styled-components";
import { useEconomy } from "../../hooks/useEconomy.js";
import StreakExplainer from "./StreakExplainer.js";
import Emoji from "../Emoji.js";

export default function DailyLoginModal() {
  const { dailyLoginModal, dismissDailyLoginModal } = useEconomy();

  return (
    <Modal
      isOpen={dailyLoginModal !== null}
      onClose={dismissDailyLoginModal}
      title={dailyLoginModal ? `Day ${dailyLoginModal.currentStreak} Streak` : ""}
      icon={<Emoji glyph="🔥" />}
      variant="quaternary"
      modalWidth="380px"
      content={
        dailyLoginModal && (
          <Content>
            <HighlightBox variant="quaternary" bordered style={{ padding: "10px 18px" }}>
              +{dailyLoginModal.coinsAwarded} coins for logging in today
            </HighlightBox>

            {dailyLoginModal.streakSaved && (
              <NoticeText>Your streak was about to break — your grace saved it.</NoticeText>
            )}
            {dailyLoginModal.milestoneHit !== null && (
              <NoticeText>
                <Emoji glyph="🎉" /> Milestone bonus for reaching day {dailyLoginModal.milestoneHit}!
              </NoticeText>
            )}

            <StreakExplainer
              currentStreak={dailyLoginModal.currentStreak}
              longestStreak={dailyLoginModal.longestStreak}
              graceAvailable={dailyLoginModal.graceAvailable}
            />
          </Content>
        )
      }
    />
  );
}

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const NoticeText = styled.p`
  margin: 0;
  font-size: 0.85em;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.warning};
`;
