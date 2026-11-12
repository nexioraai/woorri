# Mesures du générateur — option 1 (« moteur direct ») — 2026-11-12

> Commande du propriétaire, 2026-11-12 : *« Tu ne proposes rien, tu ne corriges
> rien. Tu mesures, et tu expliques chaque mesure en profondeur : ce qu'elle
> prouve, ce qu'elle ne prouve pas. »*
>
> **Étiquettes** : `FAIT` = sortie d'un script de ce dossier · `DOC` = cause
> écrite dans le code par une session antérieure, **non re-mesurée ici** ·
> `CONCL` = déduction, avec son raisonnement · `INCONNU` = la donnée manque ;
> elle n'est pas reconstruite.

## Source et reproduction

| | |
|---|---|
| Source | table `app_generations`, `moteur = 'direct'` — **34 lignes**, un seul propriétaire, un seul fournisseur (DeepSeek), du 2026-10-18 au 2026-11-12 |
| Instantané | `brut/generations-direct.json.gz` · SHA-256 du JSON décompressé `145c4107d4cb24a175d2b4943978462f64a5663f81ff7ab33e66bc0cca98bffe` |
| Extraction | `node --env-file=apps/web/.env.local docs/elite-protocol/evidence/generateur-2026-11-12/extraire.mjs` (un seul `select`, aucune écriture) |
| Mesures | `node …/m1-tours.mjs` · `m2-builds.mjs` · `m3-livrees.mjs` · `m4-juges.mjs` · `cd apps/web && npx tsx ../../…/m5-isolation.mts` · `node …/tableaux.mjs` |
| Garde | chaque mesure **refuse de tourner** si le hachage de l'instantané ne correspond plus (`commun.mjs`) |
| Reproductibilité | `FAIT` — tout relancer donne des sorties **identiques à l'octet** (vérifié par `shasum` avant/après) |

**Réserves qui valent pour tout le document**

1. Le pipeline a **changé pendant la période** : la consigne, la bibliothèque et
   les juges ont été modifiés ou ajoutés au fil de l'eau. Deux générations
   d'octobre et de novembre n'ont pas été jugées par les mêmes instruments.
   M4 donne, pour chaque juge, le nombre de générations qu'il a **réellement**
   pu voir.
2. Les dates « avant / après correctif » sont des dates de **commit**, pas de
   mise en production : c'est une borne basse, incertaine près des bords.
3. Un seul fournisseur (DeepSeek) : **rien ici ne sépare l'effet du modèle de
   celui du pipeline.** C'est l'objet de M5, qui n'est pas lancée.

---

# PARTIE I — LES CHIFFRES

## M1 · Tour par tour

| devenir des 34 générations | nombre |
|---|---|
| aucun tour enregistré (`2abfdb08`, 1ʳᵉ génération) | 1 |
| acceptées au tour 1 | 5 |
| acceptées au tour 2 | 8 |
| **livrées au tour 3** (le dernier : livraison quelles que soient les défauts) | **15** |
| jamais livrées (3 tours refusés) | 5 |

**Transitions entre deux tours (48 au total)** — `FAIT`, `sortie/m1-tours.json`

| nature de la transition | nombre | part |
|---|---|---|
| **le tour suivant garde UNIQUEMENT les mêmes classes d'erreur** | **27** | 56 % |
| toutes les classes corrigées | 13 | 27 % |
| — dont vers un tour 3 dont les résiduels ne sont connus qu'en partie | 5 | |
| les classes du tour N disparaissent, une classe NOUVELLE apparaît | 8 | 17 % |
| mélange (une classe gardée **et** une nouvelle) | 0 | 0 % |
| uniquement du nouveau, sans rien corriger | 0 | 0 % |

Par classe, sur toutes les transitions : **30 maintenues · 10 nouvelles · 37 corrigées.**
Pour les 11 transitions « construction → construction », 4 portent **exactement**
le même message et 7 un message différent.

**Ce que la mesure prouve** — dans les reproches *enregistrés*, le motif dominant
est le **blocage sur la même classe d'erreur** (27/48), pas le changement d'erreur
(8/48).

**Ce qu'elle ne prouve pas**
- *Pourquoi* le blocage : le modèle ne sait pas corriger, ou le reproche est mal
  formulé, ou la cause n'est pas dans son code. Voir M2 : **8 des 11** transitions
  construction → construction viennent de générations dont la cause est
  documentée côté Deribfy (`6f7c9499`, `7d17287f`, `96768b7f`, `b21cf508`, 2
  chacune) ; les 3 autres sont des erreurs du modèle (`2ef5f1d3` ×2, `82d64d9d`).
  `INCONNU`.
- Les défauts d'un tour 3 livré : la boucle **ne les écrit pas** dans `motif`.
  Ils sont reconstitués depuis les verdicts conservés, mais ceux des juges
  `faces` et `gestion` ne sont **pas conservés en base**. `INCONNU` pour ces deux-là.

> **Verdict sur ma phrase « à chaque tour il casse autre chose » : FAUSSE.**
> Mesuré : une classe nouvelle n'apparaît que dans **8 transitions sur 48**
> (17 %). Le cas majoritaire est l'inverse : **27/48 (56 %) restent sur la même
> erreur.** Au niveau du message exact, 7 des 11 constructions changent de
> message. Pour 5 d'entre elles, c'est la même famille avec une liste de
> paquets différente (`7d17287f` ×2, `96768b7f` ×2, `82d64d9d`). Les 2 autres
> (`b21cf508`) alternent entre « react seul » et « expo » : deux causes
> différentes.

---

## M2 · Les 20 échecs de construction

`FAIT`, `sortie/m2-builds.json`. **20 échecs, 9 générations, 3 types, 7 sous-types.**

| type | nombre | sous-types |
|---|---|---|
| paquet non embarqué | 12 | `react / react-dom` seuls : **7** · contient un paquet natif (`react-native*`, `expo*`) : **5** |
| erreur de syntaxe (`PARSE_ERROR`) | 5 | « Expected `}` but found `EOF` » ×2 · « Unexpected token » ×2 · « Unterminated string » ×1 |
| binaire natif de l'assembleur absent | 3 | `Cannot find native binding` — les 3 tours d'une même génération |

**Attribution par règle déclarée** (avant la mesure, en tête de `m2-builds.mjs`)

