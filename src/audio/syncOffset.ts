export function toChartTime(audioTime: number, offsetSeconds = 0): number {
  return audioTime + offsetSeconds;
}

export function toAudioTime(chartTime: number, offsetSeconds = 0): number {
  return chartTime - offsetSeconds;
}
