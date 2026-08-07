import { useEffect, useState } from "react";

function matches(query: string): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(query);
    function handleChange() {
      setValue(mediaQuery.matches);
    }
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return value;
}
