export type RockTier = "critical" | "red" | "yellow" | "green";

export const ROCK_METER_CRITICAL_THRESHOLD = 10;
export const ROCK_METER_RED_THRESHOLD = 33;
export const ROCK_METER_YELLOW_THRESHOLD = 66;

export function rockTierFor(rockFill: number): RockTier {
  if (rockFill < ROCK_METER_CRITICAL_THRESHOLD) return "critical";
  if (rockFill < ROCK_METER_RED_THRESHOLD) return "red";
  if (rockFill < ROCK_METER_YELLOW_THRESHOLD) return "yellow";
  return "green";
}
