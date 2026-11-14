# Plan V4 « assembler » — progression

Source de vérité du plan de génération V4 (propriétaire + Claude Code). Mise à
jour à chaque étape, avec le commit qui la ferme. Règle : toute application de
preuve se génère **par l'interface**, déposée par le propriétaire.

**Global : ~67 %** ▓▓▓▓▓▓▓░░░ (le visuel, ajouté le 2026-11-14, n'était pas compté avant)

| # | Étape | Critère de sortie | État |
|---|---|---|---|
| V1 | Contrat (catalogue, validateur, consigne) | preuve à 0 $, défauts mesurés | ✅ |
| V2 | Graphe des routes depuis la lecture | 5 lectures réelles : 100 % des tables et des routes | ✅ |
| V3 | 13 archétypes et moteur de rendu | 156 captures, 5 états, juge vert | ✅ |
| V4.1 | Deux passes, relances, repli | passe A sans réflexion, cliquets | ✅ |
| V4.2 | Branchement et traduction | Hayine de bout en bout, juge vert | ✅ |
| V4.3a | Tir Hayine (interface) | coût ≤ 0,125 $, durée ≤ 140 s, couverture ≥ 0,8 | ✅ 0,056 $ · 100 s · 0,93 (`cdafe7d4`) |
| V4.3b | Corrections du tir 1 | re-jugement 0 refus à 390 et 1 280 px | ✅ `fd49fe11` |
| V4.3c | M13 : lecture stable — même cahier, même application | étape 1 : température 0 ; étape 2 : lecture gardée (option 1) | ✅ code fait (cliquets ⑨⑩⑪) — **prérequis propriétaire : coller `apps/web/supabase/sql/app_lectures.sql` dans l'éditeur SQL Supabase** ; sans la table, la lecture se fait comme avant |
| V4.3f | **Le visuel** : coque (menu latéral + en-tête au large, barre du bas à icônes au téléphone), Indicateur et Graphique **depuis les données réelles**, archétypes refaits (dashboard, accueil, gestion), état « pas encore de données » soigné, défauts visibles (« Connecté en tant que — », garde nue, libellés de barre) | captures 1 280 / 390 px posées à côté des références du propriétaire, juge 0 refus | 🟡 code fait (`7e511c42`) ; preuve publiée (captures à côté des références) — **jugement du propriétaire attendu** |
| V4.3d | **Kits de design** : un monde visuel **différent par application**, choisi d'après le cahier (secteur, couleurs nommées), contraste ≥ 4,5:1 | Hayine recompilé sous plusieurs kits, captures téléphone, 0 $ | ⬜ (proposition faite, contrastes mesurés) |
| V4.3e | Push + prévisualisation, puis tirs **par l'interface** : Hayine, école, pièces auto | même tableau, cibles tenues | ⬜ |
| V4.4 | Suppression de l'ancien code | plus aucun module exempté, gate binaire ; décision AIR | ⬜ |
| V4.5 | Fusion dans `main` et production | le propriétaire clique, dit oui | ⬜ |
| plus tard | Téléphone / WhatsApp lus dans le cahier, sur contact et légal | — | 🅿️ |

## Ordre décidé (2026-11-14)
M13 → visuel (V4.3f) → kits (V4.3d) → preuve 0 $ → tirs par l'interface (V4.3e) → suppression (V4.4) → fusion (V4.5).

## Journal
- 2026-11-14 · M13 étape 1 : `temperature: 0` sur la lecture du cahier. Hayine relu 3 fois : avant 8 / 10 / 7 tables ; après 6 / 6 / 6 identiques, 16 écrans et 4 rôles identiques ; colonnes encore variables (`montant_final` / `montant_total`…). 0,00363 $. Preuves : `docs/elite-protocol/evidence/generateur-2026-11-12/sortie/m13-hayine{,-t0}.json`.
- 2026-11-14 · M13 étape 2 : la première lecture réussie d'un cahier est gardée (table `app_lectures`, par compte, empreinte du texte + consigne + modèle + température) et réutilisée sans appel ; la ligne le dit (`gardee`). Table à poser par le propriétaire.
- 2026-11-14 · V4.3f code : contrat Indicateur / Graphique (calculés depuis les lignes réelles, composants de Deribfy), coque (menu latéral ≥ 840 px, barre à icônes et libellés courts au téléphone), tableau de bord (indicateurs, barres par mois, anneau par statut, derniers ajouts), accueil en grille de cartes, gestion avec compteurs, garde en carte, compte sans « — ».