| auteur | nombre | appui |
|---|---|---|
| **ENVIRONNEMENT de Deribfy** | 3 | le message ne cite aucun fichier du modèle : l'assembleur lui-même ne démarre pas |
| **CONTESTÉ** (`react` seul) | 7 | une application web React doit importer React |
| — dont avant le correctif `c6040924` « l'assemblage ne dépend plus du disque » | 5 | `DOC` : React absent du disque de la fonction (`react-embarque.ts`) |
| — dont `b21cf508` (2 tours), avant le correctif `8eef0e6e` | 2 | `DOC` : le **lecteur de Deribfy** gardait les clôtures markdown du modèle ; le message disait « react non embarqué » à tort (`ecriture-directe.ts`) |
| **MODÈLE** — code natif dans une application web | 5 | `react-native`, `expo` importés |
| **MODÈLE** — syntaxe | 5 | dont 2 « EOF » sans drapeau de troncature enregistré (`tronquee = null`) : coupe de sortie possible, `INCONNU` ; dont 1 clôture « ``` » en milieu de fichier, **après** le correctif des clôtures |

**Contre-mesure du cas contesté** — `FAIT` : les **28/28** applications acceptées
importent React, dont **4 acceptées avant** le correctif `c6040924`. La cause
documentée (« React absent du disque ») n'explique donc pas tout : certaines
constructions ont trouvé React à la même période. `INCONNU` sur le mécanisme.

**Chronologie** — `FAIT` : le dernier échec de construction date du
**2026-11-01** (`fd1b4896`). **Depuis le 2026-11-04 : 0 échec de construction
sur 15 générations.**

**Ce que la mesure prouve** — 3 types couvrent 20 cas sur 20. Les deux plus
grosses familles, 10 cas sur 20 (binaire absent + `react` seul), ne sont pas du
code écrit de travers par le modèle : l'une selon la règle, l'autre selon les
causes documentées et leur chronologie.

**Ce qu'elle ne prouve pas** — que les causes `DOC` soient les bonnes (elles ne
sont pas re-mesurées ici) ; que les 2 « EOF » soient des coupes ; que l'heure du
commit soit l'heure de la mise en production.

> **Verdict sur ma phrase « motif n° 1 : du code qui ne compile pas » : TROMPEUSE.**
> Vraie au compte (20), fausse dans ce qu'elle laissait entendre : au plus
> **10/20** sont des erreurs du modèle, et cette famille **a disparu depuis le
> 2026-11-04**. Elle décrit un problème d'octobre, pas celui de vos captures.

---

## M3 · Contenu réel des 21 « livrées sans erreur »

`FAIT`, `sortie/m3-livrees.json`. **Définition reprise à l'identique** de celle qui
avait produit « 21 » : *tour accepté ∧ aucune erreur d'exécution enregistrée ∧
aucun défaut de persistance.* Elle ne dit **rien** de la qualité.

| mesure (médiane) | les 21 | avant le 2026-11-04 (n = 12) | depuis le 2026-11-04 (n = 9) |
|---|---|---|---|
| lignes écrites par le modèle | 881 | 1 268 | **466** |
| composants | 7 | — | — |
| écrans distincts | 4 | 10 | **2** |
| signes de la page d'accueil | 164 | 702 | **114** |
| **longueur du cahier** | — | **22 866** | **268** |

| autres relevés | |
|---|---|
| écrans **non enregistrés** (générations anciennes) | 6 sur 21 → `INCONNU` |
| nombre de tables **non enregistré** (avant le 2026-11-04) | 12 sur 21 → `INCONNU`, **pas « zéro »** |
| une seule vue distincte | 2 |
| accueil portant un marqueur d'état vide (« aucun », « pas encore »…) | 2 |
| `08a20016`, compté « sans erreur » | son écran entier : **« La configuration de la base de données est manquante… »** (92 signes) |

**Hors définition : les deux pharmacies du 2026-11-12, objet de votre capture**

| génération | accueil, texte **entier** rendu |
|---|---|
| `27ba05fb` | **162 signes** : « Pharmacie · Aucun médicament disponible · … · Horaires non renseignés · … » |
| `f1b753a6` | **273 signes** : un titre, un sous-titre, puis deux états vides (« Aucun médicament disponible », « Horaires non renseignés ») |

**Ce que la mesure prouve**
- La remarque « un titre et deux cadres vides » devient un chiffre pour les deux
  pharmacies : **toute** la page tient en 162 et 273 signes, dont deux états vides.
- La définition « sans erreur » laisse passer un écran d'erreur (`08a20016`).
- Les applications livrées depuis le 2026-11-04 sont nettement plus petites.

**Ce qu'elle ne prouve pas**
- **« Écrans avec données réelles » : `INCONNU`, et non mesurable avec ce qui est
  conservé.** Le simulateur monte l'œuvre **sans base** (`juge-execution.ts`,
  cloisonnement ①), et l'aperçu ne peut pas atteindre la base non plus
  (`boucle-directe.ts:1044-1071`, `DOC`). Une application à tables y est
  **vide par construction**. Un écran vide ici ne prouve donc pas que le code ne
  sait pas afficher des données.
- La baisse de taille depuis le 2026-11-04 **n'a pas de cause établie** : les
  cahiers sont 85 fois plus courts (médiane 22 866 → 268 signes). Confusion non
  contrôlée.

> **Verdict sur ma phrase « les 21 ne sont pas de bonnes applications » : NON MESURÉE.**
> « Bonne » n'a pas de définition mesurable dans ce dossier. Ce qui est mesuré :
> 9 sur 21 sont petites (médiane 2 écrans, accueil de 114 signes), et 1 affiche
> un écran d'erreur.

---

## M4 · Inventaire des juges

`FAIT`, `sortie/m4-juges.json`. Un intitulé de refus est rattaché à son juge par le
fichier qui l'écrit. S'il est écrit dans `boucle-directe.ts`, le script remonte
à la **condition** qui le déclenche et vérifie que sa variable vient bien du juge.
Le script s'arrête si ce rattachement ne se vérifie pas.

| juge | ce qu'il vérifie (son en-tête) | entré le | branché | générations exposées | tours refusés |
|---|---|---|---|---|---|
| *assemblage* | le code se construit | 2026-10-18 | oui | 33 | **20** |
| `juge-couverture` | chaque thème du cahier (lexique) est dans le code, ou déclaré hors périmètre | 2026-10-31 | oui | 25 | **14** |
| `juge-execution` | l'œuvre **démarre** dans un DOM simulé ; les contrôles ont un nom | 2026-10-31 | oui | 24 | **14** (11 « ne se monte pas » + 3 « sans nom ») |
| `juge-persistance` | chaque table est lue **et** écrite ; rien n'est gardé en mémoire | 2026-11-03 | oui | 15 | **10** |
| `juge-faces` | sans session : le public ne voit que le public ; un échec ≠ un vide | 2026-11-06 | oui | **3** | **8** (3 générations sur 3) |
| `juge-jetons` | aucun nom inventé dans la bibliothèque, aucune variable CSS inventée | 2026-10-31 | oui | 24 | 5 |
| `juge-vivacite` | tout contrôle est lié à une action | 2026-10-31 | oui | 25 | 1 |
| `juge-devise` | les montants parlent la devise configurée | 2026-10-31 | oui | 25 | **0** |
| `juge-gestion` | chaque table est modifiable et supprimable | 2026-11-05 | oui | 6 | **0** |
| `juge-contrat` | les réglages des composants existent | **2026-11-12** | oui | 1 | 0 |
| `juge-bandeau` | — | 2026-11-05 | **non** | 0 | 0 |
| `juge-navigateur` | rendu réel Chromium/WebKit | 2026-11-05 | **non** (tir manuel seulement) | 0 | 0 |

**Comptes exacts.** Pendant les 34 générations, il existait **10** fichiers de
juges, et **8** étaient branchés. Le 11ᵉ (`juge-contrat`) date d'aujourd'hui.
Mon « 11 juges » du diagnostic oral comptait donc deux juges jamais branchés et
un juge qui n'a encore rien jugé.

**Recouvrement mesuré (même tour refusé)** — « ne se monte pas » apparaît avec
« tables interrogées avant connexion » **4 fois**, avec « échec = vide » **3 fois**
et avec « données en mémoire » **3 fois**.
**Recouvrement de nature** (`CONCL`, d'après le code) : `juge-execution` et
`juge-faces` **montent tous deux l'œuvre**. Une œuvre qui plante au montage est
donc reprochée **deux fois pour une même cause**, sous deux intitulés.

**Ce que la mesure prouve** — trois juges branchés n'ont **jamais refusé** :
devise (0/25), gestion (0/6), contrat (0/1). Deux ne sont pas branchés.
`juge-faces` a refusé **toutes** les générations qu'il a vues (3/3).

**Ce qu'elle ne prouve pas** — qu'un juge qui n'a jamais refusé soit inutile.
Le modèle s'est peut-être conformé à sa règle ; aucun cas-tueur n'a été joué
ici (P-E). `INCONNU`.

**Ce qu'AUCUN juge branché ne vérifie** (`CONCL`, d'après la lecture des 8 juges
branchés et de l'assemblage ; chaque ligne dit pourquoi)

| angle | pourquoi aucun ne le voit | trace mesurée |
|---|---|---|
| le **rendu visuel** | aucun juge branché ne produit ni n'examine d'image ; le seul qui ouvre un navigateur n'est pas branché | — |
| la ressemblance à une **référence** (maquette) | aucune référence n'existe dans la boucle | — |
| l'affichage **avec des données** | simulateur et aperçu sans base ; `faces` ne regarde que la face publique, avec une ligne témoin | M3 |
| que chaque entrée de menu mène à un **écran valide** | « démarre » ≠ « mène quelque part » | `FAIT` : `f1b753a6`, livrée : **6 écrans sur 8** enregistrés par le juge d'exécution disent « Section inconnue », sans refus pour cela |
| l'**exactitude** des chiffres affichés | aucun juge ne recalcule une valeur | — |
| la mise en page **selon l'écran** (téléphone) | le simulateur n'a pas de mise en page | — |
| la **richesse** de la page publique | `couverture` compte des termes, pas des écrans | M3 : accueils de 54 à 164 signes depuis le 2026-11-04 |
| la **règle de livraison** | ce n'est pas un juge : au 3ᵉ tour, la boucle livre quoi qu'il reste | M1 : **15** livraisons au tour 3 |

---

## M5 · Les cahiers riches d'octobre, rejoués sur le pipeline d'aujourd'hui

> **Historique.** La première version de M5 (Anthropic contre DeepSeek) est
> **supprimée** par décision du propriétaire (2026-11-12) : Anthropic n'entre
> pas, DeepSeek seulement, c'est définitif. Script retiré du dépôt
> (`m5-isolation.mts`) ; elle n'a jamais été lancée.

**Question** (du propriétaire) : les applications sont devenues petites au
moment même où les cahiers ont rétréci (M3 : médiane de 22 866 → 268 signes).
Qui en est la cause : le **pipeline** d'après le 2026-11-04, ou les **cahiers** ?

**Script** : `m5-cahiers-riches.mts` · coût **0,5115 $** (plafond dur 1 $,
garde au tarif de pointe avant chaque appel) · DeepSeek seulement (le script
s'arrête sinon) · un seul essai par cahier.

**Sélection** (règle déclarée en tête du script) : en octobre, il existe **exactement
3 cahiers distincts** de 5 000 signes ou plus, et ils relèvent de 3 secteurs
différents. On les retient tous les trois :
- **énergie / compteurs** : CONTERAK, 26 028 signes ;
- **institution** : CPA-Tchad, 20 658 signes ;
- **réservation / tourisme** : Hayine, 22 866 signes.

**Pipeline rejoué**, recopié depuis le code :
1. `lire-brief` (modèle léger DeepSeek) ;
2. `preVol`, avec la devise XAF par défaut ;
3. `boucleEcriture` (DeepSeek).

**Instrument identique des deux côtés.** Les écrans d'octobre n'ont pas été
enregistrés (M3). Le **code livré en octobre** est donc remonté **aujourd'hui**
avec le même `assembler` + `jugerExecution` que les rejeux.

### Les chiffres

| secteur | | démarre | erreurs | écrans distincts | signes de l'accueil | « Section inconnue » | écrans vides |
|---|---|---|---|---|---|---|---|
| **institution** | octobre `7be93be8` (accepté au tour 1) | **oui** | 0 | **13** | **857** | 0 | 1 |
| | **aujourd'hui** (livré au tour 3) | **non** | 3 | **1** | 251 | 0 | 0 |
| **réservation** | octobre `eb7b62b5` (accepté au tour 1) | **oui** | 0 | **7** | 1 600 ⚠ | 0 | 1 |
| | octobre `88c94164` (livré au tour 3) | non | 1 | 1 | 0 | 0 | 0 |
| | **aujourd'hui** (livré au tour 3) | **non** | 2 | **4** | 298 | 0 | 2 |
| **énergie** | octobre `4a6e160d` (accepté au tour 1) | non | 1 | 1 | 0 | 0 | 0 |
| | octobre `cbf1cb34` (accepté au tour 2) | non | 2 | 4 | 179 | 1 | 2 |
| | **aujourd'hui** (livré au tour 3) | **non** | 1 | **1** | 0 | 0 | 0 |

⚠ Les 1 600 signes de `eb7b62b5` comptent du CSS rendu comme du texte
(« .sidebar { width: 260px… »).

**Les messages exacts** (`m5-erreurs.mts`, gratuit, sur le code conservé et
haché) :

| | message |
|---|---|
| institution, aujourd'hui | `object is not iterable` ×2 (dont une attrapée par `[section en erreur]`) · `alert is not defined` à l'écran « Se déconnecter » |
| réservation, aujourd'hui | `object is not iterable` ×2 (dont une attrapée par `[section en erreur]`) |
| énergie, aujourd'hui | `supabaseUrl is required` : l'œuvre ouvre un client de base alors qu'elle n'a **aucune table** |
| octobre `cbf1cb34`, `4a6e160d` | « localStorage est refusé dans un cadre isolé » : une règle de l'**instrument** ajoutée **après** octobre |
| octobre `88c94164` | `undefined.fontSize` (le défaut connu des jetons) |

**Faits annexes**
- **Aucune table** n'a été déduite pour les 3 rejeux. Pour deux cahiers, la
  lecture du brief a échoué : réponse illisible pour l'énergie, JSON mal formé
  pour CPA. Elle ne lit d'ailleurs que les **24 000 premiers signes** (l'énergie
  en fait 26 028). La branche « tables » du pipeline actuel **n'a donc pas été
  exercée** par M5.
- Les 3 rejeux ont été refusés au tour 1 (jetons ×2, construction ×1), puis
  **livrés au tour 3**.
- `object is not iterable` est **le même message** que celui de la pharmacie
  `f1b753a6`. Les 3 fois, il est attrapé par `[section en erreur]`, la
  protection de la coque de gestion ajoutée le 2026-11-12. Son point de départ
  exact est **`INCONNU`** : le simulateur ne fournit pas de ligne.
- Dans le rejeu réservation, le modèle appelle les calculs fournis **hors de
  leur signature** : `sommeParMois(paiements, 'montant', 'date')` inverse les
  deux champs, et `recents(paiements, 5)` passe un nombre comme nom de champ.
  `juge-contrat` ne lit que les réglages des composants, pas les arguments des
  fonctions : il ne pouvait pas le voir.

**Incident de mesure, déclaré.** La première exécution a **arrêté** le cahier
CPA dans `lire-brief` sur un JSON mal formé, alors que la route de production
l'attrape et continue sans table. Mon rejeu n'était donc pas fidèle sur ce
point. Il a été corrigé pour reproduire la route, et **seul CPA a été relancé**
(« tentative 2 »). Ce n'est pas un second essai : la génération CPA n'avait
jamais commencé (0,006 $ perdus en lecture du brief). Les deux tentatives sont
conservées dans `sortie/m5-rejeu.json`.

### Laquelle des deux issues

> **Issue 1 — « applications pleines, les cahiers courts étaient la cause » : RÉFUTÉE.**
> Avec des cahiers riches, le pipeline d'aujourd'hui livre **0 application sur
> 3 qui démarre**, avec 1, 4 et 1 écrans.
>
> **Issue 2 — « applications vides, régression depuis le 2026-11-04 » : c'est
> l'issue observée.**
> Pour les deux cahiers qui avaient donné, en octobre, une application qui
> démarre (institution : 13 écrans ; réservation : 7), le rejeu d'aujourd'hui
> **ne démarre pas** et compte moins d'écrans (1 et 4).

**Ce que M5 ne prouve pas**
- **Une régression *établie*.** Il y a un seul essai par cahier, et en octobre
  ces mêmes cahiers ont aussi échoué souvent : 3 des 5 livraisons d'octobre ne
  démarrent pas avec l'instrument d'aujourd'hui, dont 2 seulement à cause d'une
  règle de l'instrument postérieure. Le hasard d'un tirage n'est **pas** exclu.
- **La cause.** Rien ici ne désigne un commit. Les symptômes se **situent**
  dans deux zones : la coque et les pièces du tableau de bord
  (`object is not iterable`, 2 cas sur 3 plus la pharmacie), et une œuvre sans
  table qui ouvre la base (`supabaseUrl is required`).
- **La branche « tables »** du pipeline : elle n'a pas tourné (0 table déduite).

### Les suspects — commits du générateur depuis le 2026-11-04, AUCUN corrigé

`m5-suspects.mjs` liste **53 commits** sur `lib/apps/` et `app/api/generateur/`,
tests exclus. La liste complète est dans `sortie/m5-suspects.md`, versée en annexe.

Par fichier : `entites-declarees.ts` 15 · `boucle-directe.ts` 13 ·
`retoucher/route.ts` 7 · `direct/route.ts` 6 · **`bibliotheque-ui.ts` 5** ·
`retouche.ts` 5 · `sous-domaine.ts` 5 · `migration-oeuvre.ts` 4 · …

**Fait à mettre en regard du symptôme dominant** : les **5** commits sur
`bibliotheque-ui.ts` (la bibliothèque fournie, avec la coque et les pièces du
tableau de bord) datent **tous du 2026-11-12** et sont **les miens** :
`6f870335`, `1a73ce63`, `3b8a5a93`, `8eedc275`, `3e9856c7`. C'est une
**coïncidence de lieu**, pas une preuve de cause.

---

## M6 · La lecture du brief, et ce qui en sort

`m6-lecture-brief.mjs`, sortie `sortie/m6-lecture-brief.json`.

**Ce que la base conserve.** Le **résultat** de la lecture du brief (réussie,
illisible, JSON cassé) n'est enregistré **nulle part** : ni colonne, ni
diagnostic, ni section. → **INCONNU pour les 34**, et il n'est pas reconstruit
ici. Ce qui **en sort** est en revanche conservé : les tables
(`document.entites` depuis le 2026-11-05, le schéma SQL depuis le 2026-11-04).
La coupe à 24 000 signes, elle, se calcule depuis la longueur du cahier.

**Quand « 0 table » a un sens.** Dates lues dans git :
- `c6e6b576` (2026-11-02) : la route accepte des tables ;
- `158bac74` (2026-11-03 23:52 UTC) : la lecture du brief en demande ;
- `17a95453` (2026-11-04 11:23 UTC) : le client les **transmet** de façon fiable.

Avant cette dernière date, « 0 table » n'est pas un échec de lecture : la
chaîne n'existait pas encore, ou perdait ses tables (défaut écrit dans le code).

| | nombre |
|---|---|
| générations où le résultat de la lecture est enregistré | **0 / 34** |
| cahiers coupés à 24 000 signes | 7 / 34 (6 d'octobre, 1 du 2026-11-01), **tous avant** la mise en place de la chaîne ; **0 / 14** après |
| générations après la mise en place de la chaîne | 14 (tables connues pour les 14) |

**Croisement avec les écrans livrés** (les 14, comme en M3)

| | générations | démarrent | écrans distincts (médiane) | signes de l'accueil (médiane) | accueil avec état vide |
|---|---|---|---|---|---|
| **0 table** | 5 | 5 | 2 | 114 | 0 |
| **au moins 1 table** | 9 | 7 | **1** | 158 | 4 |

> **Verdict sur l'hypothèse « 0 table → appli vide » : NON, pour les générations
> de novembre en production.** Les applications **avec** des tables sont aussi
> petites (médiane d'**1** écran) que celles qui n'en ont pas (2 écrans). « 0
> table » ne sépare pas les applications vides des autres.
>
> **Mais pour les cahiers riches (M5), la lecture a bien échoué 2 fois sur 3,
> aujourd'hui** (une réponse illisible, un JSON mal formé), et le pipeline a
> continué sans table. Dans un cas, l'œuvre a ouvert une base inexistante
> (`supabaseUrl is required`). Ce mécanisme est **réel**, mais ce n'est pas lui
> qui explique les petites applications de novembre.

**Fait relié, découvert en mesurant.** Depuis le **2026-11-01 23:28 UTC**
(`fa0ede2c`), la configuration reçue par le générateur est **vide (`{}`) pour 16
générations sur 16**, alors qu'elle portait auparavant la devise et
l'encaissement.
- Cause lue dans le code (`CONCL`, non corrigée) : la génération directe envoie
  `configuration`, la **variable d'état React** initialisée à `{}`
  (`ConversationApplication.tsx:222` et `:1053`), et non `opts.config` que la
  lecture du brief vient de calculer. C'est la classe de défaut déjà corrigée
  pour les tables le 2026-11-04 (« lues dans l'état, elles partaient VIDES »).
- Conséquence mesurée : `juge-devise` n'a rien à juger quand aucune devise
  n'est configurée. Cela concourt à son 0 refus (M4).
- **Conséquence sur ma propre mesure M5 : elle n'était pas fidèle à la
  production sur ce point.** Mes rejeux envoyaient `{ currency: 'XAF' }`, la
  production envoie `{}`.

---

## M7 · « object is not iterable » : l'origine, LUE

`m7-pile.mts` (gratuit). La pile complète est obtenue par **une copie** du
processus enfant du juge (`m7-enfant.mjs`). Seule la capture des erreurs y
diffère, et le `diff` est documenté en tête de la copie. Les positions du
paquet sont ramenées à leur fichier source par les repères `//#region` de
rolldown.

