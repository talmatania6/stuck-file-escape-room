// All sound goes through one AudioContext, created on the first user gesture
// (browsers block autoplay before that).

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuffer = null;

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(muted) {
  const c = getCtx();
  master.gain.setTargetAtTime(muted ? 0 : 1, c.currentTime, 0.05);
}

function tone({ freq = 440, type = 'sine', start, dur, vol = 0.3, attack = 0.01, release = 0.05, freqEnd, bus }) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + attack);
  g.gain.setValueAtTime(vol, start + Math.max(attack, dur - release));
  g.gain.linearRampToValueAtTime(0, start + dur);
  o.connect(g);
  g.connect(bus || sfxBus);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise({ start, dur, vol = 0.2, from = 400, to = 1200, q = 1.2 }) {
  const c = getCtx();
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, start);
  f.frequency.exponentialRampToValueAtTime(to, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.08);
  g.gain.linearRampToValueAtTime(0, start + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start(start);
  src.stop(start + dur + 0.05);
}

/* ---------- Room 1: the signal generator ---------- */

export const BEEP = { short: 0.18, long: 0.55, gap: 0.34 };

/** Plays a bit string as short (0) / long (1) beeps. Returns the timeline for the scope screen. */
export function playBeeps(bits) {
  const c = getCtx();
  const t0 = c.currentTime + 0.3;
  let t = 0;
  const timeline = [];
  for (const b of bits) {
    const d = b === '1' ? BEEP.long : BEEP.short;
    timeline.push({ start: t, end: t + d });
    tone({ freq: 880, start: t0 + t, dur: d, vol: 0.32, attack: 0.008, release: 0.02 });
    t += d + BEEP.gap;
  }
  return { t0, timeline, total: t };
}

/* ---------- Sound effects ---------- */

export const sfx = {
  click() {
    const c = getCtx();
    tone({ freq: 1700, type: 'square', start: c.currentTime, dur: 0.035, vol: 0.06 });
  },
  key() {
    const c = getCtx();
    tone({ freq: 1200, type: 'square', start: c.currentTime, dur: 0.05, vol: 0.07 });
  },
  buzz() {
    const c = getCtx();
    tone({ freq: 110, type: 'sawtooth', start: c.currentTime, dur: 0.45, vol: 0.16 });
    tone({ freq: 117, type: 'sawtooth', start: c.currentTime, dur: 0.45, vol: 0.1 });
  },
  creak() {
    const c = getCtx();
    noise({ start: c.currentTime, dur: 0.5, vol: 0.12, from: 900, to: 300, q: 4 });
  },
  success() {
    const c = getCtx();
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', start: c.currentTime + i * 0.11, dur: 0.4, vol: 0.16 }),
    );
  },
  powerUp() {
    const c = getCtx();
    tone({ freq: 40, type: 'sawtooth', freqEnd: 120, start: c.currentTime, dur: 1.8, vol: 0.14, attack: 0.3, release: 0.6 });
    noise({ start: c.currentTime + 0.05, dur: 0.25, vol: 0.25, from: 2500, to: 4000, q: 0.7 });
  },
  door() {
    const c = getCtx();
    noise({ start: c.currentTime, dur: 1.6, vol: 0.18, from: 200, to: 700, q: 1.5 });
    tone({ freq: 70, type: 'triangle', start: c.currentTime, dur: 1.6, vol: 0.1 });
  },
  hint() {
    const c = getCtx();
    tone({ freq: 660, type: 'triangle', freqEnd: 330, start: c.currentTime, dur: 0.35, vol: 0.12 });
  },
  unlock() {
    const c = getCtx();
    tone({ freq: 220, type: 'square', start: c.currentTime, dur: 0.06, vol: 0.08 });
    tone({ freq: 330, type: 'square', start: c.currentTime + 0.09, dur: 0.06, vol: 0.08 });
    tone({ freq: 660, type: 'triangle', start: c.currentTime + 0.2, dur: 0.5, vol: 0.12 });
  },
  stamp() {
    const c = getCtx();
    noise({ start: c.currentTime, dur: 0.12, vol: 0.35, from: 300, to: 200, q: 0.8 });
    tone({ freq: 90, type: 'sine', start: c.currentTime, dur: 0.15, vol: 0.25 });
  },
  pick() {
    const c = getCtx();
    tone({ freq: 900, type: 'triangle', start: c.currentTime, dur: 0.06, vol: 0.08 });
  },
  drop() {
    const c = getCtx();
    tone({ freq: 520, type: 'triangle', start: c.currentTime, dur: 0.08, vol: 0.1 });
  },
  fragment() {
    const c = getCtx();
    [784, 988, 1175].forEach((f, i) => tone({ freq: f, type: 'sine', start: c.currentTime + i * 0.09, dur: 0.6, vol: 0.09 }));
  },
  elevator() {
    const c = getCtx();
    tone({ freq: 60, type: 'sine', start: c.currentTime, dur: 2.6, vol: 0.18, attack: 0.4, release: 0.6 });
    tone({ freq: 880, type: 'sine', start: c.currentTime + 2.4, dur: 0.6, vol: 0.12 });
  },
};

