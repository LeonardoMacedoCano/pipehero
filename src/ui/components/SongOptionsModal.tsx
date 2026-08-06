import type { ParsedChart } from "parsehero";
import { Modal, Stack, Button, Loading } from "lcano-react-ui";
import styled from "styled-components";
import type { Difficulty, Song } from "../../types.js";
import { useChart } from "../hooks/useChart.js";
import DifficultyStars from "./DifficultyStars.js";

export interface StartGameParams {
  song: Song;
  chart: ParsedChart;
  difficulty: Difficulty;
}

export default function SongOptionsModal({
  song,
  stars,
  onClose,
  onStart,
}: {
  song: Song | null;
  stars?: Partial<Record<Difficulty, number>>;
  onClose: () => void;
  onStart: (params: StartGameParams) => void;
}) {
  const { chart, error, availableDifficulties, isLoading } = useChart(song);

  function selectDifficulty(difficulty: Difficulty) {
    if (!song || !chart) return;
    onStart({ song, chart, difficulty });
  }

  return (
    <Modal
      isOpen={!!song}
      title={song?.name ?? ""}
      onClose={onClose}
      variant="info"
      content={
        <Content>
          <Loading isLoading={isLoading} />
          {error && <p>Error loading song: {error.message}</p>}

          {availableDifficulties.length > 0 && (
            <Section>
              <SectionLabel>Difficulty</SectionLabel>
              <Stack direction="row" gap="8px" wrap>
                {availableDifficulties.map((difficulty) => (
                  <Button
                    key={difficulty}
                    description={difficulty}
                    variant="secondary"
                    onClick={() => selectDifficulty(difficulty)}
                  />
                ))}
              </Stack>
            </Section>
          )}

          {stars && Object.keys(stars).length > 0 && (
            <Section>
              <SectionLabel>Your best scores</SectionLabel>
              <DifficultyStars stars={stars} />
            </Section>
          )}
        </Content>
      }
    />
  );
}

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Section = styled.div``;

const SectionLabel = styled.div`
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.tertiary};
  margin-bottom: 6px;
`;
