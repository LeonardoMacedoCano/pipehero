import { Button } from "lcano-react-ui";
import styled from "styled-components";
import { getCalibration, setCalibration } from "../../audio/calibrationStore.js";
import { useSyncedPreference } from "../hooks/useSyncedPreference.js";

const CALIBRATION_STEP_SECONDS = 0.01;
const MS_PER_SECOND = 1000;

export default function CalibrationControl() {
  const { value, updateValue } = useSyncedPreference<number>({
    field: "calibrationMs",
    get: getCalibration,
    set: setCalibration,
    toPayload: (seconds) => Math.round(seconds * MS_PER_SECOND),
    fromPayload: (raw) => (raw as number) / MS_PER_SECOND,
  });

  function adjust(deltaSeconds: number) {
    updateValue(value + deltaSeconds);
  }

  return (
    <Wrapper>
      <Row>
        <Label>Latency calibration</Label>
        <Button description="− 10ms" variant="secondary" onClick={() => adjust(-CALIBRATION_STEP_SECONDS)} />
        <Value>{Math.round(value * MS_PER_SECOND)}ms</Value>
        <Button description="+ 10ms" variant="secondary" onClick={() => adjust(CALIBRATION_STEP_SECONDS)} />
      </Row>
      <Hint>If notes always seem early or late relative to the sound, adjust here before starting.</Hint>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const Label = styled.span`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  margin-right: auto;
`;

const Value = styled.span`
  min-width: 4.5em;
  text-align: center;
  font-family: monospace;
  color: ${({ theme }) => theme.colors.white};
`;

const Hint = styled.span`
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.tertiary};
`;
