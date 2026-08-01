
export type Fret = 0 | 1 | 2 | 3 | 4 | 7;

export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

export interface Note {
  id: number;
  time: number;
  fret: Fret;
  fretName: string;
  duration: number;
  isChord: boolean;
  isHOPO: boolean;
  forced: boolean;
  tap: boolean;
}

export interface PlayableEvent {
  time: number;
  frets: Fret[];
  duration: number;
  isChord: boolean;
  isHOPO: boolean;
}

export type Rating = "perfect" | "good" | "miss";

export interface JudgmentWindows {
  perfect: number;
  good: number;
}

export interface StarPowerPhrase {
  startTime: number;
  endTime: number;
}

export type EventState = "pending" | "hit" | "missed";

export interface GameEvent extends PlayableEvent {
  state: EventState;
  rating: Rating | null;
  starPowerPhraseIndex: number;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  hits: GameEvent[];
  misses: GameEvent[];
  droppedSustains: GameEvent[];
  pendingCount: number;
  holdingCount: number;
  activeHolds: GameEvent[];
  totalNotes: number;
  starPowerMeter: number;
  starPowerActive: boolean;
  multiplier: number;
  rockMeter: number;
  failed: boolean;
}

export type KeyDownResult =
  | { type: "unmatched"; fret: Fret; time: number; awaitingChord: boolean }
  | { type: "judged"; event: GameEvent; rating: Rating };

export type StrumResult = { type: "judged"; event: GameEvent; rating: Rating } | { type: "whiffed"; time: number };

export interface GameEngine {
  handleKeyDown(fret: Fret, time: number): KeyDownResult;
  handleKeyUp(fret: Fret, time: number): void;
  strum(time: number): StrumResult;
  update(currentTime: number): GameEvent[];
  getState(): GameState;
  activateStarPower(): boolean;
}

export interface Playthrough {
  tick(): { chartTime: number; newlyMissed: GameEvent[] };
  pressFret(fret: Fret): KeyDownResult;
  releaseFret(fret: Fret): void;
  strum(): StrumResult;
  getState(): GameState;
  currentChartTime(): number;
  activateStarPower(): boolean;
}

export interface LyricSyllable {
  time: number;
  raw: string;
}

export interface LyricPhrase {
  startTime: number;
  endTime: number;
  text: string;
  syllables: LyricSyllable[];
}

export interface DifficultyRatings {
  band: number | null;
  guitar: number | null;
  bass: number | null;
  drums: number | null;
  vocals: number | null;
}

export interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  year: string;
  charter: string;
  genre: string;
  loadingPhrase: string;
  previewStartSeconds: number;
  difficultyRatings: DifficultyRatings;
  chartUrl: string;
  chartFormat: "chart" | "mid";
  audioUrl: string | null;
  coverUrl: string | null;
}