| cas | adresse | pile, jusqu'au code |
|---|---|---|
| pharmacie `f1b753a6` (livrée) | #gestion | `CarteVedette` → `systeme/ui.tsx` : `details.map(([l, v]) => …)` |
| rejeu institution | accueil et #gestion | idem |
| rejeu réservation | accueil et #gestion | idem |

**Ce que le modèle a passé, dans les 3 cas** :
`details={[{ libelle: 'Payées', valeur: … }, …]}`, c'est-à-dire des **objets**.

**Ce que la pièce attend** : des **paires** `[libellé, valeur]`
(`details?: [string, string][]`), qu'elle déstructure avec `([l, v]) =>`. Un
objet ne se déstructure pas comme un tableau : d'où `object is not iterable`.

**D'où vient cette ligne** (`git blame`, `bibliotheque-ui.ts`) : la ligne
`details.map(([l, v])` et la signature de `CarteVedette` → **`6f870335`**. Le
type `[string, string][]` → **`1a73ce63`**. Ce sont deux de **mes** commits du
2026-11-12.

**Pourquoi aucun juge ne l'a arrêté** : la consigne enseigne
`CarteVedette(…, details[])` sans dire la **forme** des éléments, et
`juge-contrat` vérifie le **nom** `details`, qui existe. Il ne vérifie pas la
forme de sa valeur. Le registre porte désormais la gate candidate **G26**.

