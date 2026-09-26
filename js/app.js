// Mélodicus — point d'entrée : navigation, écrans, moteur de jeu.
import * as store from './store.js';
import { h, toast, stars, formatMs, pct } from './ui.js';
import { MODULES, EXERCISES, exerciseById, exercisesOf } from './exercises/index.js';
import {
  recordSession, exProgress, streak, BADGES, exerciseStats, SESSION_LENGTH, TIMED_SECONDS, dayKey,
} from './progress.js';
import { audio, successSound, errorSound, strum } from './audio.js';
import { tunerScreen } from './tuner.js';
import { CHORD_LEVELS, chordById, chordDiagram, chordMidi } from './guitar.js';
import { drawStaff } from './staff.js';
import { parse, vexKey, nameFr } from './music.js';

const app = document.getElementById('app');
let cleanup = null; // fonction d'arrêt de l'écran courant (micro, minuteurs…)

const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐧', '🦄', '🐙', '🐱', '🐶', '🐰', '🐯', '🐨'];
const COLORS = ['#7c5cff', '#ff8a3d', '#1bb3a6', '#e0457b', '#3d8bff', '#8bc34a'];

// ---------------------------------------------------------------------------
// Navigation (hash) : #/accueil, #/module/lecture, #/jouer/lecture-sol/2/free …
// ---------------------------------------------------------------------------

const routes = {
  '': home,
  profils: profilesScreen,
  nouveau: newProfileScreen,
  accueil: home,
  module: moduleScreen,
  exercice: exerciseScreen,
  jouer: playScreen,
  accordeur: tunerRoute,
  badges: badgesScreen,
  profil: profileSettings,
  accords: chordsScreen,
  parent: parentScreen,
};

export function go(path) {
  location.hash = '#/' + path;
}

function render() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const view = routes[name] || home;
  const needsProfile = ![profilesScreen, newProfileScreen, tunerRoute, parentScreen].includes(view);
  if (needsProfile && !store.current()) {
    if (view === home) profilesScreen();
    else go('profils');
    return;
  }
  app.innerHTML = '';
  window.scrollTo(0, 0);
  view(...args);
}

window.addEventListener('hashchange', render);
// Débloque le son au premier contact (exigence des navigateurs mobiles).
document.addEventListener('pointerdown', () => audio(), { once: true });

function topbar(title, back = 'accueil', extra = null) {
  const p = store.current();
  return h('header.topbar',
    back != null ? h('button.icon-btn', { type: 'button', 'aria-label': 'Retour', onclick: () => go(back) }, '⬅') : h('span'),
    h('h1', title),
    extra || (p ? h('button.avatar-btn', { type: 'button', style: { background: p.color }, onclick: () => go('profils'), 'aria-label': 'Changer de profil' }, p.avatar) : h('span')));
}

function screen(...children) {
  const main = h('main.screen', ...children);
  app.append(main);
  return main;
}

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

function profilesScreen() {
  app.innerHTML = '';
  const list = store.profiles();
  screen(
    h('div.hero', h('div.logo', '🎵'), h('h1.title', 'Mélodicus'), h('p.subtitle', 'Qui joue aujourd\'hui ?')),
    h('div.profile-grid',
      list.map((p) => h('button.profile-card', {
        type: 'button',
        style: { '--c': p.color },
        onclick: () => { store.select(p.id); go('accueil'); },
      }, h('span.profile-avatar', p.avatar), h('span.profile-name', p.name),
      streak(p.days) ? h('span.profile-streak', `🔥 ${streak(p.days)}`) : null)),
      h('button.profile-card.profile-add', { type: 'button', onclick: () => go('nouveau') }, h('span.profile-avatar', '＋'), h('span.profile-name', 'Nouveau'))),
    h('div.footer-links',
      h('button.link', { type: 'button', onclick: () => go('accordeur') }, '🎤 Accordeur'),
      h('button.link', { type: 'button', onclick: () => go('parent') }, '👪 Espace parent')),
  );
}

