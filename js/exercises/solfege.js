// Module « Solfège » : valeurs de notes et silences, rythme, altérations, clavier et gamme.
import { drawStaff, drawRhythm } from '../staff.js';
import { choiceButtons, keyboard, h, sleep } from '../ui.js';
import { pickWeighted, sample, shuffle } from '../progress.js';
import { parse, nameFr, vexKey, midi, pitchClass, NAMES_FR } from '../music.js';
import { audio, click, wood, playPiano } from '../audio.js';

// ---------------------------------------------------------------------------
// Valeurs de notes et silences
// ---------------------------------------------------------------------------

const VALUES = [
  { key: 'ronde', label: 'Ronde', dur: 'w', beats: 4 },
  { key: 'blanche', label: 'Blanche', dur: 'h', beats: 2 },
  { key: 'noire', label: 'Noire', dur: 'q', beats: 1 },
  { key: 'croche', label: 'Croche', dur: '8', beats: 0.5 },
  { key: 'double', label: 'Double-croche', dur: '16', beats: 0.25 },
  { key: 'pause', label: 'Pause', dur: 'wr', beats: 4, rest: true },
  { key: 'demi-pause', label: 'Demi-pause', dur: 'hr', beats: 2, rest: true },
  { key: 'soupir', label: 'Soupir', dur: 'qr', beats: 1, rest: true },
  { key: 'demi-soupir', label: 'Demi-soupir', dur: '8r', beats: 0.5, rest: true },
  { key: 'quart-soupir', label: 'Quart de soupir', dur: '16r', beats: 0.25, rest: true },
];
const byKey = Object.fromEntries(VALUES.map((v) => [v.key, v]));
const VALUE_LEVELS = [
  { label: 'Ronde, blanche, noire', pool: ['ronde', 'blanche', 'noire'] },
  { label: 'Croches', pool: ['ronde', 'blanche', 'noire', 'croche', 'double'] },
  { label: 'Premiers silences', pool: ['pause', 'demi-pause', 'soupir'] },
  { label: 'Tous les silences', pool: ['pause', 'demi-pause', 'soupir', 'demi-soupir', 'quart-soupir'] },
  { label: 'Combien de temps ?', pool: VALUES.map((v) => v.key), beats: true },
];
const BEAT_LABEL = { 4: '4 temps', 2: '2 temps', 1: '1 temps', 0.5: '½ temps', 0.25: '¼ de temps' };

function drawValue(el, v, color) {
  drawStaff(el, {
    width: 160,
    showClef: false,
    notes: [{ keys: [v.dur === 'wr' ? 'd/5' : 'b/4'], duration: v.dur, color }],
  });
}

