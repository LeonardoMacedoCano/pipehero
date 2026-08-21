import type { ReactNode } from "react";
import styled from "styled-components";
import { themeEffectCss } from "../../themes/effectStyles.js";

export default function ShopEffectPreviewLayer({ effectId, children }: { effectId: string | null; children: ReactNode }) {
  if (!effectId) return <>{children}</>;
  return <Layer $effectId={effectId}>{children}</Layer>;
}

const Layer = styled.div<{ $effectId: string }>`
  position: relative;
  width: 100%;
  ${({ $effectId }) => themeEffectCss($effectId, { selector: "&", bloomPosition: "absolute" })}
`;
