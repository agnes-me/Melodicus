// Rendu de portées avec VexFlow (bibliothèque libre, chargée localement dans js/vendor).

function VF() {
  if (!window.Vex?.Flow) throw new Error('VexFlow non chargé');
  return window.Vex.Flow;
}

/**
 * Dessine une portée dans `el`.
 * @param {HTMLElement} el
 * @param {object} o
 * @param {'treble'|'bass'} [o.clef]
 * @param {{keys: string[], duration: string, accidentals?: (string|null)[], color?: string}[]} [o.notes]
 * @param {string} [o.time] chiffrage, ex. '4/4'
 * @param {number} [o.width] largeur logique de la portée
 * @param {boolean} [o.beam] grouper les croches
 */
export function drawStaff(el, { clef = 'treble', notes = [], time = null, width = 260, beam = false, showClef = true } = {}) {
  const Vex = VF();
  el.innerHTML = '';
  const height = 150;
  const renderer = new Vex.Renderer(el, Vex.Renderer.Backends.SVG);
  renderer.resize(width + 20, height);
  const ctx = renderer.getContext();
  const stave = new Vex.Stave(10, 20, width);
  if (showClef) stave.addClef(clef);
  if (time) stave.addTimeSignature(time);
  stave.setContext(ctx).draw();

  if (notes.length) {
    const staveNotes = notes.map((n) => {
      const sn = new Vex.StaveNote({ keys: n.keys, duration: n.duration, clef, auto_stem: !n.duration.endsWith('r') });
      (n.accidentals || []).forEach((acc, i) => {
        if (acc) sn.addModifier(new Vex.Accidental(acc), i);
      });
      if (n.dots) Vex.Dot.buildAndAttach([sn], { all: true });
      if (n.color) sn.setStyle({ fillStyle: n.color, strokeStyle: n.color });
      return sn;
    });
    const beams = beam ? Vex.Beam.generateBeams(staveNotes) : [];
    const voice = new Vex.Voice({ num_beats: 4, beat_value: 4 }).setMode(Vex.Voice.Mode.SOFT);
    voice.addTickables(staveNotes);
    new Vex.Formatter().joinVoices([voice]).format([voice], width - (showClef ? 70 : 30) - (time ? 30 : 0));
    voice.draw(ctx, stave);
    beams.forEach((b) => b.setContext(ctx).draw());
  }

  const svg = el.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width + 20} ${height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '';
  svg.style.height = '';
  svg.classList.add('staff-svg');
  return svg;
}

/** Une seule note (lecture de notes). */
export function drawSingleNote(el, clef, key, { accidental = null, color = null, duration = 'w' } = {}) {
  return drawStaff(el, {
    clef,
    width: 200,
    notes: [{ keys: [key], duration, accidentals: [accidental], color }],
  });
}

/** Durées en temps → codes VexFlow. */
export const DUR = {
  4: 'w',
  3: 'hd',
  2: 'h',
  1.5: 'qd',
  1: 'q',
  0.5: '8',
  0.25: '16',
};

/**
 * Rythme (liste de durées en temps, négatives pour les silences) sur une mesure à 4/4.
 */
export function drawRhythm(el, pattern, { width = 320, time = '4/4' } = {}) {
  const notes = pattern.map((d) => {
    const rest = d < 0;
    const code = DUR[Math.abs(d)];
    const dotted = code.endsWith('d');
    const base = dotted ? code.slice(0, -1) : code;
    return { keys: [rest && base === 'w' ? 'd/5' : 'b/4'], duration: code + (rest ? 'r' : ''), dots: dotted };
  });
  return drawStaff(el, { notes, time, width, beam: true });
}
