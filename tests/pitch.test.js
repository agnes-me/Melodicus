import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch } from '../app/js/pitch.js';
import { nearestString, INSTRUMENTS } from '../app/js/tuner.js';
import { freq, centsOff } from '../app/js/music.js';

const SR = 48000;

/** Signal proche d'une corde : fondamentale + harmoniques décroissantes. */
function stringTone(f, n = 2048, sr = SR) {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let k = 1; k <= 6; k++) v += Math.sin((2 * Math.PI * f * k * i) / sr) / k;
    buf[i] = 0.4 * v;
  }
  return buf;
}

test('détecte la hauteur de chaque corde de guitare à ±5 cents', () => {
  for (const s of INSTRUMENTS.guitare.strings) {
    const f = detectPitch(stringTone(freq(s.midi)), SR);
    assert.ok(Math.abs(centsOff(f, s.midi)) <= 5, `${s.name} : ${f.toFixed(2)} Hz`);
  }
});

test('détecte une corde légèrement désaccordée', () => {
  const target = freq(45) * 2 ** (-20 / 1200); // la, 20 cents trop bas
  const f = detectPitch(stringTone(target), SR);
  const c = centsOff(f, 45);
  assert.ok(c <= -15 && c >= -25, `écart mesuré ${c}`);
});

test('silence → pas de hauteur', () => {
  assert.equal(detectPitch(new Float32Array(2048), SR), -1);
});

test('corde la plus proche', () => {
  assert.equal(nearestString(INSTRUMENTS.guitare.strings, 112).name, 'la');
  assert.equal(nearestString(INSTRUMENTS.ukulele.strings, 262).name, 'do');
});
