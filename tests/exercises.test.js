import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, MODULES } from '../app/js/exercises/index.js';
import { onsets, scoreTaps, RHYTHMS } from '../app/js/exercises/solfege.js';
import { randomMelody } from '../app/js/exercises/oreille.js';
import { CHORDS, CHORD_LEVELS, chordById, chordName, chordPitchClasses, tonePitchClasses } from '../app/js/guitar.js';
import { newProfile } from '../app/js/progress.js';

test('chaque exercice génère des questions valides à tous les niveaux', () => {
  const profile = newProfile('Test');
  profile.instruments.guitar = true;
  for (const e of EXERCISES) {
    assert.ok(MODULES.some((m) => m.id === e.module), e.id);
    assert.ok(e.id.startsWith(e.module + '-'), e.id);
    if (e.activity) continue;
    for (let level = 1; level <= e.levels.length; level++) {
      let prev = null;
      for (let i = 0; i < 30; i++) {
        const q = e.question({ level, profile, stats: {}, prev, rng: Math.random });
        assert.equal(typeof q.item, 'string', `${e.id} niv. ${level}`);
        assert.equal(typeof q.render, 'function');
        prev = q.item;
      }
    }
  }
});

test('les rythmes font exactement une mesure à 4 temps', () => {
  for (const level of RHYTHMS) for (const p of level) {
    assert.equal(p.reduce((s, d) => s + Math.abs(d), 0), 4, p.join(' '));
  }
});

test('attaques et correction des frappes', () => {
  assert.deepEqual(onsets([1, -1, 0.5, 0.5, 1]), [0, 2, 2.5, 3]);
  const exp = [0, 1, 2];
  assert.equal(scoreTaps(exp, [0.05, 0.98, 2.1], 0.15).ok, true);
  assert.deepEqual(scoreTaps(exp, [0.05, 2.1], 0.15), { ok: false, matched: 2, missed: 1, extra: 0 });
  assert.equal(scoreTaps(exp, [0, 1, 2, 3], 0.15).extra, 1);
  assert.equal(scoreTaps(exp, [0.4, 1, 2], 0.15).ok, false);
});

test('dictée : mélodies dans l\'ambitus, sans note répétée', () => {
  const notes = [60, 62, 64, 65, 67];
  for (let i = 0; i < 200; i++) {
    const m = randomMelody(notes, 4);
    assert.equal(m.length, 4);
    m.forEach((n, j) => {
      assert.ok(notes.includes(n));
      if (j) assert.notEqual(n, m[j - 1]);
    });
  }
});

test('les doigtés de guitare ne jouent que des notes de l\'accord (fondamentale et tierce comprises)', () => {
  for (const c of CHORDS) {
    const played = chordPitchClasses(c);
    const tones = tonePitchClasses(c);
    for (const pc of played) assert.ok(tones.includes(pc), `${c.id} : note étrangère ${pc}`);
    const [root, third] = c.tones.map((t) => tonePitchClasses({ tones: [t] })[0]);
    assert.ok(played.includes(root) && played.includes(third), `${c.id} : fondamentale ou tierce manquante`);
  }
});

test('tous les accords de la fiche du professeur sont présents', () => {
  for (const id of ['C', 'D', 'E', 'F', 'G', 'A', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'C7', 'D7', 'E7', 'F7', 'G7', 'A7']) {
    assert.ok(chordById[id], id);
  }
  for (const l of CHORD_LEVELS) for (const id of l.ids) assert.ok(chordById[id], id);
});

test('noms des accords dans les deux notations', () => {
  assert.equal(chordName(chordById.Dm, 'fr'), 'Ré mineur');
  assert.equal(chordName(chordById.Dm, 'en'), 'Dm');
  assert.equal(chordName(chordById.G7, 'fr'), 'Sol 7');
  assert.equal(chordName(chordById.G7, 'en'), 'G7');
  assert.equal(chordName(chordById['F-barre'], 'en'), 'F barré');
  assert.equal(chordName(chordById.Bm, 'fr'), 'Si mineur');
});
