let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

const NOISE_DURATION_SECONDS = 0.12;
const THUD_DURATION_SECONDS = 0.15;

// Synthesized "miss" cue — a burst of band-passed noise (the metallic edge)
// layered with a quick descending thud (the muted body), in the spirit of
// the classic rhythm-game "missed note" clank. Synthesized rather than a
// sampled/ripped sound so there's no copyrighted asset to ship.
export function playMissClank(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * NOISE_DURATION_SECONDS));
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2200;
  bandpass.Q.value = 1.1;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.45, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + NOISE_DURATION_SECONDS);

  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + NOISE_DURATION_SECONDS);

  const thud = ctx.createOscillator();
  thud.type = "triangle";
  thud.frequency.setValueAtTime(190, now);
  thud.frequency.exponentialRampToValueAtTime(85, now + THUD_DURATION_SECONDS);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.3, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + THUD_DURATION_SECONDS);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now);
  thud.stop(now + THUD_DURATION_SECONDS);
}
