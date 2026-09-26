// Module « Lecture de notes » : clé de sol, clé de fa, mode mixte.
import { whiteRange, nameFr, vexKey, midi, NAMES_FR, toString, pitchClass } from '../music.js';
import { drawSingleNote } from '../staff.js';
import { choiceButtons, keyboard, h } from '../ui.js';
import { pickWeighted } from '../progress.js';
import { playPiano } from '../audio.js';

// Ambitus progressif : on part autour de la note de référence (sol / fa) puis on élargit.
const RANGES = {
  treble: [
    { from: 'E4', to: 'B4', label: 'Autour du sol', desc: 'mi, fa, sol, la, si' },
    { from: 'C4', to: 'C5', label: 'Du do au do', desc: 'Le do central et les notes du bas' },
    { from: 'C4', to: 'G5', label: 'Toute la portée', desc: 'Lignes et interlignes' },
    { from: 'A3', to: 'C6', label: 'Lignes supplémentaires', desc: 'Au-dessus et en dessous' },
    { from: 'F3', to: 'E6', label: 'Grand ambitus', desc: 'Pour les experts' },
  ],
  bass: [
    { from: 'D3', to: 'A3', label: 'Autour du fa', desc: 'ré, mi, fa, sol, la' },
    { from: 'B2', to: 'C4', label: 'Jusqu\'au do central', desc: 'Le haut de la portée' },
    { from: 'G2', to: 'C4', label: 'Toute la portée', desc: 'Lignes et interlignes' },
    { from: 'E2', to: 'E4', label: 'Lignes supplémentaires', desc: 'Au-dessus et en dessous' },
    { from: 'C2', to: 'G4', label: 'Grand ambitus', desc: 'Pour les experts' },
  ],
};

const CLEF_NAME = { treble: 'clé de sol', bass: 'clé de fa' };

/** Question de lecture : une note sur la portée, réponse par nom ou au clavier. */
function readingQuestion(clef, note, ctx, withClef = false) {
  const item = `${clef}:${toString(note)}`;
  const m = midi(note);
  return {
    item,
    label: withClef ? `${nameFr(note)} (${CLEF_NAME[clef]})` : nameFr(note),
    render(stage, answer) {
      const staffEl = h('div.staff.staff-big');
      stage.append(staffEl);
      drawSingleNote(staffEl, clef, vexKey(note));
      const done = (ok) => {
        drawSingleNote(staffEl, clef, vexKey(note), { color: ok ? '#1b9e5a' : '#d93a3a' });
        playPiano(m, { velocity: 0.4 });
        answer(ok, { reveal: `C'était ${nameFr(note)}` });
      };
      if (ctx.profile.answerMode === 'keyboard') {
        const kb = keyboard(60, 71, (pressed) => {
          kb.lock();
          const ok = pitchClass(pressed) === pitchClass(m);
          kb.mark(pressed, ok ? 'is-right' : 'is-wrong');
          if (!ok) kb.mark(60 + pitchClass(m), 'is-right');
          done(ok);
        }, { sound: false, labels: ctx.level <= 1 });
        stage.append(kb);
      } else {
        const opts = NAMES_FR.map((n, i) => ({ label: n, value: i }));
        stage.append(choiceButtons(opts, note.step, (ok) => done(ok), { cls: 'note-name' }));
      }
    },
  };
}

function readingExercise(id, clef, icon, title) {
  const ranges = RANGES[clef];
  return {
    id,
    module: 'lecture',
    icon,
    title,
    desc: `Lis la note en ${CLEF_NAME[clef]}.`,
    timed: true,
    answerModes: true,
    levels: ranges.map((r) => ({ label: r.label, desc: r.desc })),
    question(ctx) {
      const r = ranges[ctx.level - 1];
      const notes = whiteRange(r.from, r.to).map((n) => ({ key: `${clef}:${toString(n)}`, n }));
      const pick = pickWeighted(notes, ctx.stats, ctx.prev, ctx.rng);
      return readingQuestion(clef, pick.n, ctx);
    },
  };
}

export const lectureSol = readingExercise('lecture-sol', 'treble', '🎻', 'Clé de sol');
export const lectureFa = readingExercise('lecture-fa', 'bass', '🎷', 'Clé de fa');

export const lectureMixte = {
  id: 'lecture-mixte',
  module: 'lecture',
  icon: '🗝️',
  title: 'Les deux clés',
  desc: 'Clé de sol et clé de fa mélangées.',
  timed: true,
  answerModes: true,
  levels: RANGES.treble.map((r, i) => ({ label: `Niveau ${i + 1}`, desc: `Sol : ${r.desc.toLowerCase()} · Fa : ${RANGES.bass[i].desc.toLowerCase()}` })),
  requires(profile) {
    const sol = profile.progress['lecture-sol']?.unlocked || 1;
    const fa = profile.progress['lecture-fa']?.unlocked || 1;
    return sol >= 3 && fa >= 3 ? null : 'Termine d\'abord le niveau 2 en clé de sol et en clé de fa.';
  },
  question(ctx) {
    const pool = [];
    for (const clef of ['treble', 'bass']) {
      const r = RANGES[clef][ctx.level - 1];
      for (const n of whiteRange(r.from, r.to)) pool.push({ key: `${clef}:${toString(n)}`, n, clef });
    }
    const pick = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
    return readingQuestion(pick.clef, pick.n, ctx, true);
  },
};

export default [lectureSol, lectureFa, lectureMixte];
