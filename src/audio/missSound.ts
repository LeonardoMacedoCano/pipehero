let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 256;
  const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

const BASE_FREQUENCY_HZ = 185;
const DETUNE_CENTS = 60;
const PICK_CLICK_DURATION_SECONDS = 0.004;
const ATTACK_SECONDS = 0.001;
const DECAY_SECONDS = 0.05;
const RELEASE_SECONDS = 0.015;
const TOTAL_DURATION_SECONDS = ATTACK_SECONDS + DECAY_SECONDS + RELEASE_SECONDS;

export function playMissClank(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  const stopAt = now + TOTAL_DURATION_SECONDS;

  const distortion = ctx.createWaveShaper();
  distortion.curve = distortionCurve(22);
  distortion.oversample = "2x";

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 150;

  const bodyPeak = ctx.createBiquadFilter();
  bodyPeak.type = "peaking";
  bodyPeak.frequency.value = 1200;
  bodyPeak.Q.value = 1;
  bodyPeak.gain.value = 6;

  const metallicPeak = ctx.createBiquadFilter();
  metallicPeak.type = "peaking";
  metallicPeak.frequency.value = 4000;
  metallicPeak.Q.value = 1.2;
  metallicPeak.gain.value = 8;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.55, now + ATTACK_SECONDS);
  envelope.gain.exponentialRampToValueAtTime(0.05, now + ATTACK_SECONDS + DECAY_SECONDS);
  envelope.gain.linearRampToValueAtTime(0, stopAt);

  distortion.connect(highpass);
  highpass.connect(bodyPeak);
  bodyPeak.connect(metallicPeak);
  metallicPeak.connect(envelope);
  envelope.connect(ctx.destination);

  for (const detuneCents of [-DETUNE_CENTS / 2, DETUNE_CENTS / 2]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = BASE_FREQUENCY_HZ;
    osc.detune.value = detuneCents;
    osc.connect(distortion);
    osc.start(now);
    osc.stop(stopAt);
  }

  const clickBufferSize = Math.max(1, Math.floor(ctx.sampleRate * PICK_CLICK_DURATION_SECONDS));
  const clickBuffer = ctx.createBuffer(1, clickBufferSize, ctx.sampleRate);
  const clickData = clickBuffer.getChannelData(0);
  for (let i = 0; i < clickBufferSize; i++) clickData[i] = Math.random() * 2 - 1;

  const click = ctx.createBufferSource();
  click.buffer = clickBuffer;

  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = "highpass";
  clickFilter.frequency.value = 2500;

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.4, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + PICK_CLICK_DURATION_SECONDS);

  click.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.start(now);
  click.stop(now + PICK_CLICK_DURATION_SECONDS);
}
