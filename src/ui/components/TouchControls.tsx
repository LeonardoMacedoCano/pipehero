import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled, { css, keyframes } from "styled-components";
import type { Fret } from "../../types.js";
import type { Handedness, TouchButtonSize } from "../../game/controlSchemeStore.js";
import { STAR_POWER_ACTIVATION_THRESHOLD, STAR_POWER_METER_EPSILON } from "../../engine/gameEngine.js";
import { STAR_POWER_BOLT, STAR_POWER_BOLT_COLOR, STAR_POWER_BOLT_COLOR_LIGHT } from "./starPowerBolt.js";

type LaneColorKey = "laneGreen" | "laneRed" | "laneYellow" | "laneBlue" | "laneOrange";

const FRET_BUTTONS: { fret: Fret; colorKey: LaneColorKey; label: string }[] = [
  { fret: 0, colorKey: "laneGreen", label: "Green" },
  { fret: 1, colorKey: "laneRed", label: "Red" },
  { fret: 2, colorKey: "laneYellow", label: "Yellow" },
  { fret: 3, colorKey: "laneBlue", label: "Blue" },
  { fret: 4, colorKey: "laneOrange", label: "Orange" },
];

const SIZES: Record<TouchButtonSize, { fret: number; bar: number }> = {
  small: { fret: 44, bar: 44 },
  medium: { fret: 54, bar: 54 },
  large: { fret: 64, bar: 64 },
};

const STRUM_DRAG_THRESHOLD_PX = 16;

function safeSetPointerCapture(target: Element & { setPointerCapture?: (pointerId: number) => void }, pointerId: number): void {
  try {
    target.setPointerCapture?.(pointerId);
  } catch {}
}

export interface TouchControlsProps {
  strumMode: boolean;
  handedness: Handedness;
  buttonSize: TouchButtonSize;
  starPowerMeter: number;
  starPowerActive: boolean;
  onPressFret: (fret: Fret) => void;
  onReleaseFret: (fret: Fret) => void;
  onStrum: () => void;
  onActivateStarPower: () => void;
}

export default function TouchControls({
  strumMode,
  handedness,
  buttonSize,
  starPowerMeter,
  starPowerActive,
  onPressFret,
  onReleaseFret,
  onStrum,
  onActivateStarPower,
}: TouchControlsProps) {
  const size = SIZES[buttonSize];
  const starReady = starPowerMeter >= STAR_POWER_ACTIVATION_THRESHOLD - STAR_POWER_METER_EPSILON;
  const starUsable = starReady && !starPowerActive;

  return (
    <Bar>
      <FretRow $reverse={handedness === "left"}>
        {FRET_BUTTONS.map(({ fret, colorKey, label }) => (
          <FretButton key={fret} fret={fret} colorKey={colorKey} label={label} diameter={size.fret} onPress={onPressFret} onRelease={onReleaseFret} />
        ))}
      </FretRow>

      <BottomRow>
        {strumMode ? <StrumTrack height={size.bar} onStrum={onStrum} /> : <OpenBar height={size.bar} onPress={onPressFret} onRelease={onReleaseFret} />}
        <StarPowerButton diameter={size.fret} usable={starUsable} glowing={starReady || starPowerActive} onActivate={onActivateStarPower} />
      </BottomRow>
    </Bar>
  );
}

function FretButton({
  fret,
  colorKey,
  label,
  diameter,
  onPress,
  onRelease,
}: {
  fret: Fret;
  colorKey: LaneColorKey;
  label: string;
  diameter: number;
  onPress: (fret: Fret) => void;
  onRelease: (fret: Fret) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const activeRef = useRef(false);

  function handleDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (activeRef.current) return;
    activeRef.current = true;
    setPressed(true);
    safeSetPointerCapture(event.currentTarget, event.pointerId);
    onPress(fret);
  }

  function handleUp() {
    if (!activeRef.current) return;
    activeRef.current = false;
    setPressed(false);
    onRelease(fret);
  }

  return (
    <FretCircle
      type="button"
      aria-label={label}
      $colorKey={colorKey}
      $diameter={diameter}
      $pressed={pressed}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    />
  );
}

function OpenBar({ height, onPress, onRelease }: { height: number; onPress: (fret: Fret) => void; onRelease: (fret: Fret) => void }) {
  const [pressed, setPressed] = useState(false);
  const activeRef = useRef(false);

  function handleDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (activeRef.current) return;
    activeRef.current = true;
    setPressed(true);
    safeSetPointerCapture(event.currentTarget, event.pointerId);
    onPress(7);
  }

  function handleUp() {
    if (!activeRef.current) return;
    activeRef.current = false;
    setPressed(false);
    onRelease(7);
  }

  return (
    <BarButton type="button" aria-label="Open" $variant="open" $height={height} $active={pressed} onPointerDown={handleDown} onPointerUp={handleUp} onPointerCancel={handleUp}>
      <OpenDot />
      <BarLabel>OPEN</BarLabel>
    </BarButton>
  );
}

