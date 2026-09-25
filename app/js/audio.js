// Sons générés par le navigateur (Web Audio API) : piano de synthèse, guitare (Karplus-Strong),
// clics de métronome. Aucun fichier son à télécharger, aucun coût.
import { freq } from './music.js';

let ctx = null;
let master = null;

export function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const now = () => audio().currentTime;

/** Note de « piano » : somme d'harmoniques avec enveloppe percussive. */
export function playPiano(midiNote, { when = 0, duration = 1.2, velocity = 0.6 } = {}) {
  const ac = audio();
  const t = when || ac.currentTime;
  const f = freq(midiNote);
  const out = ac.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(velocity * 0.5, t + 0.008);
  out.gain.exponentialRampToValueAtTime(velocity * 0.18, t + 0.35);
  out.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.6);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(12000, f * 10), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.5), t + duration);
  out.connect(filter).connect(master);
  const partials = [1, 0.5, 0.28, 0.14, 0.08, 0.04];
  partials.forEach((amp, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = i === 0 ? 'triangle' : 'sine';
    o.frequency.value = f * (i + 1) * (1 + 0.0004 * i * i); // légère inharmonicité
    g.gain.value = amp;
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + duration + 0.7);
  });
}

const ksCache = new Map();

/** Corde pincée (algorithme de Karplus-Strong), pré-calculée dans un buffer. */
function pluckBuffer(midiNote) {
  const ac = audio();
  if (ksCache.has(midiNote)) return ksCache.get(midiNote);
  const sr = ac.sampleRate;
  const len = Math.floor(sr * 2.5);
  const buf = ac.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  const period = Math.round(sr / freq(midiNote));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  const decay = 0.996;
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % period;
    const v = decay * 0.5 * (ring[idx] + ring[next]);
    data[i] = ring[idx];
    ring[idx] = v;
    idx = next;
  }
  ksCache.set(midiNote, buf);
  return buf;
}

export function playPluck(midiNote, { when = 0, velocity = 0.5 } = {}) {
  const ac = audio();
  const src = ac.createBufferSource();
  src.buffer = pluckBuffer(midiNote);
  const g = ac.createGain();
  g.gain.value = velocity;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 5000;
  src.connect(f).connect(g).connect(master);
  src.start(when || ac.currentTime);
}

/** Accord gratté (du grave vers l'aigu). */
export function strum(midiNotes, { when = 0, spread = 0.035 } = {}) {
  const t = when || now();
  midiNotes.forEach((m, i) => playPluck(m, { when: t + i * spread, velocity: 0.35 }));
}

export function playChordPiano(midiNotes, { when = 0, arpeggio = 0 } = {}) {
  const t = when || now();
  midiNotes.forEach((m, i) => playPiano(m, { when: t + i * arpeggio, velocity: 0.45, duration: 1.6 }));
}

export function playSequence(midiNotes, { gap = 0.7, when = 0 } = {}) {
  const t = when || now() + 0.05;
  midiNotes.forEach((m, i) => playPiano(m, { when: t + i * gap, duration: gap * 1.2 }));
  return t + midiNotes.length * gap;
}

/** Clic de métronome (accent = temps fort). */
export function click(when = 0, accent = false, volume = 0.5) {
  const ac = audio();
  const t = when || ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.08);
}

/** Son de « wood-block » pour jouer les rythmes. */
export function wood(when = 0, duration = 0.12) {
  const ac = audio();
  const t = when || ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'square';
  o.frequency.value = 800;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1200;
  g.gain.setValueAtTime(0.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.08, duration));
  o.connect(f).connect(g).connect(master);
  o.start(t);
  o.stop(t + duration + 0.05);
}

export function successSound() {
  const t = now();
  playPiano(72, { when: t, duration: 0.25, velocity: 0.35 });
  playPiano(79, { when: t + 0.1, duration: 0.4, velocity: 0.35 });
}

export function errorSound() {
  const ac = audio();
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(220, t);
  o.frequency.linearRampToValueAtTime(160, t + 0.25);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.32);
}

/** Tonalité continue de référence pour l'accordeur. */
export function referenceTone(midiNote, seconds = 2) {
  playPluck(midiNote, { velocity: 0.6 });
  return seconds;
}
