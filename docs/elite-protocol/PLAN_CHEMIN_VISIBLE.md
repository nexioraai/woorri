# Plan — le juge juge ce que l'utilisateur voit, et la gestion a un chemin visible

- **Date :** 2026-11-16.
- **Origine :** décisions 1 et 2 du propriétaire, après `EXPERIENCE_UNE_VRAIE_APPLI.md`.
- **Statut :** PLAN, **non validé**. Aucune ligne de code n'est écrite.
- **Code lu :** `main` @ `5badf72a` plus la documentation locale. Les modifications de l'expérience (L2b, L3, L4) sont **retirées** : `boucle-directe.ts` et `juge-contrat.ts` sont restaurés à l'identique (`git diff` vide).

---

## 0. Une décision à confirmer avant tout : la décision 2 renverse une règle posée exprès

La règle « aucun chemin vers la gestion » n'est pas un oubli. Elle a été posée le 2026-11-06 après l'incident `asso.deribfy.app`, où l'entrée « Gestion » était visible sans compte (`__tests__/ep370-loi-public-gestion.test.ts`, en-tête). Depuis, l'accès à la gestion passe par un lien du **tableau de bord Deribfy** (`dashboard/page.tsx:771`, `IdentifiantsOeuvre.tsx:86` : `adresse + #gestion`), pas par l'application.

La décision 2 la renverse. Le plan le fait ainsi : **un seul chemin, visible et nommé, qui mène à la connexion**. Ce n'est pas un menu de gestion exposé : la face publique reste en lecture seule, sans données privées ni formulaire de connexion. Le lien du tableau de bord reste en place. **À confirmer :** c'est bien ce que tu veux pour un site vitrine aussi.

## 1. Ce qui change

### 1.1 Décision 1 — le juge n'entre plus par `#gestion`

| Où | Aujourd'hui | Demain |
|---|---|---|
| `boucle-directe.ts:513-516` | `gestionMontee` : second montage de l'œuvre **directement** sur `ADRESSE_GESTION` | **supprimé** |
| `boucle-directe.ts:517-532` | fusion des deux montages (erreurs, écrans, visites, contrôles) | l'exécution = le seul montage depuis l'accueil |
| conséquence | les écrans de gestion entraient dans `execution.ecrans` sans chemin visible, et nourrissaient la couverture (`:537`) | un écran de gestion n'y entre que si le juge l'a **atteint en cliquant** depuis l'accueil (`juge-execution-enfant.mjs:230`, sélecteur `a[href^="#"]` compris) |

Le juge parcourt déjà l'interface en cliquant. Il n'y a pas de nouveau mécanisme : on retire seulement le raccourci.

**« Un écran sans chemin visible n'est pas couvert » est automatique.** La couverture ne lit que les écrans ouverts (`juge-couverture.ts`, via `execution.ecrans`). Un écran jamais atteint n'existe pas pour elle.

**Risque connu :** le juge a un budget de 24 clics (`juge-execution-enfant.mjs:233`). Si la face publique les consomme, la gestion peut ne pas être atteinte. Il en résulterait un refus à tort, plus jamais une acceptation à tort. Il faut le mesurer à la preuve (§4), sans le corriger d'avance.

**La règle du 2026-11-12, « la gestion plante à l'ouverture et l'œuvre est acceptée », reste couverte :** le juge atteindra la gestion par son lien visible et y verra le plantage. Le test `__tests__/gestionMontee.test.ts` est réécrit en conséquence : une gestion qui plante **et** a un lien visible est refusée ; une gestion sans lien visible n'est pas comptée.

### 1.2 Décision 2 — la consigne exige un chemin visible

`entites-declarees.ts` :

| Ligne | Aujourd'hui | Demain |
|---|---|---|
| `:396-398` | « NE MONTRER AUCUN CHEMIN VERS LA GESTION : aucune entrée de menu, aucun lien, aucun bouton, aucun onglet » | « PORTER **UN** chemin visible et nommé vers la gestion (« Espace de gestion », « Se connecter »…), un lien vers `#gestion`. » |
| `:404-405` | « On y arrive en tapant cette adresse, jamais par un lien affiché. » | « On y arrive par ce lien. » |

**Ce qui reste, pour que le site vitrine reste légitime :**
- la face publique en lecture seule (`:389-391`) ;
- sans formulaire de connexion sur la face publique (`:399`) ;
- sans donnée privée (`:400-401`) ;
- la connexion à `#gestion` seulement (`:406-409`) ;
- les quatre gestes de la gestion (`:410-416`) et le retour vers l'accueil (`:417-418`).

Le visiteur d'une vitrine voit un lien « Espace de gestion » qui lui demande de se connecter. C'est le schéma ordinaire d'un site.

**Le cliquet `ep370-loi-public-gestion.test.ts` change avec la consigne :** la clause ① cite la phrase interdite (`:93`), la ② l'adresse tapée. Ils sont réécrits pour garder la nouvelle obligation. C'est une obligation, donc vérifiable ; c'est exactement ce que l'en-tête d'EP-370 recommandait (« Une interdiction se contourne, une obligation se vérifie »).