> **Verdict : l'INCONNU « origine de `object is not iterable` » est levé.**
> 3 cas sur 3 : une pièce que j'ai écrite aujourd'hui exige une forme
> (`[string, string][]`) que le modèle n'emploie pas (`{ libelle, valeur }[]`).

---

## M8 · Bissection sur le cahier institution

Deux copies de travail (`git worktree`), **hors de la branche**. DeepSeek
seulement, un essai par état. Coût **0,2285 $** (plafond 0,50 $).

**Entrées tenues constantes** : le cahier institution, 0 table, devise XAF.
Ce sont les entrées exactes du rejeu M5 « institution » ; la lecture du brief
n'est **pas** rejouée.

**Mesure** : depuis la branche de travail, avec l'instrument de M5
(`m8-mesurer.mts`).

| état | ce qu'il contient | résultat | démarre | erreurs | écrans distincts | signes de l'accueil | « Section inconnue » | écrans vides |
|---|---|---|---|---|---|---|---|---|
| **octobre** `7be93be8` | code livré le 2026-10-30 | accepté au tour 1 | **oui** | 0 | **13** | 857 | 0 | 1 |
| **a)** tentatives 1-2 | HEAD d'aujourd'hui, `bibliotheque-ui.ts` remise à `9cb89380` (avant mes 5 commits) | **ARRÊTÉ sans livrer** : `reading 'replace'` — **défaut de MON instrument** (voir ci-dessous) | — | — | — | — | — | — |
| **a)** tentative 3 (relance accordée, 0,29 $) | idem, **validateur de production** | **INTERROMPU par la garde de budget** avant le tour 3 (0,364 $ + 0,157 $ au pire > 0,5185 $) | — | — | — | — | — | — |
| *a), tour 2 rejoué* | réponse brute conservée du tour 2, rejouée gratuitement comme **dernier** tour (`m8-a-partiel.mts`) | indication, **pas** la ligne a) | **oui** | 0 | **6** | 1 377 | 0 | 1 |
| **b)** | tout le dépôt à `158bac74` (2026-11-03 23:52 UTC) | livré au tour 3 (2 refus de couverture) | **oui** | 0 | **10** | 609 | 0 | 0 |
| *rappel M5* | pipeline d'aujourd'hui complet | livré au tour 3 | **non** (`CarteVedette`) | 3 | 1 | 251 | 0 | 0 |

**Contrôle de cohérence** : `bibliotheque-ui.ts` est **identique à l'octet**
dans a) et b) (`5edfd815…`). Aucun commit n'a touché la bibliothèque entre le
2026-11-03 et mes 5 commits. **a) et b) ne diffèrent donc que par les 48
autres commits.**

**Cause de l'arrêt de a), LUE (étape 0 du 2026-11-12).** Pile :
`sansPrefixe` (`entites-declarees.ts:523`) ← `nomTable` ← `jugerPersistance`
← `boucleEcriture`. Le modèle avait déclaré en cours de route des tables mal
formées ; **la production les filtre** (`schemaEntite.safeParse`), **mon script
passait `validerEntite: () => true`** et les laissait entrer. Rejeu gratuit de
la même réponse (`m8-validateur-a.mts`) : `() => true` → arrêt ;
validateur de production → pas d'arrêt, tables refusées (`appels_offres`,
`clients`, `fournisseurs`…). **Le générateur n'y était pour rien.**
⚠ Défaut d'instrument déclaré : les réponses brutes n'étaient pas nommées par
tentative ; la 3ᵉ exécution a **écrasé** la réponse qui a servi à cette
preuve. Son résultat imprimé est rapporté ici, mais **n'est plus rejouable**
depuis `brut/m8/`. Nommage corrigé.

**Tentative 3, validateur corrigé** : tour 1 refusé (réglages inconnus —
`juge-contrat` — et exigences muettes), tour 2 refusé à son tour (la boucle a
voulu un tour 3), tour 3 **non appelé** : budget accordé atteint. Dépense M8
totale : **0,3636 $**.

**Lecture selon la règle — inchangée** : la ligne a) n'existe toujours pas. Le
tour 2 de a) rejoué démarre (6 écrans) : c'est une **indication** compatible
avec M7, pas la mesure demandée.

**L'arrêt de a), premier examen gratuit** (`m8-pile-a.mts`). La même copie,
nourrie d'une réponse connue (les fichiers de b) à la place du modèle), **ne
plante pas** et livre. L'arrêt dépend donc du **contenu de la réponse** du
modèle pendant a). Cette réponse **n'a pas été conservée** : c'est une lacune
de **mon** instrument, qui ne gardait les fichiers qu'en cas de succès. Elle
est corrigée (réponses brutes et pile désormais conservées). Le générateur
n'a pas été touché.

**Lecture selon la règle du propriétaire**

| condition posée | constat |
|---|---|
| « si a) démarre → mes commits sont suspects n° 1 » | **non applicable** : a) n'a rien livré |
| « si b) démarre et a) non → la régression est dans les 48 autres commits » | b) **démarre**. Mais a) n'a pas « échoué à démarrer » : il n'a **pas été mesuré**. La condition n'est **pas remplie** |
| « si rien ne démarre → antérieure ou inexistante » | **non** : b) démarre |

**Ce que M8 établit malgré tout** :
- sur ce cahier, le générateur du **3 novembre** produit une application qui
  démarre (10 écrans) ;
