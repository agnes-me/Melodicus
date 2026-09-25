import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newProfile, recordSession, starsFor, streak, dayKey, pickWeighted, exerciseStats } from '../app/js/progress.js';

const session = (over = {}) => ({
  ex: 'lecture-sol', level: 1, maxLevel: 5, mode: 'free', ok: 8, total: 10, ms: 1500,
  answers: [{ item: 'treble:G4', ok: true, ms: 1000 }, { item: 'treble:A4', ok: false, ms: 2000 }],
  ...over,
});

test('étoiles', () => {
  assert.equal(starsFor(7, 10), 0);
  assert.equal(starsFor(8, 10), 1);
  assert.equal(starsFor(9, 10), 2);
  assert.equal(starsFor(10, 10), 3);
});

test('une partie réussie débloque le niveau suivant', () => {
  const p = newProfile('Test');
  const r = recordSession(p, session());
  assert.equal(r.levelUp, true);
  assert.equal(p.progress['lecture-sol'].unlocked, 2);
  assert.ok(r.badges.some((b) => b.id === 'premiers-pas'));
  const r2 = recordSession(p, session({ ok: 5 }));
  assert.equal(r2.levelUp, false);
  assert.equal(p.progress['lecture-sol'].unlocked, 2);
});

test('le dernier niveau réussi marque l\'exercice terminé et donne le badge', () => {
  const p = newProfile('Test');
  p.progress['lecture-sol'] = { unlocked: 5, stars: {}, best: {} };
  const r = recordSession(p, session({ level: 5, ok: 10 }));
  assert.equal(p.progress['lecture-sol'].completed, true);
  assert.ok(r.badges.some((b) => b.id === 'cle-sol'));
  assert.ok(r.badges.some((b) => b.id === 'sans-faute'));
});

test('mode chrono : record personnel, pas de déblocage', () => {
  const p = newProfile('Test');
  const r = recordSession(p, session({ mode: 'timed', ok: 12, total: 14 }));
  assert.equal(r.newBest, true);
  assert.equal(p.progress['lecture-sol'].best[1], 12);
  assert.equal(p.progress['lecture-sol'].unlocked, 1);
  assert.equal(recordSession(p, session({ mode: 'timed', ok: 10 })).newBest, false);
});

test('statistiques par élément et erreurs fréquentes', () => {
  const p = newProfile('Test');
  recordSession(p, session());
  recordSession(p, session());
  const st = exerciseStats(p, 'lecture-sol');
  assert.equal(st.answers, 4);
  assert.equal(st.rate, 0.5);
  assert.equal(st.errors[0].key, 'treble:A4');
});

test('série de jours consécutifs', () => {
  const today = new Date(2026, 8, 25);
  const d = (offset) => dayKey(new Date(2026, 8, 25 - offset));
  assert.equal(streak([d(0), d(1), d(2)], today), 3);
  assert.equal(streak([d(1), d(2)], today), 2); // pas encore joué aujourd'hui : la série continue
  assert.equal(streak([d(0), d(2)], today), 1);
  assert.equal(streak([], today), 0);
});

test('le tirage favorise les éléments souvent ratés', () => {
  const items = ['a', 'b', 'c'];
  const stats = { a: { ok: 20, ko: 0 }, b: { ok: 20, ko: 0 }, c: { ok: 0, ko: 20 } };
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const counts = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 3000; i++) counts[pickWeighted(items, stats, null, rng)]++;
  assert.ok(counts.c > counts.a * 2, JSON.stringify(counts));
  assert.notEqual(pickWeighted(items, {}, 'a', () => 0), 'a');
});
