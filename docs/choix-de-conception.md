# Mélodicus — choix de conception (v1)

Ce document répond aux « points à trancher » du [cahier des charges](cahier-des-charges.md) et résume les choix techniques. Chaque choix peut être changé facilement.

## Points à trancher

| Question | Choix retenu en v1 | Où le modifier |
|---|---|---|
| Nombre de profils | **Illimité** (grille de profils avec avatar et couleur). | — |
| Défi / compétition entre profils | **Volontairement évité** : aucun classement ni comparaison. Le mode chrono compare l'enfant uniquement à **son propre record**. | — |
| Niveau de départ | **Niveau 1 pour tout le monde**, mais le parent peut **débloquer n'importe quel niveau** dans l'espace parent (utile pour un enfant qui a déjà des bases). Pas de test de positionnement. | Espace parent |
| Rappels / notifications | **Pas de notifications.** La série de jours 🔥 est visible sur l'accueil et sur la carte de profil, avec des badges à 3, 7 et 30 jours. | — |

## Récompenses (sans « notes d'examen »)

- 1 à 3 étoiles par niveau (8, 9 ou 10 bonnes réponses sur 10) ; 8/10 débloque le niveau suivant.
- 15 badges (premiers pas, sans faute, séries, 100 / 500 notes lues, chaque clé terminée, rythme, oreille, guitare, explorateur…).
- Messages positifs, confettis ; en cas d'erreur, la bonne réponse est montrée et expliquée.
- Les éléments ratés (une note, un intervalle, un accord…) reviennent **plus souvent** : travail ciblé automatique.

## Choix techniques (budget nul)

| Besoin | Solution |
|---|---|
| Hébergement | Site statique : GitHub Pages (gratuit, HTTPS) ou Synology / Raspberry Pi. |
| Données | `localStorage` du navigateur + export / import JSON dans l'espace parent. Aucun compte, aucune donnée en ligne. |
| Portées | VexFlow 4.2.5 (MIT), copié dans `app/js/vendor` : pas de dépendance à un CDN. |
| Sons | Web Audio API : piano de synthèse (harmoniques), guitare par l'algorithme de Karplus-Strong, métronome. |
| Accordeur | Micro via `getUserMedia` + autocorrélation (algorithme ACF2+) : fiable sur une corde seule, testé à ±5 cents. Nécessite HTTPS. |
| Hors connexion | Service worker (`sw.js`) + manifeste : installable sur l'écran d'accueil de la tablette. |
| Qualité | Tests automatiques (`npm test`) lancés à chaque publication. |

## Hors périmètre v1 (conforme au cahier des charges)

- Pas de validation au micro d'une note chantée ou d'un accord joué (le module « changer d'accord » repose sur un bouton que l'enfant touche à chaque changement).
- Pas de compte professeur.

## Pistes d'évolution

- Validation au micro d'une **note seule** jouée à la guitare (la brique de détection existe déjà : `app/js/pitch.js`).
- Autres gammes (sol majeur, fa majeur), clé d'ut, mesures à 3/4.
- Synchronisation entre tablettes via le NAS (petit fichier JSON partagé).