- le générateur d'**aujourd'hui complet** (M5) produit une application qui ne
  démarre pas, et **M7 lit pourquoi** : `CarteVedette`, mes commits.

Ce sont deux essais uniques, l'un contre l'autre : **le hasard d'un tirage
n'est pas exclu**.

**Ce qu'il manque pour conclure la bissection** : un passage réussi de a),
c'est-à-dire un nouvel essai, avec cette fois la réponse brute conservée.
Le reste du budget M8 (0,27 $) **ne suffit pas** à la garde au tarif de pointe
(jusqu'à 0,29 $ de marge par appel). Je ne relance pas sans accord.

---

# PARTIE II — RÉVISION DE MON DIAGNOSTIC ORAL, AFFIRMATION PAR AFFIRMATION

| ce que j'ai dit | verdict | appui |
|---|---|---|
| « à chaque tour il casse autre chose » | **FAUX** | M1 : 8/48 transitions introduisent une classe nouvelle ; 27/48 restent bloquées sur la même |
| « motif n° 1 : du code qui ne compile pas » | **TROMPEUR** | M2 : au plus 10/20 viennent du modèle ; aucun échec de construction depuis le 2026-11-04 (0/15) |
| « on a surtout construit des contrôleurs, pas de la qualité » | **PARTIEL** | `FAIT` : 78 des 226 commits touchant `apps/web/src/lib/apps` depuis le 2026-08-01 ont « juge » dans leur message (`git log --since=2026-08-01 --oneline [-i --grep=juge] -- apps/web/src/lib/apps \| wc -l`, relancé le 2026-11-12). Un message qui mentionne un juge n'est pas un commit qui ne fait que ça. « Pas de la qualité » n'est pas mesuré. `CONCL` M4 : aucun juge branché ne regarde le rendu |
| « le modèle ne converge pas, livré par épuisement » | **PARTIEL** | M1 : 15/28 livrées au tour 3, mais 13/28 acceptées avant. Les défauts résiduels des livraisons au tour 3 sont en partie `INCONNU` |
| « 11 juges » | **INEXACT** | M4 : 8 branchés pendant la période, 2 jamais branchés, 1 ajouté aujourd'hui |
| « un titre et deux cadres vides » | **VRAI pour les 2 pharmacies** | M3 : 162 et 273 signes, dont deux états vides. Mais la base est absente de l'aperçu **par construction** |
| « les 21 ne sont pas de bonnes applications » | **NON MESURÉ** | M3 : ce qui l'est, c'est la petite taille de 9 d'entre elles et un écran d'erreur |
| « on lui demande de tout réécrire, donc il échoue » | **NON PROUVÉ** | l'architecture est un `FAIT` (médiane de 881 lignes écrites par génération). Le lien « donc il échoue » reste une hypothèse ; M5 (révisée) ne la teste pas |

## Ce qui reste INCONNU

- Le mécanisme exact des 7 échecs « react seul » (4 acceptées l'ont trouvé à la même période).
- Si les 2 « EOF » sont des sorties coupées (drapeau non enregistré).
- Les verdicts `faces` et `gestion` des 15 livraisons au tour 3 (non conservés).
- Les écrans de 6 applications et les tables de 12 (non enregistrés avant novembre).
- Ce que valent les applications **avec des données** : rien de conservé ne le montre.
- Si l'écart octobre → aujourd'hui de M5 est une régression ou le hasard d'un seul tirage par cahier.
- ~~Le point de départ de `object is not iterable`~~ → **levé par M7** : `CarteVedette`, `details.map(([l, v]))`, commits `6f870335` / `1a73ce63`.
- Le résultat de la lecture du brief pour les 34 générations (jamais enregistré, M6).
- ~~La cause de l'arrêt de l'état a)~~ → **lue** : le validateur de mon instrument (`() => true`).
- La ligne a) complète de M8 (interrompue par le budget au tour 3).
- Le comportement du pipeline actuel **avec des tables** sur un cahier riche : non exercé par M5.
- Tout ce qui précède le 2026-10-18 : la base ne contient pas de génération directe plus ancienne.

---

**Je ne propose rien tant que tu n'as pas jugé ces mesures.**

---

# ANNEXE — tableaux générés (`tableaux.mjs`, non retouchés)

### T1 — tour par tour (34 générations)

| génération | date | tour 1 | tour 2 | tour 3 | transitions (MÊME / NOUVELLE / CORRIGÉE) |
|---|---|---|---|---|---|
| `2abfdb08` | 2026-10-18 | — | — | — | — |
| `2ef5f1d3` | 2026-10-19 | ❌ BUILD:PARSE_ERROR | ❌ BUILD:PARSE_ERROR | ❌ BUILD:PARSE_ERROR | 1→2 : 1/0/0 (même erreur exacte) ; 2→3 : 1/0/0 (même erreur exacte) |
| `6f7c9499` | 2026-10-19 | ❌ BUILD:BINDING_NATIF_ROLLDOWN | ❌ BUILD:BINDING_NATIF_ROLLDOWN | ❌ BUILD:BINDING_NATIF_ROLLDOWN | 1→2 : 1/0/0 (même erreur exacte) ; 2→3 : 1/0/0 (même erreur exacte) |
| `4a6e160d` | 2026-10-19 | ✅ accepté | — | — | — |
| `cbf1cb34` | 2026-10-19 | ❌ BUILD:PARSE_ERROR | ✅ accepté | — | 1→2 : 0/0/1 |
| `7be93be8` | 2026-10-30 | ✅ accepté | — | — | — |
| `7d17287f` | 2026-10-31 | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ BUILD:PAQUET_NON_EMBARQUE | 1→2 : 1/0/0 (autre erreur de construction) ; 2→3 : 1/0/0 (autre erreur de construction) |
| `96768b7f` | 2026-10-31 | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ BUILD:PAQUET_NON_EMBARQUE | 1→2 : 1/0/0 (autre erreur de construction) ; 2→3 : 1/0/0 (autre erreur de construction) |
| `eb7b62b5` | 2026-10-31 | ✅ accepté | — | — | — |
| `88c94164` | 2026-10-31 | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ COUV | 📦 livré · résiduels connus : aucun · faces/gestion : INCONNU | 1→2 : 0/1/1 ; 2→3 : 0/0/1 |
| `52f34017` | 2026-11-01 | ❌ COUV | ✅ accepté | — | 1→2 : 0/0/1 |
| `b21cf508` | 2026-11-01 | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ BUILD:PAQUET_NON_EMBARQUE | 1→2 : 1/0/0 (autre erreur de construction) ; 2→3 : 1/0/0 (autre erreur de construction) |
| `950e1b9e` | 2026-11-01 | ❌ JETONS + COUV | ❌ COUV | 📦 livré · résiduels connus : aucun · faces/gestion : INCONNU | 1→2 : 1/0/1 ; 2→3 : 0/0/1 |
| `82d64d9d` | 2026-11-01 | ❌ BUILD:PAQUET_NON_EMBARQUE | ❌ BUILD:PAQUET_NON_EMBARQUE | 📦 livré · résiduels connus : COUV · faces/gestion : INCONNU | 1→2 : 1/0/0 (autre erreur de construction) ; 2→3 : 0/1/1 |
| `91381918` | 2026-11-01 | ❌ SANS-NOM + COUV | ✅ accepté | — | 1→2 : 0/0/2 |
| `f21071cf` | 2026-11-01 | ❌ JETONS + COUV | ❌ COUV | 📦 livré · résiduels connus : COUV · faces/gestion : INCONNU | 1→2 : 1/0/1 ; 2→3 : 1/0/0 |
| `fd1b4896` | 2026-11-01 | ❌ BUILD:PARSE_ERROR | ❌ COUV | 📦 livré · résiduels connus : COUV · faces/gestion : INCONNU | 1→2 : 0/1/1 ; 2→3 : 1/0/0 |
| `d09d921d` | 2026-11-01 | ❌ COUV | ❌ COUV | 📦 livré · résiduels connus : aucun · faces/gestion : INCONNU | 1→2 : 1/0/0 ; 2→3 : 0/0/1 |
| `fa0ede2c` | 2026-11-01 | ❌ MONTE + COUV | ❌ COUV | 📦 livré · résiduels connus : aucun · faces/gestion : INCONNU | 1→2 : 1/0/1 ; 2→3 : 0/0/1 |
| `8a2735f0` | 2026-11-04 | ❌ JETONS | ✅ accepté | — | 1→2 : 0/0/1 |
| `08a20016` | 2026-11-04 | ❌ MONTE | ✅ accepté | — | 1→2 : 0/0/1 |
| `a85966bc` | 2026-11-04 | ✅ accepté | — | — | — |
| `0b1f3bb6` | 2026-11-04 | ❌ MONTE + SANS-TABLE | ❌ MONTE + SANS-TABLE | 📦 livré · résiduels connus : PERSIST · faces/gestion : INCONNU | 1→2 : 2/0/0 ; 2→3 : 0/1/2 |
| `60bf2c40` | 2026-11-04 | ❌ SANS-NOM + SANS-TABLE | ❌ SANS-TABLE | 📦 livré · résiduels connus : PERSIST · faces/gestion : INCONNU | 1→2 : 1/0/1 ; 2→3 : 0/1/1 |
| `15158240` | 2026-11-04 | ❌ MONTE | ✅ accepté | — | 1→2 : 0/0/1 |
| `faa9f0c3` | 2026-11-04 | ❌ COUV | ❌ COUV | 📦 livré · résiduels connus : COUV · faces/gestion : INCONNU | 1→2 : 1/0/0 ; 2→3 : 1/0/0 |
| `d3ece28a` | 2026-11-05 | ❌ MORTS | ✅ accepté | — | 1→2 : 0/0/1 |
| `cec8bddf` | 2026-11-05 | ❌ JETONS + SANS-TABLE | ❌ SANS-TABLE | 📦 livré · résiduels connus : PERSIST · faces/gestion : INCONNU | 1→2 : 1/0/1 ; 2→3 : 0/1/1 |
| `272fa964` | 2026-11-06 | ❌ MONTE | ✅ accepté | — | 1→2 : 0/0/1 |
| `ba20655a` | 2026-11-06 | ✅ accepté | — | — | — |
| `35ed32c1` | 2026-11-06 | ❌ MONTE + MÉMOIRE | ❌ MÉMOIRE | 📦 livré · résiduels connus : PERSIST · faces/gestion : INCONNU | 1→2 : 1/0/1 ; 2→3 : 0/1/1 |
| `97244e75` | 2026-11-06 | ❌ MONTE + FACE-AVANT-CNX + ÉCHEC=VIDE | ❌ FACE-AVANT-CNX | 📦 livré · résiduels connus : aucun · faces/gestion : INCONNU | 1→2 : 1/0/2 ; 2→3 : 0/0/1 |
| `27ba05fb` | 2026-11-12 | ❌ JETONS | ❌ MONTE + FACE-AVANT-CNX + ÉCHEC=VIDE | 📦 livré · résiduels connus : MONTE · faces/gestion : INCONNU | 1→2 : 0/3/1 ; 2→3 : 1/0/2 |
| `f1b753a6` | 2026-11-12 | ❌ MONTE + SANS-NOM + MÉMOIRE + FACE-AVANT-CNX + ÉCHEC=VIDE | ❌ MONTE + MÉMOIRE + FACE-AVANT-CNX | 📦 livré · résiduels connus : MONTE · faces/gestion : INCONNU | 1→2 : 3/0/2 ; 2→3 : 1/0/2 |

