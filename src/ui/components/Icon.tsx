import styled from "styled-components";
import { ICONS, type IconName } from "./iconRegistry.js";

export default function Icon({ name, className }: { name: string; className?: string }) {
  const Glyph = ICONS[name as IconName];
  if (!Glyph) return null;
  return (
    <Wrap className={className}>
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