function StrumTrack({ height, onStrum }: { height: number; onStrum: () => void }) {
  const lastYRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  function handleDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    safeSetPointerCapture(event.currentTarget, event.pointerId);
    lastYRef.current = event.clientY;
    setActive(true);
    onStrum();
  }

  function handleMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (lastYRef.current === null) return;
    const delta = event.clientY - lastYRef.current;
    if (Math.abs(delta) >= STRUM_DRAG_THRESHOLD_PX) {
      lastYRef.current = event.clientY;
      onStrum();
    }
  }

  function handleUp() {
    lastYRef.current = null;
    setActive(false);
  }

  return (
    <BarButton
      type="button"
      aria-label="Strum"
      $variant="strum"
      $height={height}
      $active={active}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <BarChevron>&#9650;</BarChevron>
      <BarLabel>STRUM</BarLabel>
      <BarChevron>&#9660;</BarChevron>
    </BarButton>
  );
}

function StarPowerButton({ diameter, usable, glowing, onActivate }: { diameter: number; usable: boolean; glowing: boolean; onActivate: () => void }) {
  return (
    <StarButton type="button" aria-label="Activate Star Power" disabled={!usable} $diameter={diameter} $glowing={glowing} onClick={onActivate}>
      <svg viewBox="0 0 100 100" width="58%" height="58%" role="img" aria-hidden="true">
        <polygon points={STAR_POWER_BOLT.points} fill="currentColor" stroke="rgba(255, 255, 255, 0.5)" strokeWidth={3} strokeLinejoin="round" />
      </svg>
    </StarButton>
  );
}

const Bar = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 16px 18px 18px;
  background: ${({ theme }) => theme.colors.primary};
  border-top: 1px solid ${({ theme }) => theme.colors.gray};
`;

const FretRow = styled.div<{ $reverse: boolean }>`
  display: flex;
  flex-direction: ${({ $reverse }) => ($reverse ? "row-reverse" : "row")};
  align-items: center;
  justify-content: space-between;
`;

const BottomRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 10px;
`;

const FretCircle = styled.button<{ $colorKey: LaneColorKey; $diameter: number; $pressed: boolean }>`
  width: ${({ $diameter }) => $diameter}px;
  height: ${({ $diameter }) => $diameter}px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, ${({ $pressed }) => ($pressed ? 0.85 : 0.3)});
  background: ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  box-shadow: ${({ $pressed, theme, $colorKey }) =>
    $pressed ? `0 0 18px 4px ${theme.colors[$colorKey]}, inset 0 0 10px rgba(0, 0, 0, 0.35)` : "0 2px 6px rgba(0, 0, 0, 0.55)"};
  transform: scale(${({ $pressed }) => ($pressed ? 0.92 : 1)});
  transition: transform 0.06s ease-out, box-shadow 0.06s ease-out, border-color 0.06s ease-out;
  touch-action: none;
  padding: 0;
  flex-shrink: 0;
`;

const BarButton = styled.button<{ $variant: "strum" | "open"; $height: number; $active: boolean }>`
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: ${({ $height }) => $height}px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme, $active, $variant }) => ($active ? ($variant === "open" ? theme.colors.laneOpen : theme.colors.info) : theme.colors.gray)};
  background: ${({ theme, $active }) => ($active ? theme.colors.secondary : theme.colors.black)};
  color: ${({ theme }) => theme.colors.tertiary};
  touch-action: none;
  padding: 0;
`;

const BarChevron = styled.span`
  font-size: 0.85em;
  opacity: 0.7;
`;

const BarLabel = styled.span`
  font-family: monospace;
  font-size: 0.85em;
  letter-spacing: 0.1em;
`;

const OpenDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.laneOpen};
  flex-shrink: 0;
`;

const starPulse = keyframes`
  0%, 100% { box-shadow: 0 0 10px 2px ${STAR_POWER_BOLT_COLOR}; }
  50% { box-shadow: 0 0 22px 7px ${STAR_POWER_BOLT_COLOR_LIGHT}; }
`;

const StarButton = styled.button<{ $diameter: number; $glowing: boolean }>`
  width: ${({ $diameter }) => $diameter}px;
  height: ${({ $diameter }) => $diameter}px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${STAR_POWER_BOLT_COLOR};
  background: ${({ theme }) => theme.colors.black};
  color: ${STAR_POWER_BOLT_COLOR_LIGHT};
  touch-action: manipulation;
  padding: 0;
  animation: ${({ $glowing }) => ($glowing ? css`${starPulse} 1s ease-in-out infinite` : "none")};
  transition: opacity 0.15s ease-out;

  &:disabled {
    opacity: 0.3;
    border-color: ${({ theme }) => theme.colors.gray};
    color: ${({ theme }) => theme.colors.gray};
  }
`;
