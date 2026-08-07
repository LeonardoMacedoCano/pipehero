import styled from "styled-components";
import { useThemeControl } from "../contexts/theme/ThemeControlProvider.js";

export default function ThemeAppearancePanel() {
  const { themeId, availableThemes, setThemeId } = useThemeControl();

  return (
    <Grid>
      {availableThemes.map((option) => (
        <ThemeCard key={option.id} type="button" $active={option.id === themeId} onClick={() => setThemeId(option.id)}>
          <Swatch>
            {option.swatch.map((color, i) => (
              <SwatchSlice key={i} style={{ backgroundColor: color }} />
            ))}
          </Swatch>
          <Label>{option.label}</Label>
          <Description>{option.description}</Description>
          {option.id === themeId && <Badge>Selected</Badge>}
        </ThemeCard>
      ))}
    </Grid>
  );
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
`;

const ThemeCard = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  text-align: left;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 2px solid ${({ theme, $active }) => ($active ? theme.colors.quaternary : theme.colors.gray)};
`;

const Swatch = styled.div`
  display: flex;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
`;

const SwatchSlice = styled.div`
  flex: 1;
`;

const Label = styled.span`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
`;

const Description = styled.span`
  font-size: 0.8em;
  color: ${({ theme }) => theme.colors.tertiary};
`;

const Badge = styled.span`
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7em;
  font-weight: bold;
  text-transform: uppercase;
  background-color: ${({ theme }) => theme.colors.quaternary};
  color: ${({ theme }) => theme.colors.white};
`;
