// Règles de progression : niveaux, étoiles, séries de jours, badges, choix pondéré des questions.
// Module pur (aucun accès au DOM ni au stockage) : testable sous Node.

export const SESSION_LENGTH = 10; // questions par partie en mode libre
export const PASS_SCORE = 8; // bonnes réponses nécessaires pour valider un niveau
export const TIMED_SECONDS = 60; // durée du défi chrono

/** 8/10 → 1 étoile, 9/10 → 2, 10/10 → 3. Sous le seuil : 0. */
export function starsFor(ok, total) {
  if (!total) return 0;
  const ratio = ok / total;
  if (ratio >= 1) return 3;
  if (ratio >= 0.9) return 2;
  if (ratio >= PASS_SCORE / SESSION_LENGTH) return 1;
  return 0;
}

export function newProfile(name, avatar = '🎵', color = '#7c5cff') {
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    avatar,
    color,
    createdAt: new Date().toISOString(),
    answerMode: 'names', // 'names' | 'keyboard'
    instruments: { guitar: false },
    progress: {}, // exId → { unlocked, stars: {level: n}, best: {level: n} }
    items: {}, // exId → itemKey → { ok, ko, ms }
    history: [], // { at, ex, level, mode, ok, total, ms }
    days: [], // 'AAAA-MM-JJ' des jours de pratique
    badges: {}, // badgeId → date
  };
}

