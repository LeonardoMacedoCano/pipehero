import { Modal, Stack } from "lcano-react-ui";
import styled from "styled-components";

export default function PrivacyPolicyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal
      isOpen={isOpen}
      title="Privacy Policy"
      onClose={onClose}
      variant="info"
      closeButtonHint="Close"
      content={
        <Stack direction="column" gap="12px">
          <Paragraph>
            PipeHero works fully without an account. Key bindings, latency calibration, and input mode are saved only
            in your browser's local storage.
          </Paragraph>
          <Paragraph>
            If you sign in with Google, we store your name, email, and avatar to identify your account, along with
            your song scores, unlocked achievements, and latency calibration — so they follow you across devices.
          </Paragraph>
          <Paragraph>
            We don't sell or share this data with third parties. You can stop syncing at any time by logging out.
          </Paragraph>
        </Stack>
      }
    />
  );
}

const Paragraph = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.95em;
  line-height: 1.5;
`;
