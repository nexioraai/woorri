# D12 à D15 — pourquoi l'Atelier de réparation casse et pas les deux autres

- **Date :** 2026-11-16. **Code en production :** `2cd20fb`.
- **Œuvres :** `4d480027` « Suivi de stock » (marche), `bbf07fd6` « Registre de ventes » (écran Produits observé, qui marche), `b010d704` « Atelier de réparation » (Clients et Véhicules tombent dès la première ligne).
- **Sources :**
  - les fichiers de chaque œuvre, sortis par la requête A2 (liste et tailles) et par A3 (contenu de cinq fichiers de l'Atelier, export CSV du propriétaire, `~/Downloads/Supabase Snippet Untitled query.csv`) ;
  - le code servi de « Suivi de stock » (`suivi.deribfy.app`) ;
  - le vrai assembleur et le vrai juge, rejoués en local.
- **Règle :** rien n'est déclaré réglé. La validation sera une génération à quatre tables, lancée par le propriétaire depuis l'interface. Rien n'est poussé.

---

## D13 — Clients et Véhicules tombent dès la première ligne

**Observation.** « Cette section n'a pas pu s'afficher » dès qu'il y a une ligne. Vides, ces écrans s'affichent. Le menu compte « Clients 1, Véhicules 1 », et le tableau de bord lit le client.

**Le message vient de la protection de section de la bibliothèque** (`bibliotheque-ui.ts:231-244`, classe `Protection`) : un écran qui lève une erreur pendant son affichage est remplacé par ce texte, et le menu survit.

**Les deux codes, côte à côte.**

| | Mouvements, « Suivi de stock » (marche) | Clients, Atelier (tombe) |
|---|---|---|
| forme de la liste | un `<table>` écrit à la main (`table`, `thead`, `tbody`, `tr`, `td` dans le code servi ; aucune occurrence de `GrilleTableau`) | `<GrilleTableau colonnes={[{ libelle: 'Nom', acces: 'nom' }, …]} enfants={clients.map(client => ({ id, nom, telephone, actions }))} />` (`Clients.tsx`, même forme dans `Vehicules.tsx:98-102`) |

**La ligne qui casse.** `GrilleTableau` est une **grille de cartes de mise en page**, pas un tableau de données. Sa signature est `({ colonnes = 4, children, enfants }: { colonnes?: number; … })` et son rendu `{children ?? enfants}` (`bibliotheque-ui.ts:666-668`). L'Atelier lui passe une **liste d'objets** comme `enfants`. React refuse d'afficher un objet.

**Mesuré.** Rejoué avec le vrai assembleur, le vrai juge et la vraie bibliothèque, sur la même forme de code :

| | monte | erreur |
|---|---|---|
| zéro client (branche `EtatVide`) | oui | aucune |
| un client | **non** | React #31 : « object with keys {id, nom, actions} » |

**Cause dans le générateur.**
- La consigne listait `GrilleTableau(colonnes)` sans dire que `colonnes` est un **nombre** et que la pièce est une grille de cartes. Le nom « GrilleTableau » et le mot « colonnes » évoquent un tableau. Le modèle avait déjà fait cette confusion au tir 4 de l'expérience (`GrilleTableau donnees=`).
- Ce n'est lié **ni au nombre de tables, ni à la profondeur des relations**. C'est le choix de la pièce pour écrire une liste. « Suivi de stock » a écrit un `<table>` et a passé.

**Pourquoi rien ne l'a rattrapé.**
- **Le juge d'exécution monte l'œuvre sans données** (base vide, D1). Les deux écrans y prennent la branche `EtatVide`, et `GrilleTableau` n'est jamais rendu.
- **Le juge du contrat** ne contrôle que les **noms** des réglages. `colonnes` et `enfants` sont des noms valides ; leur **type** n'est pas contrôlé.

**Correction (`e0fd3bd1`), dans le générateur :**
1. La consigne dit : « GrilleTableau est une grille de CARTES (colonnes = un nombre), jamais un tableau : une liste de lignes s'écrit en `<table>`. »
2. `GrilleTableau` lève une erreur **nommée** si `colonnes` n'est pas un nombre : « GrilleTableau est une GRILLE DE CARTES : colonnes est un NOMBRE (2, 3 ou 4), pas une liste de colonnes. Une liste de lignes s'écrit en `<table>`. »

**Ce que le juge verra désormais :**
- l'erreur nommée, **dès que la grille est rendue**, même sans aucune ligne (`d13-grille-reglages.test.ts` ②, vrai juge) ;
- **mais pas dans le cas exact de l'Atelier :** quand l'écran n'affiche la grille **que s'il y a des lignes**, le juge, qui monte sans données, ne la rend jamais et ne voit rien. **Ce trou reste ouvert.** Il ne se ferme qu'en montant l'œuvre avec des lignes, ce qui est un changement du juge, hors de cette mission.

## D14 — l'écran Réglages n'enregistre rien

**Mesuré dans le code de l'Atelier :**
- Le modèle a écrit son **propre** `composants/ChoixApparence.tsx` (3 388 signes), importé par `Gestion.tsx:8` (`import ChoixApparence from './ChoixApparence'`).
- Il ne fait que des `useState` (`setStyle`, `setFond`, `setCouleur` passés par `Gestion.tsx:113-115`). Il n'enregistre rien et n'applique rien.
- La pièce fournie (`bibliotheque-ui.ts:445-451`), elle, applique l'apparence (`appliquerApparence`) et l'enregistre (`localStorage.setItem(CLE_APPARENCE, …)`). C'est elle que « Suivi de stock » employait : son thème tenait.

**Le « compteur à 0 » de Réglages** est une constante écrite par le modèle (`{ cle: 'reglages', …, nombre: 0 }`, `Gestion.tsx:62`). Ce n'est pas un compteur de réglages enregistrés.

**Cause.** La consigne disait « « Réglages » contient `<ChoixApparence />` » sans dire qu'il s'**importe tel quel** et ne se réécrit pas. Rien ne vérifie qu'une pièce fournie n'est pas réécrite sous le même nom.

**Correction (`e0fd3bd1`, consigne) :** « `<ChoixApparence />` importé de `./systeme/ui`, TEL QUEL, sans réglage : n'en écris jamais un à toi (le fourni enregistre et applique l'apparence). »

