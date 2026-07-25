import { useEffect, useRef } from "react";
import { diffGamepadSnapshots, readGamepadSnapshots, type GamepadEdges, type GamepadSnapshot } from "../../game/gamepadInput.js";

export function useGamepadPolling(onEdges: (edges: GamepadEdges) => void, enabled: boolean): void {
  const onEdgesRef = useRef(onEdges);
  onEdgesRef.current = onEdges;

  useEffect(() => {
    if (!enabled) return;

    let rafId: number;
    let previous: GamepadSnapshot[] = readGamepadSnapshots();

    function tick() {
      const current = readGamepadSnapshots();
      const edges = diffGamepadSnapshots(previous, current);
      if (edges.pressed.length > 0 || edges.released.length > 0) {
        onEdgesRef.current(edges);
      }
      previous = current;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);
}