Totaux par classe : {"transitions":48,"MEME":30,"NOUVELLE":10,"CORRIGEE":37,"buildMemeErreur":4,"buildAutreErreur":7}  
Totaux par transition : {"toutCorrige":13,"dont_versDernierTourReconstitue":5,"uniquementMeme":27,"uniquementNouvelle":0,"mixte_meme_et_nouvelle":0,"corrigeEtNouvelle":8}

### T2 — les 20 échecs de construction

| génération | date | tour | type | sous-type | fichier / paquets | tronquée | auteur (règle) | avant correctif disque-react | avant correctif clôture |
|---|---|---|---|---|---|---|---|---|---|
| `2ef5f1d3` | 2026-10-19 | 1 | PARSE_ERROR | Unexpected token | index.tsx | null | MODÈLE (syntaxe) | true | true |
| `2ef5f1d3` | 2026-10-19 | 2 | PARSE_ERROR | Expected `}` but found `EOF` | index.tsx | null | MODÈLE (syntaxe) | true | true |
| `2ef5f1d3` | 2026-10-19 | 3 | PARSE_ERROR | Expected `}` but found `EOF` | index.tsx | null | MODÈLE (syntaxe) | true | true |
| `6f7c9499` | 2026-10-19 | 1 | BINDING_NATIF_ROLLDOWN | BINDING_NATIF_ROLLDOWN |  | false | ENVIRONNEMENT | true | true |
| `6f7c9499` | 2026-10-19 | 2 | BINDING_NATIF_ROLLDOWN | BINDING_NATIF_ROLLDOWN |  | false | ENVIRONNEMENT | true | true |
| `6f7c9499` | 2026-10-19 | 3 | BINDING_NATIF_ROLLDOWN | BINDING_NATIF_ROLLDOWN |  | false | ENVIRONNEMENT | true | true |
| `cbf1cb34` | 2026-10-19 | 1 | PARSE_ERROR | Unexpected token. Did you mean `{'>'}` or `&gt;`? | components/NewReading.tsx | false | MODÈLE (syntaxe) | true | true |
| `7d17287f` | 2026-10-31 | 1 | PAQUET_NON_EMBARQUE | contient un paquet natif | react, react-native, expo-status-bar | false | MODÈLE (natif) | true | true |
| `7d17287f` | 2026-10-31 | 2 | PAQUET_NON_EMBARQUE | react / react-dom seulement | react, react-dom/client | false | CONTESTÉ (react seul) | true | true |
| `7d17287f` | 2026-10-31 | 3 | PAQUET_NON_EMBARQUE | react / react-dom seulement | react, react-dom | false | CONTESTÉ (react seul) | true | true |
| `96768b7f` | 2026-10-31 | 1 | PAQUET_NON_EMBARQUE | react / react-dom seulement | react, react-dom/client | false | CONTESTÉ (react seul) | true | true |
| `96768b7f` | 2026-10-31 | 2 | PAQUET_NON_EMBARQUE | react / react-dom seulement | react-dom | false | CONTESTÉ (react seul) | true | true |
| `96768b7f` | 2026-10-31 | 3 | PAQUET_NON_EMBARQUE | react / react-dom seulement | react, react-dom/client | false | CONTESTÉ (react seul) | true | true |
| `88c94164` | 2026-10-31 | 1 | PAQUET_NON_EMBARQUE | contient un paquet natif | react-native-safe-area-context, react-native | false | MODÈLE (natif) | false | true |
| `b21cf508` | 2026-11-01 | 1 | PAQUET_NON_EMBARQUE | react / react-dom seulement | react, react-dom/client | false | CONTESTÉ (react seul) | false | true |
| `b21cf508` | 2026-11-01 | 2 | PAQUET_NON_EMBARQUE | contient un paquet natif | expo | false | MODÈLE (natif) | false | true |
| `b21cf508` | 2026-11-01 | 3 | PAQUET_NON_EMBARQUE | react / react-dom seulement | react, react-dom | false | CONTESTÉ (react seul) | false | true |
| `82d64d9d` | 2026-11-01 | 1 | PAQUET_NON_EMBARQUE | contient un paquet natif | react-native, react-native-safe-area-context | false | MODÈLE (natif) | false | false |
| `82d64d9d` | 2026-11-01 | 2 | PAQUET_NON_EMBARQUE | contient un paquet natif | react-native-safe-area-context | false | MODÈLE (natif) | false | false |
| `fd1b4896` | 2026-11-01 | 1 | PARSE_ERROR | Unterminated string | composants/Pages.tsx | false | MODÈLE (syntaxe) | false | false |

Par type : {"PAQUET_NON_EMBARQUE":12,"PARSE_ERROR":5,"BINDING_NATIF_ROLLDOWN":3}  
Par auteur : {"CONTESTÉ (react seul)":7,"MODÈLE (syntaxe)":5,"MODÈLE (natif)":5,"ENVIRONNEMENT":3}

### T3 — les 21 « livrées sans erreur » (définition : tour accepté ∧ execution.erreurs = ∅ ∧ persistance = ∅)

