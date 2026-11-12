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

## M5 · Expérience d'isolation — PRÉPARÉE, NON LANCÉE

`m5-isolation.mts` : **aucun fournisseur n'a été appelé** (`sortie/m5-plan.json`).
Il faut `TIR_PAYANT=oui` **et** `--lancer` pour qu'il appelle.

**Plan.** Rejouer des cahiers réels avec le pipeline réel de production
(`boucleEcriture` + `consignePour` + `appelerFournisseur` + le validateur
d'entités de la route), en ne changeant que le fournisseur.

**Défaut de plan, signalé avant tout lancement.** Le pipeline d'aujourd'hui
n'est pas celui de ces générations. Le bras Anthropic seul comparerait « autre
modèle + autre pipeline » à l'historique, et n'isolerait **rien**. Le script a
donc deux bras sur le pipeline d'aujourd'hui :

- **A = Anthropic** (`claude-opus-5`), comme demandé ;
- **T = DeepSeek** (`deepseek-v4-pro`), le témoin.

Seule la différence A − T isole le modèle.

**Sélection selon la règle déclarée** (les 3 plus récentes refusées au tour 1,
hors panne d'environnement, avec cahier, entités et configuration, et des
cahiers distincts) :

| génération | tables | refus au tour 1 | A Anthropic : estimé (plafond) | T DeepSeek : estimé (plafond) |
|---|---|---|---|---|
| `f1b753a6` pharmacie | 6 | ne se monte pas + sans nom + mémoire + avant connexion + échec = vide | 1,87 $ (3,00 $) | 0,32 $ (0,94 $) |
| `97244e75` association | 2 | ne se monte pas + avant connexion + échec = vide | 1,02 $ (2,86 $) | 0,18 $ (0,90 $) |
| `272fa964` ⚠ | 0 | ne se monte pas | 0,52 $ (2,53 $) | 0,09 $ (0,81 $) |
| **total** | | | **≈ 3,42 $ (plafond 8,39 $)** | **≈ 0,58 $ (plafond 2,65 $)** |

- **Estimation** : jetons réellement consommés par ces générations × tarifs de
  `fournisseur.ts`, aux heures pleines. Les tokeniseurs diffèrent d'un
  fournisseur à l'autre : facteur `INCONNU`.
- **Plafond dur** : 3 tours × sortie maximale du fournisseur, plus l'entrée
  observée triplée.
- Ce que ces générations ont réellement coûté avec DeepSeek : 0,159 + 0,089 + 0,043 $.

**⚠ Un problème que la règle a fait apparaître.** Le cahier de `272fa964` est
« oui cest bien une application » (29 signes) : c'est le défaut connu où la
confirmation partait à la place de la description. La règle déclarée la
retient. **Je ne la modifie pas après avoir vu le résultat.** Avec une règle
amendée qui écarte les cahiers de moins de 200 signes, seuls **2** cahiers
restent éligibles (`f1b753a6`, `97244e75`). Total : A ≈ 2,90 $, T ≈ 0,50 $.

**Ce que M5 pourra prouver, et ce qu'elle ne pourra pas.**
- Avec 3 cahiers (ou 2) et **un seul tirage** par bras, elle montrera un écart
  **grossier** entre modèles sur ces cahiers. Par exemple : Anthropic passe le
  tour 1 là où DeepSeek échoue sur la même consigne.
- Elle **n'établira pas de taux** : un modèle de langage varie d'un tirage à
  l'autre, et n = 3 ne mesure pas cette variance.

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
| « on lui demande de tout réécrire, donc il échoue » | **NON PROUVÉ** | l'architecture est un `FAIT` (médiane de 881 lignes écrites par génération). Le lien « donc il échoue » est une hypothèse : c'est M5 qui pourrait en tester une partie |

## Ce qui reste INCONNU

- Le mécanisme exact des 7 échecs « react seul » (4 acceptées l'ont trouvé à la même période).
- Si les 2 « EOF » sont des sorties coupées (drapeau non enregistré).
- Les verdicts `faces` et `gestion` des 15 livraisons au tour 3 (non conservés).
- Les écrans de 6 applications et les tables de 12 (non enregistrés avant novembre).
- Ce que valent les applications **avec des données** : rien de conservé ne le montre.
- La part du modèle et celle du pipeline dans les échecs : c'est M5, non lancée.
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
