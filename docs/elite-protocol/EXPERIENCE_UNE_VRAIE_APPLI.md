# Expérience — obtenir UNE application qui marche vraiment

- **Ouverte :** 2026-11-16, sur instruction du propriétaire. Elle passe avant tous les autres chantiers.
- **Objectif :** une seule application qui marche. Le critère n'est **pas** le juge : c'est le propriétaire qui ouvre l'application et vérifie :
  1. une dépense ajoutée apparaît dans la liste ;
  2. le total du mois se met à jour ;
  3. après fermeture et réouverture, elle est toujours là ;
  4. rien ne plante, aucun écran ne manque.
- **Demande :** le carnet de dépenses du 16 novembre (œuvre `ef085fa7`), mot pour mot.
- **Statut :** TIR 1 ARRÊTÉ au tour 4 (2026-11-16, 13:23 UTC) sur une impasse du juge, prouvée hors ligne (§5.2). Coût : 0,0927 $ mesuré pour 3 appels, plus le 4ᵉ appel interrompu (non mesuré, au plus ≈ 0,04 $). Option A choisie par le propriétaire pour la persistance (§3).

---

## 1. Le montage [LU-CODE + ESSAI À BLANC]

- **Hors dépôt, hors Vercel.** Le script et sa configuration vivent dans le scratchpad de la session (`vraie-appli/experience.test.ts`, `vitest.experience.config.mjs`). Aucune ligne du dépôt n'est modifiée, rien n'est poussé, rien n'écrit en base.
- **La vraie boucle :** `boucleEcriture` (`boucle-directe.ts:325`), avec les vrais juges (exécution, faces, couverture, persistance, etc.), le vrai assembleur et le vrai appel DeepSeek (`appelerFournisseur`, `fournisseur.ts:230`, modèle `deepseek-v4-pro`).
- **La limite de tours est levée sans toucher au code :** `boucleEcriture` accepte `toursMax` en paramètre (`boucle-directe.ts:329`, `:371`). La route ne le passe jamais ; le montage le passe (25 par défaut). La modification est donc locale **par construction**.
- **Ce qui est mesuré, par appel :** rang, durée de l'appel au modèle **seul** (ce que la production ne mesure pas, `ENQUETE_TOURS_ET_DUREES.md` §0.3), jetons d'entrée et de sortie, troncature, pointe ou creuse, coût au tarif de l'heure (`tarifDe`, `fournisseur.ts:134`), cumul, et le motif exact renvoyé au modèle. Chaque réponse brute est conservée.
- **Le plafond de coût :** avant chaque appel, si le cumul a atteint le plafond (1 USD au départ), le montage **s'arrête et attend** un accord écrit, sans perdre le travail en cours.
- **Essai à blanc (réponse fixe, aucun réseau, 2 tours) :** il passe. Le vrai assembleur et le vrai juge ont tourné, et le juge de vivacité a renvoyé au tour 2 un vrai reproche (« DES CONTRÔLES MORTS — … `<button type="button">` »). Les 5 lignes du journal sont écrites.

## 2. Ce qu'il manque pour lancer : les entrées exactes du carnet

La boucle reçoit la demande, la configuration et les **tables déclarées** (`route.ts:575-590`). Les tables changent la consigne : avec des tables, le « bloc base » remplace la règle 6 (`boucle-directe.ts:320-323`, `entites-declarees.ts:362`). Sans les mêmes tables, ce ne serait pas la même expérience.

Elles sont dans la ligne de l'œuvre : `document.entites` et `document.configuration` (`route.ts:846-872`). **Réserve :** `document.entites` est la liste **après** la boucle (`route.ts:655`). Elle peut contenir des tables que le modèle a déclarées en cours de route, en plus de celles qu'il a reçues. C'est la meilleure approximation stockée des entrées.

## 3. Ce que l'aperçu local ne peut pas prouver : la persistance [LU-CODE]

Une application à tables lit et écrit dans une vraie base Supabase (`entites-declarees.ts:375-378`). Sans adresse de base, en aperçu, elle tourne « ENTIÈREMENT en mémoire » par consigne (`:367-370`), et une donnée saisie disparaît à la fermeture. Le critère 3 exige donc une base. Décision du propriétaire en attente.

## 4. Coût : l'historique grandit à chaque tour [LU-CODE]

