import type { Fret, JudgmentWindows, KeyDownResult, Note, Playthrough, StarPowerPhrase } from "../types.js";
import { createGameEngine } from "../engine/gameEngine.js";
import { groupIntoPlayableEvents } from "../engine/chordGrouping.js";
import { toChartTime } from "../audio/syncOffset.js";

export function createPlaythrough({
  notes,
  offsetSeconds = 0,
  getAudioTime,
  starPowerPhrases = [],
  windows,
  strumMode,
}: {
  notes: Note[];
  offsetSeconds?: number;
  getAudioTime: () => number;
  starPowerPhrases?: StarPowerPhrase[];
  windows?: JudgmentWindows;
  strumMode?: boolean;
}): Playthrough {
  const engine = createGameEngine(groupIntoPlayableEvents(notes), { starPowerPhrases, windows, strumMode });

  function currentChartTime(): number {
    return toChartTime(getAudioTime(), offsetSeconds);
  }

  function tick(): { chartTime: number; newlyMissed: ReturnType<typeof engine.update> } {
    const chartTime = currentChartTime();
    const newlyMissed = engine.update(chartTime);
    return { chartTime, newlyMissed };
  }

  function pressFret(fret: Fret): KeyDownResult {
    const chartTime = currentChartTime();
    return engine.handleKeyDown(fret, chartTime);
  }

  function releaseFret(fret: Fret): void {
    const chartTime = currentChartTime();
    engine.handleKeyUp(fret, chartTime);
  }

  function strum(): ReturnType<typeof engine.strum> {
    return engine.strum(currentChartTime());
  }

  function getState() {
    return engine.getState();
  }

  return {
    tick,
    pressFret,
    releaseFret,
    strum,
    getState,
    currentChartTime,
    activateStarPower: engine.activateStarPower,
  };
}