function newProfileScreen() {
  let avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  let color = COLORS[store.profiles().length % COLORS.length];
  const name = h('input.input', { type: 'text', maxlength: 20, placeholder: 'Ton prénom', autocomplete: 'off' });
  const guitar = h('input', { type: 'checkbox' });
  const avatars = h('div.pick-grid', AVATARS.map((a) => h('button.pick' + (a === avatar ? '.is-on' : ''), {
    type: 'button',
    onclick: (ev) => { avatar = a; avatars.querySelectorAll('.pick').forEach((b) => b.classList.toggle('is-on', b === ev.currentTarget)); },
  }, a)));
  const colors = h('div.pick-grid', COLORS.map((c) => h('button.pick.pick-color' + (c === color ? '.is-on' : ''), {
    type: 'button',
    style: { background: c },
    'aria-label': 'Couleur',
    onclick: (ev) => { color = c; colors.querySelectorAll('.pick').forEach((b) => b.classList.toggle('is-on', b === ev.currentTarget)); },
  })));
  screen(
    topbar('Nouveau profil', 'profils', h('span')),
    h('div.card.form',
      h('label.field', h('span', 'Prénom'), name),
      h('div.field', h('span', 'Choisis ton animal'), avatars),
      h('div.field', h('span', 'Choisis ta couleur'), colors),
      h('label.switch', guitar, h('span', '🎸 Je joue de la guitare')),
      h('button.btn.btn-primary.btn-big', {
        type: 'button',
        onclick: () => {
          const n = name.value.trim();
          if (!n) { name.focus(); toast('Écris ton prénom 🙂'); return; }
          const p = store.create(n, avatar, color);
          p.instruments.guitar = guitar.checked;
          store.save();
          go('accueil');
        },
      }, 'C\'est parti !')),
  );
  name.focus();
}

function profileSettings() {
  const p = store.current();
  const mode = h('div.segmented', [['names', 'Avec les noms (do, ré, mi…)'], ['keyboard', 'Avec le clavier 🎹']].map(([k, label]) =>
    h('button.seg' + (p.answerMode === k ? '.is-on' : ''), { type: 'button', onclick: () => { p.answerMode = k; store.save(); render(); } }, label)));
  const guitar = h('input', { type: 'checkbox', checked: p.instruments.guitar || null, onchange: (ev) => { p.instruments.guitar = ev.target.checked; store.save(); } });
  screen(
    topbar('Mon profil'),
    h('div.card.form',
      h('div.big-avatar', { style: { background: p.color } }, p.avatar),
      h('h2', p.name),
      h('div.field', h('span', 'Pour lire les notes, je réponds :'), mode),
      h('label.switch', guitar, h('span', '🎸 Je joue de la guitare (module accords)')),
      h('button.btn', { type: 'button', onclick: () => go('profils') }, '👥 Changer de joueur')),
  );
}

// ---------------------------------------------------------------------------
// Accueil et modules
// ---------------------------------------------------------------------------

function home() {
  const p = store.current();
  const s = streak(p.days);
  const today = p.days.includes(dayKey());
  const badgeCount = Object.keys(p.badges).length;
  screen(
    topbar(`Bonjour ${p.name} !`, null),
    h('div.status-row',
      h('div.pill', s ? `🔥 ${s} jour${s > 1 ? 's' : ''} de suite` : '🌱 Nouvelle série'),
      h('div.pill', today ? '✅ Déjà joué aujourd\'hui' : '🎯 Pas encore joué aujourd\'hui'),
      h('button.pill.pill-btn', { type: 'button', onclick: () => go('badges') }, `🏅 ${badgeCount} badge${badgeCount > 1 ? 's' : ''}`)),
    h('div.module-grid',
      MODULES.filter((m) => !m.instrument || p.instruments[m.instrument]).map((m) => h('button.module-card', {
        type: 'button',
        style: { '--c': m.color },
        onclick: () => go('module/' + m.id),
      }, h('span.module-icon', m.icon), h('span.module-title', m.title), h('span.module-desc', m.desc), moduleProgressBar(p, m.id))),
      h('button.module-card', { type: 'button', style: { '--c': '#5b6b7f' }, onclick: () => go('accordeur') },
        h('span.module-icon', '🎤'), h('span.module-title', 'Accordeur'), h('span.module-desc', 'Guitare et ukulélé'))),
    h('div.footer-links',
      h('button.link', { type: 'button', onclick: () => go('profil') }, '⚙️ Mon profil'),
      h('button.link', { type: 'button', onclick: () => go('parent') }, '👪 Espace parent')),
  );
}

