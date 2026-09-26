// Module « Accords de guitare » : reconnaissance nom ↔ diagramme ↔ son, majeur/mineur, changements d'accords.
import { CHORD_LEVELS, chordById, chordDiagram, chordMidi } from '../guitar.js';
import { choiceButtons, h, sleep } from '../ui.js';
import { pickWeighted, sample, shuffle } from '../progress.js';
import { strum } from '../audio.js';

const requiresGuitar = (profile) => (profile.instruments?.guitar ? null : 'Active la guitare dans « Mon profil » pour ouvrir ce module.');

const strumBtn = (chord, label = '🔊 Écouter') => h('button.btn.btn-play', { type: 'button', onclick: () => strum(chordMidi(chord)) }, label);

function levelPool(ctx) {
  return CHORD_LEVELS[ctx.level - 1].ids.map((id) => ({ key: id, c: chordById[id] }));
}

export const accords = {
  id: 'guitare-accords',
  module: 'guitare',
  icon: '🎸',
  title: 'Reconnaître les accords',
  desc: 'Associe le nom et le diagramme.',
  timed: true,
  requires: requiresGuitar,
  levels: CHORD_LEVELS.map((l) => ({ label: l.label, desc: l.desc })),
  question(ctx) {
    const pool = levelPool(ctx);
    const { c } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
    const others = sample(pool.filter((p) => p.c.id !== c.id).map((p) => p.c), 2, ctx.rng);
    const options = shuffle([c, ...others], ctx.rng);
    const nameToDiagram = ctx.rng() < 0.5;
    return {
      item: c.id,
      label: c.name,
      render(stage, answer) {
        const done = (ok) => {
          strum(chordMidi(c));
          answer(ok, { reveal: `C'était l'accord de ${c.name}.` });
        };
        if (nameToDiagram) {
          stage.append(h('p.prompt', 'Quel est le diagramme de l\'accord :'), h('p.prompt.prompt-big', c.name));
          const opts = options.map((o) => ({ label: chordDiagram(o, { showName: false, size: 1.4 }), value: o.id }));
          stage.append(choiceButtons(opts, c.id, done, { cls: 'choice-diagram' }));
        } else {
          stage.append(h('p.prompt', 'Quel est cet accord ?'));
          stage.append(h('div.diagram-big', chordDiagram(c, { showName: false, size: 1.6 })));
          const opts = options.map((o) => ({ label: o.name, value: o.id }));
          stage.append(choiceButtons(opts, c.id, done));
        }
      },
    };
  },
};

export const accordsSon = {
  id: 'guitare-son',
  module: 'guitare',
  icon: '🔊',
  title: 'Accords à l\'oreille',
  desc: 'Écoute l\'accord et retrouve-le.',
  requires: requiresGuitar,
  levels: CHORD_LEVELS.map((l) => ({ label: l.label, desc: l.desc })),
  question(ctx) {
    const pool = levelPool(ctx);
    const { c } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
    const nOthers = ctx.level === 1 ? 1 : 2;
    const options = shuffle([c, ...sample(pool.filter((p) => p.c.id !== c.id).map((p) => p.c), nOthers, ctx.rng)], ctx.rng);
    return {
      item: c.id,
      label: c.name,
      render(stage, answer) {
        stage.append(h('p.prompt', 'Écoute l\'accord. Lequel est-ce ?'));
        stage.append(h('div.row', strumBtn(c, '🔊 Réécouter')));
        const opts = options.map((o) => ({
          label: h('span.diagram-choice', chordDiagram(o, { size: 1.3 }), h('span.mini-play', {
            role: 'button',
            'aria-label': `Écouter ${o.name}`,
            onclick: (ev) => { ev.stopPropagation(); strum(chordMidi(o)); },
          }, '🔈')),
          value: o.id,
        }));
        stage.append(choiceButtons(opts, c.id, (ok) => answer(ok, { reveal: `C'était l'accord de ${c.name}.` }), { cls: 'choice-diagram' }));
        setTimeout(() => strum(chordMidi(c)), 300);
      },
    };
  },
};

const MAJMIN_PAIRS = [
  [['A', 'Am'], ['E', 'Em'], ['D', 'Dm']],
  [['A', 'Am'], ['E', 'Em'], ['D', 'Dm'], ['B', 'Bm'], ['F', 'Fm']],
];