Chaque tour renvoie au modèle la demande, **toutes** ses réponses précédentes (chacune contient l'application entière) et tous les motifs (`boucle-directe.ts:381-383`, `:736-737`). Les jetons d'entrée, et donc le coût d'un tour, augmentent à chaque tour. L'estimation de 0,06 USD par tour vaut pour les premiers tours, pas pour le 15ᵉ. Le journal mesurera la croissance réelle.

## 5. Journal des tours

**Entrées (requête du propriétaire, 2026-11-16) :** la demande mot pour mot ; une table `depense` (date `date`, libelle `text`, montant `decimal`) ; configuration `currency XAF`, `nom_produit carnet de dépenses`, `encaissement aucun`. *Réserve :* ces tables sont celles d'après la boucle de production (`route.ts:655`) ; c'est la meilleure approximation stockée.

### 5.1 Tir 1 — 13:17 UTC, heure creuse, limite 25 tours [MESURÉ]

| tour | modèle (s) | jetons entrée | jetons sortie | tronqué | coût | cumul | motif renvoyé au tour suivant |
|---|---|---|---|---|---|---|---|
| 1 | 207 | 4 517 | 17 501 | non | 0,0376 | 0,0376 | L'APPLICATION NE SE MONTE PAS — « reading 'url' » à l'import |
| 2 | 65 | 11 915 | 8 547 | non | 0,0248 | 0,0624 | contrôle sans nom lisible + « depense » lue sans connexion : déclare-la `lecturePublique` |
| 3 | 74 | 19 135 | 8 901 | non | 0,0303 | 0,0927 | **identique au mot près** au précédent |
| 4 | interrompu | — | — | — | — | — | — |

Sources : `scratchpad/vraie-appli/tir1/journal.jsonl`, réponses brutes `tir1/reponses/appel-0N.txt`.

**Contexte envoyé (hypothèse du propriétaire) :** +7 400 puis +7 200 jetons d'entrée par tour, soit la réponse précédente entière plus le motif. La croissance est confirmée. **L'hypothèse du propriétaire (le modèle se noie dans son historique) n'est pas vérifiée à ce stade :** le tour 2 a bien corrigé le reproche du tour 1, malgré +7 300 jetons. Ce qui a bloqué ensuite est autre chose (§5.2). La taille du contexte et la qualité restent mesurées tour par tour ; si une dégradation apparaît après le tour 5 ou 6, le levier suivant sera un tour sans historique accumulé.

### 5.2 Deux défauts de l'instrument, trouvés en route [LU-CODE + REJOUÉ HORS LIGNE, gratuit]

**D1 · Le juge d'exécution ne définit pas `window.DERIBFY_BASE`.**
- La consigne prescrit, pour une œuvre à tables, `const b = window.DERIBFY_BASE … b.url` (`entites-declarees.ts:375-378`).
- La vraie page le définit toujours (`boucle-directe.ts:1114`, `:1150-1159`), de même que le juge des faces (`juge-faces-enfant.mjs:147`).
- Le simulateur du juge d'exécution ne le définit **jamais** (`grep DERIBFY_BASE` : 0 occurrence dans `juge-execution-enfant.mjs`).
- Résultat : le code écrit selon la consigne est déclaré « ne se monte pas » (tour 1). Le modèle a contourné au tour 2 (`?? { url: '' … }`). C'est un tour payé pour un défaut de l'instrument.
- Il est **non établi** que ce soit la cause du « ne se monte pas » du carnet de production : son motif est tronqué dans R11.

**D2 · Le reproche « déclare-la publique » est impossible à satisfaire.**
- Le modèle a rendu `DONNEES.json` avec `"lecturePublique": true` dès le tour 2, et au tour 3 encore.
- Rejoué hors ligne avec les vraies fonctions (`lireDeclarationEnRoute`, `fusionnerEntites`, contrat `projectAirSchema`) sur la réponse du tour 3 : **`DECLARATION [] REFUS [{"quoi":"depense","motif":"forme refusée par le contrat de données"}]`**. La déclaration est jetée en entier.
- **Cause :** le contrat exige un `id` par table et par champ (`air-schema/src/air.ts:606-607`, `fieldSchema` strict). Or le gabarit que la consigne enseigne au modèle n'en porte pas (`boucle-directe.ts:93`, `[{"name":"chose","fields":[{"name":"champ",…}]}]`). Le modèle a aussi écrit `date: text` et `montant: number` à la place des types du cahier.
- **Et le refus n'est jamais dit au modèle :** `refusEnRoute` est accumulé (`boucle-directe.ts:408-415`) mais n'entre dans **aucun** reproche. Il ne sort qu'à l'acceptation (`:703`).
- Résultat : le juge des faces redemande la déclaration, le modèle la refait, elle est rejetée en silence. Le motif devient **identique mot pour mot** au tour 4. Aucun nombre de tours n'en sort : la boucle aurait tourné jusqu'à 25 et livré au dernier tour.
- **Une question de fond, consignée sans réponse :** pour un carnet de dépenses **personnel**, sans comptes, le juge exige que les dépenses soient lisibles par tout visiteur. Que ce soit souhaitable est une décision du propriétaire.

**Pourquoi le tir a été arrêté :** à partir du tour 3, le motif est identique et la cause est prouvée déterministe. Continuer aurait coûté sans rien apprendre ; c'est la règle de ce chantier.

## 6. Leviers essayés

| # | Levier | Pourquoi | Effet mesuré |
|---|---|---|---|
| 0 | Limite de tours levée (`toursMax` = 25) | les tours corrigent : 9 œuvres refusées au tour 1 ont été acceptées sans reproche au tour 2 (T3, `ENQUETE_TOURS_ET_DUREES.md`) | — |

### 5.3 Tir 2 — leviers L1 et L2b (validés par le propriétaire, 2026-11-16)

- **L1, dans le montage seulement :** le juge d'exécution reçoit `window.DERIBFY_BASE` vide, comme la vraie page (`experience.test.ts`, `jugerCommeLaPage`, passé par le paramètre `juger`, `boucle-directe.ts:339`).
- **L2b, modification LOCALE et TEMPORAIRE, NON COMMITÉE de `boucle-directe.ts` :** les refus de déclaration du tour (`refusDuTour`) deviennent un reproche, avec un exemple valide portant les `id`. L'original est sauvegardé dans le scratchpad (`vraie-appli/boucle-directe.ts.original`) et sera restauré à la fin.
- **L2a écartée** par le propriétaire : elle trancherait la question de confidentialité à sa place.
- **Vérification hors ligne avant le tir (gratuite) :** les réponses 1 et 3 du tir 1 rejouées. Avec L1, la réponse 1 n'est plus « ne se monte pas » ; avec L2b, le reproche « TA DÉCLARATION DONNEES.json A ÉTÉ REFUSÉE » part bien au modèle.
- Lancé à 13:30 UTC, en heure creuse, même plafond (1 USD) et mêmes règles.

**Tours du tir 2 [MESURÉ] :**

| tour | modèle (s) | entrée | sortie | coût | cumul | ce qui a changé | motif renvoyé ensuite |
|---|---|---|---|---|---|---|---|
| 1 | 179 | 4 517 | 15 500 | 0,0337 | 0,0337 | — (avec L1, plus de « ne se monte pas ») | 2 boutons sans nom ; échec de chargement affiché comme une liste vide ; **déclaration refusée (dit, L2b)** |
| 2 | 70 | 10 058 | 7 544 | 0,0216 | 0,0552 | `id` ajoutés à la déclaration | 4 boutons sans nom ; chargement ; déclaration refusée : `montant: number` au lieu de `decimal` |
| 3 | 61 | 15 945 | 7 060 | 0,0245 | 0,0797 | **déclaration acceptée** (L2b a convergé en 2 corrections) | 4 boutons sans nom ; chargement |
| 4 | 84 | 21 692 | 8 313 | 0,0308 | 0,1105 | — | identique au précédent |
| 5 | interrompu | | | | | | |

**Nouvel angle mort de l'instrument, D3 : un reproche juste mais pas actionnable.** Les « boutons sans nom » sont ceux de la barre latérale de la **bibliothèque** (`CoqueGestion`, `bibliotheque-ui.ts:620`, `:646`), qui affiche `s.libelle` (type `SectionGestion`, `:493`). Le modèle lui passe d'autres noms de champ à chaque tour : `titre` (tours 2 et 4), puis `nom` (tour 3). Il devine, et oscille. Le reproche ne nomme ni le composant ni le champ attendu. L'assembleur ne vérifie pas les types, et `jugerContrat` ne voit pas un champ manquant à l'intérieur d'un tableau.

**Aperçus ouvrables :** `scratchpad/vraie-appli/tir2/apercu-tour3.html` et `apercu-tour4.html` (données en mémoire).

**Tir 2 arrêté au tour 5,** sur l'oscillation, en attente d'une décision sur le levier L3.

### 5.4 Tir 3 — levier L3 (validé), et L3 est un pansement

- **L3, en modification LOCALE, TEMPORAIRE et NON COMMITÉE de `boucle-directe.ts` :** quand des contrôles sans nom sont reprochés et que l'œuvre emploie `CoqueGestion`, le reproche ajoute le champ attendu (`libelle`) et le type exact `SectionGestion`. Vérifié hors ligne sur la réponse 4 du tir 2 : la phrase part bien au modèle.
- **Lancé à 13:40 UTC,** avec L1, L2b et L3, mêmes règles. Les aperçus vont désormais aussi sur le Bureau du propriétaire.
- **L3 est un pansement, et le journal le dit :** il rattrape **un** reproche **après** l'échec. Il faudrait le refaire pour chaque composant de la bibliothèque dont le modèle ne devine pas les champs. C'est sans fin. La question est en amont : pourquoi le modèle ne sait-il pas que `CoqueGestion` attend `libelle` ?

**Tours du tir 3 [MESURÉ] — L1 + L2b + L3 :**

| tour | durée du tour (s) | coût | cumul | issue | motif renvoyé ensuite |
|---|---|---|---|---|---|
| 1 | 237 | 0,0459 | 0,0459 | refusé | boutons sans nom (avec la précision L3 : `libelle`) ; plus deux autres reproches |
| 2 | 111 | 0,0293 | 0,0752 | refusé | **un seul** : déclaration refusée, `montant: number` au lieu de `decimal` |
| 3 | 65 | 0,0282 | 0,1035 | **ACCEPTÉ, sans aucun reproche restant** | — |

- **Première acceptation non forcée de toute l'expérience.** La limite était à 25 tours : le tour 3 n'était pas le dernier, et l'œuvre a été acceptée parce qu'aucun juge n'avait plus rien à reprocher (`boucle-directe.ts:684`).
- **Durée totale 413 s, coût 0,1035 $.**
- **Verdict des juges sur l'œuvre acceptée :** se monte dans le simulateur, 0 erreur ; 3 écrans atteints ; 30 contrôles visités sur 60 découverts ; aucun jeton inexistant, aucun contrôle mort, aucune donnée en mémoire ; couverture 0,5 avec **0 exigence absente** ; déclaration de la table acceptée (`lecturePublique: true`, selon l'exigence du juge des faces — question de confidentialité laissée au propriétaire, chantier à part n° 7).
- **Le juge n'est pas le critère.** L'application est sur le Bureau du propriétaire (`carnet-tir3-final.html`, données en mémoire), qui tranche les critères 1, 2 et 4.

