const AUDIO_MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  opus: "audio/ogg; codecs=opus",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
};

export function isAudioElementFormatSupported(audio: HTMLAudioElement): boolean {
  const path = audio.src.split("?")[0].split("#")[0];
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const mimeType = AUDIO_MIME_TYPES_BY_EXTENSION[extension];
  if (!mimeType) return true;
  return audio.canPlayType(mimeType) !== "";
}
