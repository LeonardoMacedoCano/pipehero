import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { getCalibration, setCalibration } from "../../audio/calibrationStore.js";
import { useAuth } from "../hooks/useAuth.js";

const CALIBRATION_STEP_SECONDS = 0.01;
const MS_PER_SECOND = 1000;

function saveCalibrationToServer(seconds: number): void {
  fetch("/api/settings/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calibrationMs: Math.round(seconds * MS_PER_SECOND) }),
  }).catch(() => {});
}

export default function CalibrationControl() {
  const { user } = useAuth();
  const [value, setValue] = useState(() => getCalibration());
  const adjustedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/settings/me")
      .then((response) => response.json() as Promise<{ calibrationMs: number | null }>)
      .then((data) => {
        if (cancelled || adjustedRef.current || data.calibrationMs === null) return;
        const seconds = data.calibrationMs / MS_PER_SECOND;
        setCalibration(seconds);
        setValue(seconds);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  function adjust(deltaSeconds: number) {
    adjustedRef.current = true;
    const next = value + deltaSeconds;
    setCalibration(next);
    setValue(next);
    if (user) saveCalibrationToServer(next);
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