## 7. Levier L4 — formulé, NON appliqué (attend l'avis du propriétaire)

**L4 : documenter dans la consigne les composants de la bibliothèque ET les champs des objets qu'ils attendent, pour que le modèle n'ait rien à deviner.** Si l'hypothèse tient, L4 supprime d'un coup toute une famille d'erreurs au lieu de les rattraper une par une. Ce serait un levier produit, pas un correctif d'expérience.

### 7.1 Ce que la bibliothèque expose [MESURÉ sur le code, `signaturesDe(fichiersSysteme())`]

- **15 composants** à signature lisible : Icone, Carte, CarteDeChiffre, EnTeteDeSection, Pastille, Bouton, EtatVide, CoqueGestion, GrilleTableau, CarteVedette, Courbe, Barres, Anneau, Classement, ListeRecente.
- **16 réglages sont des LISTES** à remplir par le modèle.
- **Pour 1 seule** de ces 16 listes, la forme des éléments est connue : `CarteVedette.details[{libelle, valeur}]`.
- **Les 15 autres** ne disent pas les champs de leurs éléments : `CarteDeChiffre.serie`, **`CoqueGestion.sections`**, `Courbe.points/donnees/comparaison`, `Barres.points/donnees`, `Anneau.parts/donnees/points`, `Classement.lignes/donnees/points`, `ListeRecente.elements/donnees`.

