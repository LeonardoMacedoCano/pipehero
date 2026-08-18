import styled from "styled-components";
import { OptionGrid } from "lcano-react-ui";
import { useThemeControl } from "../contexts/theme/ThemeControlProvider.js";

export default function ThemeAppearancePanel() {
  const { themeId, availableThemes, setThemeId, themeEffectId, availableThemeEffects, setThemeEffectId } = useThemeControl();

  return (
    <>
      <OptionGrid
        value={themeId}
        onChange={setThemeId}
        locale="en"
        options={availableThemes.map((option) => ({
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
        options={availableThemeEffects.map((option) => ({ id: option.id, label: option.label, description: option.description }))}
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
