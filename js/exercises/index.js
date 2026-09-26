// Catalogue des modules et exercices.
import lecture from './lecture.js';
import solfege from './solfege.js';
import oreille from './oreille.js';
import guitare from './guitare.js';

export const MODULES = [
  { id: 'lecture', icon: '🎼', title: 'Lecture de notes', desc: 'Clé de sol, clé de fa', color: '#7c5cff' },
  { id: 'solfege', icon: '🎶', title: 'Solfège', desc: 'Rythme, valeurs, altérations', color: '#ff8a3d' },
  { id: 'oreille', icon: '👂', title: 'Oreille musicale', desc: 'Écouter et reconnaître', color: '#1bb3a6' },
  { id: 'guitare', icon: '🎸', title: 'Guitare', desc: 'Les accords', color: '#e0457b', instrument: 'guitar' },
];

export const EXERCISES = [...lecture, ...solfege, ...oreille, ...guitare];

export const exerciseById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const exercisesOf = (moduleId) => EXERCISES.filter((e) => e.module === moduleId);
