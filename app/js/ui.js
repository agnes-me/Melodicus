// Petits utilitaires d'interface : création d'éléments, boutons de choix, clavier virtuel.
import { isBlackKey, midiNameFr } from './music.js';
import { playPiano } from './audio.js';

/** h('div.classe', {attrs}, ...enfants) */
export function h(tag, attrs = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = {};
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/**
 * Boutons de réponse. Au clic : marque juste/faux, révèle la bonne réponse, appelle onAnswer(ok, value).
 * @param {{label: string|Node, value: any}[]} options
 */
export function choiceButtons(options, correct, onAnswer, { cls = '', equals = (a, b) => a === b } = {}) {
  let locked = false;
  const buttons = options.map((o) =>
    h('button.choice' + (cls ? '.' + cls : ''), {
      type: 'button',
      onclick: () => {
        if (locked) return;
        locked = true;
        const ok = equals(o.value, correct);
        btn(o).classList.add(ok ? 'is-right' : 'is-wrong');
        if (!ok) buttons.forEach((b, i) => equals(options[i].value, correct) && b.classList.add('is-right'));
        onAnswer(ok, o.value);
      },
    }, o.label),
  );
  const btn = (o) => buttons[options.indexOf(o)];
  return h('div.choices', buttons);
}

/**
 * Clavier de piano cliquable.
 * @param {number} from note MIDI de départ (touche blanche)
 * @param {number} to note MIDI de fin
 * @param {(midi: number) => void} onPress
 */
export function keyboard(from, to, onPress, { sound = true, labels = false } = {}) {
  const wrap = h('div.keyboard');
  const whites = [];
  for (let m = from; m <= to; m++) if (!isBlackKey(m)) whites.push(m);
  const ww = 100 / whites.length;
  const keys = new Map();
  const press = (m, el) => (ev) => {
    ev.preventDefault();
    if (wrap.classList.contains('is-locked')) return;
    if (sound) playPiano(m);
    el.classList.add('is-down');
    setTimeout(() => el.classList.remove('is-down'), 180);
    onPress(m);
  };
  whites.forEach((m, i) => {
    const k = h('button.key.white', { type: 'button', style: { left: `${i * ww}%`, width: `${ww}%` }, 'aria-label': midiNameFr(m) },
      labels ? h('span.key-label', midiNameFr(m)) : null);
    k.addEventListener('pointerdown', press(m, k));
    keys.set(m, k);
    wrap.append(k);
  });
  for (let m = from; m <= to; m++) {
    if (!isBlackKey(m)) continue;
    const leftWhite = whites.indexOf(m - 1);
    const k = h('button.key.black', { type: 'button', style: { left: `${(leftWhite + 1) * ww - ww * 0.3}%`, width: `${ww * 0.6}%` }, 'aria-label': midiNameFr(m) });
    k.addEventListener('pointerdown', press(m, k));
    keys.set(m, k);
    wrap.append(k);
  }
  wrap.mark = (m, cls) => keys.get(m)?.classList.add(cls);
  wrap.clear = () => keys.forEach((k) => k.classList.remove('is-right', 'is-wrong', 'is-hint'));
  wrap.lock = (v = true) => wrap.classList.toggle('is-locked', v);
  return wrap;
}

export function toast(msg, ms = 2500) {
  const t = h('div.toast', msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('is-out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function stars(n, max = 3) {
  return h('span.stars', { 'aria-label': `${n} étoile(s) sur ${max}` }, '★'.repeat(n), h('span.stars-off', '★'.repeat(max - n)));
}

export function formatMs(ms) {
  if (ms == null) return '–';
  return (ms / 1000).toFixed(1).replace('.', ',') + ' s';
}

export function pct(x) {
  return x == null ? '–' : Math.round(x * 100) + ' %';
}
