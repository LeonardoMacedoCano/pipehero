import { useEffect } from "react";
import type { RefObject } from "react";
import styled from "styled-components";
import { clampDevicePixelRatio } from "../../render/layout.js";
import { graphicsSettingsFor } from "../../render/graphicsQuality.js";
import { getGraphicsQuality } from "../../render/graphicsQualityStore.js";

export default function GameCanvas({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const maxDpr = graphicsSettingsFor(getGraphicsQuality()).maxDevicePixelRatio;
      const dpr = clampDevicePixelRatio(window.devicePixelRatio || 1, maxDpr);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef]);

  return <Canvas ref={canvasRef} />;
}

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;
