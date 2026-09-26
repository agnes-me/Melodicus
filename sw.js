// Service worker : met l'application en cache pour qu'elle fonctionne hors connexion.
const VERSION = 'melodicus-v1';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/vendor/vexflow.js',
  'js/app.js',
  'js/audio.js',
  'js/guitar.js',
  'js/music.js',
  'js/pitch.js',
  'js/progress.js',
  'js/staff.js',
  'js/store.js',
  'js/tuner.js',
  'js/ui.js',
  'js/exercises/index.js',
  'js/exercises/lecture.js',
  'js/exercises/solfege.js',
  'js/exercises/oreille.js',
  'js/exercises/guitare.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache en secours (hors connexion).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && new URL(event.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
