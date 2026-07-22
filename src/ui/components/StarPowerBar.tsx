import styled from "styled-components";

export default function StarPowerBar({ meter, active }: { meter: number; active: boolean }) {
  return (
    <Wrapper>
      <Label>Star Power</Label>
      <BarOuter>
        <BarInner style={{ width: `${meter}%` }} $active={active} />
      </BarOuter>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
`;

const Label = styled.div`
  font-size: 0.8em;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.tertiary};
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  margin-bottom: 4px;
`;

const BarOuter = styled.div`
  width: 100%;
  height: 12px;
  background-color: rgba(0, 0, 0, 0.35);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.gray};
`;

const BarInner = styled.div<{ $active: boolean }>`
  height: 100%;
  transition: width 0.1s linear;
  background: ${({ theme, $active }) =>
    $active
      ? `linear-gradient(90deg, ${theme.colors.laneYellow}, ${theme.colors.laneOrange})`
      : `linear-gradient(90deg, ${theme.colors.laneBlue}, ${theme.colors.quaternary})`};
`;
