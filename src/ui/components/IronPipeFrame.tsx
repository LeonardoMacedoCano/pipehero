import styled from "styled-components";

const IronPipeFrame = styled.div<{ $glow: boolean }>`
  position: relative;
  padding: 10px 18px;
  border-radius: 10px;
  background: linear-gradient(
    160deg,
    ${({ theme }) => theme.colors.quaternary},
    ${({ theme }) => theme.colors.gray} 45%,
    ${({ theme }) => theme.colors.black} 100%
  );
  border: 1px solid ${({ theme }) => theme.colors.black};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -2px 4px rgba(0, 0, 0, 0.6),
    0 4px 10px rgba(0, 0, 0, 0.5),
    ${({ $glow, theme }) => ($glow ? `0 0 22px ${theme.colors.info}` : "0 0 0 transparent")};
  background-image:
    radial-gradient(circle 3px, rgba(255, 255, 255, 0.5) 40%, transparent 42%),
    radial-gradient(circle 3px, rgba(255, 255, 255, 0.5) 40%, transparent 42%),
    radial-gradient(circle 3px, rgba(255, 255, 255, 0.5) 40%, transparent 42%),
    radial-gradient(circle 3px, rgba(255, 255, 255, 0.5) 40%, transparent 42%);
  background-repeat: no-repeat;
  background-position:
    8px 8px,
    calc(100% - 8px) 8px,
    8px calc(100% - 8px),
    calc(100% - 8px) calc(100% - 8px);
  transition: box-shadow 0.3s ease;
`;

export default IronPipeFrame;
