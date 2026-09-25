// Théorie musicale de base : notes, hauteurs, fréquences.
// Module pur (aucun accès au DOM) : testable avec `node --test`.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NAMES_FR = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const PC_NAMES_FR = ['do', 'do♯', 'ré', 'mi♭', 'mi', 'fa', 'fa♯', 'sol', 'sol♯', 'la', 'si♭', 'si'];

// Une note : { step: 0..6 (do..si), oct: numéro d'octave, alt: -1|0|1 }
// On garde la notation scientifique en interne : C4 = do central (appelé « do3 » en France).

/** 'C4', 'F#3', 'Bb2' → note */
export function parse(str) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(str);
  if (!m) throw new Error(`Note invalide : ${str}`);
  return { step: LETTERS.indexOf(m[1]), alt: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0, oct: Number(m[3]) };
}

export function toString(n) {
  return LETTERS[n.step] + (n.alt === 1 ? '#' : n.alt === -1 ? 'b' : '') + n.oct;
}

export function midi(n) {
  if (typeof n === 'string') n = parse(n);
  return 12 * (n.oct + 1) + LETTER_PC[LETTERS[n.step]] + n.alt;
}

export function freq(m) {
  return 440 * 2 ** ((m - 69) / 12);
}

/** Fréquence → numéro MIDI fractionnaire. */
export function freqToMidi(f) {
  return 69 + 12 * Math.log2(f / 440);
}

export function diatonic(n) {
  return n.oct * 7 + n.step;
}

export function fromDiatonic(i, alt = 0) {
  return { step: ((i % 7) + 7) % 7, oct: Math.floor(i / 7), alt };
}

/** Liste des notes naturelles entre deux bornes incluses ('C4', 'G5'). */
export function whiteRange(from, to) {
  const a = diatonic(parse(from));
  const b = diatonic(parse(to));
  const out = [];
  for (let i = a; i <= b; i++) out.push(fromDiatonic(i));
  return out;
}

const ALT_SYMBOL = { 1: '♯', '-1': '♭', 0: '' };

/** Nom français : 'fa♯' (ou 'fa♯ 3' avec l'octave). */
export function nameFr(n, withOct = false) {
  const base = NAMES_FR[n.step] + ALT_SYMBOL[n.alt];
  return withOct ? `${base} ${n.oct}` : base;
}

/** Clé VexFlow : 'f#/4'. */
export function vexKey(n) {
  return LETTERS[n.step].toLowerCase() + (n.alt === 1 ? '#' : n.alt === -1 ? 'b' : '') + '/' + n.oct;
}

export function pitchClass(m) {
  return ((m % 12) + 12) % 12;
}

export function isBlackKey(m) {
  return [1, 3, 6, 8, 10].includes(pitchClass(m));
}

/** Nom français d'un numéro MIDI (dièses pour les touches noires, sauf mi♭ / si♭). */
export function midiNameFr(m) {
  return PC_NAMES_FR[pitchClass(m)];
}

/** Écart en cents entre une fréquence et une note MIDI cible. */
export function centsOff(f, targetMidi) {
  return Math.round((freqToMidi(f) - targetMidi) * 100);
}

export const INTERVALS = [
  { id: 'seconde', label: 'Seconde', semis: 2 },
  { id: 'tierce', label: 'Tierce', semis: 4 },
  { id: 'quarte', label: 'Quarte', semis: 5 },
  { id: 'quinte', label: 'Quinte', semis: 7 },
  { id: 'octave', label: 'Octave', semis: 12 },
];
