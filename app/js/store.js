// Stockage local (navigateur) des profils : aucune donnée n'est envoyée sur Internet.
import { newProfile } from './progress.js';

const KEY = 'melodicus.v1';

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.profiles)) return data;
    }
  } catch (e) {
    console.warn('Lecture des données impossible', e);
  }
  return { version: 1, profiles: [], currentId: null, parentPin: null };
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Sauvegarde impossible', e);
  }
}

export const profiles = () => state.profiles;

export function current() {
  return state.profiles.find((p) => p.id === state.currentId) || null;
}

export function select(id) {
  state.currentId = id;
  save();
}

export function create(name, avatar, color) {
  const p = newProfile(name, avatar, color);
  state.profiles.push(p);
  state.currentId = p.id;
  save();
  return p;
}

export function remove(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (state.currentId === id) state.currentId = null;
  save();
}

export function getProfile(id) {
  return state.profiles.find((p) => p.id === id) || null;
}

export function exportJson() {
  return JSON.stringify(state, null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.profiles)) throw new Error('Fichier non reconnu');
  state = { version: 1, currentId: null, parentPin: null, ...data };
  save();
}
