// Détection de hauteur d'une note unique (accordeur).
// Autocorrélation avec interpolation parabolique (algorithme « ACF2+ »),
// fiable pour une corde jouée seule. Module pur, testable sous Node.

/**
 * @param {Float32Array} buf échantillons temporels
 * @param {number} sampleRate
 * @returns {number} fréquence en Hz, ou -1 si le signal est trop faible / non périodique
 */
export function detectPitch(buf, sampleRate) {
  let size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return -1;

  // On retire les bords silencieux pour stabiliser la corrélation.
  const thres = 0.2 * maxAbs(buf);
  let r1 = 0;
  let r2 = size - 1;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
  }
  const b = buf.slice(r1, r2);
  size = b.length;

  const c = new Float32Array(size);
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let j = 0; j < size - lag; j++) sum += b[j] * b[j + lag];
    c[lag] = sum;
  }

  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;
  let maxVal = -Infinity;
  let maxPos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  }
  if (maxPos <= 0 || maxVal < c[0] * 0.3) return -1;

  // Interpolation parabolique autour du pic.
  let t0 = maxPos;
  const x1 = c[t0 - 1] ?? c[t0];
  const x2 = c[t0];
  const x3 = c[t0 + 1] ?? c[t0];
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) t0 = t0 - bb / (2 * a);
  return sampleRate / t0;
}

function maxAbs(buf) {
  let m = 0;
  for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
  return m;
}

/** Médiane glissante pour lisser l'affichage. */
export function median(values) {
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