export const majMin = {
  id: 'guitare-majmin',
  module: 'guitare',
  icon: '🎭',
  title: 'Majeur ou mineur (guitare)',
  desc: 'Reconnais la couleur de l\'accord.',
  requires: requiresGuitar,
  levels: [
    { label: 'Accords ouverts', desc: 'La, Mi, Ré' },
    { label: 'Avec les barrés', desc: '+ Si, Fa' },
  ],
  question(ctx) {
    const pairs = MAJMIN_PAIRS[ctx.level - 1];
    const pair = pairs[Math.floor(ctx.rng() * pairs.length)];
    const { key: kind } = pickWeighted([{ key: 'majeur' }, { key: 'mineur' }], ctx.stats, null, ctx.rng);
    const c = chordById[kind === 'majeur' ? pair[0] : pair[1]];
    return {
      item: kind,
      label: `accord ${kind}`,
      render(stage, answer) {
        stage.append(h('p.prompt', 'Cet accord est-il majeur ou mineur ?'));
        stage.append(strumBtn(c, '🔊 Réécouter'));
        stage.append(choiceButtons([
          { label: '😀 Majeur', value: 'majeur' },
          { label: '😢 Mineur', value: 'mineur' },
        ], kind, (ok) => {
          stage.append(h('div.diagram-reveal', chordDiagram(c)));
          answer(ok, { reveal: `C'était ${c.name} : un accord ${kind}.` });
        }, { cls: 'choice-big' }));
        setTimeout(() => strum(chordMidi(c)), 300);
      },
    };
  },
};

const CHANGE_LEVELS = [
  { pair: ['Em', 'Am'], target: 20 },
  { pair: ['D', 'A'], target: 20 },
  { pair: ['C', 'G'], target: 15 },
  { pair: ['G', 'D'], target: 15 },
  { pair: ['C', 'Fs'], target: 12 },
  { pair: ['E', 'B7'], target: 12 },
];

/**
 * Exercice « activité » (pas de questions) : pendant une minute, l'enfant enchaîne deux accords
 * sur sa guitare et touche le grand bouton à chaque changement.
 */
export const changement = {
  id: 'guitare-changement',
  module: 'guitare',
  icon: '🔁',
  title: 'Changer d\'accord',
  desc: 'Enchaîne deux accords le plus souvent possible en 1 minute.',
  requires: requiresGuitar,
  activity: true,
  levels: CHANGE_LEVELS.map((l) => ({ label: `${chordById[l.pair[0]].name} ↔ ${chordById[l.pair[1]].name}`, desc: `Objectif : ${l.target} changements` })),
  async run(stage, ctx, finish) {
    const lvl = CHANGE_LEVELS[ctx.level - 1];
    const [a, b] = lvl.pair.map((id) => chordById[id]);
    let current = 0;
    let changes = 0;
    const cards = [a, b].map((c) => h('div.change-card', chordDiagram(c, { size: 1.3 })));
    const counter = h('div.change-counter', `0 / ${lvl.target}`);
    const timer = h('div.timer', '60');
    const btn = h('button.tap-pad.tap-change', { type: 'button', disabled: true }, 'J\'ai changé !');
    stage.append(
      h('p.prompt', `Place tes doigts sur ${a.name}. Quand le chrono démarre, passe à ${b.name}, touche le bouton, puis reviens, et ainsi de suite.`),
      h('div.change-cards', cards),
      h('div.row', timer, counter),
      btn,
    );
    cards[0].classList.add('is-current');
    const flip = () => {
      if (btn.disabled) return;
      changes++;
      current = 1 - current;
      cards.forEach((c, i) => c.classList.toggle('is-current', i === current));
      counter.textContent = `${changes} / ${lvl.target}`;
    };
    btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); flip(); });
    for (const n of [3, 2, 1]) {
      timer.textContent = `${n}…`;
      await sleep(1000);
      if (!stage.isConnected) return;
    }
    btn.disabled = false;
    const end = Date.now() + 60000;
    while (Date.now() < end) {
      timer.textContent = `${Math.ceil((end - Date.now()) / 1000)} s`;
      await sleep(200);
      if (!stage.isConnected) return;
    }
    btn.disabled = true;
    finish({ ok: Math.min(changes, lvl.target), total: lvl.target, score: changes, message: `${changes} changements en 1 minute !` });
  },
};

export default [accords, accordsSon, majMin, changement];