export function exProgress(profile, exId) {
  if (!profile.progress[exId]) profile.progress[exId] = { unlocked: 1, stars: {}, best: {} };
  return profile.progress[exId];
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Nombre de jours consécutifs de pratique, jusqu'à aujourd'hui (ou hier : la série n'est pas encore perdue). */
export function streak(days, today = new Date()) {
  const set = new Set(days);
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/**
 * Enregistre une partie terminée et renvoie ce qui a changé (niveau débloqué, étoiles, record, badges).
 * @param {object} profile
 * @param {{ex: string, level: number, maxLevel: number, mode: 'free'|'timed', ok: number, total: number, ms: number,
 *          answers: {item: string, ok: boolean, ms: number}[]}} session
 */
export function recordSession(profile, session, now = new Date()) {
  const p = exProgress(profile, session.ex);
  const result = { levelUp: false, stars: 0, newBest: false, badges: [] };

  if (session.mode === 'free') {
    const stars = starsFor(session.ok, session.total);
    result.stars = stars;
    if (stars > (p.stars[session.level] || 0)) p.stars[session.level] = stars;
    if (stars > 0 && session.level === p.unlocked && p.unlocked < session.maxLevel) {
      p.unlocked++;
      result.levelUp = true;
    }
    if (stars > 0 && session.level === session.maxLevel) p.completed = true;
    // Activités à score libre (ex. nombre de changements d'accords) : on garde aussi le record.
    if (session.score != null && session.score > (p.best[session.level] || 0)) {
      p.best[session.level] = session.score;
      result.newBest = true;
    }
  } else if (session.ok > (p.best[session.level] || 0)) {
    p.best[session.level] = session.ok;
    result.newBest = true;
  }

  const items = (profile.items[session.ex] ||= {});
  for (const a of session.answers) {
    const s = (items[a.item] ||= { ok: 0, ko: 0, ms: 0 });
    if (a.ok) s.ok++;
    else s.ko++;
    s.ms += a.ms;
  }

  profile.history.push({
    at: now.toISOString(),
    ex: session.ex,
    level: session.level,
    mode: session.mode,
    ok: session.ok,
    total: session.total,
    ms: session.ms,
  });
  if (profile.history.length > 1000) profile.history.splice(0, profile.history.length - 1000);

  const today = dayKey(now);
  if (!profile.days.includes(today)) profile.days.push(today);

  for (const b of BADGES) {
    if (!profile.badges[b.id] && b.test(profile, session)) {
      profile.badges[b.id] = now.toISOString();
      result.badges.push(b);
    }
  }
  return result;
}

function totalCorrect(profile, prefix) {
  let n = 0;
  for (const [ex, items] of Object.entries(profile.items)) {
    if (!ex.startsWith(prefix)) continue;
    for (const s of Object.values(items)) n += s.ok;
  }
  return n;
}

const done = (profile, ex) => !!profile.progress[ex]?.completed;

export const BADGES = [
  { id: 'premiers-pas', icon: '👣', label: 'Premiers pas', desc: 'Terminer une première partie', test: () => true },
  { id: 'sans-faute', icon: '💯', label: 'Sans faute', desc: '10 bonnes réponses sur 10', test: (p, s) => s.mode === 'free' && s.ok === s.total && s.total > 0 },
  { id: 'serie-3', icon: '🔥', label: '3 jours de suite', desc: 'Jouer 3 jours d\'affilée', test: (p) => streak(p.days) >= 3 },
  { id: 'serie-7', icon: '🌟', label: 'Une semaine !', desc: 'Jouer 7 jours d\'affilée', test: (p) => streak(p.days) >= 7 },
  { id: 'serie-30', icon: '🏆', label: 'Un mois !', desc: 'Jouer 30 jours d\'affilée', test: (p) => streak(p.days) >= 30 },
  { id: 'notes-100', icon: '🎼', label: '100 notes lues', desc: '100 notes bien lues', test: (p) => totalCorrect(p, 'lecture') >= 100 },
  { id: 'notes-500', icon: '📚', label: '500 notes lues', desc: '500 notes bien lues', test: (p) => totalCorrect(p, 'lecture') >= 500 },
  { id: 'chrono-15', icon: '⏱️', label: 'Rapide !', desc: '15 bonnes réponses en 1 minute', test: (p, s) => s.mode === 'timed' && s.ok >= 15 },
  { id: 'cle-sol', icon: '🎻', label: 'Clé de sol', desc: 'Finir tous les niveaux de la clé de sol', test: (p) => done(p, 'lecture-sol') },
  { id: 'cle-fa', icon: '🎷', label: 'Clé de fa', desc: 'Finir tous les niveaux de la clé de fa', test: (p) => done(p, 'lecture-fa') },
  { id: 'deux-cles', icon: '🗝️', label: 'Les deux clés', desc: 'Finir le mode mixte', test: (p) => done(p, 'lecture-mixte') },
  { id: 'rythme', icon: '🥁', label: 'Batteur', desc: 'Finir « Frapper le rythme »', test: (p) => done(p, 'solfege-rythme-frapper') },
  { id: 'oreille', icon: '👂', label: 'Oreille fine', desc: 'Finir les intervalles', test: (p) => done(p, 'oreille-intervalles') },
  { id: 'guitare', icon: '🎸', label: 'Guitariste', desc: 'Finir « Reconnaître les accords »', test: (p) => done(p, 'guitare-accords') },
  {
    id: 'explorateur', icon: '🧭', label: 'Explorateur', desc: 'Essayer les 4 grands modules',
    test: (p) => ['lecture', 'solfege', 'oreille', 'guitare'].every((m) => p.history.some((h) => h.ex.startsWith(m + '-'))),
  },
];

/**
 * Choisit un élément en favorisant ceux où l'enfant se trompe souvent (travail ciblé),
 * en évitant de reproposer immédiatement le précédent.
 */
export function pickWeighted(items, stats = {}, prevKey, rng = Math.random, keyOf = (x) => x.key ?? String(x)) {
  const pool = items.length > 1 ? items.filter((x) => keyOf(x) !== prevKey) : items;
  const weights = pool.map((x) => {
    const s = stats[keyOf(x)];
    if (!s) return 1.5; // jamais vu : un peu favorisé
    const errRate = (s.ko + 0.5) / (s.ok + s.ko + 1);
    return 1 + 4 * errRate;
  });
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Statistiques consolidées d'un exercice pour l'espace parent. */
export function exerciseStats(profile, exId) {
  const items = profile.items[exId] || {};
  let ok = 0;
  let ko = 0;
  let ms = 0;
  const errors = [];
  for (const [key, s] of Object.entries(items)) {
    ok += s.ok;
    ko += s.ko;
    ms += s.ms;
    if (s.ko > 0) errors.push({ key, ko: s.ko, rate: s.ko / (s.ok + s.ko) });
  }
  errors.sort((a, b) => b.ko - a.ko || b.rate - a.rate);
  const n = ok + ko;
  return { answers: n, rate: n ? ok / n : null, avgMs: n ? ms / n : null, errors: errors.slice(0, 5) };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n, rng = Math.random) {
  return shuffle(arr, rng).slice(0, n);
}