## 2. Ce qu'il faut décider avec : trois défauts de l'instrument trouvés par l'expérience

**Sans eux, la preuve (§4) a peu de chances de passer, pour des raisons qui ne tiennent ni au modèle ni à ces deux décisions.** Le tir 3 n'a été accepté qu'avec L1, L2b et L3. Recommandation : les intégrer dans ce lot, chacun dans son commit. Décision du propriétaire.

| | Défaut | Correctif durable (pas celui de l'expérience) | Recommandation |
|---|---|---|---|
| **D1** | le juge d'exécution ne pose pas `window.DERIBFY_BASE` | `juge-execution-enfant.mjs` pose la même base vide que la vraie page (`boucle-directe.ts:1150-1159`), avant l'import de l'œuvre (`:205`). Le juge des faces le fait déjà (`juge-faces-enfant.mjs:147`). | **dans le lot** : sans lui, toute œuvre à tables qui suit la consigne est refusée au tour 1 |
| **D2** | le refus d'une déclaration n'est jamais dit au modèle ; le gabarit enseigné n'a pas d'`id` | `refusEnRoute` du tour devient un reproche (`boucle-directe.ts:408-415` → bloc des reproches) ; le gabarit `DONNEES.json` de la consigne porte les `id` (`entites-declarees.ts`, gabarit ; `boucle-directe.ts:93` pour la branche sans base) | **dans le lot** : sinon la boucle tourne à vide (tir 1, motif identique) |
| **L4** (cause de D3) | le lecteur de signatures ne suit pas les types nommés : 15 listes sur 16 sans forme | `juge-contrat.ts:137-140` suit `type X = { … }` dans les fichiers système. La consigne passe de 1 à 13 listes décrites (+2 % de signes), et `jugerContrat` voit enfin les champs inventés. | **dans le lot** : éprouvé au tir 4 (`libelle` dès le tour 1) |
| D5 | le reproche « chargement qui échoue = chargement vide » tombe même sur une page qui n'affiche pas la table, et sa phrase est écrite en dur | `juge-faces.ts:230-232` : ne reprocher que si la table est montrée sur la face publique ; `:133` : ne pas affirmer un code que l'œuvre n'a pas | à décider : il a bloqué le tir 4 ; avec un chemin vers la gestion, il pourrait ne plus mordre, ou mordre autrement |

L3 (le reproche qui nomme `libelle`) n'est **pas** repris : L4 le rend inutile.

## 3. Hors du périmètre de ces deux décisions

- **La couverture et ses 19 familles : chantier à part.** Les décisions 1 et 2 changent ce que la couverture **voit** (seulement les écrans atteints), pas ce qu'elle **cherche**. « Formulaire d'ajout » n'était pas une exigence parce que les exigences tirées de la demande sont des mots isolés (`depense`, `ecran` pour le carnet), et que seules les familles sont reprochées (`juge-couverture.ts:267`). Or la lecture de la demande produit déjà la liste des écrans voulus : `lectureBrief.ecrans` (le carnet : « liste… », « formulaire d'ajout », « total du mois »). Juger que **chaque écran lu est atteint par un chemin visible** est le bon critère, mais il faut apparier une description d'écran et un écran rendu. Ce n'est pas un mot à chercher. À instruire à part, après la preuve.
- **Décision 3** (application personnelle, outil interne, vitrine) : reportée, actée comme le chantier suivant.
- **La confidentialité (point 7), `lecturePublique` imposée :** inchangée. Le carnet restera déclaré public tant que le point 7 n'est pas tranché.
- **Rien d'autre ne change :** la limite de 3 tours, `maxDuration`, la route, la base, les deux portes de production, les chantiers à part (purge, `journal.ts`, `ai_usage_log`, 16 $, abandon d'écran).

## 4. La preuve, énoncée d'avance

- **Critère unique :** le carnet de dépenses regénéré, ouvert par le propriétaire, permet d'**ajouter une dépense sans taper d'adresse**. Le juge ne décide pas.
- **Comment :** le montage local de l'expérience, sans aucun levier d'expérience, avec le **code du lot** et la limite de **3 tours, comme en production**. Les entrées sont exactement celles du tir 1. L'application va sur le Bureau, données en mémoire. Aucune porte de production n'est ouverte.
- **Coût estimé :** de 0,10 à 0,15 $ en heure creuse (le tir 3, accepté en 3 tours, a coûté 0,1035 $), le double en heure de pointe DeepSeek (06:00–10:00 UTC en semaine). Plafond : 1 $.
- **Si elle échoue :** on consigne quel défaut, et on ne lance aucun tir de plus sans ton accord.

## 5. Ordre d'exécution, une fois le plan validé

1. Décision 1 (`boucle-directe.ts`, `gestionMontee.test.ts`). Un commit.
2. Décision 2 (`entites-declarees.ts`, `ep370-…test.ts`). Un commit.
3. Chacun des correctifs retenus au §2 (D1, D2, L4, D5 s'il est retenu). Un commit chacun, avec son test.
4. `npx tsc --noEmit`, `npm run verifier`.
5. Preuve (§4), puis ton verdict.

Rien n'est poussé ni déployé sans ton accord.
