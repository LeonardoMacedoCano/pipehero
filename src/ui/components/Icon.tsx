import styled from "styled-components";
import { ICONS, type IconName } from "./iconRegistry.js";

export default function Icon({ name, className, mono }: { name: string; className?: string; mono?: boolean }) {
  const def = ICONS[name as IconName];
  if (!def) return null;
  const { Glyph, color } = def;
  return (
    <Wrap className={className} style={mono ? undefined : { color }}>
      <Glyph />
    </Wrap>
  );
}

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  vertical-align: -0.15em;

  svg {
    width: 1em;
    height: 1em;
  }
`;
