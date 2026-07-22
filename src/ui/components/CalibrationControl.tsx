import { useState } from "react";
import styled from "styled-components";
import { getCalibration, setCalibration } from "../../audio/calibrationStore.js";

const CALIBRATION_STEP_SECONDS = 0.01;
const MS_PER_SECOND = 1000;

export default function CalibrationControl() {
  const [value, setValue] = useState(() => getCalibration());

  function adjust(deltaSeconds: number) {
    const next = value + deltaSeconds;
    setCalibration(next);
    setValue(next);
  }

  return (
    <Wrapper>
      <span>Latency calibration:</span>
      <button onClick={() => adjust(-CALIBRATION_STEP_SECONDS)}>− 10ms</button>
      <span>{Math.round(value * MS_PER_SECOND)}ms</span>
      <button onClick={() => adjust(CALIBRATION_STEP_SECONDS)}>+ 10ms</button>
      <Hint>(if notes always seem early/late relative to the sound, adjust here before starting)</Hint>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.tertiary};

  button {
    font-size: 0.85em;
    padding: 2px 8px;
    cursor: pointer;
  }
`;

const Hint = styled.span`
  color: ${({ theme }) => theme.colors.tertiary};
`;
