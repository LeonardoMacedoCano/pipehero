let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

export type CrowdAmbience = "silent" | "cheer" | "loud-cheer" | "boo";

interface ActiveVoice {
  gain: GainNode;
  stoppables: (OscillatorNode | AudioBufferSourceNode)[];
}

const FADE_SECONDS = 0.35;
const NOISE_LOOP_SECONDS = 2.5;

let current: { ambience: CrowdAmbience; voice: ActiveVoice } | null = null;

function fadeOutAndStop(voice: ActiveVoice, ctx: AudioContext): void {
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
  for (const node of voice.stoppables) node.stop(now + FADE_SECONDS + 0.05);
}

function makeNoiseLoop(ctx: AudioContext): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_LOOP_SECONDS), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function buildBooVoice(ctx: AudioContext): ActiveVoice {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + FADE_SECONDS);
  gain.connect(ctx.destination);

  const voiceFilter = ctx.createBiquadFilter();
  voiceFilter.type = "bandpass";
  voiceFilter.frequency.value = 650;
  voiceFilter.Q.value = 0.5;
  voiceFilter.connect(gain);

  const stoppables: (OscillatorNode | AudioBufferSourceNode)[] = [];
  const voiceCount = 4;
  for (let i = 0; i < voiceCount; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 140 + i * 9;
    osc.detune.value = (i / (voiceCount - 1) - 0.5) * 40;
    osc.connect(voiceFilter);
    osc.start();
    stoppables.push(osc);
  }

  const noise = makeNoiseLoop(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1200;
  noiseFilter.Q.value = 0.35;
  noise.connect(noiseFilter);
  noiseFilter.connect(gain);
  noise.start();
  stoppables.push(noise);

  return { gain, stoppables };
}

function buildCheerVoice(ctx: AudioContext, loud: boolean): ActiveVoice {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(loud ? 0.45 : 0.22, ctx.currentTime + FADE_SECONDS);
  gain.connect(ctx.destination);

  const noise = makeNoiseLoop(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = loud ? 2200 : 1800;
  noiseFilter.Q.value = 0.6;
  noise.connect(noiseFilter);
  noiseFilter.connect(gain);
  noise.start();

  const stoppables: (OscillatorNode | AudioBufferSourceNode)[] = [noise];

  if (loud) {
    const whistle = ctx.createOscillator();
    whistle.type = "sine";
    whistle.frequency.setValueAtTime(1800, ctx.currentTime);
    whistle.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 1.2);
    const whistleGain = ctx.createGain();
    whistleGain.gain.value = 0.05;
    whistle.connect(whistleGain);
    whistleGain.connect(gain);
    whistle.start();
    stoppables.push(whistle);
  }

  return { gain, stoppables };
}

export function setCrowdAmbience(ambience: CrowdAmbience): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (current?.ambience === ambience) return;
  if (ctx.state === "suspended") void ctx.resume();

  if (current) {
    fadeOutAndStop(current.voice, ctx);
    current = null;
  }
  if (ambience === "silent") return;

  const voice =
    ambience === "boo" ? buildBooVoice(ctx) : buildCheerVoice(ctx, ambience === "loud-cheer");
  current = { ambience, voice };
}