function moduleProgressBar(p, moduleId) {
  const exs = exercisesOf(moduleId);
  let done = 0;
  let total = 0;
  for (const e of exs) {
    total += e.levels.length;
    const pr = p.progress[e.id];
    if (pr) done += Object.keys(pr.stars).filter((l) => pr.stars[l] > 0).length;
  }
  return h('span.progress', h('span.progress-fill', { style: { width: `${(done / total) * 100}%` } }));
}

function moduleScreen(id) {
  const m = MODULES.find((x) => x.id === id);
  if (!m) return go('accueil');
  const p = store.current();
  screen(
    topbar(`${m.icon} ${m.title}`),
    h('div.ex-list', exercisesOf(id).map((e) => {
      const lock = e.requires?.(p);
      const pr = p.progress[e.id];
      const unlocked = pr?.unlocked || 1;
      return h('button.ex-card' + (lock ? '.is-locked' : ''), {
        type: 'button',
        style: { '--c': m.color },
        onclick: () => (lock ? toast(lock, 3500) : go('exercice/' + e.id)),
      },
      h('span.ex-icon', lock ? '🔒' : e.icon),
      h('span.ex-text', h('span.ex-title', e.title), h('span.ex-desc', lock || e.desc)),
      e.activity ? null : h('span.ex-level', `Niv. ${Math.min(unlocked, e.levels.length)}/${e.levels.length}`));
    })),
    id === 'guitare' ? h('button.btn.btn-wide', { type: 'button', onclick: () => go('accords') }, '📖 Mes accords (diagrammes, sons et notes)') : null,
  );
}

function exerciseScreen(id) {
  const e = exerciseById[id];
  if (!e) return go('accueil');
  const p = store.current();
  const lock = e.requires?.(p);
  if (lock) { toast(lock); return go('module/' + e.module); }
  const pr = exProgress(p, e.id);
  screen(
    topbar(`${e.icon} ${e.title}`, 'module/' + e.module),
    h('p.lead', e.desc),
    h('div.level-list', e.levels.map((lvl, i) => {
      const n = i + 1;
      const open = n <= pr.unlocked;
      return h('div.level-card' + (open ? '' : '.is-locked'),
        h('div.level-num', open ? n : '🔒'),
        h('div.level-text', h('div.level-title', lvl.label), lvl.desc ? h('div.level-desc', lvl.desc) : null,
          pr.best[n] ? h('div.level-best', e.activity ? `Record : ${pr.best[n]}` : `⏱️ Record : ${pr.best[n]} en 1 min`) : null),
        h('div.level-stars', stars(pr.stars[n] || 0)),
        open ? h('div.level-actions',
          h('button.btn.btn-primary', { type: 'button', onclick: () => go(`jouer/${e.id}/${n}/free`) }, '▶ Jouer'),
          e.timed ? h('button.btn', { type: 'button', onclick: () => go(`jouer/${e.id}/${n}/timed`) }, '⏱️ Chrono') : null) : null);
    })),
    h('p.hint', e.activity ? 'Atteins l\'objectif pour débloquer le niveau suivant.' : `Réussis ${8} réponses sur ${SESSION_LENGTH} pour débloquer le niveau suivant. Le mode Chrono : un maximum de bonnes réponses en 1 minute, pour battre ton propre record !`),
  );
}

// ---------------------------------------------------------------------------
// Moteur de jeu
// ---------------------------------------------------------------------------

