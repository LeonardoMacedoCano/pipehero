import { Modal, Stack } from "lcano-react-ui";
import styled from "styled-components";

export default function CreditsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal
      isOpen={isOpen}
      title="Credits"
      onClose={onClose}
      variant="info"
      content={
        <Stack direction="column" gap="12px">
          <Line>
            <strong>PipeHero</strong> — created by Leonardo Macedo Cano.
          </Line>
          <Line>
            <Link href="https://github.com/LeonardoMacedoCano/pipehero" target="_blank" rel="noreferrer">
              github.com/LeonardoMacedoCano/pipehero
            </Link>
          </Line>
          <Line>
            Built with <Link href="https://github.com/LeonardoMacedoCano/lcano-react-ui" target="_blank" rel="noreferrer">lcano-react-ui</Link>.
          </Line>
          <Line>
            Fan-made project, playable with Clone Hero-compatible charts. Not affiliated with or endorsed by Harmonix,
            Guitar Hero, or Clone Hero.
          </Line>
        </Stack>
      }
    />
  );
}

const Line = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.95em;
`;

const Link = styled.a`
  color: ${({ theme }) => theme.colors.info};
  text-decoration: underline;
`;