**INCONNU :** si le modèle suivra. **Aucune détection n'est ajoutée** : un juge capable de repérer une pièce fournie réécrite serait une modification du juge.

## D15 — une seule pastille de couleur

Même fichier. La couleur y est un `<input type="color" value={couleur}>`. Le contrôle natif de couleur, avec une valeur initiale vide, s'affiche comme une pastille noire. La pièce fournie offre six couleurs (`COULEURS`, `bibliotheque-ui.ts:396`) et « Celle du style ». Même cause et même correction que D14.

## D12 — le juge ne tient pas l'échelle (documenté, non corrigé)

**Le mécanisme.** Le juge d'exécution ouvre au plus `BUDGET_VISITES = 24` contrôles par montage (`juge-execution-enfant.mjs:249`). Il attend 60 ms après chaque clic (`:342`), sous un plafond global de 15 s (`juge-execution.ts:133`). Il compte tous les contrôles qu'il **aperçoit** et n'en ouvre que 24. D'où « 24 sur 77 (31 %) des contrôles des 11 écrans atteints » : le budget est épuisé.

**Ce qui a aggravé la situation, et c'est mon fait.** Avant la décision 1 (`17f24c15`, 2026-11-16), une œuvre à tables avait **deux** montages : l'accueil et `#gestion`, soit 24 + 24 = 48 visites. En supprimant le montage direct sur `#gestion`, il ne reste qu'un montage, et donc **24 visites au total**, accueil **et** gestion compris. Le budget effectif d'une œuvre à tables a été **divisé par deux** ce jour-là.

