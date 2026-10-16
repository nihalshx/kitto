// Tiny synthesized cat sounds (Web Audio, no audio files). Off by default;
// the visitor turns them on from the chat header.

const KEY = "kitto.sound";
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the toggle still works for this page view
  }
  if (on) audio(); // create/resume inside the click gesture
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function envelope(c: AudioContext, start: number, attack: number, hold: number, release: number, peak: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, start + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
  g.connect(c.destination);
  return g;
}

/** A short rising-falling "mrrp". */
function mrrp(c: AudioContext, at: number, pitch = 1) {
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(480 * pitch, at);
  osc.frequency.exponentialRampToValueAtTime(860 * pitch, at + 0.09);
  osc.frequency.exponentialRampToValueAtTime(620 * pitch, at + 0.2);
  // a little trill
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 32;
  lfoGain.gain.value = 18 * pitch;
  lfo.connect(lfoGain).connect(osc.frequency);
  const g = envelope(c, at, 0.02, 0.12, 0.1, 0.18);
  osc.connect(g);
  osc.start(at);
  lfo.start(at);
  osc.stop(at + 0.26);
  lfo.stop(at + 0.26);
}

/** A low rumbling purr: filtered noise pulsing ~25 times a second. */
function purr(c: AudioContext, at: number, seconds = 1.6) {
  const length = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 260;
  const pulse = c.createGain();
  pulse.gain.value = 0.5;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 25;
  lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain).connect(pulse.gain);
  const g = envelope(c, at, 0.25, seconds - 0.6, 0.35, 0.55);
  noise.connect(lp).connect(pulse).connect(g);
  noise.start(at);
  lfo.start(at);
  noise.stop(at + seconds);
  lfo.stop(at + seconds);
}

/** Bright little arpeggio for celebrations. */
function sparkle(c: AudioContext, at: number) {
  [880, 1175, 1568].forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = envelope(c, at + i * 0.07, 0.01, 0.04, 0.18, 0.12);
    osc.connect(g);
    osc.start(at + i * 0.07);
    osc.stop(at + i * 0.07 + 0.3);
  });
}

export type Sound = "mrrp" | "hello" | "purr" | "celebrate" | "wake" | "back";

export function playSound(sound: Sound): void {
  if (!soundEnabled()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (sound) {
    case "mrrp":
      return mrrp(c, t, 0.9 + Math.random() * 0.25);
    case "hello":
      mrrp(c, t, 1);
      return mrrp(c, t + 0.22, 1.15);
    case "purr":
      return purr(c, t);
    case "celebrate":
      mrrp(c, t, 1.2);
      return sparkle(c, t + 0.15);
    case "wake":
      return mrrp(c, t, 1.35);
    case "back":
      mrrp(c, t, 1.1);
      return mrrp(c, t + 0.2, 1.3);
  }
}