export const valeurs = {
  id: 'solfege-valeurs',
  module: 'solfege',
  icon: '🎶',
  title: 'Valeurs des notes',
  desc: 'Reconnais les notes et les silences.',
  timed: true,
  levels: VALUE_LEVELS.map((l) => ({ label: l.label })),
  question(ctx) {
    const lvl = VALUE_LEVELS[ctx.level - 1];
    const pool = lvl.pool.map((k) => ({ key: k, v: byKey[k] }));
    const { v } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
    return {
      item: v.key,
      label: v.label,
      render(stage, answer) {
        stage.append(h('p.prompt', lvl.beats ? 'Combien de temps dure ce signe ?' : v.rest ? 'Comment s\'appelle ce silence ?' : 'Comment s\'appelle cette note ?'));
        const el = h('div.staff.staff-value');
        stage.append(el);
        drawValue(el, v);
        let opts;
        let correct;
        if (lvl.beats) {
          opts = [4, 2, 1, 0.5, 0.25].map((b) => ({ label: BEAT_LABEL[b], value: b }));
          correct = v.beats;
        } else {
          opts = lvl.pool.map((k) => ({ label: byKey[k].label, value: k }));
          correct = v.key;
        }
        stage.append(choiceButtons(opts, correct, (ok) => {
          drawValue(el, v, ok ? '#1b9e5a' : '#d93a3a');
          answer(ok, { reveal: lvl.beats ? `${v.label} : ${BEAT_LABEL[v.beats]}` : `C'était : ${v.label.toLowerCase()}` });
        }));
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Rythme : formules par niveau (durées en temps, négatif = silence), mesure à 4/4
// ---------------------------------------------------------------------------

export const RHYTHMS = [
  [[4], [2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1], [1, 2, 1]],
  [[0.5, 0.5, 1, 1, 1], [1, 0.5, 0.5, 2], [0.5, 0.5, 0.5, 0.5, 2], [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [2, 0.5, 0.5, 1]],
  [[1, -1, 1, 1], [2, -1, 1], [1, 1, -2], [-1, 1, 1, 1], [1, 0.5, 0.5, -1, 1], [0.5, 0.5, -1, 2]],
  [[1.5, 0.5, 2], [1.5, 0.5, 1, 1], [3, 1], [1, 1.5, 0.5, 1], [2, 1.5, 0.5]],
  [[0.25, 0.25, 0.5, 1, 2], [0.25, 0.25, 0.25, 0.25, 1, 2], [1, 0.25, 0.25, 0.5, 2], [0.5, 0.25, 0.25, 1, 1, 1]],
];
const RHYTHM_LEVELS = ['Noires et blanches', 'Croches', 'Silences', 'Notes pointées', 'Doubles-croches'];
const TEMPO = [60, 66, 72, 72, 60];

const patternKey = (p) => p.join(' ');

/** Instants (en temps) où l'on doit frapper. */
export function onsets(pattern) {
  const out = [];
  let t = 0;
  for (const d of pattern) {
    if (d > 0) out.push(t);
    t += Math.abs(d);
  }
  return out;
}

/** Joue un rythme : 4 clics de décompte puis la mesure. Renvoie l'instant de début de la mesure. */
function playRhythm(pattern, bpm, { countIn = true } = {}) {
  const ac = audio();
  const beat = 60 / bpm;
  let t = ac.currentTime + 0.1;
  if (countIn) {
    for (let i = 0; i < 4; i++) click(t + i * beat, i === 0, 0.35);
    t += 4 * beat;
  }
  let pos = 0;
  for (const d of pattern) {
    if (d > 0) wood(t + pos * beat, Math.min(0.25, d * beat * 0.8));
    pos += Math.abs(d);
  }
  return t;
}

export const rythmeReconnaitre = {
  id: 'solfege-rythme-reconnaitre',
  module: 'solfege',
  icon: '👂',
  title: 'Reconnaître un rythme',
  desc: 'Écoute et retrouve le bon rythme.',
  levels: RHYTHM_LEVELS.map((label) => ({ label })),
  question(ctx) {
    const current = RHYTHMS[ctx.level - 1].map((p) => ({ key: patternKey(p), p }));
    const { p } = pickWeighted(current, ctx.stats, ctx.prev, ctx.rng);
    const others = RHYTHMS.slice(0, ctx.level).flat().filter((x) => patternKey(x) !== patternKey(p));
    const options = shuffle([p, ...sample(others, 2, ctx.rng)], ctx.rng);
    const bpm = TEMPO[ctx.level - 1];
    return {
      item: patternKey(p),
      label: `rythme ${patternKey(p)}`,
      render(stage, answer) {
        stage.append(h('p.prompt', 'Écoute bien, puis choisis le rythme entendu.'));
        stage.append(h('button.btn.btn-play', { type: 'button', onclick: () => playRhythm(p, bpm) }, '🔊 Réécouter'));
        const opts = options.map((o) => {
          const el = h('div.staff.staff-rhythm');
          drawRhythm(el, o, { width: 300 });
          return { label: el, value: patternKey(o) };
        });
        stage.append(choiceButtons(opts, patternKey(p), (ok) => answer(ok, { reveal: 'Voici le bon rythme (en vert).' }), { cls: 'choice-wide' }));
        setTimeout(() => playRhythm(p, bpm), 300);
      },
    };
  },
};

/**
 * Compare les frappes (en secondes depuis le début de la mesure) aux attaques attendues.
 * @returns {{ok: boolean, matched: number, missed: number, extra: number}}
 */
export function scoreTaps(expectedSec, tapsSec, tol) {
  const used = new Set();
  let matched = 0;
  for (const e of expectedSec) {
    let best = -1;
    let bestDist = Infinity;
    tapsSec.forEach((t, i) => {
      const d = Math.abs(t - e);
      if (!used.has(i) && d <= tol && d < bestDist) { best = i; bestDist = d; }
    });
    if (best >= 0) { used.add(best); matched++; }
  }
  const missed = expectedSec.length - matched;
  const extra = tapsSec.length - used.size;
  return { ok: missed === 0 && extra === 0, matched, missed, extra };
}

export const rythmeFrapper = {
  id: 'solfege-rythme-frapper',
  module: 'solfege',
  icon: '🥁',
  title: 'Frapper le rythme',
  desc: 'Tape le rythme au bon moment.',
  levels: RHYTHM_LEVELS.map((label, i) => ({ label, desc: `Tempo ${TEMPO[i]}` })),
  question(ctx) {
    const pool = RHYTHMS[ctx.level - 1].map((p) => ({ key: patternKey(p), p }));
    const { p } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
    const bpm = TEMPO[ctx.level - 1];
    const beat = 60 / bpm;
    const minGap = Math.min(...p.map(Math.abs)) * beat;
    const tol = Math.max(0.09, Math.min(0.2, 0.45 * minGap));
    return {
      item: patternKey(p),
      label: `rythme ${patternKey(p)}`,
      render(stage, answer) {
        stage.append(h('p.prompt', 'Écoute l\'exemple, puis appuie sur « À moi ! ». Après « 1, 2, 3, 4 », tape le rythme sur le tambour.'));
        const el = h('div.staff.staff-rhythm');
        stage.append(el);
        drawRhythm(el, p, { width: 340 });
        const count = h('div.countdown', ' ');
        const timeline = h('div.timeline');
        const pad = h('button.tap-pad', { type: 'button', disabled: true }, '🥁');
        const listen = h('button.btn.btn-play', { type: 'button', onclick: () => playRhythm(p, bpm) }, '🔊 Écouter');
        const go = h('button.btn.btn-primary', { type: 'button' }, '🙋 À moi !');
        stage.append(h('div.row', listen, go), count, pad, timeline);

        let taps = null;
        let start = 0;
        const ac = audio();
        const latency = () => ac.outputLatency || ac.baseLatency || 0;
        const onTap = (ev) => {
          ev.preventDefault();
          if (!taps) return;
          taps.push(ac.currentTime - latency() - start);
          pad.classList.add('is-hit');
          setTimeout(() => pad.classList.remove('is-hit'), 100);
        };
        pad.addEventListener('pointerdown', onTap);
        const onKey = (ev) => { if (ev.code === 'Space') onTap(ev); };
        document.addEventListener('keydown', onKey);

        go.addEventListener('click', async () => {
          go.disabled = listen.disabled = true;
          const t0 = ac.currentTime + 0.2;
          for (let i = 0; i < 4; i++) click(t0 + i * beat, i === 0, 0.5);
          start = t0 + 4 * beat;
          for (let i = 0; i < 4; i++) click(start + i * beat, i === 0, 0.15);
          for (let i = 0; i < 4; i++) {
            setTimeout(() => (count.textContent = String(i + 1)), (t0 - ac.currentTime + i * beat) * 1000);
          }
          await sleep((start - ac.currentTime - tol) * 1000);
          count.textContent = '🥁 À toi !';
          taps = [];
          pad.disabled = false;
          await sleep((start - ac.currentTime + 4 * beat + tol) * 1000);
          pad.disabled = true;
          document.removeEventListener('keydown', onKey);
          const expected = onsets(p).map((o) => o * beat);
          const res = scoreTaps(expected, taps, tol);
          count.textContent = '';
          drawTimeline(timeline, expected, taps, 4 * beat);
          const reveal = res.ok ? 'Parfait, en rythme !' : [res.missed && `${res.missed} coup(s) manqué(s)`, res.extra && `${res.extra} coup(s) en trop`].filter(Boolean).join(', ');
          answer(res.ok, { reveal, delay: 2500 });
        });
      },
    };
  },
};

function drawTimeline(el, expected, taps, total) {
  el.innerHTML = '';
  el.append(h('div.tl-legend', h('span.tl-dot.exp'), ' attendu  ', h('span.tl-dot.tap'), ' tes frappes'));
  const bar = h('div.tl-bar');
  for (const e of expected) bar.append(h('span.tl-mark.exp', { style: { left: `${(e / total) * 100}%` } }));
  for (const t of taps) if (t >= -0.3 && t <= total + 0.3) bar.append(h('span.tl-mark.tap', { style: { left: `${Math.max(0, Math.min(1, t / total)) * 100}%` } }));
  el.append(bar);
}

// ---------------------------------------------------------------------------
// Altérations
// ---------------------------------------------------------------------------

const ACC = {
  '#': { label: 'Dièse', symbol: '♯', effect: 'monte la note d\'un demi-ton' },
  b: { label: 'Bémol', symbol: '♭', effect: 'baisse la note d\'un demi-ton' },
  n: { label: 'Bécarre', symbol: '♮', effect: 'annule le dièse ou le bémol' },
};
const ALTERED = ['F#4', 'C#5', 'G#4', 'D#5', 'A#4', 'Bb4', 'Eb5', 'Ab4', 'Db5', 'Gb4'];
const ALTERED_LOW = ['F#4', 'C#4', 'G#4', 'D#4', 'A#4', 'Bb4', 'Eb4', 'Ab4', 'Db4', 'Gb4'];

export const alterations = {
  id: 'solfege-alterations',
  module: 'solfege',
  icon: '♯',
  title: 'Dièse, bémol, bécarre',
  desc: 'Les altérations et leur effet.',
  timed: true,
  levels: [
    { label: 'Reconnaître le signe' },
    { label: 'Nommer la note altérée' },
    { label: 'Trouver la touche du clavier' },
  ],
  question(ctx) {
    if (ctx.level === 1) {
      const pool = Object.keys(ACC).map((k) => ({ key: k }));
      const { key: acc } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
      const base = sample(['F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'], 1, ctx.rng)[0];
      return {
        item: acc,
        label: ACC[acc].label,
        render(stage, answer) {
          stage.append(h('p.prompt', 'Comment s\'appelle ce signe ?'));
          const el = h('div.staff.staff-big');
          stage.append(el);
          drawStaff(el, { width: 200, notes: [{ keys: [vexKey(parse(base))], duration: 'w', accidentals: [acc] }] });
          const opts = Object.entries(ACC).map(([k, a]) => ({ label: `${a.symbol} ${a.label}`, value: k }));
          stage.append(choiceButtons(opts, acc, (ok) => answer(ok, { reveal: `${ACC[acc].label} : il ${ACC[acc].effect}.` })));
        },
      };
    }
    const list = ctx.level === 2 ? ALTERED : ALTERED_LOW;
    const pool = list.map((s) => ({ key: s }));
    const { key } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
    const n = parse(key);
    const acc = n.alt === 1 ? '#' : 'b';
    return {
      item: key,
      label: nameFr(n),
      render(stage, answer) {
        const el = h('div.staff.staff-big');
        stage.append(el);
        drawStaff(el, { width: 200, notes: [{ keys: [vexKey(n)], duration: 'w', accidentals: [acc] }] });
        const reveal = `C'était ${nameFr(n)} : le ${ACC[acc].label.toLowerCase()} ${ACC[acc].effect}.`;
        if (ctx.level === 2) {
          stage.prepend(h('p.prompt', 'Comment s\'appelle cette note ?'));
          const variants = [
            n,
            { ...n, alt: 0 },
            { ...n, alt: -n.alt },
            { ...n, step: (n.step + 1) % 7 },
          ];
          const opts = shuffle(variants.map((v) => ({ label: nameFr(v), value: nameFr(v) })), ctx.rng);
          stage.append(choiceButtons(opts, nameFr(n), (ok) => {
            playPiano(midi(n));
            answer(ok, { reveal });
          }, { cls: 'note-name' }));
        } else {
          stage.prepend(h('p.prompt', 'Appuie sur la bonne touche du clavier.'));
          const m = midi(n);
          const kb = keyboard(60, 71, (pressed) => {
            kb.lock();
            const ok = pitchClass(pressed) === pitchClass(m);
            kb.mark(pressed, ok ? 'is-right' : 'is-wrong');
            if (!ok) kb.mark(60 + pitchClass(m), 'is-right');
            answer(ok, { reveal });
          }, { labels: true });
          stage.append(kb);
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Clavier et gamme de do majeur
// ---------------------------------------------------------------------------

const SCALE_C = [60, 62, 64, 65, 67, 69, 71, 72];

export const clavier = {
  id: 'solfege-clavier',
  module: 'solfege',
  icon: '🎹',
  title: 'Clavier et gamme',
  desc: 'Les notes sur le clavier, la gamme de do.',
  timed: true,
  levels: [
    { label: 'Trouver la note', desc: 'Sur une octave' },
    { label: 'Sur deux octaves', desc: 'N\'importe quelle octave' },
    { label: 'La note qui manque', desc: 'Dans la gamme de do' },
    { label: 'Jouer la gamme', desc: 'En montant ou en descendant' },
  ],
  question(ctx) {
    if (ctx.level <= 2) {
      const pool = NAMES_FR.map((n, i) => ({ key: n, i }));
      const { key, i } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
      const pc = SCALE_C[i] % 12;
      return {
        item: key,
        label: key,
        render(stage, answer) {
          stage.append(h('p.prompt.prompt-big', `Trouve le ${key}`));
          const kb = keyboard(60, ctx.level === 1 ? 71 : 83, (pressed) => {
            kb.lock();
            const ok = pitchClass(pressed) === pc;
            kb.mark(pressed, ok ? 'is-right' : 'is-wrong');
            if (!ok) for (let m = 60; m <= 83; m++) if (pitchClass(m) === pc) kb.mark(m, 'is-right');
            answer(ok, { reveal: 'Le bon endroit est en vert.' });
          });
          stage.append(kb);
        },
      };
    }
    if (ctx.level === 3) {
      const pool = [1, 2, 3, 4, 5, 6].map((i) => ({ key: NAMES_FR[i], i }));
      const { key, i } = pickWeighted(pool, ctx.stats, ctx.prev, ctx.rng);
      return {
        item: key,
        label: key,
        render(stage, answer) {
          stage.append(h('p.prompt', 'Quelle note manque dans la gamme de do ?'));
          const names = [...NAMES_FR, 'do'];
          stage.append(h('div.scale-chips', names.map((n, j) => h('span.chip' + (j === i ? '.chip-missing' : ''), j === i ? '?' : n))));
          const opts = NAMES_FR.map((n) => ({ label: n, value: n }));
          stage.append(choiceButtons(opts, key, (ok) => {
            answer(ok, { reveal: `Il manquait le ${key}.` });
          }, { cls: 'note-name' }));
        },
      };
    }
    const dir = pickWeighted([{ key: 'montante' }, { key: 'descendante' }], ctx.stats, null, ctx.rng).key;
    const seq = dir === 'montante' ? SCALE_C : [...SCALE_C].reverse();
    return {
      item: dir,
      label: `gamme ${dir}`,
      render(stage, answer) {
        stage.append(h('p.prompt', `Joue la gamme de do ${dir === 'montante' ? 'en montant ⬆️ (du do grave au do aigu)' : 'en descendant ⬇️ (du do aigu au do grave)'}`));
        const progress = h('div.scale-chips', seq.map(() => h('span.chip', '·')));
        stage.append(progress);
        let idx = 0;
        const kb = keyboard(60, 72, (pressed) => {
          const ok = pressed === seq[idx];
          kb.mark(pressed, ok ? 'is-right' : 'is-wrong');
          if (!ok) {
            kb.lock();
            kb.mark(seq[idx], 'is-hint');
            answer(false, { reveal: 'La bonne touche est en jaune.' });
            return;
          }
          progress.children[idx].textContent = NAMES_FR[SCALE_C.indexOf(seq[idx]) % 7] || 'do';
          progress.children[idx].classList.add('chip-ok');
          idx++;
          setTimeout(() => kb.clear(), 200);
          if (idx === seq.length) {
            kb.lock();
            answer(true, { reveal: 'Belle gamme !' });
          }
        }, { labels: true });
        stage.append(kb);
      },
    };
  },
};

export default [valeurs, rythmeReconnaitre, rythmeFrapper, alterations, clavier];