**Le budget nécessaire pour l'Atelier :**
- **au moins 77** visites, soit un clic par contrôle aperçu ; c'est un minimum, car ouvrir de nouveaux écrans fait apparaître de nouveaux contrôles ;
- en temps, 77 × (60 ms + le rendu) : au moins 4,6 s d'attente seule, sous les 15 s du plafond ;
- le coût du rendu par clic n'est pas mesuré : **INCONNU** si 77 tiennent sous 15 s.

**Ce que ce budget ne réglerait pas :** D13. Même avec un budget infini, le juge ouvre Clients **vide** et ne voit pas la casse.

**Non corrigé**, comme demandé.

## L'anomalie de durée (220 s contre 312 s) : INCONNU

Le nombre de tours, la durée de chaque tour et le coût des trois œuvres sortent de la requête **A1**, qui n'a pas encore été exportée. Sans elle, je ne l'explique pas.

Ce qu'on sait du mécanisme : une génération est faite de 1 à N tours, et chacun **réécrit toute l'application** (`boucle-directe.ts`, « Corrige et rends TOUS les fichiers »). La durée dépend donc du **nombre de tours** bien plus que de la taille. Une œuvre plus grosse acceptée au tour 1 prend moins de temps qu'une œuvre plus petite acceptée au tour 2. C'est une hypothèse, que A1 confirmera ou réfutera.

---

## Modifié dans le générateur (branche `feat/grille-et-reglages`, commit `e0fd3bd1`, non poussé)

| Fichier | Changement |
|---|---|
| `lib/apps/bibliotheque-ui.ts`, `GrilleTableau` | erreur nommée si `colonnes` n'est pas un nombre |
| `lib/apps/bibliotheque-ui.ts`, consigne | GrilleTableau est une grille de cartes ; ChoixApparence se pose tel quel |
| `__tests__/ep319-entites-declarees.test.ts` | trois plafonds de taille relevés avec leur mesure : 10 100 → 10 400 (mesuré 10 216), 14 800 → 15 100 (14 912), 20 900 → 21 200 (20 984). Les trois tombent pour les mêmes +233 signes, la phrase de consigne ci-dessus. |
| `__tests__/d13-grille-reglages.test.ts` | nouveau ; rouge sur l'ancienne bibliothèque |

## Laissé intact

Les quatre juges, dont le budget de visites (D12) ; l'œuvre `b010d704` et toutes les œuvres déjà générées ; la décision 3 ; le chantier du brief incomplet.

## INCONNU

- **L'anomalie de durée :** A1 à exporter.
- **Si le modèle suivra les deux nouvelles règles :** seule une génération le dira.
- **D13 dans la forme exacte de l'Atelier** (grille rendue seulement s'il y a des lignes) : **le juge ne le verra toujours pas**. Seuls la consigne ou un montage avec données peuvent l'empêcher.
- **L'écran Ventes du Registre :** non observé.

---

## Réponses aux quatre questions du propriétaire (2026-11-16)