function playScreen(id, levelStr, mode = 'free') {
  const e = exerciseById[id];
  const p = store.current();
  const level = Number(levelStr);
  if (!e || !level || level > exProgress(p, id).unlocked || e.requires?.(p)) return go('accueil');
  const timed = mode === 'timed';
  const answers = [];
  let prev = null;
  let ended = false;
  let timerId = null;
  const stats = p.items[e.id] || {};

  const dots = h('div.dots', timed ? null : Array.from({ length: SESSION_LENGTH }, () => h('span.dot')));
  const timerEl = h('div.timer', timed ? `${TIMED_SECONDS} s` : '');
  const scoreEl = h('div.score', timed ? '✔ 0' : '');
  const stage = h('div.stage');
  const feedback = h('div.feedback');
  const modeToggle = e.answerModes ? h('button.icon-btn', {
    type: 'button',
    title: 'Répondre avec les noms ou le clavier',
    'aria-label': 'Changer le mode de réponse',
    onclick: () => { p.answerMode = p.answerMode === 'keyboard' ? 'names' : 'keyboard'; store.save(); modeToggle.textContent = p.answerMode === 'keyboard' ? '🔤' : '🎹'; next(true); },
  }, p.answerMode === 'keyboard' ? '🔤' : '🎹') : h('span');

  screen(
    h('header.topbar',
      h('button.icon-btn', { type: 'button', 'aria-label': 'Quitter', onclick: () => go('exercice/' + e.id) }, '✕'),
      h('h1', `${e.title} · niv. ${level}`),
      modeToggle),
    e.activity ? null : h('div.play-status', dots, timerEl, scoreEl),
    stage,
    feedback,
  );

  const ctxBase = { level, profile: p, stats, rng: Math.random };

  if (e.activity) {
    e.run(stage, ctxBase, (res) => finish(res));
    cleanup = () => { ended = true; };
    return;
  }

  let startedAt = 0;
  let pending = null;

  function next(replace = false) {
    if (ended) return;
    if (!timed && answers.length >= SESSION_LENGTH) return finish();
    if (replace && pending) pending.cancelled = true;
    feedback.textContent = '';
    feedback.className = 'feedback';
    stage.innerHTML = '';
    const q = e.question({ ...ctxBase, prev });
    prev = q.item;
    startedAt = performance.now();
    const token = { cancelled: false };
    pending = token;
    q.render(stage, (ok, { reveal, delay } = {}) => {
      if (token.cancelled || ended || token.done) return;
      token.done = true;
      const ms = Math.round(performance.now() - startedAt);
      answers.push({ item: q.item, label: q.label, ok, ms });
      if (ok) successSound(); else errorSound();
      if (!timed) dots.children[answers.length - 1].classList.add(ok ? 'is-ok' : 'is-ko');
      else scoreEl.textContent = `✔ ${answers.filter((a) => a.ok).length}`;
      feedback.className = 'feedback ' + (ok ? 'is-ok' : 'is-ko');
      feedback.textContent = (ok ? pickPraise() : 'Oups ! ') + (reveal && (!ok || delay) ? ' ' + reveal : '');
      const wait = delay ?? (ok ? (timed ? 350 : 900) : (timed ? 1400 : 2200));
      setTimeout(() => next(), wait);
    });
  }

  if (timed) {
    const end = Date.now() + TIMED_SECONDS * 1000;
    timerId = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      timerEl.textContent = `${left} s`;
      timerEl.classList.toggle('is-hurry', left <= 10);
      if (left <= 0) finish();
    }, 250);
  }
  cleanup = () => { ended = true; clearInterval(timerId); };
  next();

  function finish(activity = null) {
    if (ended && !activity) return;
    ended = true;
    clearInterval(timerId);
    const ok = activity ? activity.ok : answers.filter((a) => a.ok).length;
    const total = activity ? activity.total : answers.length;
    const ms = answers.reduce((s, a) => s + a.ms, 0);
    const result = recordSession(p, {
      ex: e.id,
      level,
      maxLevel: e.levels.length,
      mode: timed ? 'timed' : 'free',
      ok,
      total,
      ms: answers.length ? Math.round(ms / answers.length) : 0,
      answers,
      score: activity?.score,
    });
    store.save();
    showResults({ e, level, timed, ok, total, answers, result, activity });
  }
}

