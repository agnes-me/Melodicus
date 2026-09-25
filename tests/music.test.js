import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, midi, freq, whiteRange, nameFr, vexKey, freqToMidi, centsOff } from '../app/js/music.js';

test('conversion des notes', () => {
  assert.equal(midi('C4'), 60);
  assert.equal(midi('A4'), 69);
  assert.equal(midi('F#3'), 54);
  assert.equal(midi('Bb2'), 46);
  assert.equal(Math.round(freq(69)), 440);
  assert.equal(Math.round(freqToMidi(261.63)), 60);
  assert.equal(centsOff(440, 69), 0);
});

test('noms français et clés VexFlow', () => {
  assert.equal(nameFr(parse('F#4')), 'fa♯');
  assert.equal(nameFr(parse('Bb4')), 'si♭');
  assert.equal(nameFr(parse('G4')), 'sol');
  assert.equal(vexKey(parse('Eb5')), 'eb/5');
});

test('ambitus de notes naturelles', () => {
  const r = whiteRange('E4', 'B4').map((n) => nameFr(n));
  assert.deepEqual(r, ['mi', 'fa', 'sol', 'la', 'si']);
  assert.equal(whiteRange('C4', 'C5').length, 8);
});
