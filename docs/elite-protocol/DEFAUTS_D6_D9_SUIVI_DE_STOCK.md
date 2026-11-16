# D6 à D9 — « Suivi de stock » (4d480027), et pourquoi le juge n'a rien dit

- **Date :** 2026-11-16.
- **Œuvre :** `4d480027995e43f39ba1de323900fc1f`, « Suivi de stock », publiée sur `suivi.deribfy.app` : 2 tours, 256 s, 0,07 $, `monte_selon_le_juge = true`, `diagnostics = []`.
- **Test du propriétaire :** l'arithmétique est exacte dans tous les cas. Trois défauts d'affichage restent visibles à l'œil nu.
- **Source du code de l'œuvre :** la page servie par `https://suivi.deribfy.app/`, lue le 2026-11-16 (839 006 octets). Les fonctions citées ont été **extraites de cette page et exécutées** ; la base n'a pas été touchée.
- **Règle :** rien n'est déclaré réglé. La validation sera une nouvelle génération lancée par le propriétaire depuis l'interface. Rien n'est poussé.

---

## D6 — le lien `#gestion` casse dans l'aperçu

- **Observation :** dans l'aperçu de l'interface, « Espace de gestion » affiche « This page couldn't load » (message de Safari).
- **Cause, établie et mesurée** (`PLAN_TOURS_AU_TEMPS.md` §7) :
  - l'aperçu est une `iframe srcdoc` en `sandbox="allow-scripts"` (`Conversation.tsx:242-245`, `dashboard/page.tsx:715`, `CadreApercu.tsx:116-120`) ;
  - son URL de base est celle de la page Deribfy, donc `href="#gestion"` vise `deribfy.com/…#gestion` ;
  - le cadre ne peut pas charger cette adresse (`X-Frame-Options: SAMEORIGIN`).
- **Correction (`c89dbeac`) :** le prélude de `pageAutonome` (`boucle-directe.ts`, `PRELUDE`) ramène, **seulement dans un cadre srcdoc** (`location.protocol === "about:"`), un clic sur un lien `#ancre` dans le document, par `location.hash`.
  - Un lien que l'application gère elle-même (`preventDefault`) n'est pas repris.
  - Une page publiée n'est pas touchée.
  - Le correctif est placé dans la page, pas dans les trois cadres : les trois aperçus servent la même page.
- **Mesure, WebKit et Chromium**, sur une page réelle de `pageAutonome`, servie avec les mêmes en-têtes que Deribfy (`evidence/ancre-apercu/preuve-page.mjs.txt`) :

| | avec le correctif | sans |
|---|---|---|
| aperçu, clic sur « Espace de gestion » | URL `about:srcdoc#gestion`, « GESTION » | `…/dashboard#gestion`, cadre vide |
| aperçu, clic sur « Retour » (`href="#"`) | « ACCUEIL » | — |
| page autonome | `…/app#gestion`, « GESTION » | identique |

- **Garde dans le dépôt :** `d6-ancre-apercu.test.ts` vérifie que le correctif est **émis** dans la page. La preuve navigateur, elle, tourne hors de la gate (environ 7 s par navigateur) : **ce cliquet ne prouve pas que le correctif marche, seulement qu'il est présent.**
- **INCONNU :** Safari sur iPhone n'est pas testé ; WebKit pour ordinateur l'est.

## D7 — le graphique contredit le compteur à côté de lui

- **Observation :** « Mouvements ce mois : 3 », et à côté, « Mouvements par mois : Pas encore de données ». Les trois mouvements sont datés du 2026-11-16.
- **a) Les deux sources, dans le code servi :**
  - **le compteur** (`App`) : `mouvementsCeMois = mouvements.filter(m => mois et année de m.date = maintenant).length` ;
  - **le graphique** (`Accueil`) : `mouvementParMois = parMois(mouvements, "date", "quantite")`, passé à `Barres` ;
  - **elles divergent dans l'appel :** `parMois(elements, champ, nombre = 6)` (`bibliotheque-ui.ts`) prend en 3ᵉ argument un **nombre de mois**. `"quantite"` y est donc un nombre de mois : `"quantite" - 1 = NaN`, la boucle ne tourne pas, et la série est vide.
  - **Exécuté** (fonctions extraites de la page) : `parMois(mv, "date", "quantite") = []`. Le modèle voulait `sommeParMois(elements, champDate, champMontant)`, absente du code servi parce que non appelée.
- **b) Est-ce systématique ? OUI, la consigne y pousse.**
  - Elle nommait ces fonctions **sans leurs arguments** : « `./systeme/donnees : parMois, parJour, sommeParMois, compterPar…` ».
  - Elle prescrivait « une date → Courbe/Barres(parMois) » (consigne rendue, lignes 200 et 207).
  - Rien ne disait au modèle que le 3ᵉ argument est un nombre. C'est la même famille que L4 : des noms sans leurs formes.
