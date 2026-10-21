// Sons sintetizados com WebAudio: bleeps simples, nenhum arquivo externo.

export type Sfx =
  | 'click'
  | 'card'
  | 'deal'
  | 'flip'
  | 'truco'
  | 'accept'
  | 'run'
  | 'roundWin'
  | 'roundLose'
  | 'tie'
  | 'zap'
  | 'chips'
  | 'mult'
  | 'xmult'
  | 'coin'
  | 'buy'
  | 'error'
  | 'blindWin'
  | 'gameOver'
  | 'victory'
  | 'pack';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.6;
let muted = false;

export function configureAudio(v: number, m: boolean): void {
  volume = v;
  muted = m;
  if (master) master.gain.value = muted ? 0 : volume * 0.5;
}

function audio(): AudioContext | null {
  if (muted || volume <= 0) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume * 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', when = 0, gain = 0.25, slideTo?: number): void {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, when = 0, gain = 0.2, filterFreq = 2000): void {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + when;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

/** Pitch sobe a cada chamada seguida (para a sequência de pontuação). */
let streak = 0;
let lastStreak = 0;

export function sfx(name: Sfx): void {
  const now = performance.now();
  if (now - lastStreak > 900) streak = 0;
  switch (name) {
    case 'click':
      tone(660, 0.05, 'square', 0, 0.12);
      break;
    case 'card':
      noise(0.08, 0, 0.25, 3000);
      break;
    case 'deal':
      for (let i = 0; i < 3; i++) noise(0.05, i * 0.07, 0.18, 3500);
      break;
    case 'flip':
      noise(0.06, 0, 0.2, 1500);
      tone(880, 0.05, 'triangle', 0.03, 0.08);
      break;
    case 'truco':
      tone(196, 0.18, 'sawtooth', 0, 0.3);
      tone(262, 0.18, 'sawtooth', 0.12, 0.3);
      tone(392, 0.35, 'sawtooth', 0.24, 0.3);
      noise(0.25, 0.24, 0.25, 800);
      break;
    case 'accept':
      tone(392, 0.1, 'square', 0, 0.2);
      tone(523, 0.16, 'square', 0.09, 0.2);
      break;
    case 'run':
      tone(400, 0.35, 'triangle', 0, 0.25, 120);
      break;
    case 'roundWin':
      tone(523, 0.08, 'square', 0, 0.18);
      tone(784, 0.14, 'square', 0.07, 0.18);
      break;
    case 'roundLose':
      tone(330, 0.12, 'square', 0, 0.16);
      tone(247, 0.2, 'square', 0.1, 0.16);
      break;
    case 'tie':
      tone(440, 0.1, 'triangle', 0, 0.2);
      tone(440, 0.1, 'triangle', 0.14, 0.2);
      break;
    case 'zap':
      tone(110, 0.4, 'sawtooth', 0, 0.3, 880);
      noise(0.3, 0.05, 0.3, 4000);
      break;
    case 'chips':
      streak++;
      lastStreak = now;
      tone(440 * Math.pow(1.06, Math.min(streak, 24)), 0.07, 'square', 0, 0.14);
      break;
    case 'mult':
      streak++;
      lastStreak = now;
      tone(330 * Math.pow(1.06, Math.min(streak, 24)), 0.1, 'sawtooth', 0, 0.16);
      break;
    case 'xmult':
      streak++;
      lastStreak = now;
      tone(220 * Math.pow(1.06, Math.min(streak, 24)), 0.22, 'sawtooth', 0, 0.22, 660 * Math.pow(1.06, Math.min(streak, 24)));
      noise(0.15, 0, 0.18, 1200);
      break;
    case 'coin':
      tone(988, 0.06, 'square', 0, 0.14);
      tone(1319, 0.12, 'square', 0.05, 0.14);
      break;
    case 'buy':
      tone(660, 0.06, 'square', 0, 0.14);
      tone(990, 0.1, 'square', 0.06, 0.14);
      break;
    case 'error':
      tone(150, 0.15, 'square', 0, 0.2);
      break;
    case 'pack':
      noise(0.3, 0, 0.25, 2500);
      tone(523, 0.1, 'triangle', 0.15, 0.2);
      tone(659, 0.1, 'triangle', 0.25, 0.2);
      tone(784, 0.2, 'triangle', 0.35, 0.2);
      break;
    case 'blindWin':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', i * 0.1, 0.2));
      break;
    case 'gameOver':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', i * 0.18, 0.25));
      break;
    case 'victory':
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', i * 0.12, 0.2));
      break;
  }
}
