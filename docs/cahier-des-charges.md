# Cahier des charges — Mélodicus (application de lecture de notes, solfège, oreille)

## 1. Contexte et objectifs

Application web dédiée, indépendante des autres projets, destinée à faire travailler aux enfants :
- la **lecture de notes** en clé de sol et en clé de fa,
- le **solfège élémentaire** (rythme, valeurs de notes, altérations, silences),
- l'**oreille musicale** (intervalles, hauteur, dictées simples).

Objectif : un outil ludique et progressif, utilisable en autonomie par les enfants, pour compléter (et non remplacer) l'apprentissage avec un professeur ou une école de musique.

## 2. Public cible

- Enfants, niveaux débutant à intermédiaire (pas de prérequis).
- Plusieurs enfants possibles → **profils individuels** avec progression propre, niveau et statistiques séparés.
- Interface simple, grands boutons, peu de texte, adaptée à un jeune lecteur.

## 3. Plateforme

- **Web uniquement** (pas de version mobile native dans un premier temps).
- Responsive pour un usage confortable sur tablette (position d'usage la plus probable pour un enfant).

## 4. Fonctionnalités

### 4.1 Lecture de notes
- Module **clé de sol** et module **clé de fa**, indépendants.
- Affichage d'une note sur une portée ; l'enfant répond en cliquant sur la touche d'un clavier virtuel, ou en sélectionnant le nom de la note (do, ré, mi…).
- Difficulté progressive : ambitus restreint autour de la note de référence au départ, puis élargissement (lignes/interlignes, notes au-dessus/en dessous de la portée).
- Mode chronométré (jeu d'entraînement rapide) et mode libre (sans pression de temps).
- Mode mixte clé de sol + clé de fa une fois les deux clés acquises séparément.

### 4.2 Solfège élémentaire
- Reconnaissance des **valeurs de notes** (ronde, blanche, noire, croche, double-croche) et des silences correspondants.
- Exercices de **rythme** : frapper/taper un tempo affiché ou entendu, reconnaître une formule rythmique.
- **Altérations** : dièse, bémol, bécarre — reconnaissance visuelle et effet sur la note.
- Notions de base : gammes simples (do majeur pour commencer), position des notes sur le clavier.

### 4.3 Oreille musicale
- Reconnaissance **plus aigu / plus grave** (deux notes jouées, l'enfant indique laquelle est la plus haute).
- Reconnaissance d'**intervalles** simples (seconde, tierce, quarte, quinte, octave), progressivement.
- **Dictées mélodiques courtes** : une courte suite de notes jouée, l'enfant la reproduit ou la retranscrit.
- Reconnaissance accord majeur / mineur en version simplifiée (étape plus avancée).

### 4.4 Progression et suivi
- Système de **niveaux** par module (lecture clé de sol, clé de fa, rythme, oreille…), progression indépendante par module.
- **Historique de performance** : taux de réussite, temps de réponse, notes/erreurs récurrentes pour cibler le travail.
- Système de récompense adapté aux enfants : badges, streaks (jours consécutifs), déblocage de niveaux ou de contenus bonus — pas de points bruts façon examen.
- Espace parent (optionnel) : vue consolidée par enfant pour suivre la progression sans passer par le compte enfant.

### 4.5 Son
- Synthèse ou échantillons sonores pour jouer les notes (piano de référence).
- Clavier virtuel cliquable qui joue le son de la note en même temps que l'affichage visuel.

### 4.6 Module accords guitare
- Priorité v1 : **reconnaissance** des accords (nom, diagramme, son), pas de validation du jeu réel à l'instrument (qui reste une évolution possible, cf. §7).
- Module dédié, activable par instrument (pensé pour un enfant jouant de la guitare, extensible à d'autres instruments plus tard).
- **Diagrammes d'accords** : affichage du grip (position des doigts sur le manche) pour les accords ouverts courants (do, ré, mi, fa, sol, la, si, et leurs mineurs).
- Association **nom d'accord ↔ diagramme ↔ son** : l'enfant entend l'accord joué et doit retrouver le nom ou le diagramme correspondant, et inversement.
- Reconnaissance à l'oreille **accord majeur / mineur** en version guitare (couleur sonore caractéristique), en lien avec le module oreille musicale (§4.3).
- Exercice de **changement d'accord** : enchaînement de deux accords affichés, chronométré, pour travailler la fluidité des transitions (sans analyse du son réellement joué — pas de micro en v1, cf. §5).
- Progression dédiée : accords ouverts de base d'abord, puis accords barrés dans une étape ultérieure.
- Lien optionnel avec le module lecture de notes : une portée simple indiquant les notes qui composent l'accord, pour faire le pont entre lecture de notes et jeu de l'instrument.

### 4.7 Accordeur guitare / ukulélé
- Accordeur chromatique simple utilisant le micro (détection de hauteur sur une corde jouée seule — cas d'usage fiable pour la détection de pitch, contrairement à un accord complet, cf. §6).
- Sélection de l'instrument (guitare 6 cordes, ukulélé) → affichage des notes cibles correspondantes (mi-la-ré-sol-si-mi pour la guitare standard, sol-do-mi-la pour le ukulélé).
- Indicateur visuel simple (trop grave / juste / trop aigu) par corde, avec nom de la corde affiché.
- Fonctionne indépendamment des autres modules (utilisable même sans être connecté à un profil enfant, pour un accordage rapide avant de jouer).

## 5. Hors périmètre (v1)

- Pas de version mobile native.
- Pas de reconnaissance de voix/instrument en temps réel (micro) dans un premier temps — pourrait être envisagé plus tard pour valider un chant ou une note jouée à l'instrument.
- Pas de contenu théorique avancé (harmonie, analyse) — appli centrée sur les bases.
- Pas de compte professeur / usage classe entière en v1 (reste envisageable en évolution future).

## 6. Contraintes techniques et de développement

- Développement en solo, budget quasi nul (cohérent avec les autres projets perso — appli tâches/ménage, appli scolarité).
- Techno web légère, pas de dépendance à un backend coûteux (hébergement simple, données stockées localement ou sur l'infrastructure déjà existante à la maison — Synology/Raspberry Pi).
- Assets sonores : privilégier des banques de sons libres de droits (piano échantillonné) ou synthèse via Web Audio API pour rester à budget nul.
- Rendu de portée musicale : bibliothèque JS de notation existante (ex. VexFlow ou équivalent) plutôt que développement d'un moteur de gravure maison.
- Accès micro (accordeur, futures dictées avec validation audio) : nécessite HTTPS même en hébergement local (certificat auto-signé ou tunnel suffisant) ; détection de hauteur sur note unique via bibliothèque JS de pitch detection (fiable), à distinguer de la détection d'accord complet (plus complexe, cf. évolutions possibles).

## 7. Évolutions possibles (hors v1)

- Détection d'un accord complet joué à la guitare (validation en temps réel du jeu de l'enfant) — techniquement plus complexe qu'une note unique, à traiter comme sous-projet à part si retenu.
- Extension du module accords/accordeur à d'autres instruments (piano, violon...).
- Compte professeur / usage en petit groupe.

## 8. Points à trancher avant développement

- Nombre de profils enfants à prévoir dès la v1 (1, 2, illimité ?).
- Faut-il un mode « défi » ou compétition entre profils (frère/sœur), ou volontairement évité pour ne pas créer de comparaison anxiogène ?
- Niveau de difficulté de départ : faut-il un test de positionnement initial, ou démarrage systématique au niveau 1 ?
- Fréquence et forme des rappels/notifications pour encourager la régularité (streak) — souhaité ou pas du tout ?

---

*Document de travail — à affiner avant le lancement du développement.*