- **c) Combien d'œuvres déjà générées : INCONNU.** Je ne lance pas de requête en production. Celle-ci, en lecture seule, est prête et essayée sur une table factice : elle repère le défaut, laisse passer l'appel correct et ignore `systeme/`.
  ```sql
  select g.moteur, g.statut,
         count(distinct g.id) as oeuvres_avec_fichiers,
         count(distinct g.id) filter (where f.value ~ 'parMois\(\s*[^,()]+,\s*[^,()]+,\s*[''"]') as d7_parmois_champ_en_3e,
         count(distinct g.id) filter (where f.value ~ 'compterPar\(\s*[^,()]+,\s*[''"][^''"]+[''"]\s*\)') as d8_compterpar_sans_libelles,
         count(distinct g.id) filter (where f.value ~ '[''"]succes[''"]\s*:\s*[''"]alerte[''"]') as d9_succes_sinon_alerte
  from public.app_generations g,
       jsonb_each_text(case when jsonb_typeof(g.document->'fichiers') = 'object'
                            then g.document->'fichiers' else '{}'::jsonb end) as f
  where f.key not like 'systeme/%'
  group by 1, 2
  order by 1, 2;
  ```
  **Limite :** ce sont des motifs de texte. Un troisième argument passé par une variable n'est pas détecté. C'est une borne inférieure.
- **d) Correction (`8e51a29b`), dans le générateur :**
  1. **Prévention.** La consigne donne les **signatures exactes**, lues dans `systeme/donnees` (`fonctionsDonneesEnumerees`, `bibliotheque-ui.ts`), par exemple `parMois(elements, champ, nombre = 6) · sommeParMois(elements, champDate, champMontant, nombre = 6) · compterPar(elements, champ, libelles)…`, plus « Un COMPTE par mois : parMois ; une SOMME par mois : sommeParMois ».
  2. **Détection.** `parMois`, `parJour` et `sommeParMois` rejettent un nombre de périodes non entier par une erreur **nommée** : « parMois(elements, champDate, nombre) : le dernier argument est un NOMBRE de périodes, reçu « quantite ». Pour une SOMME par mois : sommeParMois(…) ». Le juge d'exécution la voit **même sur une œuvre sans données** (`d7-donnees-signatures.test.ts` ②, vrai assembleur et vrai juge). Avant, c'était un vide muet.
- **INCONNU :** si le modèle suivra les signatures. Seule une génération le dira.

## D8 — des valeurs brutes à l'écran

- **Observation :** « Entree » dans la légende de « Types de mouvements », « succes » sur les badges ; « Entrée » correct dans le tableau.
- **Mesure :**
  - `typesMouvements = compterPar(mouvements, "type")`. Exécuté : `[{"libelle":"sortie","valeur":2},{"libelle":"entree","valeur":1}]` ;
  - avec le 3ᵉ argument : `compterPar(mv, "type", {entree:"Entrée", sortie:"Sortie"})` donne `[{"libelle":"Sortie",…},{"libelle":"Entrée",…}]` ;
  - le tableau, lui, est écrit à la main (`m.type === "entree" ? "Entrée" : "Sortie"`) : d'où la différence d'un endroit à l'autre.
- **La consigne demandait-elle des libellés lisibles ? NON.** Aucune occurrence de « lisible », de « libellé » pour une valeur, ni de la forme à trois arguments de `compterPar` dans la consigne rendue avant correction. Il n'y avait rien à suivre.
- **Correction (`8e51a29b`) :** « CE QUI S'AFFICHE EST LISIBLE. Une valeur brute de la base (« entree ») ne va jamais à l'écran : `compterPar(l, 'type', { entree: 'Entrée' })`, le même mot partout. » La signature de `compterPar` montre maintenant `libelles`.
- **INCONNU :** l'effet réel.

## D9 — un badge « alerte » sur toute sortie

- **Tranché par la lecture du code servi :** `genre: m.type === "entree" ? "succes" : "alerte"`. **Le badge ne dépend pas du stock résultant** : il dépend du seul type. **D9 n'est pas un PASS : c'est un mensonge affiché.**
- **Pourquoi « succes » et « alerte » s'affichent comme des mots :** `ListeRecente` affiche `e.genre` tel quel, dans une pastille neutre (`bibliotheque-ui.ts`, `{e.genre !== undefined && <Pastille ton="neutre">{e.genre}</Pastille>}`). Le modèle a pris `genre` pour un **ton**, le vocabulaire de `Pastille` étant `'succes' | 'alerte' | 'danger' | 'neutre'`. Rien ne lui disait que `genre` s'affiche.
- **Correction (`8e51a29b`) :** « Le genre d'un élément de ListeRecente S'AFFICHE : un mot lisible, jamais un ton (« succes », « alerte »). Une alerte ne se montre que si le métier l'établit (stock à zéro), jamais par type. »
- **Non corrigé :** le nom ambigu `genre` dans la bibliothèque. Le renommer changerait le contrat des pièces ; c'est hors de cette mission.

