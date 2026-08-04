import styled from "styled-components";
import { cylinderGradientHorizontal, pipeCapGradient, pipeShadow } from "../../pipeStyles.js";

export default function PipeBeam({ width = "100%", thickness = 8 }: { width?: string; thickness?: number }) {
  return (
    <Beam style={{ width }} $thickness={thickness}>
      <Cap $side="left" $thickness={thickness} />
      <Cap $side="right" $thickness={thickness} />
    </Beam>
  );
}

const Beam = styled.div<{ $thickness: number }>`
  position: relative;
  height: ${({ $thickness }) => $thickness}px;
  max-width: 100%;
  background: ${({ theme }) => cylinderGradientHorizontal(theme)};
  box-shadow: ${pipeShadow};
`;

const Cap = styled.div<{ $side: "left" | "right"; $thickness: number }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === "left" ? "left: 0;" : "right: 0;")}
  transform: translate(${({ $side }) => ($side === "left" ? "-45%" : "45%")}, -50%);
  width: ${({ $thickness }) => $thickness + 6}px;
  height: ${({ $thickness }) => $thickness + 6}px;
  border-radius: 50%;
  background: ${({ theme }) => pipeCapGradient(theme)};
  border: 1px solid ${({ theme }) => theme.colors.black};
`;
