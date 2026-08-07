import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled from "styled-components";
import type { Fret } from "../../types.js";
import {
  TOUCH_HIT_LINE_Y_RATIO_LANDSCAPE,
  TOUCH_HIT_LINE_Y_RATIO_PORTRAIT,
  highwayWidthFraction,
  laneBarrelBoundaryFractions,
} from "../../render/layout.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { LANDSCAPE_MEDIA_QUERY } from "../responsive.js";

type LaneColorKey = "lane1" | "lane2" | "lane3" | "lane4" | "lane5";

const FRET_BUTTONS: { fret: Fret; colorKey: LaneColorKey; label: string }[] = [
  { fret: 0, colorKey: "lane1", label: "Button 1" },
  { fret: 1, colorKey: "lane2", label: "Button 2" },
  { fret: 2, colorKey: "lane3", label: "Button 3" },
  { fret: 3, colorKey: "lane4", label: "Button 4" },
  { fret: 4, colorKey: "lane5", label: "Button 5" },
];

function safeSetPointerCapture(target: Element & { setPointerCapture?: (pointerId: number) => void }, pointerId: number): void {
  try {
    target.setPointerCapture?.(pointerId);
  } catch {}
}

export interface TouchControlsProps {
  strumMode: boolean;
  onPressFret: (fret: Fret) => void;
  onReleaseFret: (fret: Fret) => void;
  onStrum: () => void;
}

export default function TouchControls({ strumMode, onPressFret, onReleaseFret, onStrum }: TouchControlsProps) {
  const isLandscapePhone = useMediaQuery(LANDSCAPE_MEDIA_QUERY);
  const hitLineRatio = isLandscapePhone ? TOUCH_HIT_LINE_Y_RATIO_LANDSCAPE : TOUCH_HIT_LINE_Y_RATIO_PORTRAIT;
  const openHeldRef = useRef(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [zoneWidth, setZoneWidth] = useState(0);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const observer = new ResizeObserver(([entry]) => setZoneWidth(entry.contentRect.width));
    observer.observe(zone);
    return () => observer.disconnect();
  }, []);

  const laneBoundaries = useMemo(() => laneBarrelBoundaryFractions(highwayWidthFraction(zoneWidth)), [zoneWidth]);

  function handleZoneDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    if (strumMode) {
      onStrum();
      return;
    }
    if (openHeldRef.current) return;
    openHeldRef.current = true;
    safeSetPointerCapture(event.currentTarget, event.pointerId);
    onPressFret(7);
  }

  function handleZoneUp() {
    if (strumMode || !openHeldRef.current) return;
    openHeldRef.current = false;
    onReleaseFret(7);
  }

  return (
    <StrumZone ref={zoneRef} onPointerDown={handleZoneDown} onPointerUp={handleZoneUp} onPointerCancel={handleZoneUp}>
      <ButtonZone $top={hitLineRatio * 100}>
        {FRET_BUTTONS.map(({ fret, colorKey, label }, index) => (
          <LaneButton
            key={fret}
            fret={fret}
            label={label}
            $colorKey={colorKey}
            $left={laneBoundaries[index] * 100}
            $width={(laneBoundaries[index + 1] - laneBoundaries[index]) * 100}
            onPress={onPressFret}
            onRelease={onReleaseFret}
          />
        ))}
      </ButtonZone>
    </StrumZone>
  );
}

function LaneButton({
  fret,
  label,
  $colorKey,
  $left,
  $width,
  onPress,
  onRelease,
}: {
  fret: Fret;
  label: string;
  $colorKey: LaneColorKey;
  $left: number;
  $width: number;
  onPress: (fret: Fret) => void;
  onRelease: (fret: Fret) => void;
}) {
  const activeRef = useRef(false);
  const [pressed, setPressed] = useState(false);

  function handleDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (activeRef.current) return;
    activeRef.current = true;
    setPressed(true);
    safeSetPointerCapture(event.currentTarget, event.pointerId);
    onPress(fret);
  }

  function handleUp(event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!activeRef.current) return;
    activeRef.current = false;
    setPressed(false);
    onRelease(fret);
  }

  return (
    <LaneButtonHit
      type="button"
      aria-label={label}
      $colorKey={$colorKey}
      $left={$left}
      $width={$width}
      $pressed={pressed}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    />
  );
}

const StrumZone = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  touch-action: none;
`;

const ButtonZone = styled.div<{ $top: number }>`
  position: absolute;
  left: 0;
  right: 0;
  top: ${({ $top }) => $top}%;
  bottom: 0;
`;

const LaneButtonHit = styled.button<{ $colorKey: LaneColorKey; $left: number; $width: number; $pressed: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $left }) => $left}%;
  width: ${({ $width }) => $width}%;
  border: none;
  background: ${({ theme, $colorKey }) => theme.colors[$colorKey]};
  opacity: ${({ $pressed }) => ($pressed ? 0.4 : 0)};
  box-shadow: ${({ $pressed }) => ($pressed ? "inset 0 0 24px rgba(255, 255, 255, 0.5)" : "none")};
  padding: 0;
  touch-action: none;
`;
