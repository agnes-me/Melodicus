// Module « Oreille musicale » : plus aigu / plus grave, intervalles, dictées, majeur / mineur.
import { choiceButtons, keyboard, h } from '../ui.js';
import { pickWeighted } from '../progress.js';
import { INTERVALS, midiNameFr } from '../music.js';
import { playSequence, playChordPiano, now } from '../audio.js';

const randInt = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));

const listenBtn = (fn, label = '🔊 Réécouter') => h('button.btn.btn-play', { type: 'button', onclick: fn }, label);

// ---------------------------------------------------------------------------

const HEIGHT_LEVELS = [
  { label: 'Très différent', min: 12, max: 19 },
  { label: 'Différent', min: 7, max: 11 },
  { label: 'Assez proche', min: 4, max: 6 },
  { label: 'Proche', min: 2, max: 3 },
  { label: 'Tout proche', min: 1, max: 1 },
];

export const hauteur = {
  id: 'oreille-hauteur',
  module: 'oreille',
  icon: '↕️',
  title: 'Ça monte ou ça descend ?',
  desc: 'La 2ᵉ note est-elle plus aiguë ou plus grave ?',
  timed: false,
  levels: HEIGHT_LEVELS.map((l) => ({ label: l.label })),
  question(ctx) {
    const lvl = HEIGHT_LEVELS[ctx.level - 1];
    const { key: dir } = pickWeighted([{ key: 'monte' }, { key: 'descend' }], ctx.stats, null, ctx.rng);
    const semis = randInt(lvl.min, lvl.max, ctx.rng);
    const a = randInt(57, 72, ctx.rng);
    const b = dir === 'monte' ? a + semis : a - semis;
    const play = () => playSequence([a, b], { gap: 0.9 });
    return {
      item: dir,
      label: dir === 'monte' ? 'ça monte' : 'ça descend',
      render(stage, answer) {
        stage.append(h('p.prompt', 'Écoute les deux notes. La deuxième est…'));
        stage.append(listenBtn(play));
        stage.append(choiceButtons([
          { label: '⬆️ plus aiguë', value: 'monte' },
          { label: '⬇️ plus grave', value: 'descend' },
        ], dir, (ok) => answer(ok, { reveal: dir === 'monte' ? 'Ça montait : la 2ᵉ note était plus aiguë.' : 'Ça descendait : la 2ᵉ note était plus grave.' }), { cls: 'choice-big' }));
        setTimeout(play, 300);
      },
    };
  },
};

// ---------------------------------------------------------------------------

const INTERVAL_LEVELS = [
  { label: 'Seconde ou octave', ids: ['seconde', 'octave'] },
  { label: '+ la quinte', ids: ['seconde', 'quinte', 'octave'] },
  { label: '+ la tierce', ids: ['seconde', 'tierce', 'quinte', 'octave'] },
  { label: '+ la quarte', ids: ['seconde', 'tierce', 'quarte', 'quinte', 'octave'] },
  { label: 'En montant et en descendant', ids: ['seconde', 'tierce', 'quarte', 'quinte', 'octave'], down: true },
];

// Petits moyens mnémotechniques (début de chansons connues).
const HINTS = {
  seconde: 'comme « Frè-re Jacques »',
  tierce: 'comme « Kum-ba-ya »',
  quarte: 'comme « Allons en-fants » (La Marseillaise)',
  quinte: 'comme « Ah vous di-rai-je maman » (do-do-sol)',
  octave: 'la même note, en plus aigu',
};

export const intervalles = {
  id: 'oreille-intervalles',
  module: 'oreille',
  icon: '📏',
  title: 'Les intervalles',
  desc: 'Reconnais l\'écart entre deux notes.',
  levels: INTERVAL_LEVELS.map((l) => ({ label: l.label })),
  question(ctx) {
    const lvl = INTERVAL_LEVELS[ctx.level - 1];
    const pool = INTERVALS.filter((i) => lvl.ids.includes(i.id)).map((i) => ({ key: i.id, i }));
    const { i } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
    const down = lvl.down && ctx.rng() < 0.5;
    const a = down ? randInt(67, 76, ctx.rng) : randInt(57, 67, ctx.rng);
    const b = down ? a - i.semis : a + i.semis;
    const play = () => playSequence([a, b], { gap: 0.8 });
    return {
      item: i.id,
      label: i.label.toLowerCase(),
      render(stage, answer) {
        stage.append(h('p.prompt', `Quel est cet intervalle ${down ? '(en descendant)' : ''} ?`));
        stage.append(h('div.row', listenBtn(play), listenBtn(() => playChordPiano([a, b]), '🎹 Ensemble')));
        const opts = INTERVALS.filter((x) => lvl.ids.includes(x.id)).map((x) => ({ label: x.label, value: x.id }));
        stage.append(choiceButtons(opts, i.id, (ok) => answer(ok, { reveal: `${i.label} : ${HINTS[i.id]}.` })));
        setTimeout(play, 300);
      },
    };
  },
};

