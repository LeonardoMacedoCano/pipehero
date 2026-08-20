import styled from "styled-components";
import { OptionGrid, useMessage } from "lcano-react-ui";
import { useThemeControl } from "../contexts/theme/ThemeControlProvider.js";
import { useShop } from "../hooks/useShop.js";
import { DEFAULT_THEME_ID } from "../themes/registry.js";
import { DEFAULT_THEME_EFFECT_ID } from "../themes/effects.js";

export default function ThemeAppearancePanel() {
  const { themeId, availableThemes, setThemeId, themeEffectId, availableThemeEffects, setThemeEffectId } = useThemeControl();
  const { items } = useShop();
  const { showInfo } = useMessage();

  const ownedThemeRefIds = new Set(items.filter((item) => item.slot === "theme" && item.owned).map((item) => item.refId));
  const priceByThemeRefId = new Map(items.filter((item) => item.slot === "theme").map((item) => [item.refId, item.priceCoins]));
  const ownedEffectRefIds = new Set(items.filter((item) => item.slot === "effect" && item.owned).map((item) => item.refId));
  const priceByEffectRefId = new Map(items.filter((item) => item.slot === "effect").map((item) => [item.refId, item.priceCoins]));

  function isThemeOwned(id: string): boolean {
    return id === DEFAULT_THEME_ID || ownedThemeRefIds.has(id);
  }

  function isEffectOwned(id: string): boolean {
    return id === DEFAULT_THEME_EFFECT_ID || ownedEffectRefIds.has(id);
  }

  function handleThemeChange(id: string) {
    if (!isThemeOwned(id)) {
      showInfo(`You don't own this theme yet — unlock it in the Shop for ${priceByThemeRefId.get(id) ?? "?"} coins.`);
      return;
    }
    setThemeId(id);
  }

  function handleEffectChange(id: string) {
    if (!isEffectOwned(id)) {
      showInfo(`You don't own this effect yet — unlock it in the Shop for ${priceByEffectRefId.get(id) ?? "?"} coins.`);
      return;
    }
    setThemeEffectId(id);
  }

  return (
    <>
      <OptionGrid
        value={themeId}
        onChange={handleThemeChange}
        locale="en"
        options={availableThemes.map((option) => ({
          id: option.id,
          label: isThemeOwned(option.id) ? option.label : `${option.label} 🔒`,
          description: isThemeOwned(option.id)
            ? option.description
            : `${option.description} — unlock in the Shop for ${priceByThemeRefId.get(option.id) ?? "?"} coins.`,
          swatch: [...option.swatch],
        }))}
      />

      <SectionTitle>Effect</SectionTitle>
      <OptionGrid
        value={themeEffectId}
        onChange={handleEffectChange}
        locale="en"
        options={availableThemeEffects.map((option) => ({
          id: option.id,
          label: isEffectOwned(option.id) ? option.label : `${option.label} 🔒`,
          description: isEffectOwned(option.id)
            ? option.description
            : `${option.description} — unlock in the Shop for ${priceByEffectRefId.get(option.id) ?? "?"} coins.`,
        }))}
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