**1. Les adresses.**
- **Le web sortant fonctionne**, mesuré : `suivi.deribfy.app` répond 200 (839 713 octets), et le code servi contient `mouvementsCeMois` (4 occurrences).
- **La lecture du matin était bien celle du code servi :** `curl https://suivi.deribfy.app/`, 839 006 octets enregistrés dans `oeuvre4d/page.html` à 12:02 (heure locale).
- **« Aucune de ces adresses ne répond » portait sur des adresses DEVINÉES** (`atelier`, `reparation`, `registre`…), essayées faute du résultat de A1. Elles se résolvent par le DNS générique de Vercel (`atelier.deribfy.app` → `76.76.21.241`), mais la connexion échoue (`http=000`) : ce ne sont pas des domaines de Deribfy. Les vraies adresses des deux œuvres ne m'ont jamais été données. La phrase était exacte pour ce que j'ai essayé, et **trompeuse** pour qui l'a lue : il fallait écrire « les adresses que j'ai devinées ne répondent pas ».
- **Sur quoi a porté la mesure D6, précisément :**
  - Playwright, avec WebKit et Chromium, en **local** ;
  - la page testée est une sortie réelle de `pageAutonome` (vrai assembleur), servie par un serveur HTTP local qui pose les **mêmes en-têtes** que Deribfy (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`), dans une `iframe srcdoc` en `sandbox="allow-scripts"` comme l'aperçu.
  - **Elle n'a PAS porté sur l'aperçu de Deribfy en production.** D6 est en production sans avoir été observé dans l'interface réelle. C'est le cas exact de la règle de preuve du 2026-11-16 : la mesure s'écrit [OBSERVÉ-LOCAL], et D6 reste **non validé** tant que le propriétaire n'a pas cliqué « Espace de gestion » dans l'aperçu de l'interface.

**2. La consigne qui grossit.**
- **Aujourd'hui** (mesuré à `c34c697`) : `CONSIGNE` fait **10 216 signes** sans table, et **14 908** avec une table.
- **Il y a un mois :** la boucle directe n'existait pas. Sa première consigne (`47837412`, 2026-10-18) faisait **262 signes**. Le cliquet EP-319 relève aussi « 1 363 » puis « 5 904 » vers le 2026-11-03.
- **Rien ne borne cette croissance.** Les plafonds d'EP-319 sont relevés à chaque fois : **25 relèvements** sont consignés dans ce test, dont **6 aujourd'hui**, sur trois plafonds.
- **Chaque correction de type consigne ajoute sa phrase.** Où ça mène :
  - la consigne s'allonge sans fin ;
  - chaque règle pèse moins dans la masse (le modèle a déjà ignoré des clauses écrites) ;
  - chaque appel coûte un peu plus ;
  - le texte se contredit à la longue.
  
  Les corrections de type **garde dans la bibliothèque** (parMois, GrilleTableau) ne grossissent pas la consigne et se vérifient : c'est la voie qui passe à l'échelle. **Décision ouverte, non traitée.**

**3. Le mécanisme des tours (lu dans le code, pas mesuré).** Chaque tour **réécrit l'application entière.**
- La consigne de reprise demande « Corrige et rends TOUS les fichiers » (`boucle-directe.ts:897`).
- Les fichiers d'un tour sont lus de **sa seule** réponse (`let lus = lireFichiers(texte)`, `:496`), puis la carte est reconstruite à partir d'eux seuls (`:574-575`). Rien du tour précédent n'est fusionné.

La durée d'une génération suit donc le **nombre de tours** et la taille de l'application **à chaque tour**. Le détail des trois œuvres sort de A1 (mesure), pas du code.

**4. D7, « c'est systématique ».**
- **Ce que la base a mesuré :** **1 œuvre sur 48.**
- **Mon affirmation confondait deux choses.** Ce qui était systématique, c'est la **faille de la consigne** : les fonctions de données étaient nommées sans leurs arguments, dans **chaque** génération. Le **défaut dans les applications livrées**, lui, ne l'était pas : une sur 48, et ce chiffre est un minimum (un argument passé par variable n'est pas compté).
- J'aurais dû revenir sur la phrase dès la mesure.

---

## LA DÉCISION QUI COMMANDE TOUTES LES AUTRES (consignée, non commencée)

**Le juge monte les applications vides, et les défauts vivent dans l'état plein.**

D7 (graphique vide à côté d'un compteur), D13 (une liste qui tombe à la première ligne) et D14 (des réglages qui ne s'enregistrent pas) : trois défauts sur trois écrans, et une seule raison de n'avoir rien vu. Le juge d'exécution monte l'œuvre sur une base vide (`url: ''`, D1). Les écrans y prennent leur branche « vide », ou n'enregistrent rien qu'on relise.

Aucune garde de bibliothèque ni aucun budget de clics ne ferme cette famille (D12 : même un budget infini ne voit pas D13). **Ce chantier commande les autres.** Il n'est pas commencé : il attend la décision du propriétaire.

