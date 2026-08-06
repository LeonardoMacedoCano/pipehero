import { Modal, Stack } from "lcano-react-ui";
import styled from "styled-components";

export default function SupportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal
      isOpen={isOpen}
      title="Support PipeHero"
      onClose={onClose}
      variant="info"
      content={
        <Stack direction="column" gap="12px">
          <Paragraph>
            PipeHero is free and made in my spare time. If you'd like to help keep it going, you can support the
            project below.
          </Paragraph>
          <Paragraph>
            <Link href="https://cano.dev.br/apoio/?origem=pipehero" target="_blank" rel="noreferrer">
              cano.dev.br/apoio
            </Link>
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

const Link = styled.a`
  color: ${({ theme }) => theme.colors.info};
  text-decoration: underline;
`;