## La question qui vaut les trois autres : pourquoi `diagnostics = []` ?

### a) Lequel des quatre juges serait censé l'attraper ? Aucun n'est conçu pour cela.

| Juge | Ce qu'il mesure | Pourquoi pas ici |
|---|---|---|
| `juge-execution` | l'œuvre se monte, ses erreurs, les écrans atteints en cliquant, les contrôles sans nom | il lit des **erreurs** et des **textes**, jamais la **cohérence** entre deux valeurs. Et il monte l'œuvre **sans données** (base vide, `url: ''`, `juge-execution-enfant.mjs`, D1) : sur des tableaux vides, compteur « 0 » et graphique « Pas encore de données » sont **cohérents**. La contradiction n'existe qu'avec des données. |
| `juge-faces` | quelles tables la face publique lit sans session ; le refus confondu avec le vide | il a des données (base simulée, régime `temoin`, `juge-faces-enfant.mjs`), mais il **ne compare aucune valeur**, et il monte sans session : le tableau de bord de gestion lui est inaccessible. |
| `juge-contrat` | les noms de réglages des pièces (premier niveau) | statique : il voit `parMois(...)` comme du code, pas comme un appel mal formé. Et ce n'est pas une prop JSX. |
| `juge-couverture` | les mots de la demande présents sur les écrans atteints | des mots, pas des valeurs. |

### b) Pourquoi aucun ne l'a fait : cité ci-dessus

Aucun ne compare deux valeurs affichées, et celui qui exécute ne voit aucune donnée.

### c) Hors de portée, ou comblable ? Réponse franche, par défaut

- **D7, l'appel mal formé : COMBLABLE, et désormais détecté** — par la bibliothèque, pas par le juge. L'erreur nommée de `parMois` rend le défaut visible au juge d'exécution sans aucune donnée. Ce n'est pas une correction du juge, et elle ne couvre que **les mauvais arguments de nos fonctions**, pas toute contradiction.
- **D8, une valeur brute à l'écran : COMBLABLE EN PARTIE.** Si le juge d'exécution montait l'œuvre avec des lignes de démonstration dont les valeurs d'énumération sont connues (déclarées dans les entités), il pourrait signaler une valeur brute (« entree ») trouvée dans le texte rendu. Ce n'est pas fait.
- **D9, et une contradiction en général** (« ce badge ment », « ce graphique contredit ce compteur ») : **HORS DE PORTÉE de l'architecture actuelle.** Il faut savoir que « Mouvements ce mois » et « Mouvements par mois » parlent de la même chose, et qu'une alerte suppose un seuil métier. Ce sont des jugements de **sens**. Aucun juge actuel ne lit le sens, et des seuils écrits en dur ne s'appliqueraient qu'à des cas connus d'avance.
- **Conséquence à ne pas oublier :** `diagnostics = []` veut dire « aucun défaut **de ceux que nos juges savent voir** ». Ce n'est pas « l'application est juste ».

### d) Le juge n'est pas modifié dans cette mission

Seule la bibliothèque l'est : erreur nommée, D7.

---

## Ce qui a été modifié dans le générateur

| Commit | Fichier | Changement |
|---|---|---|
| `c89dbeac` | `lib/apps/boucle-directe.ts` (`PRELUDE` de `pageAutonome`) | D6 : lien `#ancre` ramené dans le document, dans un cadre srcdoc seulement |
| `8e51a29b` | `lib/apps/bibliotheque-ui.ts` (consigne) | D7, D8, D9 : signatures des fonctions de données, et règle des libellés lisibles et des alertes |
| `8e51a29b` | `lib/apps/bibliotheque-ui.ts` (`systeme/donnees`) | D7 : `parMois`, `parJour` et `sommeParMois` rejettent un nombre de périodes non entier par une erreur nommée |
| `8e51a29b` | `__tests__/ep319-entites-declarees.test.ts` | trois plafonds de taille relevés avec leur mesure (+749 signes) |

Tests ajoutés : `d6-ancre-apercu.test.ts`, `d7-donnees-signatures.test.ts`. Chacun échoue sur le code d'avant.

## Ce qui est laissé intact

- **Les quatre juges :** `juge-execution`, `juge-faces`, `juge-contrat`, `juge-couverture`.
- **L'œuvre 4d480027 elle-même,** et toute œuvre déjà générée. Elles gardent leur copie de la bibliothèque.
- **La décision 3,** le type d'application.
- **Le nom `genre`** dans `ListeRecente`.
- **Les chantiers à part.**

## Ce qui reste INCONNU

- **Si le modèle suivra les signatures et la règle des libellés :** seule une génération par l'interface le dira.
- **Le nombre d'œuvres déjà touchées par D7, D8 et D9 :** la requête est prête et n'a pas été lancée.
- **D6 sur Safari pour iPhone.**
