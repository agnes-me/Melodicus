// Accords de guitare : données et dessin des diagrammes (SVG maison, très simple).
import { parse, midi } from './music.js';

export const GUITAR_TUNING = [40, 45, 50, 55, 59, 64]; // mi2 la2 ré3 sol3 si3 mi4 (grave → aigu)

// frets : de la corde de mi grave à la corde de mi aigu ; -1 = corde non jouée, 0 = à vide.
// fingers : numéro du doigt (1 index … 4 auriculaire).
export const CHORDS = [
  { id: 'C', name: 'Do', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], tones: ['C4', 'E4', 'G4'], kind: 'majeur' },
  { id: 'D', name: 'Ré', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], tones: ['D4', 'F#4', 'A4'], kind: 'majeur' },
  { id: 'E', name: 'Mi', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], tones: ['E4', 'G#4', 'B4'], kind: 'majeur' },
  { id: 'G', name: 'Sol', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], tones: ['G4', 'B4', 'D5'], kind: 'majeur' },
  { id: 'A', name: 'La', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], tones: ['A4', 'C#5', 'E5'], kind: 'majeur' },
  { id: 'Am', name: 'La mineur', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], tones: ['A4', 'C5', 'E5'], kind: 'mineur' },
  { id: 'Dm', name: 'Ré mineur', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], tones: ['D4', 'F4', 'A4'], kind: 'mineur' },
  { id: 'Em', name: 'Mi mineur', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], tones: ['E4', 'G4', 'B4'], kind: 'mineur' },
  { id: 'Fs', name: 'Fa (petit)', frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], barre: { fret: 1, from: 4, to: 5 }, tones: ['F4', 'A4', 'C5'], kind: 'majeur' },
  { id: 'B7', name: 'Si 7', frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], tones: ['B3', 'D#4', 'F#4', 'A4'], kind: 'septième' },
  { id: 'F', name: 'Fa (barré)', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 }, tones: ['F4', 'A4', 'C5'], kind: 'majeur' },
  { id: 'Fm', name: 'Fa mineur', frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 1, from: 0, to: 5 }, tones: ['F4', 'Ab4', 'C5'], kind: 'mineur' },
  { id: 'B', name: 'Si', frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], barre: { fret: 2, from: 1, to: 5 }, tones: ['B3', 'D#4', 'F#4'], kind: 'majeur' },
  { id: 'Bm', name: 'Si mineur', frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 }, tones: ['B3', 'D4', 'F#4'], kind: 'mineur' },
  { id: 'Cm', name: 'Do mineur', frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 3, from: 1, to: 5 }, tones: ['C4', 'Eb4', 'G4'], kind: 'mineur' },
  { id: 'Gm', name: 'Sol mineur', frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 3, from: 0, to: 5 }, tones: ['G4', 'Bb4', 'D5'], kind: 'mineur' },
];

export const chordById = Object.fromEntries(CHORDS.map((c) => [c.id, c]));

export const CHORD_LEVELS = [
  { label: 'Premiers accords', desc: 'Do, Ré, Mi, Sol, La', ids: ['C', 'D', 'E', 'G', 'A'] },
  { label: 'Les mineurs', desc: '+ La m, Ré m, Mi m', ids: ['C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em'] },
  { label: 'Fa et Si 7', desc: '+ petit Fa, Si 7', ids: ['C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em', 'Fs', 'B7'] },
  { label: 'Accords barrés', desc: 'Fa, Fa m, Si, Si m, Do m, Sol m', ids: ['F', 'Fm', 'B', 'Bm', 'Cm', 'Gm'] },
];

/** Notes MIDI réellement jouées par l'accord (grave → aigu). */
export function chordMidi(chord) {
  return chord.frets.flatMap((f, s) => (f < 0 ? [] : [GUITAR_TUNING[s] + f]));
}

/** Vérifie que les notes jouées correspondent bien aux notes de l'accord (utilisé par les tests). */
export function chordPitchClasses(chord) {
  return [...new Set(chordMidi(chord).map((m) => m % 12))].sort((a, b) => a - b);
}

export function tonePitchClasses(chord) {
  return [...new Set(chord.tones.map((t) => midi(parse(t)) % 12))].sort((a, b) => a - b);
}

const SVGNS = 'http://www.w3.org/2000/svg';

/** Diagramme d'accord (cordes verticales, cases horizontales). */
export function chordDiagram(chord, { size = 1, showName = true } = {}) {
  const played = chord.frets.filter((f) => f > 0);
  const minFret = Math.min(...played);
  const maxFret = Math.max(...played);
  const base = maxFret > 4 ? minFret : 1; // première case affichée
  const W = 120;
  const H = 150;
  const x0 = 20;
  const y0 = showName ? 40 : 22;
  const dx = 16;
  const dy = 22;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chord-diagram');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Diagramme de l'accord ${chord.name}`);
  svg.style.width = `${W * size}px`;
  const el = (name, attrs, text) => {
    const n = document.createElementNS(SVGNS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    svg.append(n);
    return n;
  };
  if (showName) el('text', { x: W / 2, y: 16, 'text-anchor': 'middle', class: 'cd-name' }, chord.name);
  // sillet ou numéro de case
  if (base === 1) el('rect', { x: x0 - 1, y: y0 - 4, width: dx * 5 + 2, height: 4, class: 'cd-nut' });
  else el('text', { x: x0 + dx * 5 + 6, y: y0 + dy * 0.7, class: 'cd-fret-num' }, `${base}`);
  for (let i = 0; i <= 4; i++) el('line', { x1: x0, y1: y0 + i * dy, x2: x0 + dx * 5, y2: y0 + i * dy, class: 'cd-line' });
  for (let s = 0; s < 6; s++) el('line', { x1: x0 + s * dx, y1: y0, x2: x0 + s * dx, y2: y0 + 4 * dy, class: 'cd-line' });
  chord.frets.forEach((f, s) => {
    const x = x0 + s * dx;
    if (f < 0) el('text', { x, y: y0 - 8, 'text-anchor': 'middle', class: 'cd-mute' }, '×');
    else if (f === 0) el('circle', { cx: x, cy: y0 - 12, r: 4, class: 'cd-open' });
  });
  if (chord.barre) {
    const b = chord.barre;
    const y = y0 + (b.fret - base + 0.5) * dy;
    el('rect', { x: x0 + b.from * dx - 6, y: y - 6, width: (b.to - b.from) * dx + 12, height: 12, rx: 6, class: 'cd-dot' });
  }
  chord.frets.forEach((f, s) => {
    if (f <= 0) return;
    if (chord.barre && f === chord.barre.fret && s >= chord.barre.from && s <= chord.barre.to && chord.fingers[s] === 1) return;
    const x = x0 + s * dx;
    const y = y0 + (f - base + 0.5) * dy;
    el('circle', { cx: x, cy: y, r: 7, class: 'cd-dot' });
    if (chord.fingers[s]) el('text', { x, y: y + 4, 'text-anchor': 'middle', class: 'cd-finger' }, chord.fingers[s]);
  });
  return svg;
}
