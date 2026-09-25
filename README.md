# 🎵 Mélodicus

Application web pour apprendre aux enfants la **lecture de notes** (clé de sol, clé de fa), le **solfège élémentaire**, l'**oreille musicale** et les **accords de guitare**, avec un **accordeur** guitare / ukulélé.

- **Coût : 0 €** — site 100 % statique, aucun serveur, aucune base de données, aucun abonnement.
- **Données privées** — les profils et la progression restent dans le navigateur de la tablette (export / import possible).
- **Fonctionne hors connexion** une fois ouverte une première fois (application installable, « PWA »).
- **Sons générés par le navigateur** (Web Audio API) : aucun fichier audio à acheter ou héberger.
- Portées dessinées avec [VexFlow](https://www.vexflow.com) (libre, licence MIT), inclus dans le dépôt.

## Contenu

| Module | Exercices |
|---|---|
| 🎼 Lecture de notes | Clé de sol (5 niveaux), clé de fa (5 niveaux), les deux clés mélangées (débloqué après le niveau 2 de chaque clé). Réponse par le nom de la note ou au clavier. Mode libre ou chrono (1 minute). |
| 🎶 Solfège | Valeurs des notes et silences, reconnaître un rythme, frapper un rythme (tambour à taper en mesure), dièse / bémol / bécarre, clavier et gamme de do. |
| 👂 Oreille musicale | Ça monte ou ça descend ?, intervalles (seconde → octave), petites dictées mélodiques, majeur ou mineur. |
| 🎸 Guitare *(activable par profil)* | Nom ↔ diagramme, accords à l'oreille, majeur/mineur à la guitare, changements d'accords chronométrés, page « Mes accords » (diagramme + son + notes sur la portée). |
| 🎤 Accordeur | Guitare (mi-la-ré-sol-si-mi) et ukulélé (sol-do-mi-la), aiguille trop grave / juste / trop aigu, accessible sans profil. |

**Progression** : chaque exercice a des niveaux ; 8 bonnes réponses sur 10 débloquent le niveau suivant (1 à 3 étoiles). Les questions ratées reviennent plus souvent. Badges, série de jours consécutifs 🔥, records personnels en mode chrono.

**Espace parent** (protégé par une petite multiplication) : série, jours de pratique, activité sur 14 jours, réussite et temps de réponse par exercice, erreurs fréquentes, dernières parties, déblocage manuel de niveaux, sauvegarde / restauration.

## Utiliser l'application

### Option 1 — GitHub Pages (gratuit, recommandé)

1. Fusionner le code sur la branche `main`.
2. Dans le dépôt GitHub : **Settings → Pages → Source : GitHub Actions**.
3. À chaque mise à jour de `main`, les tests sont lancés puis le site est publié à l'adresse `https://<compte>.github.io/<dépôt>/`.
4. Sur la tablette, ouvrir cette adresse puis **« Ajouter à l'écran d'accueil »**.

> ℹ️ GitHub Pages est gratuit pour les dépôts **publics**. Pour un dépôt privé, il faut un compte payant : dans ce cas, utiliser l'option 2 ou un autre hébergeur statique gratuit (Cloudflare Pages, Netlify) en pointant sur le dossier `app/`.

### Option 2 — Synology / Raspberry Pi à la maison

Copier le contenu du dossier `app/` dans un dossier web :

- **Synology** : paquet *Web Station*, dossier `web/melodicus`.
- **Raspberry Pi** : `sudo apt install nginx` puis copier `app/` dans `/var/www/html/melodicus`.

⚠️ L'**accordeur** utilise le micro, ce que les navigateurs n'autorisent qu'en **HTTPS** (ou sur `localhost`). Sur Synology, activer HTTPS (certificat Let's Encrypt gratuit via DSM, ou certificat auto-signé). Tout le reste fonctionne aussi en HTTP simple.

### Option 3 — Sur l'ordinateur, pour essayer

```bash
npm start          # puis ouvrir http://localhost:8080
```

(Il faut Node.js ; aucune dépendance à installer.)

## Développement

```
app/                 le site publié
  index.html
  css/style.css
  js/app.js          navigation, écrans, moteur de jeu, espace parent
  js/exercises/      un fichier par module (lecture, solfège, oreille, guitare)
  js/music.js        théorie : notes, fréquences
  js/progress.js     niveaux, étoiles, badges, séries, choix des questions
  js/audio.js        sons (piano de synthèse, guitare Karplus-Strong, métronome)
  js/pitch.js        détection de hauteur (accordeur)
  js/tuner.js        écran accordeur
  js/guitar.js       accords et diagrammes
  js/staff.js        portées (VexFlow)
  js/store.js        sauvegarde locale (localStorage)
  js/vendor/         VexFlow 4.2.5 (MIT)
  sw.js              cache hors connexion
tests/               tests automatiques (node --test, sans dépendance)
docs/                cahier des charges et choix de conception
```

```bash
npm test
```

Pour ajouter un exercice : créer un objet `{ id, module, title, levels, question(ctx) }` dans le fichier du module (voir les exemples) ; il apparaît automatiquement dans le menu, la progression et l'espace parent. Penser à ajouter tout nouveau fichier JS à la liste de `app/sw.js` et à changer `VERSION` pour forcer la mise à jour du cache.

Voir aussi [docs/choix-de-conception.md](docs/choix-de-conception.md).
