import styled from "styled-components";
import { emojiAssets } from "../emojiAssets.js";

export default function Emoji({ glyph, className }: { glyph: string; className?: string }) {
  const src = emojiAssets[glyph];
  if (!src) return <>{glyph}</>;
  return <Img src={src} alt="" draggable={false} className={className} />;
}

const Img = styled.img`
  height: 1em;
  width: 1em;
  vertical-align: -0.15em;
  display: inline-block;
`;