const PRAISES = ['Bravo !', 'Super !', 'Génial !', 'Bien joué !', 'Excellent !', 'Parfait !', 'Yes !'];
const pickPraise = () => PRAISES[Math.floor(Math.random() * PRAISES.length)];

function showResults({ e, level, timed, ok, total, answers, result, activity }) {
  app.innerHTML = '';
  const p = store.current();
  const missed = [...new Set(answers.filter((a) => !a.ok).map((a) => a.label))];
  const pr = exProgress(p, e.id);
  let title;
  let big;
  if (timed) {
    title = result.newBest ? '🎉 Nouveau record !' : 'Temps écoulé !';
    big = h('div.result-big', `${ok}`, h('small', ` bonne${ok > 1 ? 's' : ''} réponse${ok > 1 ? 's' : ''} en 1 minute`));
  } else if (activity) {
    title = result.stars ? '🎉 Objectif atteint !' : 'Bien travaillé !';
    big = h('div.result-big', activity.message);
  } else {
    title = result.stars === 3 ? '🎉 Sans faute !' : result.stars ? '🎉 Niveau réussi !' : 'Continue, tu progresses !';
    big = h('div.result-big', `${ok} / ${total}`);
  }
  screen(
    h('div.result card',
      h('h1', title),
      !timed ? h('div.result-stars', stars(result.stars)) : null,
      big,
      timed ? h('p', `Ton record : ${pr.best[level] || ok}`) : null,
      result.levelUp ? h('p.levelup', `🔓 Niveau ${level + 1} débloqué !`) : null,
      !timed && !result.stars ? h('p', activity ? 'Rejoue pour atteindre l\'objectif.' : `Il faut 8 bonnes réponses pour passer au niveau suivant. Tu peux le faire !`) : null,
      missed.length ? h('div.missed', h('span', 'À revoir : '), missed.slice(0, 6).map((m) => h('span.chip', m))) : null,
      result.badges.length ? h('div.new-badges', h('p', 'Nouveau badge !'), result.badges.map((b) => h('div.badge.is-won', h('span.badge-icon', b.icon), h('span.badge-label', b.label)))) : null,
      h('div.row.row-center',
        h('button.btn', { type: 'button', onclick: () => go('exercice/' + e.id) }, '⬅ Niveaux'),
        h('button.btn.btn-primary', { type: 'button', onclick: () => render() }, '🔁 Rejouer'),
        result.levelUp ? h('button.btn.btn-primary', { type: 'button', onclick: () => go(`jouer/${e.id}/${level + 1}/free`) }, 'Niveau suivant ➜') : null)),
  );
  if (result.stars || result.newBest) confetti();
}

