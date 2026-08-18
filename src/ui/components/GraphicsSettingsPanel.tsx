import { OptionGrid } from "lcano-react-ui";
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

  return <OptionGrid value={quality} onChange={setQuality} locale="en" minItemWidth="200px" options={QUALITY_OPTIONS} />;
}