| génération | date | tour livré | tables | fichiers | lignes | composants | écrans distincts / visités / découverts | écrans enregistrés · dont marqueur vide | accueil : signes · début |
|---|---|---|---|---|---|---|---|---|---|
| `4a6e160d` | 2026-10-19 | 1 | INCONNU | 2 | 1873 | 9 | INCONNU / — / — | 0 · 0 | INCONNU (non enregistré) |
| `cbf1cb34` | 2026-10-19 | 2 | INCONNU | 13 | 1461 | 9 | INCONNU / — / — | 0 · 0 | INCONNU (non enregistré) |
| `7be93be8` | 2026-10-30 | 1 | INCONNU | 6 | 1029 | 12 | INCONNU / — / — | 0 · 0 | INCONNU (non enregistré) |
| `eb7b62b5` | 2026-10-31 | 1 | INCONNU | 14 | 881 | 12 | INCONNU / — / — | 0 · 0 | INCONNU (non enregistré) |
| `88c94164` | 2026-10-31 | 3 | INCONNU | 3 | 767 | 6 | INCONNU / — / — | 0 · 0 | INCONNU (non enregistré) |
| `52f34017` | 2026-11-01 | 2 | INCONNU | 3 | 656 | 7 | 10 / 24 / 66 | 0 · 0 | INCONNU (non enregistré) |
| `950e1b9e` | 2026-11-01 | 3 | INCONNU | 7 | 1093 | 6 | 10 / 24 / 89 | 10 · 2 | 585 · « Hayine Accueil Réservations Agent IA Profil Administration A » |
| `91381918` | 2026-11-01 | 2 | INCONNU | 6 | 1296 | 8 | 7 / 16 / 59 | 7 · 0 | 596 · « Tontine Digitale Accueil Séances Cotisations Enchères Membre » |
| `f21071cf` | 2026-11-01 | 3 | INCONNU | 14 | 1268 | 12 | 10 / 24 / 113 | 10 · 0 | 702 · « CPA-Tchad Accueil La CPA Activités Produits Clients Fourniss » |
| `fd1b4896` | 2026-11-01 | 3 | INCONNU | 5 | 1754 | 13 | 10 / 24 / 111 | 10 · 0 | 1370 · « CPA Accueil La CPA Activités Produits Clients Fournisseurs A » |
| `d09d921d` | 2026-11-01 | 3 | INCONNU | 12 | 1484 | 10 | 10 / 24 / 78 | 10 · 0 | 640 · « CONTERAK Accueil Saisie relevé Historique Comparaison SNE Pa » |
| `fa0ede2c` | 2026-11-01 | 3 | INCONNU | 13 | 1254 | 11 | 10 / 24 / 104 | 10 · 0 | 1112 · « CPA-Tchad Plateforme institutionnelle Accueil Appels d’offre » |
| `8a2735f0` | 2026-11-04 | 2 | 0 | 6 | 411 | 4 | 3 / 7 / 8 | 3 · 1 | 109 · « SNE Énergie Calcul Historique Calcul de consommation Index p » |
| `08a20016` | 2026-11-04 | 2 | 1 | 6 | 638 | 5 | 1 / 0 / 0 | 1 · 0 | 92 · « La configuration de la base de données est manquante. L'appl » |
| `a85966bc` | 2026-11-04 | 1 | 1 | 2 | 430 | 4 | 2 / 4 / 5 | 2 · 0 | 162 · « SNE Saisie Historique Date du relevé Index précédent Index a » |
| `15158240` | 2026-11-04 | 2 | 1 | 1 | 314 | 1 | 3 / 6 / 8 | 3 · 0 | 164 · « Électricité SNE Saisir un relevé Historique Aperçu — les don » |
| `faa9f0c3` | 2026-11-04 | 3 | 4 | 3 | 1330 | 8 | 2 / 12 / 12 | 2 · 2 | 158 · « Tontine Digitale Accueil Tontines Membres Opérations Profil  » |
| `d3ece28a` | 2026-11-05 | 2 | 0 | 3 | 372 | 2 | 2 / 2 / 2 | 2 · 0 | 114 · « Calcul facture Calcul de facture SNE Type de client Domestiq » |
| `272fa964` | 2026-11-06 | 2 | 0 | 2 | 466 | 3 | 2 / 3 / 5 | 2 · 0 | 444 · « Suivi Compteur Accueil Relevés Démonstration Mode démonstrat » |
| `ba20655a` | 2026-11-06 | 1 | 2 | 5 | 613 | 3 | 4 / 9 / 12 | 4 · 0 | 54 · « Association Annonces Gestion Annonces de l'association » |
| `97244e75` | 2026-11-06 | 3 | 2 | 2 | 565 | 7 | 1 / 0 / 0 | 1 · 1 | 69 · « Association Accueil Annonces de l'association Aucune annonce » |

Résumé : {"retenues":21,"mediane_lignesModele":881,"min_lignes":314,"max_lignes":1873,"mediane_composants":7,"mediane_ecransDistincts":4,"apps_1_seul_ecran_distinct":2,"apps_sans_ecran_enregistre":6,"apps_avec_tables":6,"apps_tables_inconnues":12,"apps_zero_table_mesure":3,"accueil_avec_marqueurVide":2,"mediane_signes_accueil":164,"avant_2026_11_04":{"n":12,"mediane_lignes":1268,"mediane_signes_accueil":702,"mediane_ecransDistincts":10},"depuis_2026_11_04":{"n":9,"mediane_lignes":466,"mediane_signes_accueil":114,"mediane_ecransDistincts":2},"longueur_mediane_cahier_avant":22866,"longueur_mediane_cahier_depuis":268}

### T4 — les juges

| fichier | entré le | branché dans la boucle | générations exposées | tours refusés | intitulés observés |
|---|---|---|---|---|---|
| juge-bandeau.ts | 2026-11-05 | **non** | 0 | 0 | — |
| juge-contrat.ts | 2026-11-12 | oui | 1 | 0 | — |
| juge-couverture.ts | 2026-10-31 | oui | 25 | 14 | COUV |
| juge-devise.ts | 2026-10-31 | oui | 25 | 0 | — |
| juge-execution.ts | 2026-10-31 | oui | 24 | 14 | MONTE, SANS-NOM |
| juge-faces.ts | 2026-11-06 | oui | 3 | 8 | FACE-AVANT-CNX, ÉCHEC=VIDE |
| juge-gestion.ts | 2026-11-05 | oui | 6 | 0 | — |
| juge-jetons.ts | 2026-10-31 | oui | 24 | 5 | JETONS |
| juge-navigateur.ts | 2026-11-05 | **non** | 0 | 0 | — |
| juge-persistance.ts | 2026-11-03 | oui | 15 | 10 | SANS-TABLE, MÉMOIRE |
| juge-vivacite.ts | 2026-10-31 | oui | 25 | 1 | MORTS |
| *(assemblage — pas de fichier juge)* | 2026-10-18 | oui | 33 | 20 | BUILD |

Co-occurrences dans un même tour refusé :

- 4 × FACE-AVANT-CNX ⟷ MONTE
- 3 × MÉMOIRE ⟷ MONTE
- 3 × MONTE ⟷ ÉCHEC=VIDE
- 3 × FACE-AVANT-CNX ⟷ ÉCHEC=VIDE
- 2 × COUV ⟷ JETONS
- 2 × SANS-TABLE ⟷ MONTE
- 2 × MÉMOIRE ⟷ FACE-AVANT-CNX
- 1 × SANS-NOM ⟷ COUV
- 1 × COUV ⟷ MONTE
- 1 × SANS-TABLE ⟷ SANS-NOM
- 1 × SANS-TABLE ⟷ JETONS
- 1 × SANS-NOM ⟷ MONTE
- 1 × SANS-NOM ⟷ MÉMOIRE
- 1 × SANS-NOM ⟷ FACE-AVANT-CNX
- 1 × SANS-NOM ⟷ ÉCHEC=VIDE
- 1 × MÉMOIRE ⟷ ÉCHEC=VIDE

### T5 — commits suspects (`m5-suspects.mjs`, non retouchés)