function confetti() {
  const box = h('div.confetti');
  for (let i = 0; i < 40; i++) {
    box.append(h('span', { style: { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.6}s`, background: COLORS[i % COLORS.length] } }));
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 2500);
}

// ---------------------------------------------------------------------------
// Badges, accordeur, accords
// ---------------------------------------------------------------------------

function badgesScreen() {
  const p = store.current();
  screen(
    topbar('🏅 Mes badges'),
    h('div.badge-grid', BADGES.map((b) => h('div.badge' + (p.badges[b.id] ? '.is-won' : ''),
      h('span.badge-icon', p.badges[b.id] ? b.icon : '❔'),
      h('span.badge-label', b.label),
      h('span.badge-desc', b.desc)))),
  );
}

function tunerRoute() {
  const p = store.current();
  screen(topbar('🎤 Accordeur', p ? 'accueil' : 'profils', h('span')));
  const root = h('div');
  app.querySelector('main').append(root);
  cleanup = tunerScreen(root);
}

function chordsScreen() {
  const main = screen(topbar('📖 Mes accords', 'module/guitare'));
  CHORD_LEVELS.forEach((lvl, i) => {
    const ids = i === 0 ? lvl.ids : lvl.ids.filter((id) => !CHORD_LEVELS.slice(0, i).some((l) => l.ids.includes(id)));
    main.append(h('h2.section', lvl.label));
    main.append(h('div.chord-grid', ids.map((id) => {
      const c = chordById[id];
      const staff = h('div.staff.staff-chord');
      const card = h('div.chord-card',
        chordDiagram(c),
        staff,
        h('p.chord-notes', 'Notes : ' + c.tones.map((t) => nameFr(parse(t))).join(' – ')),
        h('button.btn.btn-play', { type: 'button', onclick: () => strum(chordMidi(c)) }, '🔊 Écouter'));
      queueMicrotask(() => drawStaff(staff, { width: 150, notes: [{ keys: c.tones.map((t) => vexKey(parse(t))), duration: 'w', accidentals: c.tones.map((t) => (t.includes('#') ? '#' : /^[A-G]b/.test(t) ? 'b' : null)) }] }));
      return card;
    })));
  });
}

// ---------------------------------------------------------------------------
// Espace parent
// ---------------------------------------------------------------------------

let parentUnlocked = false;

function parentScreen(profileId) {
  if (!parentUnlocked) return parentGate();
  const list = store.profiles();
  const back = store.current() ? 'accueil' : 'profils';
  const main = screen(topbar('👪 Espace parent', back, h('span')));
  if (!list.length) {
    main.append(h('p.lead', 'Aucun profil pour l\'instant.'));
  }
  const selected = store.getProfile(profileId) || list[0];
  if (selected) {
    main.append(h('div.segmented.segmented-wrap', list.map((p) => h('button.seg' + (p === selected ? '.is-on' : ''), { type: 'button', onclick: () => go('parent/' + p.id) }, `${p.avatar} ${p.name}`))));
    main.append(parentDashboard(selected));
  }
  main.append(h('div.card',
    h('h2', 'Sauvegarde'),
    h('p', 'Les données sont enregistrées uniquement dans ce navigateur. Pensez à exporter une sauvegarde de temps en temps (ou pour passer sur une autre tablette).'),
    h('div.row',
      h('button.btn', { type: 'button', onclick: exportData }, '💾 Exporter'),
      h('label.btn', '📂 Importer', h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: importData })))));
}

function parentGate() {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const input = h('input.input', { type: 'number', inputmode: 'numeric', placeholder: '?' });
  const check = () => {
    if (Number(input.value) === a * b) { parentUnlocked = true; render(); } else { toast('Réponse incorrecte'); input.value = ''; }
  };
  input.addEventListener('keydown', (ev) => ev.key === 'Enter' && check());
  screen(
    topbar('👪 Espace parent', store.current() ? 'accueil' : 'profils', h('span')),
    h('div.card.form',
      h('p', 'Cet espace est réservé aux parents. Pour continuer, répondez à la question :'),
      h('p.prompt.prompt-big', `${a} × ${b} = ?`),
      input,
      h('button.btn.btn-primary', { type: 'button', onclick: check }, 'Valider')),
  );
  input.focus();
}

function parentDashboard(p) {
  const wrap = h('div');
  const days = last14(p);
  const max = Math.max(1, ...days.map((d) => d.n));
  const sessions = p.history.length;
  const answers = p.history.reduce((s, x) => s + x.total, 0);
  const correct = p.history.reduce((s, x) => s + x.ok, 0);

  wrap.append(h('div.card',
    h('h2', `${p.avatar} ${p.name}`),
    h('div.kpis',
      kpi('Série actuelle', `${streak(p.days)} j`),
      kpi('Jours de pratique', p.days.length),
      kpi('Parties jouées', sessions),
      kpi('Réussite globale', pct(answers ? correct / answers : null)),
      kpi('Badges', `${Object.keys(p.badges).length} / ${BADGES.length}`)),
    h('h3', 'Activité des 14 derniers jours (réponses données)'),
    h('div.bars', days.map((d) => h('div.bar-col', { title: `${d.label} : ${d.n} réponses` },
      h('div.bar', { style: { height: `${(d.n / max) * 100}%` } }),
      h('span.bar-label', d.short))))));

  const rows = EXERCISES.map((e) => {
    const st = exerciseStats(p, e.id);
    const pr = p.progress[e.id];
    const played = p.history.filter((x) => x.ex === e.id).length;
    const select = h('select.input.input-sm', {
      'aria-label': 'Niveau débloqué',
      onchange: (ev) => { exProgress(p, e.id).unlocked = Number(ev.target.value); store.save(); toast('Niveau mis à jour'); },
    }, e.levels.map((_, i) => h('option', { value: i + 1, selected: (pr?.unlocked || 1) === i + 1 || null }, `${i + 1}`)));
    return h('tr',
      h('td', `${e.icon} ${e.title}`),
      h('td.nowrap', select, ` / ${e.levels.length}`),
      h('td', played),
      h('td', pct(st.rate)),
      h('td', formatMs(st.avgMs)),
      h('td', st.errors.map((x) => h('span.chip.chip-sm', { title: `${x.ko} erreur(s)` }, errorLabel(e, x.key)))));
  });
  wrap.append(h('div.card',
    h('h2', 'Progression par exercice'),
    h('p.hint', 'Vous pouvez débloquer un niveau (par exemple pour un enfant qui connaît déjà les bases).'),
    h('div.table-wrap', h('table.table',
      h('thead', h('tr', ['Exercice', 'Niveau', 'Parties', 'Réussite', 'Temps moyen', 'Erreurs fréquentes'].map((t) => h('th', t)))),
      h('tbody', rows)))));

  const recent = [...p.history].reverse().slice(0, 15);
  wrap.append(h('div.card',
    h('h2', 'Dernières parties'),
    recent.length ? h('div.table-wrap', h('table.table',
      h('thead', h('tr', ['Date', 'Exercice', 'Niveau', 'Mode', 'Score'].map((t) => h('th', t)))),
      h('tbody', recent.map((x) => h('tr',
        h('td', new Date(x.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })),
        h('td', exerciseById[x.ex]?.title || x.ex),
        h('td', x.level),
        h('td', x.mode === 'timed' ? 'Chrono' : 'Libre'),
        h('td', `${x.ok} / ${x.total}`)))))) : h('p', 'Aucune partie pour le moment.'),
    h('button.btn.btn-danger', { type: 'button', onclick: () => {
      if (confirm(`Supprimer définitivement le profil de ${p.name} ?`)) { store.remove(p.id); go('parent'); }
    } }, '🗑️ Supprimer ce profil')));
  return wrap;
}

const NOTE_FR = { C: 'do', D: 'ré', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' };

/** Rend lisible une clé d'élément (ex. 'treble:G4' → 'sol (clé de sol)'). */
function errorLabel(e, key) {
  const m = /^(treble|bass):([A-G])(#|b)?(\d)$/.exec(key);
  if (m) return `${NOTE_FR[m[2]]}${m[3] === '#' ? '♯' : m[3] === 'b' ? '♭' : ''}${m[4]} ${m[1] === 'treble' ? '𝄞' : '𝄢'}`;
  const n = /^([A-G])(#|b)?(\d)$/.exec(key);
  if (n) return `${NOTE_FR[n[1]]}${n[2] === '#' ? '♯' : n[2] === 'b' ? '♭' : ''}`;
  if (chordById[key] && e.module === 'guitare') return chordById[key].name;
  return key;
}

function kpi(label, value) {
  return h('div.kpi', h('div.kpi-value', value), h('div.kpi-label', label));
}

function last14(p) {
  const out = [];
  const counts = {};
  for (const x of p.history) {
    const k = dayKey(new Date(x.at));
    counts[k] = (counts[k] || 0) + x.total;
  }
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    out.push({ n: counts[k] || 0, label: d.toLocaleDateString('fr-FR'), short: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }) });
  }
  return out;
}

function exportData() {
  const blob = new Blob([store.exportJson()], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `melodicus-sauvegarde-${dayKey()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
}

function importData(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  file.text().then((text) => {
    try {
      if (!confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
      store.importJson(text);
      toast('Sauvegarde importée ✅');
      go('parent');
      render();
    } catch (e) {
      toast('Fichier invalide');
    }
  });
}

// ---------------------------------------------------------------------------

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