/* ---------- Music: three tension levels ----------
 * If the team adds public/audio/music-calm.mp3, music-mid.mp3 and music-high.mp3
 * (e.g. made in Suno), those are used and cross-faded. Otherwise a quiet
 * synthesized drone stands in. */

const music = { started: false, mode: null, level: 0, files: {}, filter: null, nextTick: 0, timer: null };
const LEVEL_NAMES = ['calm', 'mid', 'high'];

async function filesAvailable() {
  const checks = await Promise.all(
    LEVEL_NAMES.map((l) =>
      fetch(`audio/music-${l}.mp3`, { method: 'HEAD' })
        .then((r) => r.ok && (r.headers.get('content-type') || '').includes('audio'))
        .catch(() => false),
    ),
  );
  return checks.every(Boolean);
}

export async function startMusic() {
  if (music.started) return;
  music.started = true;
  const c = getCtx();
  if (await filesAvailable()) {
    music.mode = 'files';
    LEVEL_NAMES.forEach((l) => {
      const a = new Audio(`audio/music-${l}.mp3`);
      a.loop = true;
      a.crossOrigin = 'anonymous';
      const src = c.createMediaElementSource(a);
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(g);
      g.connect(musicBus);
      a.play().catch(() => {});
      music.files[l] = g;
    });
  } else {
    music.mode = 'synth';
    startSynth(c);
  }
  applyLevel();
}

function startSynth(c) {
  const out = c.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(0.09, c.currentTime + 4);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 380;
  f.connect(out);
  out.connect(musicBus);
  [55, 82.41, 110.6].forEach((fr, i) => {
    const o = c.createOscillator();
    o.type = i === 2 ? 'triangle' : 'sine';
    o.frequency.value = fr;
    o.detune.value = (i - 1) * 7;
    const g = c.createGain();
    g.gain.value = i === 2 ? 0.22 : 0.5;
    o.connect(g);
    g.connect(f);
    o.start();
  });
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain);
  lfoGain.connect(f.frequency);
  lfo.start();
  music.filter = f;
  music.nextTick = c.currentTime + 2;
  const pent = [220, 247, 294, 330, 392, 440];
  music.timer = setInterval(() => {
    const now = c.currentTime;
    if (now + 0.2 < music.nextTick) return;
    const t = music.nextTick;
    if (music.level === 0) {
      tone({ freq: pent[Math.floor(Math.random() * pent.length)] * 2, type: 'sine', start: t, dur: 1.6, vol: 0.025, attack: 0.3, release: 1, bus: musicBus });
      music.nextTick = t + 5 + Math.random() * 3;
    } else {
      const interval = music.level === 1 ? 0.75 : 0.42;
      tone({ freq: music.level === 1 ? 196 : 247, type: 'triangle', start: t, dur: 0.09, vol: 0.05, bus: musicBus });
      music.nextTick = t + interval;
    }
  }, 60);
}

function applyLevel() {
  const c = getCtx();
  if (music.mode === 'files') {
    LEVEL_NAMES.forEach((l, i) => music.files[l].gain.setTargetAtTime(i === music.level ? 1 : 0, c.currentTime, 1.2));
  } else if (music.mode === 'synth' && music.filter) {
    music.filter.frequency.setTargetAtTime([380, 520, 700][music.level], c.currentTime, 1.5);
    music.nextTick = Math.min(music.nextTick, c.currentTime + 0.5);
  }
}

/** 0: more than 10 minutes left, 1: 5–10 minutes, 2: under 5 minutes. */
export function setTension(level) {
  if (level === music.level) return;
  music.level = level;
  if (music.started) applyLevel();
}


/** Lower the music while Ping is speaking. */
export function duckMusic(on) {
  if (!ctx || !musicBus) return;
  musicBus.gain.setTargetAtTime(on ? 0.22 : 0.55, ctx.currentTime, on ? 0.12 : 0.5);
}