| commit | date | +/− | sujet | fichiers du générateur |
|---|---|---|---|---|
| `83a7261e` | 2026-11-04T05:25 | +2/−3 | Zero question avant de construire — et la phrase qui mentait est partie | entites-declarees.ts |
| `17a95453` | 2026-11-04T06:23 | +96/−4 | Le bandeau mentait : la page publiee ne recevait jamais sa base | api/livraison/route.ts, base-de-l-oeuvre.ts, boucle-directe.ts |
| `78d6b589` | 2026-11-04T07:59 | +31/−6 | La cle etait fabriquee, renvoyee, et jetee dans la meme milliseconde | compte-oeuvre.ts |
| `7d4a3777` | 2026-11-04T09:16 | +382/−13 | Le constructeur declare ce dont il a besoin, et le refus propose | api/compte/route.ts, api/direct/route.ts, boucle-directe.ts, declaration-en-route.ts, entites-declarees.ts, juge-persistance.ts, retouche.ts |
| `631a362f` | 2026-11-04T09:37 | +252/−0 | M1 — ce qu'une modification n'a pas le droit de faire | entites-declarees.ts, migration-oeuvre.ts |
| `d242de5f` | 2026-11-04T09:56 | +301/−0 | M2 — la liste des formes emettables est BLANCHE, et elle a trouve deux trous | migration-sql.ts |
| `5a27dc36` | 2026-11-04T10:29 | +48/−13 | M2 complete — A, B, C, et la regle du jour | migration-sql.ts |
| `f33cd699` | 2026-11-04T11:40 | +176/−19 | L'apercu s'apercoit, et aucun mot brut n'atteint l'ecran | api/direct/route.ts, entites-declarees.ts, phrase-erreur.ts |
| `6a37e52d` | 2026-11-04T13:36 | +182/−0 | D — la connexion du migrateur n'a qu'un lecteur, et la classe security definer est fermee | connexion-migrateur.ts |
| `dde8eb1a` | 2026-11-04T14:10 | +51/−2 | La base dit qui nous sommes — et la variable de production porte un nom double | connexion-migrateur.ts |
| `b1b34297` | 2026-11-04T15:18 | +18/−1 | La sonde dit si la variable ARRIVE, pas si elle existe | api/schema/route.ts |
| `091aeef9` | 2026-11-04T15:41 | +308/−5 | M3 — l'instantane hors transaction, la porte eprouvee, et les comptes | connexion-migrateur.ts, instantane-migration.ts, migration-sql.ts |
| `0cea6e52` | 2026-11-04T16:24 | +37/−0 | Une retouche coupee ne s'ecrit plus par-dessus la bonne | api/retoucher/route.ts |
| `1d2df026` | 2026-11-04T17:20 | +168/−1 | M4 (a) — la declaration existe, et elle est montree | api/direct/route.ts, api/retoucher/route.ts, declaration-depuis-schema.ts, retouche.ts |
| `fa1150ea` | 2026-11-04T17:47 | +102/−13 | B et C — l'oeuvre amnesique ne se publie plus, et le dernier tour offre deux sorties | api/direct/route.ts, api/publier/route.ts, boucle-directe.ts, juge-persistance.ts |
| `6643ca5b` | 2026-11-04T23:28 | +42/−3 | Le faux arret sur le type — il aurait bloque tout M4 | entites-declarees.ts, migration-oeuvre.ts |
| `7ea15ead` | 2026-11-04T23:56 | +54/−1 | Ni taire ni garder — ne pas comparer | declaration-depuis-schema.ts, entites-declarees.ts, migration-oeuvre.ts |
| `20f866cd` | 2026-11-05T00:13 | +94/−14 | (b) — la retouche passe les six juges, et deux etaient inertes | api/direct/route.ts, api/retoucher/route.ts |
| `017b61c5` | 2026-11-05T00:33 | +282/−15 | Le perimetre est ouvert — et ce qui arrive aux donnees se dit avant, en francais | api/retoucher/route.ts, phrase-migration.ts, retouche.ts |
| `4da2c45e` | 2026-11-05T02:44 | +198/−6 | La prudence ne se paie pas deux fois | api/retoucher/route.ts, versions-oeuvre.ts |
| `07904438` | 2026-11-05T04:46 | +99/−0 | L'accueil parle des quatre choix, pas de trois | invites-accueil.ts |
| `22459094` | 2026-11-05T05:15 | +102/−0 | (b) — le juge rencontre enfin ce que la personne rencontre | juge-execution-enfant.mjs |
| `9aacbd0d` | 2026-11-05T05:31 | +17/−1 | Une oeuvre publiee porte son adresse — et « publiee » n'est pas « livree » | api/mes-applications/route.ts |
| `e730aa4d` | 2026-11-05T05:47 | +153/−0 | (c) — un vrai navigateur dans la chaine, et il dit la verite | juge-navigateur-enfant.mjs |
| `a83ba8e3` | 2026-11-05T05:57 | +52/−13 | Le bouchon — et la racine n'est pas une ligne de code | juge-navigateur-enfant.mjs |
| `a450c71e` | 2026-11-05T06:27 | +131/−0 | (c) fini — le juge navigateur branche la ou il peut tourner | juge-navigateur.ts |
| `ab824dd0` | 2026-11-05T06:40 | +114/−10 | A — l'apercu d'une oeuvre publiee ne mente plus | api/direct/[id]/route.ts, api/mes-applications/route.ts, boucle-directe.ts, entites-declarees.ts, sous-domaine.ts |
| `54b0d4b9` | 2026-11-05T07:37 | +149/−4 | Deux routes, deux regimes — les applications publiees redemarrent | boucle-directe.ts, publication.ts |
| `28d201ed` | 2026-11-05T15:02 | +69/−0 | P1 — une table declare si sa lecture est publique | entites-declarees.ts |
| `51699028` | 2026-11-05T15:49 | +169/−2 | P3 P4 P5 — le drapeau traverse, le diff le nomme, l'ecran le dit avant | api/publier/route.ts, migration-oeuvre.ts, phrase-migration.ts |
| `e1d49b4f` | 2026-11-05T16:16 | +63/−0 | La garde d'exposition — tenter n'est pas reussir | poser-oeuvre.ts |
| `854a9d5a` | 2026-11-05T17:10 | +15/−0 | A1 — le modele apprend qu'une oeuvre a donnees a un espace de gestion | entites-declarees.ts |
| `726d4415` | 2026-11-05T18:45 | +120/−2 | Le bandeau inverse, et une borne qui ne bornait rien | entites-declarees.ts, juge-bandeau.ts |
| `f6a9ff4b` | 2026-11-05T19:00 | +254/−13 | A2 A3 — le juge de la gestion, et son hypothese dite a voix haute | boucle-directe.ts, juge-gestion.ts, juge-persistance.ts |
| `1be52a6c` | 2026-11-05T20:25 | +93/−13 | C0 — l'angle mort du chemin sans table, ferme par construction | boucle-directe.ts, entites-declarees.ts, juge-bandeau.ts, juge-navigateur.ts |
| `59d53645` | 2026-11-05T21:35 | +60/−8 | C4 C1 C2 — l'exemple ne peut plus devenir un produit, et le fil passe | boucle-directe.ts, entites-declarees.ts, fil-accueil.ts, retouche.ts |
| `543d04a4` | 2026-11-06T04:58 | +64/−8 | EP-366 — « je n'ai rien mesure » ne se dit pas « 1,00 » | api/direct/route.ts, api/retoucher/route.ts, juge-couverture.ts, retouche.ts |
| `8e8a6a25` | 2026-11-06T05:35 | +283/−14 | EP-367 ②beta — le juge MESURE, il ne reproche pas | exigences-demande.ts, juge-couverture.ts |
| `bb88f640` | 2026-11-06T06:55 | +154/−22 | La loi public/gestion ① — la chaîne avant la consigne | api/retoucher/route.ts, boucle-directe.ts, declaration-en-route.ts |
| `16a6efd5` | 2026-11-06T07:08 | +82/−18 | La loi public/gestion ② — la loi dite, et les deux chemins vers la gestion | entites-declarees.ts |
| `3293ab9c` | 2026-11-06T07:38 | +3/−1 | La loi public/gestion ③ — quatre cliquets rouges, et ce qu'ils disaient | entites-declarees.ts |
| `67e26f79` | 2026-11-06T07:55 | +2/−1 | La loi public/gestion ④ — deux restitutions, trouvées par un diff dans les DEUX sens | entites-declarees.ts |
| `29d082c9` | 2026-11-06T09:22 | +495/−0 | J1 + ② — les deux faces se mesurent en montant, et le juge REFUSE | boucle-directe.ts, juge-faces-enfant.mjs, juge-faces.ts |
| `7aad0835` | 2026-11-06T09:39 | +26/−13 | J1 — trois rouges de gate, et le vocabulaire fige au registre | boucle-directe.ts, juge-faces-enfant.mjs, juge-faces.ts |
| `40b7e193` | 2026-11-09T09:10 | +8/−3 | LOT 11 A bis — approuver un compte, dans le tableau de bord | sous-domaine.ts |
| `d2680578` | 2026-11-09T22:31 | +5/−1 | LOT 13.2 — la Centrale ouvre les plis, retient et répond | sous-domaine.ts |
| `faf87ca2` | 2026-11-10T14:42 | +1/−1 | Sous-domaines : « guide » réservé (nouvelle route du produit, cliquet EP-291) | sous-domaine.ts |
| `5eec5a55` | 2026-11-12T05:24 | +1/−1 | feat(editeur): l'éditeur visuel en 3 colonnes — structure, aperçu réel, réglages | sous-domaine.ts |
| `6f870335` | 2026-11-12T07:13 | +567/−9 | feat(generateur): Deribfy apprend à faire un tableau de bord pour les applis qu'il génère | bibliotheque-ui.ts |
| `1a73ce63` | 2026-11-12T08:00 | +72/−16 | fix(generateur): le tableau de bord tient face à ce que le modèle écrit vraiment — mesuré sur une vr | bibliotheque-ui.ts |
| `3b8a5a93` | 2026-11-12T08:09 | +66/−6 | fix(generateur): le juge monte l'espace de gestion ; champs nommés ; tendances honnêtes | bibliotheque-ui.ts, boucle-directe.ts, juge-execution-enfant.mjs, juge-execution.ts |
| `8eedc275` | 2026-11-12T08:21 | +209/−58 | feat(generateur): quatre mises en page pour l'espace de gestion des applis générées | bibliotheque-ui.ts |
| `3e9856c7` | 2026-11-12T15:38 | +295/−9 | fix(generateur): le contrat des pièces — enseigné, jugé, et un plantage ne blanchit plus l'écran | bibliotheque-ui.ts, boucle-directe.ts, juge-contrat.ts |