Les champs que le modèle doit deviner sont donc ceux des éléments de ces 15 listes. Leur nombre exact par liste n'est pas compté ici : il faudrait lire chaque type.

### 7.2 Ce que la consigne actuelle en dit [MESURÉ sur la consigne produite pour le carnet]

**Ni rien, ni seulement des noms : les composants ET leurs réglages, mais pas l'intérieur des listes.** Depuis le 2026-11-12, la consigne énumère chaque pièce avec ses réglages exacts (`bibliotheque-ui.ts:1107-1127`, `reglagesEnumeres`), par exemple :

    CoqueGestion(nom, sousTitre, style, sections[], active, …)
    CarteVedette(libelle, valeur, contexte, tendance, details[{libelle, valeur}])

`sections[]` dit « une liste » sans dire de quoi. Le modèle sait qu'il faut une liste de sections, pas qu'une section porte `libelle`.

### 7.3 Pourquoi la forme manque : une cause mécanique [LU-CODE]

La forme des éléments est lue dans le **texte** de la signature, par une expression régulière qui ne reconnaît qu'un objet écrit en ligne, `{ … }` (`juge-contrat.ts:137-140`).
- `details?: { libelle: string; valeur: string }[]` est écrit en ligne : forme trouvée.
- `sections?: SectionGestion[]` passe par un **type nommé** (`bibliotheque-ui.ts:493`) : aucune accolade dans la signature, donc aucune forme.

Ce n'est pas un oubli de rédaction : le lecteur ne suit pas les types nommés. Le même lecteur sert au juge du contrat (`jugerContrat`), ce qui explique aussi pourquoi aucun juge n'a vu `titre` à la place de `libelle`.

**Ce qui trancherait l'hypothèse L4, sans la croire :** un tir du carnet avec L4 et **sans** L3. Si les boutons ont un `libelle` dès le tour 1, L4 a supprimé l'erreur en amont.