// ---------------------------------------------------------------------------

const DICTEE_LEVELS = [
  { label: '3 notes : do, ré, mi', notes: [60, 62, 64], len: 3 },
  { label: '3 notes : do à sol', notes: [60, 62, 64, 65, 67], len: 3 },
  { label: '4 notes : do à sol', notes: [60, 62, 64, 65, 67], len: 4 },
  { label: '4 notes : une octave', notes: [60, 62, 64, 65, 67, 69, 71, 72], len: 4 },
  { label: '5 notes : une octave', notes: [60, 62, 64, 65, 67, 69, 71, 72], len: 5 },
];

/** Mélodie aléatoire sans répétition immédiate ni saut trop grand. */
export function randomMelody(notes, len, rng = Math.random) {
  const out = [notes[Math.floor(rng() * Math.min(3, notes.length))]];
  while (out.length < len) {
    const prev = notes.indexOf(out[out.length - 1]);
    const cands = notes.filter((_, j) => j !== prev && Math.abs(j - prev) <= 3);
    out.push(cands[Math.floor(rng() * cands.length)]);
  }
  return out;
}

export const dictee = {
  id: 'oreille-dictee',
  module: 'oreille',
  icon: '✍️',
  title: 'Petites dictées',
  desc: 'Écoute la mélodie et rejoue-la au clavier.',
  levels: DICTEE_LEVELS.map((l) => ({ label: l.label })),
  question(ctx) {
    const lvl = DICTEE_LEVELS[ctx.level - 1];
    const melody = randomMelody(lvl.notes, lvl.len, ctx.rng);
    const play = () => playSequence(melody, { gap: 0.65 });
    return {
      item: `dictee-${lvl.len}`,
      label: melody.map(midiNameFr).join(' '),
      render(stage, answer) {
        stage.append(h('p.prompt', `Écoute les ${lvl.len} notes, puis rejoue-les. La première note est ${midiNameFr(melody[0])}.`));
        stage.append(listenBtn(play));
        const slots = h('div.scale-chips', melody.map(() => h('span.chip', '?')));
        stage.append(slots);
        let idx = 0;
        const kb = keyboard(60, 72, (pressed) => {
          const ok = pressed === melody[idx];
          kb.mark(pressed, ok ? 'is-right' : 'is-wrong');
          if (!ok) {
            kb.lock();
            melody.forEach((m, j) => {
              slots.children[j].textContent = midiNameFr(m);
              slots.children[j].classList.add(j < idx ? 'chip-ok' : 'chip-reveal');
            });
            setTimeout(play, 500);
            answer(false, { reveal: `La mélodie était : ${melody.map(midiNameFr).join(' – ')}`, delay: 3000 });
            return;
          }
          slots.children[idx].textContent = midiNameFr(pressed);
          slots.children[idx].classList.add('chip-ok');
          idx++;
          setTimeout(() => kb.clear(), 200);
          if (idx === melody.length) {
            kb.lock();
            answer(true, { reveal: 'Bravo, bien écouté !' });
          }
        }, { labels: ctx.level <= 3 });
        stage.append(kb);
        setTimeout(play, 300);
      },
    };
  },
};

// ---------------------------------------------------------------------------

export const majeurMineur = {
  id: 'oreille-accords',
  module: 'oreille',
  icon: '🎭',
  title: 'Majeur ou mineur ?',
  desc: 'Joyeux ou triste ? Écoute la couleur de l\'accord.',
  levels: [
    { label: 'Accords de do', desc: 'Arpège puis accord' },
    { label: 'Toutes les notes', desc: 'Arpège puis accord' },
    { label: 'Accord plaqué seul', desc: 'Pour les oreilles fines' },
  ],
  question(ctx) {
    const { key: kind } = pickWeighted([{ key: 'majeur' }, { key: 'mineur' }], ctx.stats, null, ctx.rng);
    const root = ctx.level === 1 ? 60 : randInt(55, 67, ctx.rng);
    const notes = [root, root + (kind === 'majeur' ? 4 : 3), root + 7];
    const play = () => {
      if (ctx.level < 3) {
        playChordPiano(notes, { arpeggio: 0.35 });
        playChordPiano(notes, { when: now() + 1.4 });
      } else playChordPiano(notes);
    };
    return {
      item: kind,
      label: `accord ${kind}`,
      render(stage, answer) {
        stage.append(h('p.prompt', 'Cet accord est-il majeur ou mineur ?'));
        stage.append(listenBtn(play));
        stage.append(choiceButtons([
          { label: '😀 Majeur (joyeux)', value: 'majeur' },
          { label: '😢 Mineur (triste)', value: 'mineur' },
        ], kind, (ok) => answer(ok, { reveal: `C'était un accord ${kind} (${midiNameFr(root)} ${kind}).` }), { cls: 'choice-big' }));
        setTimeout(play, 300);
      },
    };
  },
};

export default [hauteur, intervalles, dictee, majeurMineur];

