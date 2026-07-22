import { useEffect, useState } from "react";
import { parseChart, type ParsedChart } from "parsehero";
import type { Difficulty, Song } from "../../types.js";
import { listAvailableDifficulties } from "../../engine/availableTracks.js";

export function useChart(song: Song | null): {
  chart: ParsedChart | null;
  error: Error | null;
  availableDifficulties: Difficulty[];
  isLoading: boolean;
} {
  const [chart, setChart] = useState<ParsedChart | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setChart(null);
    setError(null);
    if (!song) return;

    let cancelled = false;

    async function load(currentSong: Song) {
      try {
        const response = await fetch(currentSong.chartUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} buscando o chart`);
        const raw = currentSong.chartFormat === "mid" ? await response.arrayBuffer() : await response.text();
        const { chart: parsedChart } = parseChart(raw);
        if (!cancelled) setChart(parsedChart);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      }
    }

    load(song);
    return () => {
      cancelled = true;
    };
  }, [song]);

  return {
    chart,
    error,
    availableDifficulties: chart ? listAvailableDifficulties(chart) : [],
    isLoading: !!song && !chart && !error,
  };
}
