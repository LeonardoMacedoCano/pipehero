let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

const VOICE_COUNT = 5;
const START_FREQUENCY_HZ = 220;
const END_FREQUENCY_HZ = 110;
const DETUNE_SPREAD_CENTS = 45;
const ATTACK_SECONDS = 0.08;
const SUSTAIN_SECONDS = 0.7;
const RELEASE_SECONDS = 0.45;
const TOTAL_DURATION_SECONDS = ATTACK_SECONDS + SUSTAIN_SECONDS + RELEASE_SECONDS;

export function playBooSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  const stopAt = now + TOTAL_DURATION_SECONDS;

  const crowdFilter = ctx.createBiquadFilter();
  crowdFilter.type = "bandpass";
  crowdFilter.frequency.value = 700;
  crowdFilter.Q.value = 0.6;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.5, now + ATTACK_SECONDS);
  envelope.gain.setValueAtTime(0.5, now + ATTACK_SECONDS + SUSTAIN_SECONDS);
  envelope.gain.linearRampToValueAtTime(0, stopAt);

  crowdFilter.connect(envelope);
  envelope.connect(ctx.destination);

  for (let i = 0; i < VOICE_COUNT; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const detune = (i / (VOICE_COUNT - 1) - 0.5) * DETUNE_SPREAD_CENTS;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(START_FREQUENCY_HZ, now);
    osc.frequency.exponentialRampToValueAtTime(END_FREQUENCY_HZ, stopAt);
    osc.connect(crowdFilter);
    osc.start(now);
    osc.stop(stopAt);
  }

  const noiseBufferSize = Math.floor(ctx.sampleRate * TOTAL_DURATION_SECONDS);
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBufferSize; i++) noiseData[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1400;
  noiseFilter.Q.value = 0.4;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.15, now + ATTACK_SECONDS);
  noiseGain.gain.setValueAtTime(0.15, now + ATTACK_SECONDS + SUSTAIN_SECONDS);
  noiseGain.gain.linearRampToValueAtTime(0, stopAt);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(stopAt);
}
