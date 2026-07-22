let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

const BUZZ_DURATION_SECONDS = 0.06;
const THUMP_DURATION_SECONDS = 0.09;

// Synthesized "miss" cue — a short, dull "dead string" buzz (low-passed
// noise, not bright/metallic) layered with a quick, low, quickly-decaying
// thump (a palm-muted pluck rather than a ringing tone), in the spirit of
// the classic rhythm-game "missed note" sound. Synthesized rather than a
// sampled/ripped sound so there's no copyrighted asset to ship.
export function playMissClank(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * BUZZ_DURATION_SECONDS));
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 1100;
  noiseFilter.Q.value = 0.7;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + BUZZ_DURATION_SECONDS);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + BUZZ_DURATION_SECONDS);

  const thump = ctx.createOscillator();
  thump.type = "square";
  thump.frequency.setValueAtTime(150, now);
  thump.frequency.exponentialRampToValueAtTime(70, now + THUMP_DURATION_SECONDS);

  const thumpFilter = ctx.createBiquadFilter();
  thumpFilter.type = "lowpass";
  thumpFilter.frequency.value = 500;

  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.28, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + THUMP_DURATION_SECONDS);

  thump.connect(thumpFilter);
  thumpFilter.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(now);
  thump.stop(now + THUMP_DURATION_SECONDS);
}
