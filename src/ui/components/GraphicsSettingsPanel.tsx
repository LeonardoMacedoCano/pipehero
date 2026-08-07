import styled from "styled-components";
import { useSyncedPreference } from "../hooks/useSyncedPreference.js";
import { getGraphicsQuality, setGraphicsQuality } from "../../render/graphicsQualityStore.js";
import { DEFAULT_GRAPHICS_QUALITY, isGraphicsQuality, type GraphicsQuality } from "../../render/graphicsQuality.js";

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string; description: string }[] = [
  {
    id: "low",
    label: "Low",
    description: "Notes glow purple during Star Power instead of sparking lightning, and hit splash particles are removed. Best for older or budget phones.",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Default. Lightning bolts and hit particles, tuned to stay smooth on most phones.",
  },
  {
    id: "high",
    label: "High",
    description: "Richer lightning with more bolts, plus the screen's native resolution. Best for high-end phones and desktops.",
  },
];

export default function GraphicsSettingsPanel() {
  const { value: quality, updateValue: setQuality } = useSyncedPreference<GraphicsQuality>({
    field: "graphicsQuality",
    get: getGraphicsQuality,
    set: setGraphicsQuality,
    toPayload: (value) => value,
    fromPayload: (raw) => (isGraphicsQuality(raw) ? raw : DEFAULT_GRAPHICS_QUALITY),
  });

  return (
    <Grid>
      {QUALITY_OPTIONS.map((option) => (
        <QualityCard key={option.id} type="button" $active={option.id === quality} onClick={() => setQuality(option.id)}>
          <Label>{option.label}</Label>
          <Description>{option.description}</Description>
        </QualityCard>
      ))}
    </Grid>
  );
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const QualityCard = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  text-align: left;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 2px solid ${({ theme, $active }) => ($active ? theme.colors.quaternary : theme.colors.gray)};
`;

const Label = styled.span`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
`;

const Description = styled.span`
  font-size: 0.8em;
  color: ${({ theme }) => theme.colors.tertiary};
`;
