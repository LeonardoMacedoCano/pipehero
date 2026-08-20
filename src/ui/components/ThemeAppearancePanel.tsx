import styled from "styled-components";
import { OptionGrid } from "lcano-react-ui";
import { useThemeControl } from "../contexts/theme/ThemeControlProvider.js";
import { useShop } from "../hooks/useShop.js";
import { DEFAULT_THEME_ID } from "../themes/registry.js";
import { DEFAULT_THEME_EFFECT_ID } from "../themes/effects.js";

export default function ThemeAppearancePanel() {
  const { themeId, availableThemes, setThemeId, themeEffectId, availableThemeEffects, setThemeEffectId } = useThemeControl();
  const { items } = useShop();

  const ownedThemeRefIds = new Set(items.filter((item) => item.slot === "theme" && item.owned).map((item) => item.refId));
  const ownedEffectRefIds = new Set(items.filter((item) => item.slot === "effect" && item.owned).map((item) => item.refId));

  const ownedThemes = availableThemes.filter((option) => option.id === DEFAULT_THEME_ID || ownedThemeRefIds.has(option.id));
  const ownedEffects = availableThemeEffects.filter(
    (option) => option.id === DEFAULT_THEME_EFFECT_ID || ownedEffectRefIds.has(option.id)
  );

  return (
    <>
      <OptionGrid
        value={themeId}
        onChange={setThemeId}
        locale="en"
        options={ownedThemes.map((option) => ({
          id: option.id,
          label: option.label,
          description: option.description,
          swatch: [...option.swatch],
        }))}
      />

      <SectionTitle>Effect</SectionTitle>
      <OptionGrid
        value={themeEffectId}
        onChange={setThemeEffectId}
        locale="en"
        options={ownedEffects.map((option) => ({ id: option.id, label: option.label, description: option.description }))}
      />
    </>
  );
}

const SectionTitle = styled.h3`
  margin-top: 24px;
  margin-bottom: 12px;
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.tertiary};
`;
