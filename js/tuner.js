// Accordeur guitare / ukulélé : micro → détection de hauteur → aiguille « trop grave / juste / trop aigu ».
import { h } from './ui.js';
import { detectPitch, median } from './pitch.js';
import { freqToMidi, midiNameFr } from './music.js';
import { audio, referenceTone } from './audio.js';

export const INSTRUMENTS = {
  guitare: {
    label: 'Guitare',
    strings: [
      { midi: 40, name: 'mi grave', n: 6 },
      { midi: 45, name: 'la', n: 5 },
      { midi: 50, name: 'ré', n: 4 },
      { midi: 55, name: 'sol', n: 3 },
      { midi: 59, name: 'si', n: 2 },
      { midi: 64, name: 'mi aigu', n: 1 },
    ],
  },
  ukulele: {
    label: 'Ukulélé',
    strings: [
      { midi: 67, name: 'sol', n: 4 },
      { midi: 60, name: 'do', n: 3 },
      { midi: 64, name: 'mi', n: 2 },
      { midi: 69, name: 'la', n: 1 },
    ],
  },
};

const IN_TUNE = 5; // cents

/** Corde la plus proche d'une fréquence mesurée. */
export function nearestString(strings, f) {
  const m = freqToMidi(f);
  return strings.reduce((best, s) => (Math.abs(s.midi - m) < Math.abs(best.midi - m) ? s : best));
}

export function tunerScreen(root, { instrument = 'guitare' } = {}) {
  let inst = instrument;
  let target = null; // corde choisie (null = automatique)
  let stream = null;
  let raf = 0;
  let running = false;
  const history = [];
  const tuned = new Set();
  let inTuneSince = 0;

  const needle = h('div.gauge-needle');
  const gauge = h('div.gauge',
    h('div.gauge-zone'),
    h('span.gauge-label.left', 'grave'),
    h('span.gauge-label.mid', 'juste'),
    h('span.gauge-label.right', 'aigu'),
    needle);
  const status = h('div.tuner-status', 'Touche « Démarrer » puis joue une corde.');
  const detected = h('div.tuner-detected', ' ');
  const stringsRow = h('div.tuner-strings');
  const startBtn = h('button.btn.btn-primary.btn-big', { type: 'button', onclick: () => (running ? stop() : start()) }, '🎤 Démarrer');
  const instSel = h('div.segmented', Object.entries(INSTRUMENTS).map(([k, v]) =>
    h('button.seg' + (k === inst ? '.is-on' : ''), { type: 'button', onclick: (ev) => {
      inst = k;
      target = null;
      tuned.clear();
      instSel.querySelectorAll('.seg').forEach((b) => b.classList.toggle('is-on', b === ev.currentTarget));
      drawStrings();
    } }, v.label)));

  function drawStrings() {
    stringsRow.innerHTML = '';
    for (const s of INSTRUMENTS[inst].strings) {
      const b = h('button.string-btn' + (target === s ? '.is-target' : '') + (tuned.has(s.midi) ? '.is-tuned' : ''), {
        type: 'button',
        onclick: () => {
          target = target === s ? null : s;
          referenceTone(s.midi);
          drawStrings();
        },
      }, h('span.string-num', `${s.n}`), h('span', s.name), tuned.has(s.midi) ? h('span.string-ok', '✔') : null);
      stringsRow.append(b);
    }
    stringsRow.append(h('p.hint', target ? 'Corde choisie. Touche-la encore pour revenir en mode automatique.' : 'Mode automatique : l\'accordeur trouve la corde tout seul. Touche une corde pour entendre sa note.'));
  }

  async function start() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      status.textContent = '⚠️ Le micro n\'est disponible qu\'en HTTPS (ou sur localhost).';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      status.textContent = '⚠️ Micro refusé. Autorise le micro dans le navigateur pour utiliser l\'accordeur.';
      return;
    }
    const ac = audio();
    const src = ac.createMediaStreamSource(stream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    running = true;
    startBtn.textContent = '⏹️ Arrêter';
    status.textContent = 'Joue une corde…';
    let last = 0;
    const loop = (t) => {
      if (!root.isConnected) return stop();
      raf = requestAnimationFrame(loop);
      if (t - last < 60) return; // ~15 mesures par seconde suffisent
      last = t;
      analyser.getFloatTimeDomainData(buf);
      const f = detectPitch(buf, ac.sampleRate);
      if (f < 60 || f > 1200) {
        if (history.length) history.shift();
        if (!history.length) needle.classList.add('is-idle');
        return;
      }
      history.push(f);
      if (history.length > 5) history.shift();
      update(median(history));
    };
    raf = requestAnimationFrame(loop);
  }

  function update(f) {
    const strings = INSTRUMENTS[inst].strings;
    const s = target || nearestString(strings, f);
    const cents = Math.round((freqToMidi(f) - s.midi) * 100);
    const clamped = Math.max(-50, Math.min(50, cents));
    needle.classList.remove('is-idle');
    needle.style.transform = `translateX(-50%) rotate(${clamped * 0.9}deg)`;
    detected.textContent = `Corde ${s.n} (${s.name}) · j'entends ${midiNameFr(Math.round(freqToMidi(f)))} · ${f.toFixed(1).replace('.', ',')} Hz`;
    gauge.classList.remove('is-low', 'is-high', 'is-ok');
    if (Math.abs(cents) <= IN_TUNE) {
      gauge.classList.add('is-ok');
      status.textContent = '✅ Juste !';
      if (!inTuneSince) inTuneSince = performance.now();
      if (performance.now() - inTuneSince > 1200 && !tuned.has(s.midi)) {
        tuned.add(s.midi);
        drawStrings();
      }
    } else {
      inTuneSince = 0;
      if (Math.abs(cents) > 300) status.textContent = cents < 0 ? '⬇️ Beaucoup trop grave : tends la corde' : '⬆️ Beaucoup trop aigu : détends la corde';
      else if (cents < 0) status.textContent = '⬇️ Trop grave : tends un peu la corde';
      else status.textContent = '⬆️ Trop aigu : détends un peu la corde';
      gauge.classList.add(cents < 0 ? 'is-low' : 'is-high');
    }
  }

  function stop() {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    running = false;
    startBtn.textContent = '🎤 Démarrer';
  }

  drawStrings();
  root.append(
    h('div.tuner',
      instSel,
      gauge,
      status,
      detected,
      startBtn,
      stringsRow,
      h('p.hint', 'Astuce : joue une seule corde à la fois, près de la tablette, dans une pièce calme.')),
  );
  return stop;
}
