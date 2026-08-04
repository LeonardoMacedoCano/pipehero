import { useCallback, useEffect, useState } from "react";

const isSupported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    if (!isSupported) return;
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggle = useCallback(() => {
    if (!isSupported) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  return { isFullscreen, toggle, isSupported };
}
