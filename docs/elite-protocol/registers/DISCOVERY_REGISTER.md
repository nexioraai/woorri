# DISCOVERY REGISTER

> **Règle de tenue** : une découverte n'est JAMAIS supprimée, même après
> correction. Son statut évolue ; son enregistrement demeure. Toute
> découverte corrigée doit engendrer un test de non-régression permanent.

**Convention d'identifiants** : `APP-Dnnn` (application) · `PROTOCOL-Dnnn`
(protocole) · `GEN-Dnnn` (générateur).

Une découverte n'est comptée comme telle que si **elle n'était présente dans
aucune information fournie comme défaut connu**.

---

## VOCABULAIRE FIGÉ — MOTEUR · APPLI · SITE

> **Posé le 2026-11-06, après une demi-journée perdue à les confondre.**
> Ces trois mots s'emploient **sans exception** dans tout rapport, tout
> commit et tout en-tête de cliquet.

> ⚠️ **CORRIGÉ LE 2026-11-06, QUELQUES HEURES APRÈS AVOIR ÉTÉ POSÉ.**
> La version d'origine disait « MOTEUR — l'unique générateur. Il n'y en a
> qu'un ». **Mesuré : il y en a DEUX.** La définition de SITE comme « ce que
> le moteur ne sait pas produire » était donc fausse — elle décrivait un
> générateur en ignorant l'autre. Les deux versions sont conservées : c'est
> la règle de tenue de ce registre.

**MOTEUR D'APPLIS** — `src/lib/apps/` · génère une œuvre depuis une demande en
langue naturelle, en un seul document servi sur tous les chemins. 55
générations mesurées, 2 avec des tables.

**MOTEUR DE SITES** — `src/app/sites/[slug]/` · **95 fichiers, 828 Ko**, en
production, **42 sites en base** dont plusieurs sur domaine propre
(`biyaminchine.com`, `yiaglobalcommodities.com`). Mesuré le 2026-11-06 sur un
site vivant :

| | |
|---|---|
| `/` | 200 · 35 047 o sur le fil |
| `/blog` | 200 · une page **différente** |
| `/nimportequoi` | **404** — un vrai |
| `/robots.txt` | 200 |
| métadonnées | `<title>`, `description`, `canonical`, `og:title`, **JSON-LD** — rendues côté SERVEUR |

Il a aussi `/blog/[post]/` et `/produits/[id]/` — **une page adressable par
ligne de table**, exactement ce que j'avais déclaré impossible. Et quatre
routes de **téléversement de fichiers** qui tournent en production
(`site-images`, `pod-designs`), avec un an de cache sur les fichiers déposés.

**Ce que la version d'origine affirmait et qui est réfuté** : « le moteur ne
sait pas produire une adresse par page, un rendu indexable, un 404 ». Le
moteur d'APPLIS ne sait pas. **Le moteur de SITES le fait déjà, en
production.**

**APPLI** — ce que le moteur sait produire *aujourd'hui* : des écrans, une
connexion, de la saisie, un menu latéral, **un seul document servi sur tous
les chemins**. Son public est le **propriétaire**.

**SITE** — ce que le moteur **ne sait pas** produire : une adresse par page,
des pages imbriquées sur trois niveaux, une barre de menu en haut, un pied de
page, un rendu indexable, une mise en cache. Son public est le **visiteur**.

### La règle d'usage

**Ne jamais dire « il n'y a pas de distinction ».** Dire toujours DEUX choses
séparément :

1. ce que le **moteur** fait ;
2. quel **objet** il produit.

**Quand les deux ne coïncident pas, c'est précisément l'information utile.**

### Ce que la confusion a coûté

La phrase fautive était : *« dans Deribfy il n'y a pas site et application, il
y a une seule question : l'œuvre déclare-t-elle des tables ? »* Elle est
**vraie du MOTEUR et fausse du PRODUIT**. Elle a été écrite, relayée, corrigée
par le propriétaire — et les trois parties ont continué à mélanger les deux
pendant des heures.

La preuve de la distinction était déjà dans le tableau qui accompagnait la
phrase fautive : les huit composants mesurés absents de la bibliothèque —
`Menu`, `Tableau`, `FilAriane`, `Pied`, `Pagination`, `Recherche`, `Onglet`,
`Accordeon` — sont **tous** des pièces de SITE. **Aucun** n'est une pièce
d'APPLI. Une bibliothèque faite pour des APPLIS ne produit pas un SITE par
enrichissement : elle produit un SITE qui ressemble à une APPLI.

### L'état au 2026-11-06

| | |
|---|---|
| le portail CPA | un **SITE** → donc le moteur de SITES |
| l'œuvre `asosa` | une **APPLI** → le moteur d'APPLIS |
| les deux moteurs | **distincts, et tous deux en production** |

La question n'est donc plus « faut-il un régime site dans le moteur ». Elle
est : **que manque-t-il au moteur de SITES pour qu'il produise un portail
institutionnel ?** C'est une question beaucoup plus petite, et elle se
chiffre.

### Ce que cette erreur a coûté, et comment elle s'est produite

J'ai analysé le moteur d'APPLIS pendant une journée entière, conclu que « le
moteur ne sait pas produire un SITE », chiffré un lot de 7 h 30 pour écrire
une loi, puis un juge de refus — tout cela en ignorant 95 fichiers et 42
sites en production dans le même dépôt.

La cause n'est pas un manque de mesure : c'est d'avoir mesuré **le périmètre
que j'avais supposé**. Les cinq modules que j'avais classés « morts » le
2026-11-06 — `FamilyFilter`, `themeRegistry`, `ImageProduit`,
`DesignUploader`, `checkSectionOrder` — appartiennent TOUS à ce générateur. Je
les ai comptés comme dette sans me demander de quel produit ils étaient la
dette.

**La règle qui en sort** : avant de conclure qu'un dépôt ne sait pas faire une
chose, énumérer ses générateurs. Pas ses modules — ses **produits**.

---

## HORS-CHANTIER DU 2026-11-06 — MESURÉ, NOTÉ, NON CORRIGÉ

> **RÈGLE DU PROPRIÉTAIRE, 2026-11-06** : le seul objectif est de finir le
> site CPA. Tout défaut trouvé en chemin qui ne le concerne pas se note ici,
> daté, avec sa mesure — et on passe. On y revient quand le site CPA est fini.
>
> Ces entrées sont donc **ouvertes et volontairement non traitées**. Aucune
> n'est une supposition : chacune porte la commande qui l'a produite.

### GEN-D023 — La dérivation du type schema.org LIT DES MOTS

`src/app/sites/[slug]/themes/JsonLd.tsx` · `resolveSchemaType(site.type)`
classe 43 sites en cherchant des mots dans un champ de **texte libre** :

```
24 × Store          12 × LocalBusiness (repli)
 3 × AutoPartsStore  2 × Organization      2 × Restaurant
```

**LE PREMIER MOT TROUVÉ GAGNE, sans regarder le reste de la phrase.** Mesuré :
cinq sites portent « en ligne » ou « Online » dans leur type, et le mot
`boutique` ou `store` les attrape avant — dans la **même phrase**.

**Le quasi-accident** : `t.includes('pharmaci') → Pharmacy`. Le type de la CPA
est « Institution publique de santé » ; s'il avait porté « pharmaceutique »,
nous aurions déclaré à Google un **établissement public d'État comme une
officine de quartier**, et personne ne l'aurait vu.

**Et la dérivation n'est pas à jeter** : 24 des 29 attrapes sont franchement
justes. Elle est juste à **83 %**. Ce qui doit tomber est ailleurs — voir
GEN-D024.

### GEN-D024 — `isPhysical: true` affirmé sur 9 sites qui n'ont aucun local

Même fichier. Le drapeau commande l'émission de l'adresse et de la position.
Mesuré : **9 sites sur 43** déclarent à Google des locaux qui n'existent pas,
alors que **leur propre type dit explicitement le contraire** :

```
Online Beauty & Cosmetics Retailer          → LocalBusiness · isPhysical:true
Dropshipping Electronics Retailer           → LocalBusiness · isPhysical:true
Marque de vêtements … imprimés à la demande → LocalBusiness · isPhysical:true
Plateforme de personnalisation d'articles   → LocalBusiness · isPhysical:true
Children's Clothing Dropshipping Store      → Store         · isPhysical:true
Boutique en ligne - Articles tendance       → Store         · isPhysical:true
Boutique de Mode en Ligne                   → Store         · isPhysical:true
Online Sportswear Dropshipping Store        → Store         · isPhysical:true
Boutique de vêtements en ligne              → Store         · isPhysical:true
```

**LA RÈGLE QUI EN SORT** : un local physique ne se déduit pas d'un nom de
métier. Il se déduit d'une adresse vérifiée, ou **il ne s'affirme pas**. Même
discipline que partout ailleurs ce jour-là : le silence vaut mieux qu'une
affirmation fausse — et ici l'affirmation est tournée vers l'EXTÉRIEUR, vers
Google, pas vers nous.

`schema.org` porte **`OnlineStore`** depuis 2022 : c'est le type juste pour
cinq d'entre eux.

### GEN-D025 — Le libellé vient du site, la destination l'ignore

`EditorialTheme.tsx` et ses trois jumeaux :

```ts
const cta = site.cta || t.labels.contactCta      // le LIBELLÉ vient du site
const ctaHref = hasShop ? '#shop' : '#contact'   // la DESTINATION l'ignore
```

**43 sites sur 43** portent un `cta` propre. Mesuré : « Commander maintenant »
→ `#contact`. « Consulter les appels d'offres » → `#contact`. Ce n'est pas un
cas CPA : c'est **tout le monde**.

A2 réglera la destination des appels d'offres pour la CPA. **La forme reste à
régler** : deux sources pour un même bouton.

### GEN-D029 — `priceRange` émis sur une `Organization` non physique

`JsonLd.tsx`. `priceRange` est une propriété de `LocalBusiness` en
schema.org ; l'émettre sur une `Organization` n'est pas valide.

**Mesuré** : la fixture du cliquet `priceRangeJsonLd` est le site YIA,
`type: 'import export'` — donc `isPhysical: false` — et le CHANTIER 5 avait
décidé **exprès** qu'il émette sa fourchette de prix. Quatre cas le gardent.

**Comment c'est apparu** : en gardant `priceRange` derrière `isPhysical` pour
la CPA, j'ai fait rougir ces quatre cas. Ma garde changeait le JSON-LD d'un
AUTRE site pour réparer celui de la CPA. Resserrée au seul cas
`GovernmentOrganization`, par la règle du 2026-11-06.

**Reste ouvert** : faut-il retirer `priceRange` à toute `Organization` non
physique — 3 sites sur 43 — et que devient alors la décision du CHANTIER 5 ?

### GEN-D030 — `isPhysical: false` ne retirait que l'adresse

Même fichier. Le drapeau gardait la ligne 184 (`address`) et laissait passer
**`geo` et `priceRange`**. Le site de la CPA, déclaré
`GovernmentOrganization`, annonçait donc encore une position sur la carte et
une fourchette de prix.

**TROUVÉ EN REMESURANT L'ÉCRAN APRÈS LE DÉPLOIEMENT, pas en relisant le
code.** La correction de A1(c) paraissait complète ; elle ne l'était qu'au
tiers — trois lignes vertes sur cinq. Sans la remesure, « corrigé » aurait été
annoncé sur un tiers de correction.

`geo` est désormais gardé (3 sites touchés, le retrait est juste pour les
trois). `priceRange` ne l'est que pour un organisme public — voir GEN-D029.

### GEN-D026 — `sites_sous_domaines` : capacité construite, jamais employée

La table existe. La route `api/sites/adresse` existe. Le proxy sert
`*.deribfy.app` **SITE d'abord, application ensuite**, avec ce commentaire :
« les slugs portent un horodatage, personne n'imprime ça sur une carte ».

**Mesuré : la table est VIDE — zéro ligne sur 43 sites.** Vingt-huitième cas
de la famille « prouvé sans appelant », et c'est précisément la capacité dont
le site CPA a besoin. Traité dans A1(d), pour la CPA seulement.

**RECTIFICATION DATÉE DU 2026-11-06 — LA CAPACITÉ EST EMPLOYÉE.** Une ligne,
posée à **17:07 UTC** par A1(d) :

```
nom = cpa-tchad  ·  site_slug = centrale-pharmaceutique-d-achats-cpa-1793979506814
```

Mesuré à l'écran le même jour : `https://cpa-tchad.deribfy.app/` rend
**HTTP 200, 145 943 o**, titre « Centrale Pharmaceutique d'Achats (CPA) —
Approvisionner la santé publique au Tchad ». Le slug long, lui, rend
**HTTP 000** : aucun certificat n'a jamais été émis pour ce nom (GEN-D022 — un
sous-domaine jamais demandé n'en a pas). L'adresse publique **n'est donc pas**
le slug : c'est `sites_sous_domaines` qui la porte. Le vingt-huitième cas de
« prouvé sans appelant » est fermé. Voir **GEN-D036** pour ce que cette
jointure ne garantit pas.

### GEN-D027 — `getVideo()` chez Pexels, zéro appelant

`src/lib/pexels.ts` expose une recherche de vidéos — qualité HD/SD. Aucun
appelant. Vingt-neuvième cas. Et il ne servira pas : la règle du propriétaire
interdit les médias par défaut.

### GEN-D028 — Les images d'agence sont injectées PAR NOUS, délibérément

`api/chat/route.ts`. Le modèle rend `gallery: []` — la consigne le lui ordonne
à la ligne 610 : « Gallery images are selected automatically from a stock
photo library after your response ». Puis **notre route remplit** :

```
ligne  995  fetchPexelsPhotos(pexelsQuery, parsed.primaryColor)
ligne 1000  heroImage = pioche.choisir(heroPhotos, true) || …
ligne 1100  hero_image: heroImage
ligne 1108  gallery
```

Le site CPA en porte **31**. Un établissement public illustré par des photos
d'agence n'est pas crédible.

**Le lot, chiffré le 2026-11-06, NON ENGAGÉ** : P1 injection conditionnelle
2 h · P2 emplacements visiblement vides dans les 4 thèmes 4 h · P3 le tableau
de bord nomme ce qui manque 2 h · P4 la condition — **non chiffrable**, aucune
propriété ne distingue un établissement public d'une boutique.

**Deux voies**, l'arbitrage reste ouvert : **A** jamais pour un institutionnel,
emplacement invitant ailleurs — 8 h, bloquée par P4. **B** emplacement
visiblement vide pour tous, jamais d'image d'agence — **6 h, zéro décision**.
Les sites existants gardent leurs photos ; seules les générations futures
naissent vides.

**Et pour le site CPA, ce lot n'est pas requis** : ses 31 photos sont du
CONTENU en base, retirables depuis le tableau de bord. Zéro heure.

---

### A2 (c) — MESURE DE CLÔTURE, à l'écran servi, dans les deux sens

2026-11-06, `c5e36079` déployé. **19 / 19** sur
`https://cpa-tchad.deribfy.app`, instrument versionné
`scripts/prouver-ecran-appels-offres.mjs`.

**Le relevé d'AVANT vaut autant que celui d'après** : l'adresse rendait
**HTTP 404** six minutes plus tôt. C'est ce qui prouve que le 200 vient de ce
déploiement et pas d'autre chose.

| | mesuré |
|---|---|
| à zéro avis | la page se sert · dit qu'aucun avis n'est publié · **n'invente aucun canal** · donne le contact réellement déclaré |
| avis publié | référence, objet, **heure**, état, adresse — tout paraît ; le détail porte une rubrique absente de la liste et DIT que les non renseignées ne l'ont pas été |
| ailleurs | **aucune fuite sur les 8 autres sites servis**, tous RÉELLEMENT lus (compté à part) ; la même adresse rend 404 chez un autre acheteur |
| retrait | vérifié **depuis l'adresse publique** : liste muette · adresse en 404 · base à 0. Confirmé une seconde fois à la main, hors de la sonde |

**Le témoin a vécu 12 secondes** (21:23:00 → 21:23:12), référence
`TEMOIN-JETABLE-20261106T212256`, objet en capitales « CECI N'EST PAS UN AVIS
DE MARCHÉ… Ne pas y répondre » — conditions posées par le propriétaire.

**Rectification d'un chiffre que j'avais donné** : **9 sites servis**, pas 43.
Les 43 comptent les non publiés et les archivés. La mesure de non-fuite porte
donc sur 8 sites, et c'est le dénominateur réel.

### A2 (b) — MESURE DE CLÔTURE, à l'écran servi, trois témoins

2026-11-06, `7ba57af1` déployé en 64 s. **26 / 26** sur
`https://cpa-tchad.deribfy.app`, instrument versionné
`scripts/prouver-ecran-appels-offres.mjs`. Relevé d'avant : `/api/version`
rendait `c7d8625` — c'est lui qui donne sa valeur au `7ba57af` d'après.

**P-01 PROUVÉ PAR LA MESURE, et c'est la pièce maîtresse de ce lot.** Les deux
mutations que le cliquet unitaire ne peut PAS voir :

| mutation | cliquet unitaire | sonde d'écran |
|---|---|---|
| le JSX cesse de rendre `(prévisionnelle)` | **53/53 VERT** | 🔴 point 12 |
| le bandeau « aucune offre recevable » retiré | **53/53 VERT** | 🔴 point 14 |

Chaque instrument attrape exactement ce que l'autre ne voit pas. Le principe
n'est pas une intention : il est mesuré.

**Le témoin EN PRÉPARATION, désigné par le propriétaire comme la pièce à
regarder** — « le seul des trois dont le faux vert serait invisible ; les deux
autres se voient à l'œil ». Six points lui sont consacrés, dont **deux de
contrôle inverse** (17, 18) : prouver que la marque apparaît ne dit rien tant
qu'on n'a pas prouvé qu'elle n'apparaît **pas ailleurs**. Un avis échu garde
bien le libellé « limite » et ne porte ni bandeau ni marque.

**Retrait** : vérifié depuis l'adresse publique pour les trois témoins (liste
muette · trois 404 · base à 0), puis **confirmé une seconde fois à la main**,
hors de la sonde qui venait de nettoyer. Témoins vivants **12 secondes**
(03:00:40Z → 03:00:52Z).

**Non-fuite** : 8 autres sites servis, **tous réellement lus**, zéro illisible.

### PRINCIPE P-01 — Un cliquet garde la règle, une sonde d'écran garde le rendu

**Posé par le propriétaire le 2026-11-06, comme principe général et non comme
note de lot. C'est la synthèse de la journée.**

> **Un cliquet qui lit le source garde la RÈGLE.**
> **Une sonde d'écran garde le RENDU.**
> **Aucun des deux ne fait le travail de l'autre, et prétendre le contraire
> produit un vert qui ne mesure rien.**

**La forme générale du défaut** : *un instrument qui prétend couvrir ce qu'il
ne peut pas voir.* Il ne tombe jamais en panne — il rend le résultat qu'on
espérait, et le vert se lit comme une preuve.

#### Ce que ce principe explique, dans la journée du 2026-11-06

| l'instrument | ce qu'il voyait | ce qu'il prétendait couvrir |
|---|---|---|
| `expect(liste).toMatch(/t\.previsionnel/)` | une **présence** dans le source | que la marque **s'affiche** (GEN-D041) |
| le bloc SQL comptant `pg_views` | la vérité du **moteur** | que la vue soit **atteignable par l'API** — `PGRST205` |
| `(lecture.data ?? []).length === 0` | un **repli** | une **absence constatée** (GEN-D037) |
| une substitution `python3` sans `assert` | **rien** | qu'une mutation ait eu lieu (GEN-D038) |
| une injection `503` | une requête **rejouée** | une panne **subie** (GEN-D038) |
| une branche redondante mutée | **rien** | une règle **défendue** (GEN-D040) |
| `/\bretiré\b/` | **jamais vrai** | un journal **relu** |

Sept instruments, un seul défaut. Aucun n'était cassé ; tous mesuraient à côté
de ce qu'ils annonçaient.

#### Comment l'appliquer

**① Avant d'écrire une assertion, dire ce qu'elle NE peut pas voir.** Si la
phrase est difficile, l'assertion couvre probablement moins qu'on croit.

**② Quand la frontière est irréductible, la NOMMER dans le fichier** plutôt
que de la combler par une ancre de forme. Exemple tenu le même jour :
distinguer `{ech.marque && …}` de `{false && …}` dans un source **demanderait
exactement l'ancre de forme qui vient de tromper**. La note vit donc dans le
cliquet, et la sonde d'écran prend le relais — versionnée, pas promise.

**③ Un vert ne vaut que lié à son geste.** Une mutation verte a deux lectures,
et il faut trancher : cliquet aveugle, ou mutation sans effet (GEN-D040).

**④ Appairer les instruments.** Toute règle qui finit à l'écran a DEUX
gardiens : un cliquet pour la règle, une sonde pour le rendu. L'absence du
second se consigne ; elle ne se suppose pas comblée par le premier.

**Statut** : 🟢 **PRINCIPE POSÉ** — il gouverne les cliquets et les sondes du
dépôt

### GEN-D040 — Une branche qu'aucune mutation ne peut faire rougir est une branche qu'aucun test ne défend

**Règle, pas incident** — retenue par le propriétaire le 2026-11-06.

`cycleDeVie.ts`, première rédaction :

```ts
if (avis.etat === 'attribue' || avis.etat === 'preparation') return avis.etat
if (avis.etat !== 'ouvert') return avis.etat
```

J'ai muté la première ligne pour éprouver le cliquet : **43 tests verts**. La
conclusion facile était « le cliquet ne couvre pas `preparation` ». La vraie
cause : la seconde ligne rendait déjà la même chose. **Il n'y avait rien à
casser.**

**La branche se supprime, elle ne se commente pas.** Une ligne qui documente
sans décider appartient au commentaire ; laissée dans le code, elle se fait
passer pour une garde, et une garde qu'on ne peut pas faire rougir se fait
passer pour une garde éprouvée.

**Corollaire opératoire** : une mutation VERTE a deux lectures — « le cliquet
est aveugle » ou « la mutation n'a rien changé ». **Trancher avant de
conclure.** Une fois la branche retirée, la vraie mutation (faire tomber
`preparation` dans la logique d'échéance) a rougi en nommant sa règle.

**Même famille que GEN-D038** — l'absence d'effet se lit comme l'effet
attendu — mais la cause est inverse : là une substitution qui n'avait pas
pris, ici un code qui n'avait rien à perdre.

### GEN-D041 — Une ancre de forme qui ne couvre pas la perte laisse l'écran mentir

Mesuré le 2026-11-06, lot A2 b1. Le cliquet gardait la marque
« (prévisionnelle) » ainsi :

```ts
expect(liste).toMatch(/t\.previsionnel/)
```

Muter le rendu en `{false && <span>{t.previsionnel}</span>}` laissait **49
tests verts** : le texte restait dans le fichier, le marqueur disparaissait de
l'écran. L'assertion vérifiait une PRÉSENCE dans le source, jamais un
AFFICHAGE.

**Contre-mesure** : la règle a été déplacée dans une fonction pure —
`echeanceAffichee(remiseLe, etatVisible, lang)` — que des cas tiennent par son
COMPORTEMENT, et que les deux surfaces partagent. La muter fait désormais
rougir. Bénéfice second, non cherché : liste et détail ne peuvent plus
diverger sur ce que « prévisionnelle » veut dire.

**ET LA FRONTIÈRE EST NOMMÉE, pas maquillée.** Muter le JSX lui-même
(`{false && …}`) laisse encore les 53 tests verts, et **aucun test lisant le
source ne peut faire mieux** : distinguer `{ech.marque && …}` de
`{false && …}` demanderait précisément une ancre de forme — la chose qui vient
de tromper. Donc : ce cliquet garde la **règle**, la sonde d'écran garde le
**rendu**. La note est écrite dans le fichier de test, à l'endroit où
quelqu'un la cherchera.

**Statut** : 🟢 **RÈGLE DÉPLACÉE ET ÉPROUVÉE** · frontière documentée, rendu
couvert par `prouver-ecran-appels-offres.mjs`

### GEN-D038 — Une mutation OU une injection dont on ne vérifie pas l'effet est un non-événement lu comme un verdict

**Classe, pas incident** — consigne du propriétaire le 2026-11-06 : les deux
occurrences ci-dessous sont la MÊME forme, et la seconde l'a prouvé en
m'attrapant alors que je connaissais déjà la première.

| | ce que je croyais faire | ce qui se passait | ce que j'allais conclure |
|---|---|---|---|
| **mutation à vide** | casser le code pour voir le cliquet rougir | mes chaînes de remplacement ne correspondaient à rien (apostrophe contre accent grave) — **le fichier n'a pas bougé** | « 0 rouge → le cliquet est inutile » |
| **injection guérie** | tuer la relecture d'une garde avec un `503` | **supabase-js REJOUE un 5xx** : `#4` tuée, `#5` le même GET en `200`, `reste.status = 200` | « alerte muette → défaut confirmé » |

Dans les deux cas, **l'absence d'effet se lit exactement comme l'effet
attendu**. Et dans les deux cas la conclusion que j'allais tirer était
*vraisemblable* — c'est ce qui rend la forme dangereuse : elle ne produit
jamais d'anomalie, elle produit la réponse qu'on cherchait.

**La règle** : toute mutation, toute injection, toute panne simulée se
PROUVE AVANT d'être interprétée. La preuve n'est pas l'intention du geste,
c'est une observation séparée — le diff du fichier, la trace des requêtes, le
code d'erreur réellement reçu. Dans le cas de l'injection, la trace
`#4 ← TUÉE (503)` suivie de `#5 … 200` était la seule chose qui disait la
vérité ; sans elle j'aurais signé un défaut sur un instrument qui ne mesurait
rien.

**Corollaire pratique mesuré** : un **5xx ne simule pas une panne** côté
Supabase — il est rejoué. Un **4xx** l'est fidèlement, et `403 / 42501` est en
plus la panne réaliste (privilège retiré en cours de route).

**Statut** : 🟢 **CLASSE POSÉE**, instrument versionné
(`scripts/prouver-garde-temoin.mjs`)

### GEN-D039 — Un relevé rouge dont on ne publie pas les lignes devient une capture d'écran qui fait peur trois heures plus tard

**Règle de compte rendu, posée contre moi-même le 2026-11-06 et retenue par le
propriétaire.**

J'avais rapporté « 8/21 — l'instrument sait rougir » et rien de plus. Trois
heures après, Youssouf montre au propriétaire la capture de ce relevé : onze
lignes rouges, dont « anon SELECT sur la TABLE → **accordé** ». Il a fallu
remesurer en direct, rétablir l'horodatage (EST contre UTC, cinq heures
d'écart) et expliquer les onze lignes une par une pour établir que le relevé
**précédait de treize minutes** la pose de la vue.

**Aucune de ces onze lignes n'était fausse.** Elles étaient PÉRIMÉES, et rien
dans ce que j'avais écrit ne permettait de le savoir.

**La règle** : un relevé rouge se rend **en entier**, ou l'on dit
explicitement *pourquoi* ses rouges sont attendus et *à quelle date* il se
rapporte. Un résumé qui garde le score et jette les lignes transforme une
mesure en rumeur.

**Corollaire** : tout relevé porte un horodatage **non ambigu**. Ma sonde
imprimait UTC, les captures de l'écran affichaient l'heure locale (EST) — deux
séries qui semblaient sans rapport. L'instrument doit dire son fuseau, ou
imprimer les deux.

**Statut** : 🟢 **RÈGLE POSÉE**

### GEN-D037 — Un repli silencieux transforme une lecture ratée en preuve d'absence — trois occurrences, dont une dans une garde de la maison

**Classe nommée par le propriétaire le 2026-11-06**, après que j'ai trouvé la
première dans ma propre sonde d'écran : *« une mesure qui confond une absence
et une impossibilité de mesurer »*. Sa consigne : chercher la forme ailleurs.
Trois occurrences trouvées, toutes de la même structure —

```
(lecture.data ?? []).length   →  0   attendu « 0 »   →  VERT
```

Le repli `?? []` rend une longueur de 0 quand la lecture a **échoué**. Un
point qui attend « 0 », « absent » ou « aucun » passe alors au vert **sans
avoir rien lu**.

| # | où | ce que le faux vert aurait annoncé |
|---|---|---|
| ① | `prouver-ecran-appels-offres.mjs`, l'échéance | « l'heure est absente » sur une page jamais servie. **Rougi par chance** : son attendu était « présent ». Quatre points voisins attendaient « absent » |
| ② | `mesurer-appels-offres.mjs`, point 21 | « aucune fuite sur les autres sites » alors que la requête de contrôle avait échoué |
| ③ | `scripts/temoin-en-base.mjs` — **fichier de la maison** | « témoin retiré » **sans relecture réussie**, sur une table de VRAIS CLIENTS |

**Le cas ③ est le plus grave, et il est dans l'intention même du fichier.**
Son commentaire dit : « il est VÉRIFIÉ : annoncer un retrait sans le relire
serait exactement le genre d'affirmation que le protocole interdit. » Le code :

```js
const reste = await sb.from(table).select('id').eq('id', id).maybeSingle()
if (del.error !== null || reste.data !== null) { /* RETRAIT RATÉ */ }
else { journal('retiré', id) }
```

`reste.error` n'est **jamais** consulté — mesuré, aucune occurrence dans le
fichier. Relecture en échec → `reste.data === null` → branche « retiré ». Un
témoin peut survivre sur la table de production pendant que le journal jure
qu'il a disparu.

**Pourquoi la forme est si difficile à voir** : elle ne produit jamais
d'erreur, jamais de rouge, jamais de ligne de log. Elle produit le résultat
qu'on espérait. Et elle se niche précisément dans les assertions NÉGATIVES —
celles qu'on écrit parce qu'on a compris que prouver l'absence est le travail
difficile.

**Corrigés** : ① et ② — les deux erreurs de lecture sont désormais nommées
séparément et remontent comme valeur obtenue (`LECTURE RATÉE <code>`,
`RELECTURE IMPOSSIBLE <code>`), jamais fondues dans un zéro.

**③ CORRIGÉ le 2026-11-06 sur ordre du propriétaire** — « la correction ne
peut rendre cette garde que plus bruyante, jamais plus silencieuse. Mais ne la
corrige pas par raisonnement : force une relecture en échec et montre que
l'alerte se déclenche vraiment. »

Instrument versionné avec la mesure : `scripts/prouver-garde-temoin.mjs`.
`fetch` intercepté, la suppression passe, **seule la relecture reçoit une
erreur**.

```
code d'origine (HEAD)  →  alerte MUETTE, et le journal imprime « retiré »
code corrigé           →  alerte, avec la cause exacte
```

#### Deux trouvailles DANS la démonstration, et la première l'invalidait

**(a) UN 5xx NE SIMULE PAS UNE PANNE : supabase-js REJOUE.** Première
injection, 503. La trace montre `#4 GET … ← TUÉE (503)` puis **`#5` le MÊME
GET en 200**, et `reste.status = 200`. L'alerte restait muette **pour une
autre raison que le défaut**. Ma première « démonstration » ne démontrait
rien — le client guérissait la panne que je croyais injecter. Une injection
dont on ne vérifie pas l'effet est une mutation sans `assert`. Un **4xx** n'est
pas rejoué : `403 / 42501`, qui est aussi la panne réaliste (privilège retiré
en cours de route).

**(b) `\b` NE BORNE PAS UN MOT ACCENTUÉ.** En JavaScript, `\b` se fonde sur
`[A-Za-z0-9_]` ; **`é` n'en fait pas partie**, donc `/\bretiré\b/` est
TOUJOURS faux. Mon indicateur annonçait « le journal ne dit pas retiré » sur un
journal qui imprimait `retiré 40e17a7c…`. J'avais **resserré** une
vérification correcte (`/retiré/`) et je l'avais rendue aveugle. Même famille
que l'ancre de forme convertie en propriété sans vérifier qu'elle couvre la
même perte.

**LE CHIFFRE DEMANDÉ PAR LE PROPRIÉTAIRE** — « combien d'autres de tes motifs
emploient `\b` sur du français ? » Balayage de `apps/web`, littéraux regex
seulement, `node_modules` exclu :

```
fichiers contenant « \b »                          78
occurrences de « \b » dans des littéraux regex    359
AVEUGLES (\b adjacent à un caractère non-ASCII)     0
\w adjacent à un caractère non-ASCII                0   (même racine)
```

**Le détecteur a été éprouvé avant d'être cru** : sur un cas témoin,
`/\bretiré\b/` est détecté, `/\bpublie\b/` est correctement ignoré. Un
détecteur qui n'a jamais rien trouvé ne prouve rien — c'est la leçon du
cliquet jamais vu rouge, appliquée à un balayage.

La seule occurrence aveugle du dépôt était la mienne, du jour même, et elle
est corrigée.

**Statut** : 🟢 **①②③ CORRIGÉS**, ③ démontré sur le code réel

### DEBT-073 — FERMÉE PAR RICOCHET pour deux vues sur trois, et la mesure dit laquelle reste seule

Fermeture consignée le 2026-11-06 sur demande du propriétaire, **avec sa
mesure et avec sa borne**. DEBT-073 : `ALTER DEFAULT PRIVILEGES … GRANT ALL ON
TABLES` couvre aussi les VUES ; une vue de `public` naît écrivable par `anon`,
et un `GRANT SELECT` n'annule rien — il ajoute.

Jusqu'ici une seule garde existait : **retirer le privilège**. Elle est
réparable, donc oubliable. La mesure du 2026-11-06 en révèle une seconde,
**structurelle**, et dit exactement où elle s'applique — une tentative
d'`INSERT` anonyme sur chaque vue publique du dépôt :

| vue | code | ce qui refuse |
|---|---|---|
| `appels_offres_public` | **55000** | **la STRUCTURE** — `FROM` à deux relations, vue non auto-modifiable |
| `site_blog_posts_public` | **55000** | **la STRUCTURE** — même patron, même jointure sur `sites_public` |
| `sites_public` | **42501** | **le PRIVILÈGE SEUL** — `FROM` à une relation, la vue EST auto-modifiable |
| `catalog_products_public_view` | `PGRST205` | absente de l'API — non exposée à `anon` |

**Ce que ça veut dire.** Toute vue qui **joint `sites_public` pour hériter
l'invariant de lecture** devient, par le même trait, **impossible à écrire** :
PostgreSQL exige une règle `DO INSTEAD` ou un trigger `INSTEAD OF`, et refuse
**avant** de regarder le moindre privilège. Un trait de conception, deux
gardes.

**Et ce que ça ne veut pas dire.** `sites_public` — la vue sur laquelle le
défaut s'est réellement produit, cinq jours durant — **n'a toujours qu'une
seule garde**. Son `FROM` ne porte qu'une relation ; elle est auto-modifiable ;
seul le `REVOKE` la protège. Déclarer « DEBT-073 fermée » sans cette ligne
serait exactement le genre de fermeture qui ne mesure rien.

**Statut** : 🟢 **FERMÉE PAR RICOCHET** sur les deux vues jointes ·
🟠 **une garde unique subsiste sur `sites_public`**, et elle est versionnée
(`views_privileges_hardening.sql` + le cliquet `sqlViewPrivileges.test.ts`)

### GEN-D036 — L'adresse publique de la CPA dépend du SLUG, et rien ne tient ce lien

`sites_sous_domaines` rattache `nom` → **`site_slug`**, pas `site_id`.

**Mesuré le 2026-11-06** : une ligne dont `site_slug` vaut
`slug-qui-nexiste-absolument-pas` est **ACCEPTÉE**. Il n'y a **aucune clé
étrangère** sur cette colonne.

**Conséquence.** Renommer `sites.slug` orphelinerait la ligne **en silence** —
pas d'erreur, pas de contrainte violée — et `cpa-tchad.deribfy.app`
cesserait de résoudre. L'adresse que la CPA imprimera tomberait sans que rien
ne le signale.

**Pourquoi c'est noté maintenant.** Le propriétaire a arbitré de différer le
renommage du slug, sur la prémisse « depuis la bascule vers `site_id` un
renommage ne casserait plus rien ». La bascule a couvert `appels_offres` et le
blog multi-tenant. **Elle n'a jamais touché `sites_sous_domaines`.** La
prémisse est donc vraie pour les deux tables migrées et fausse pour celle qui
porte l'adresse.

**L'arbitrage ne change pas** : différer reste bon, et c'est même *plus* vrai
maintenant — tant que le slug ne bouge pas, rien ne casse. Ce qui change, c'est
que le renommage n'est **pas gratuit** : il exige de mettre à jour cette ligne
dans le même geste.

**LA RÉPARATION, ÉCRITE ICI POUR QUE PERSONNE N'AIT À LA REDÉRIVER.**
Arbitrage du propriétaire, 2026-11-06 : **différer, confirmé** — et la
réparation se note à côté du défaut.

```sql
-- Posable tant que la table est petite ; `on update cascade` fait suivre
-- l'adresse quand le slug change, au lieu de l'orpheliner en silence.
alter table public.sites_sous_domaines
  add constraint sites_sous_domaines_site_slug_fkey
  foreign key (site_slug) references public.sites (slug)
  on update cascade on delete cascade;
```

`ON UPDATE CASCADE` est le point qui compte : sans lui, le renommage serait
soit REFUSÉ (et l'on croirait à un bug), soit permis en laissant l'adresse
morte. Avec lui, le renommage devient réellement gratuit — ce que la prémisse
du propriétaire supposait déjà.

`ON DELETE CASCADE` reprend la sémantique déjà en place ailleurs : un site
supprimé emporte ses rattachements.

**Pourquoi PAS la bascule vers `site_id`**, pourtant plus conforme à la règle
« un identifiant ne change jamais » : le proxy résout par **slug** (mesuré :
`url.pathname = /sites/${slug}${pathname}`). Basculer la table imposerait une
jointure sur le chemin chaud de CHAQUE requête entrante. La FK obtient le même
résultat sans toucher le proxy. **Non chiffrée, hors chantier A2.**

**AMENDEMENT DE LA RÈGLE, PAR LE PROPRIÉTAIRE, 2026-11-06.** Acceptation
explicite de l'argument, et précision de sa propre règle :

> « Ma règle *on n'attache pas des données à un nom* portait sur des
> **CONTENUS** — des articles, des avis. Une **table de routage** dont l'objet
> même est de porter un nom est le cas où elle ne s'applique pas. »

La règle n'est donc pas « identifiant partout », mais : **un contenu se
rattache par identifiant ; une table dont la raison d'être EST le nom se
rattache par le nom, et la clé étrangère `on update cascade` fait le reste.**
`appels_offres` et `site_blog_posts` relèvent du premier cas, `sites_sous_domaines`
du second.

**Statut** : 🟠 **DIFFÉRÉ, confirmé** — réparation écrite ci-dessus, prête à
poser le jour du renommage

### GEN-D034 — Deux attendus faux dans MON bloc de vérification ont fait passer une application RÉUSSIE pour un échec

Le 2026-11-06, le propriétaire applique `appels_offres.sql`. Les trois
contrôles passent. Mais **deux de mes « ATTENDU » ne décrivaient pas la
requête placée juste en dessous** :

| contrôle | mon attendu | mesuré | pourquoi mon chiffre était faux |
|---|---|---|---|
| contraintes après | `6` | **7** | j'ai prédit l'« avant » (3) avec `contraintes_vivantes`, qui ne rapporte **pas les clés étrangères**, et vérifié avec `pg_constraint`, qui les compte (4). Deux instruments, deux dénominateurs, comparés l'un à l'autre |
| privilèges de la vue | « exactement **deux** lignes » | **16** | ma requête **ne filtre pas le bénéficiaire**. 16 = anon 1 + authenticated 1 + postgres 7 + service_role 7. L'assertion juste n'est pas un compte de lignes, c'est « anon et authenticated n'ont que SELECT » |

**Ce que ça coûte** : un faux rouge. Le propriétaire a vu `7` là où j'annonçais
`6`, et `16 rows` là où j'annonçais `2`. Rien n'était cassé — **mon attendu
l'était**. Un faux rouge dépense la confiance qu'un vrai rouge exige.

**La règle** : un attendu se dérive de **l'instrument qui le vérifiera**,
jamais d'un relevé pris avec un autre. Même famille que
[[verification-qui-compte-les-ajouts]] et le relevé `DETTE_OPAQUE` du matin
(361 écrit depuis un script jetable, 376 rendu par le cliquet embarqué).

**Corrigé** : les deux attendus rectifiés **dans le fichier**, datés, avec leur
cause. Et une quatrième requête ajoutée, resserrée sur `anon` et
`authenticated` — celle dont « exactement deux lignes » était vrai.

**Statut** : 🟢 **CORRIGÉ**

### GEN-D035 — La vue refuse l'écriture par sa STRUCTURE, pas par son privilège — et c'est ce qui manquait à `sites_public`

Mesuré le 2026-11-06, après application. J'attendais `42501` (privilège
refusé) sur `INSERT`/`UPDATE`/`DELETE` d'`anon` dans `appels_offres_public`.
La base rend **`55000`** — `object_not_in_prerequisite_state` :

> cannot insert into view … You need an unconditional ON INSERT DO INSTEAD
> rule or an INSTEAD OF INSERT trigger.

**La vue n'est pas AUTO-MODIFIABLE**, parce que son `FROM` porte **deux
relations** — la jointure sur `sites_public`. PostgreSQL refuse l'écriture
**avant toute question de privilège**.

**C'est exactement ce qui a manqué à `sites_public`.** Son `FROM` ne portait
qu'**une** relation : elle *était* auto-modifiable, et le `GRANT ALL` posé par
défaut suffisait à la rendre écrivable par un visiteur anonyme — DEBT-073,
cinq jours.

**Donc la jointure qui porte l'invariant de lecture ferme aussi l'écriture.**
Un seul trait de conception, deux gardes. Ce n'était pas mon intention : je
joignais `sites_public` pour hériter « site publié ET non archivé ». La
seconde garde est un effet, mesuré après coup, pas un mérite.

**Ce que ça change pour le cliquet** : le point n'asserte plus le **code**
mais le **refus**, et il imprime le mécanisme. Exiger `42501` ferait rougir un
état MEILLEUR que l'attendu — et un cliquet qui rougit sur une amélioration
finit désarmé. La garde de privilège se mesure ailleurs, dans
`information_schema`.

**Reste ouvert** : combien des autres vues publiques du dépôt sont
auto-modifiables ? `sites_public` l'était. `catalog_products_public_view` et
`site_blog_posts_public` n'ont jamais été mesurées sous cet angle — seul leur
privilège l'a été.

**Statut** : 🟢 **MESURÉ** · 🟠 **question ouverte sur les autres vues**

### GEN-D031 — Mes 14 points verts mesuraient une convention, pas un invariant

**La phrase est au registre telle quelle, à la demande du propriétaire.**

`appels_offres`. J'ai bâti la lecture publique sur **une policy de table** :
`grant select to anon` + `using (publie = true)`. Puis j'ai annoncé 14 points
verts. Les 14 étaient justes sur ce qu'ils testaient. Aucun ne testait le
**site**.

**Mesuré le 2026-11-06**, sur un site réel non publié (`eclat-style`,
`published = false`, non archivé) : un avis `publie = true` rattaché à ce site
est **lu par `anon`**. Le blog du même site, interrogé en même temps par le
même client : **0 article**.

| | `appels_offres` (mon patron) | `site_blog_posts` (patron de la maison) |
|---|---|---|
| `anon` sur la TABLE | `SELECT` accordé | `42501` sur les quatre verbes |
| l'invariant | `publie = true`, écrit dans une policy | « article publié **ET** site publié **ET** site non archivé », écrit dans la **définition de la vue** |
| un site non publié | ses avis sont **visibles** | ses articles sont **invisibles** |

**La cause n'est pas l'oubli d'une clause** — c'est l'endroit où l'invariant
vit. `sites_public` n'expose **ni `published` ni `archived_at`** : une vue qui
s'y joint **hérite** la clause et il devient *syntaxiquement impossible* de la
réécrire en aval. Une policy, elle, se recopie — donc s'oublie. La phrase du
fichier de la maison le dit : « Une régression de ce fichier ne peut pas
exposer un brouillon ni le contenu d'un site archivé : **la base ne les rend
pas**. C'est ce qui distingue un invariant d'une convention. »

**Ce qui tenait quand même** : `INSERT`, `UPDATE`, `DELETE` → `42501` les
trois. Le trou était exactement, et seulement, le chemin de lecture.

**Contre-mesure** : `appels_offres.sql` — plus aucun privilège à `anon` sur la
table, vue `appels_offres_public` en `security_invoker = false` jointe à
`sites_public`. Écrit, **non encore appliqué**.

**Statut** : 🟠 **TROU MESURÉ, CORRECTIF ÉCRIT, APPLICATION EN ATTENTE**

### GEN-D032 — Une table qui n'est pas un fichier est hors de portée de TOUS les cliquets

**C'est la découverte qui explique GEN-D031**, et elle vaut plus que lui.

**Mesuré le 2026-11-06** : `grep -rl "appels_offres" .` sur tout le dépôt
(suivi et non suivi, hors `node_modules`) → **aucun fichier**. `git status`
→ **propre**. Aucun commit local non poussé.

Donc : la table existe **en base et nulle part ailleurs**. Le SQL qui l'a
créée n'a jamais été un fichier — il n'a existé que comme **texte dans mes
messages**, que le propriétaire a collé dans l'éditeur Supabase. Et les
14 points étaient un **script jetable**, aujourd'hui disparu : *il n'y a rien
à rejouer*.

**Pourquoi aucun instrument ne pouvait le voir.** La maison a construit les
bons cliquets — et ils lisent tous des **fichiers** :

- `sqlViewPrivileges.test.ts` (DEBT-073) énumère `supabase/sql/*.sql` et exige
  `REVOKE` avant `GRANT` sur chaque vue. Son propre en-tête le dit : « il ne
  lit pas la base — il lit les FICHIERS de `supabase/sql/`, **qui sont la
  seule source versionnée de ce que le projet déclare déployer** » ;
- `siteFreshness.test.ts` compare `security_invoker` à `sites_public_view.sql` ;
- `staleSqlObsolescence.test.ts`, `views_privileges_hardening.sql`, idem.

Aucun n'a failli. `appels_offres` **n'était dans le dénominateur d'aucun**.
Un objet hors fichier est hors mesure, par construction — pas par défaut
d'instrument.

**La maison avait déjà nommé cette dette** : `site_blog_posts.sql` porte en
en-tête « rien de ce lot n'était versionné — c'est précisément la lacune que
**DEBT-074** nommait, et que ce fichier ferme. » Je l'ai rouverte.

**Corollaire, et c'est la règle à garder** : un relevé ne vaut que si
l'instrument qui le produit **entre dans le dépôt avec lui**. Un chiffre
annoncé depuis un script écrit à côté n'est pas un relevé, c'est un souvenir.

**Contre-mesure** : deux fichiers dans `supabase/sql/` — ce qui les fait
entrer d'office dans le dénominateur de DEBT-073 — et un cliquet versionné qui
remplace le script perdu.

**Reste ouvert** : rien ne compare la **base en ligne** à `supabase/sql/`. Un
objet créé à la main resterait invisible. `contraintes_vivantes.sql` fait
exactement cela pour les contraintes d'**une** table nommée ; personne ne
l'exécute sur l'ensemble.

**Statut** : 🟠 **CLASSE OUVERTE** — la cause est traitée pour `appels_offres`,
pas pour la prochaine table

### GEN-D033 — Une projection étroite sur une colonne absente servait 2 articles en `noindex` — réparé PAR ACCIDENT

`src/app/blog/[slug]/page.tsx:23`, blog de la **plateforme** (`blog_posts`).

```ts
.select("title, excerpt, content, cover_image")
```

**Mesuré** : PostgREST rend **`42703`** sur une colonne inexistante — il ne la
rend pas nulle, il refuse la requête entière. Vérifié en nommant une colonne
inventée sur cette table même.

Donc tant que `excerpt` n'existait pas sur `blog_posts`, `article` valait
`null`, et `generateMetadata` renvoyait, pour **chaque** article publié :
`title: "Article introuvable — Deribfy"` et `robots: { index: false }`. Le
corps de la page, lui, fait son propre `select("*")` et s'affichait
normalement — **l'article était lisible, et son en-tête disait qu'il n'existait
pas.**

**Comment la colonne est arrivée** : par **mon erreur du 2026-11-06**. Je
visais le blog multi-tenant et j'ai fait appliquer mon SQL à `blog_posts`, la
mauvaise table. Trois colonnes inutilisées ont été retirées ; `excerpt` a été
gardée *parce qu'un lecteur réel la nommait*. Je n'avais pas vu que ce lecteur
**échouait** faute d'elle.

**Mesuré à l'écran le 2026-11-06**, `https://www.deribfy.com/blog/creer-un-site-dropshipping-rapidement` :
HTTP 200 · `<title>Créer un site dropshipping rapidement : le guide complet
pour entrepreneurs — Blog Deribfy</title>` · `robots: index, follow` ·
**0 occurrence de `noindex`**. `excerpt` est `NULL` sur les 2 articles, et le
repli en cascade (`?? content`) écrit la description — comportement voulu.

**Ce que je ne peux pas prouver** : l'état d'avant. Je n'ai pas d'observation
de l'écran antérieure à mon ajout. Le mécanisme (`42703`) est **mesuré** ;
l'état d'avant en est **déduit**, pas constaté.

**Même famille que DEBT-068**, que le fichier cite déjà en commentaire : une
garde lisant une colonne jamais demandée. Ici le miroir — un lecteur demandant
une colonne jamais créée.

**Reste ouvert** : combien d'autres projections étroites nomment une colonne
absente ? Un `42703` ne casse pas l'écran, il vide une variable — et le repli
le masque. Aucun cliquet ne compare les colonnes nommées dans un `.select()`
aux colonnes réelles. `contextResolvesRealColumns.test.ts` le fait pour **une**
route.

**Statut** : 🟢 **FERMÉ pour les 2 articles** (mesuré à l'écran) · 🟠 **classe
ouverte**

---

## APP-D001 — `field.unique` déclaré mais jamais traduit en contrainte SQL

| | |
|---|---|
| **Date** | 2026-08-29 |
| **Type** | 🟢 **BLIND DISCOVERY** — jamais mentionnée par le propriétaire ni par aucune fiche DET |
| **Contexte** | sonde aveugle lancée depuis les 44 champs de schéma non couverts par une obligation (voir PROTOCOL-D003) |
| **Observation brute** | `grep -n "unique" packages/provisioner/src/sql-gen.ts` → **0 occurrence**. Le générateur SQL produit PK, FK, CHECK d'énums et index ; il ignore `field.unique` |
| **Méthode de découverte** | hypothèse H1 formulée depuis la liste des champs non couverts, testée sur les 13 documents |
| **Portée mesurée** | **23 champs** déclarés `unique: true`, répartis sur **12 documents sur 13** |
| **Exemples** | `billetterie-concerts / ent_billet.fld_billet_code_scan` — deux billets peuvent porter le même code de scan · `ent_billet.fld_billet_reference` · `agence-immo / ent_bien.fld_bien_reference` |
| **Impact** | 🔴 **intégrité de données** — la classe la plus grave : corrompt le stock, pas l'affichage. Aucun validateur, aucun Oracle, aucune fiche DET ne le voit |
| **Reproductibilité** | 🟢 déterministe — `scratchpad/blind.mjs` |
| **Statut** | 🔴 **OUVERT** |
| **Correction** | aucune (interdiction de modifier le produit en vigueur) |
| **Preuve** | absence textuelle vérifiée dans le générateur + comptage sur les 13 documents |
| **Test de non-régression exigé** | pour tout AIR, ∀ champ `unique: true` ⇒ le SQL généré contient une contrainte `UNIQUE` sur la colonne |

---

## APP-D002 — Lignes de liste pressables et INERTES

| | |
|---|---|
| **Date** | 2026-08-30 |
| **Type** | 🟢 **BLIND DISCOVERY** — produite par la **première observation d'exécution** du chantier |
| **Instrument** | `evidence/observation/` — rendu de l'écran ÉMIS avec le runtime ÉMIS, appui par identité, **contrôle négatif** |
| **`FACT` — contrôle négatif** | sans appui : **0 transition**. L'instrument ne produit pas de delta par lui-même |
| **`FACT` — relevé** | écran `scr_conteneurs` : **11 identités adressables** · **8** portent un handler d'appui · **1 seule agit** (`blk_conteneurs_ajouter` → `scr_suivi_ajout`) · **7 pressées sans aucun effet** |
| **Les 7 inertes** | `blk_conteneurs_synchroniser` (effet `capability`, hors enveloppe — **prédit** par le protocole) et **6 lignes de liste** `blk_conteneurs_liste-row-*` |
| **Cause racine** | `AirList` câble **toujours** `onItemPress={onItemNavigate}` ; `useItemNavigate` lit `screen.uiActionsByBlock[blockId]`. Or `uiActionsByBlock` de cet écran vaut `{blk_conteneurs_ajouter, blk_conteneurs_synchroniser}` — **aucune entrée pour le bloc liste**. Chaque ligne est donc pressable et sans action |
| **🔴 Pourquoi le protocole ne le voit pas** | `controls()` ne recense un contrôle que si `actionsOfBlock` retourne une action. Le bloc liste n'en porte aucune ⇒ **aucun contrôle recensé, aucun écart émis**. L'utilisateur voit 6 lignes, les presse, rien ne se produit — **et le rapport de faisabilité est muet** |
| **Impact** | 🔴 affordance morte offerte à l'utilisateur, invisible à toute mesure statique existante |
| **Niveau de preuve** | **N7 au niveau JS** — appui réel, delta enregistré, contrôle négatif. **PAS** une observation appareil : les hôtes React Native sont stubés |
| **Reproductibilité** | 🟢 `npx vitest run --config docs/elite-protocol/evidence/observation/obs.config.ts --reporter=verbose` |
| **Statut** | 🔴 **OUVERT** — non corrigé (interdiction de modifier le produit) |
| **Fait notable** | 🟢 **première confirmation empirique d'une prédiction du protocole** : `blk_conteneurs_synchroniser` était annoncé `EXEC_GHOST_CONTROL` ; l'appui le confirme |

---

## APP-D004 — L'intention du client n'est stockée nulle part, et les promesses déclarées ne sont jamais exécutées

| | |
|---|---|
| **Date** | 2026-08-31 |
| **Type** | 🟢 **BLIND DISCOVERY** — produite en cherchant la racine, après refus propriétaire de la correction du prompt comme cause |
| **`FACT` — hypothèse tuée** | Le moteur n'est **pas** le plafond : un AIR écrit à la main de **12 écrans / 8 entités** passe `assertValidAir` 🟢 et `compileProject` 🟢 **47 fichiers**, sans refus ni dégradation |
| **`FACT` — le symptôme** | `emit-v2.mjs:134` et `emit.mjs:142`, identiques : *« Sois complet mais sobre : 2 à 4 écrans, 1 à 3 entités »*. Plafond **saturé 12/12**. Réel, mais n'explique pas l'absence de détection |
| **`FACT` — racine ①** | L'AIR porte **19 champs de premier niveau** ; **aucun** ne contient la demande d'origine. L'intention entre dans un prompt et **disparaît** |
| **`FACT` — racine ②** | **227 `expectedTests`** déclarés au corpus. Consommateurs : `validate.ts` (unicité d'identifiant) et `render-text.ts` (affichage). **Aucun exécuteur — jamais** |
| **`INFÉRENCE`** | Toute la vérification compare l'**artefact au document**. **Personne ne compare le document à la demande.** Cause commune du plafond non vu sur 12 documents, de *« avec photos »* évaporé, de la grille A++ verte sur une app pauvre, et d'`APP-D002` invisible à 640 tests verts |
| **Portée mesurée** | Sur **227** promesses : **167 à CIBLE MORTE (73,6 %)** · 60 vivantes · 0 inexistante. Par nature — `deterministic` 40/**75** · `e2e` 18/**35** · `contract` 2/**57**. Causes : effet hors `EXECUTION_ENVELOPE_V1`, écran inatteignable, entité liée à aucun bloc rendu |
| **`FACT` — couche la plus profonde** | `expectedTests.targetId` doit désigner un **nœud existant** (`scr_`/`act_`/`ent_`). `INFÉRENCE` — un besoin **sans nœud** ne peut pas être exprimé comme promesse : le manque n'est pas non détecté, il est **inexprimable** |
| **Contre-épreuve** | `slices/resto-riche/` — même moteur, document écrit pour ce que le moteur tient : **10/10** promesses à cible vivante, **22/22** contrôles agissants, **0** écran mort. Contre `resto-quartier` : **4/18** et 4/14 |
| **Impact** | 🔴 le système produit et certifie des applications **sans jamais confronter le résultat à la demande** |
| **Niveau de preuve** | **N6** — analyse statique du graphe (`reachableScreens`, `controls`, `dataBindings`) croisée avec l'enveloppe d'exécution. **Condition NÉCESSAIRE seulement** : l'énoncé de chaque promesse n'est **pas** vérifié |
| **Reproductibilité** | 🟢 `node docs/elite-protocol/evidence/promesses-tenues.mjs` |
| **Statut** | 🔴 **OUVERT** — mesuré et démontré, **non corrigé**. Correction = montée de schéma AIR (arbitrage propriétaire, D-054) |

---

## APP-D003 — La dimension C de la grille A++ mesure le CODE, pas l'ÉTAT ATTEINT

| | |
|---|---|
| **Date** | 2026-08-30 |
| **Type** | 🟢 **BLIND DISCOVERY** — produite par la première observation des états de bloc |
| **`FACT` — l'instrument** | `apxx-grid.ts` §C : `["loading","empty","error"].filter(k => blocks.includes(\`state.kind === "${k}"\`))`, puis `states.length === 3 ? "conforme" : "non_conforme"`. C'est une **recherche de sous-chaîne** dans le source du composant émis |
| **`FACT` — le verdict enregistré** | `slices/conteneurs/results/metrics.json` : dimension **C = conforme**, détail *« états rendus par le bloc liste : loading/empty/error »* |
| **`FACT` — l'enveloppe** | `EXECUTION_ENVELOPE_V1.reachableBlockStates.list = ["ready","empty"]`. L'enveloppe **concède** que `loading` et `error` ne sont pas atteignables |
| **`FACT` — l'observation** | sous **deux** conditions de données (fixtures livrées, dataset vide), le bloc `list` ne rend jamais que **`empty`** et **`ready`**. `loading` et `error` : **jamais** |
| **`INFÉRENCE`** | La dimension C mesure *« le composant contient la branche »*, jamais *« l'état est atteint »*. Le critère A++ — *« tout bloc consommant des données expose loading/empty/error »* — porte sur ce que l'utilisateur voit, pas sur ce que le code sait écrire |
| **`CONCL.`** | **C est déclarée conforme alors que 2 des 3 états qu'elle nomme ne sont jamais atteints.** Deux organes du même système se contredisent sur le même objet — l'enveloppe (mesurée, cliquetée) et la grille A++ (lecture de source) — et **personne ne les avait croisés** |
| **Portée mesurée** | **11 états déclarés au registre · 7 concédés par l'enveloppe · 3 observés.** 8 états déclarés sur 11 ne sont **jamais rendus**. Quatre types de blocs (`button`, `header`, `detail_header`, `empty_state`) déclarent un état et **n'en portent aucun** à l'exécution |
| **Impact** | 🔴 une dimension de la grille de qualité produit est **verte sans fondement observationnel** |
| **Niveau de preuve** | **N7 au niveau JS** — rendu réel sous deux conditions de données. Hôtes RN stubés |
| **Reproductibilité** | 🟢 `npx vitest run --config docs/elite-protocol/evidence/observation/obs.config.ts --reporter=verbose etats` |
| **Statut** | 🔴 **OUVERT** — non corrigé |

---

## PROTOCOL-D001 — Les métriques en ratio sont aveugles à l'échelle

| | |
|---|---|
| **Date** | 2026-08-29 |
| **Type** | 🟢 **BLIND DISCOVERY (protocole)** |
| **Contexte** | analyse de l'attaque G22, après confirmation empirique |
| **Observation brute** | toutes les métriques du rapport de faisabilité sont des ratios : `effectsExecuted/effectsDeclared`, `screensReachable/screensDeclared`… |
| **Le fait** | un ratio est **invariant par changement d'échelle**. `1/1` et `4/4` sont indistinguables |
| **Impact** | 🔴 **G22 n'est pas un cas particulier du `n/a`** : c'est une propriété générale de toute métrique en ratio. Réduire le périmètre améliore mécaniquement tous les scores. Mesuré : app minimaliste = **1 écart** vs slice conteneurs = **52** |
| **Reproductibilité** | 🟢 `scratchpad/g22.mjs` |
| **Statut** | 🟠 **COMPRIS, NON RÉSOLU** — seul un pool de tâches scellé y résiste |
| **Test de non-régression exigé** | toute métrique publiée porte son **numérateur ET son dénominateur**, jamais le seul pourcentage |

---

## PROTOCOL-D002 — Les écarts n'ont aucune sévérité

| | |
|---|---|
| **Date** | 2026-08-29 |
| **Type** | 🟢 **BLIND DISCOVERY (protocole)** |
| **Observation brute** | `grep -n "severity\|gravite" feasibility.ts` → **0 occurrence**. La structure `FeasibilityGap` porte `{code, path, owner, detail}` |
| **Impact** | 🔴 **vecteur de gaming interne à l'instrument anti-gaming** : les 52 écarts du slice pèsent identiquement. **Retirer une capability `analytics` améliore le score autant que rendre 2 écrans atteignables** |
| **Reproductibilité** | 🟢 vérification textuelle |
| **Statut** | 🔴 **OUVERT** |
| **Test de non-régression exigé** | tout écart porte une sévérité dérivée de sa **nature**, jamais choisie ; le score agrège par sévérité |

---

## PROTOCOL-D003 — La dérivation des obligations n'est totale qu'à 45 %

| | |
|---|---|
| **Date** | 2026-08-30 |
| **Type** | 🟢 découverte du protocole, **par mesure** |
| **Contexte** | recherche de la cause réelle des 2 faux négatifs du test de discrimination |
| **Observation brute** | 80 champs repérés dans le schéma AIR · **36 visités** par une obligation · **44 jamais visités** |
| **Champs orphelins** | `visibleWhen · enumValues · operator · assertions · operation · required · unique · allowedImports · inputs · outputs · expectedTests · commerceClass · allowedDomains · routes · relations · providerClass · tokensVersion · …` |
| **Impact** | 🔴 **P-A avait été implémenté en réintroduisant la liste écrite à la main un étage plus bas.** C'est le défaut exact reproché à la grille A++, commis dans le module censé le corriger |
| **Conséquence positive** | la limite L1 **rétrécit** : elle ne signifie plus « des inconnues partout » mais exactement « un champ absent du schéma » |
| **Conséquence méthodologique** | 🟢 **la métrique de couverture est un GÉNÉRATEUR DE PISTES** — elle a produit APP-D001 |
| **Statut** | 🔴 **OUVERT** — condition n°1 |
| **Test de non-régression exigé** | G24 : ∀ champ du schéma ⇒ ≥1 obligation, **ou** déclaration explicite motivée « ne porte aucune obligation ». Couverture publiée à chaque certification |

---

## HYPOTHÈSES TESTÉES SANS RÉSULTAT — conservées par honnêteté

| Hypothèse | Résultat | Pourquoi conservée |
|---|---|---|
| **H2** · champ affiché structurellement vide (`asset`/`json`) | **0 occurrence** | négatif utile : les documents évitent naturellement ce cas |
| **H3** · même entité titrée par des champs différents selon l'écran | **0 occurrence** | négatif utile |
| **H4** · champ `required` produisant NULL | 25 occurrences **mais explicitement documenté** dans `sql-gen.ts` | 🔴 **écarté — ce n'est PAS une découverte**, la décision est consignée |

---

## PROTOCOL-D004 — Un déclencheur `data` fantôme efface les écrans morts

| | |
|---|---|
| **Date** | 2026-08-30 |
| **Type** | 🟢 **BLIND DISCOVERY (protocole)** — produite par le cas-tueur `KT-G04-B01`, verdict attendu déclaré avant exécution |
| **Contexte** | campagne 1 de cas-tueurs, attaque inédite contre G4 |
| **Observation brute** | ajout de 4 actions `data`→`navigate` **inertes** sur le slice conteneurs : `EXEC_SCREEN_UNREACHABLE_DECLARED` passe de **2 à 0**, `screensReachableDeclared` de **2/4 à 4/4**, **produit inchangé** |
| **Cause racine** | dans `reachableScreens()`, un déclencheur `data` (ou `lifecycle` sans `screenId`) a une **origine indéterminée**, donc réputée atteignable. Le chemin est compté sans vérifier qu'il puisse être emprunté |
| **Impact** | 🔴 **vecteur de gaming exploitable et bon marché** : 4 lignes d'AIR effacent 100 % d'un défaut critique |
| **🔴 Composition** | l'attaque ajoute 4 écarts triviaux pour en supprimer 2 critiques. **PROTOCOL-D002 (absence de sévérité) empêche le protocole de dire que le troc est défavorable.** Deux faiblesses bornées composent une attaque exploitable |
| **Atténuation observée** | la métrique **effective** résiste (2/4 inchangé) car elle borne les déclencheurs à l'enveloppe — la défense en profondeur a partiellement joué |
| **Reproductibilité** | 🟢 `scratchpad/exploit.mjs` |
| **Statut** | 🔴 **OUVERT** — non corrigé (interdiction de corriger opportunément) |
| **Test de non-régression exigé** | `KT-G04-B01` doit devenir permanent : un déclencheur hors enveloppe ne doit **jamais** rendre un écran atteignable |

---

## 🔴 CORRECTION DE PROTOCOL-D004 — mécanisme réfuté par EXP-1

> **Cette correction est obligatoire à la lecture.** La description originale
> de D004 ci-dessus dit que l'attaque **supprime** un défaut critique et que
> le protocole subit un **troc** défavorable. **L'expérience réfute les deux.**

| | |
|---|---|
| **Constat historique CONSERVÉ** | `EXEC_SCREEN_UNREACHABLE_DECLARED` passe bien de **2 à 0**, et `screensReachableDeclared` de **2/4 à 4/4**, produit inchangé. Ce fait n'est pas remis en cause. |
| **Réfutation expérimentale** | `FACT` — à construction contrôlée (A : 2 écrans morts · B : 2 déclencheurs `data` inertes · A∪B : les mêmes 2 redirigés) le comptage est **STRICTEMENT ADDITIF** : 2 + 2 = 4. **Aucun écart n'est supprimé.** Les 2 `EXEC_SCREEN_UNREACHABLE_DECLARED` (owner `document`) sont remplacés par 2 `EXEC_SCREEN_UNREACHABLE_ENGINE` (owner `moteur`). |
| **Ce qui change réellement** | `INFÉR.` — **l'imputation**, pas la quantité. `owner:document` passe de **2 à 0**. Le producteur du document déplace son défaut vers la dette moteur, déjà déclarée et acceptée par l'enveloppe. |
| **Conséquence sur la correction prévue** | `CONCL.` — une échelle de sévérité **ne verrait pas D004** : les deux configurations portent **2 écarts critiques** dans les deux cas. Seul le champ `owner` change, et le score ne l'agrège pas. La correction de PROTOCOL-D002 traite le troc de `KT-C2-06`, **pas** D004. |
| **Preuve** | `docs/elite-protocol/evidence/exp1b.mjs` |
| **Nouveau statut** | 🔴 **OUVERT** — mécanisme requalifié en `PROTOCOL-D015`. Description originale conservée ci-dessus **à titre historique**, invalidée quant au mécanisme. |

---

## PROTOCOL-D005 — Le bloc structurellement invisible n'est pas détecté

| | |
|---|---|
| **Date** | 2026-08-30 |
| **Type** | 🟢 **BLIND DISCOVERY (protocole)** — cas-tueur `KT-G05-B02` |
| **Observation brute** | un bloc portant `visibleWhen: {kind:"entity_empty", entityId:"ent_x"}` sur une entité dont le dataset vaut 9 lignes n'est **jamais** rendu. Le protocole ne produit **aucun écart** |
| **Cause racine** | aucune obligation ne porte sur la **satisfiabilité** d'une condition de visibilité. `visibleWhen` fait partie des 44 champs non couverts (PROTOCOL-D003) |
| **Impact** | 🟠 interface morte non détectée ; un générateur peut « conditionner » un contrôle pour le soustraire à l'observation |
| **Note d'honnêteté** | c'est l'**inverse exact** du défaut DET-017 corrigé par D-044. En rendant les blocs conditionnables, le contrat a créé une seconde classe de défaut — bloc **toujours visible à tort** *ou* **jamais visible à tort** — dont une seule est traitée |
| **Reproductibilité** | 🟢 `scratchpad/kt.mjs` |
| **Statut** | 🔴 **OUVERT** |
| **Test de non-régression exigé** | toute condition de visibilité doit être **satisfiable** au regard des datasets déclarés, dans les deux sens |

---

# DÉCOUVERTES EXP-1 — versées le 2026-08-30

> **Convention de niveau de preuve, appliquée à chaque ligne** :
> `FACT` (mesuré ou lu dans le code) · `INFÉR.` (déduit de faits) ·
> `HYPO.` (non testé) · `CONCL.`
> Aucune de ces entrées n'a été corrigée. Aucune n'autorise une correction.

## PROTOCOL-D015 — D004 est un TRANSFERT D'IMPUTATION, pas une suppression

| | |
|---|---|
| **Date** | 2026-08-30 · EXP-1 |
| **Type** | 🔴 **BLIND** — requalifie le mécanisme d'une découverte enregistrée |
| **`FACT`** | À construction contrôlée : A (2 écrans morts) = 2 écarts `owner:document` · B (2 déclencheurs `data` inertes) = 2 écarts `owner:moteur` · **A∪B = 4 écarts, dont `owner:document` = 0** |
| **`FACT`** | Comptage **strictement additif** (2+2=4). `EXEC_SCREEN_UNREACHABLE_DECLARED` → `EXEC_SCREEN_UNREACHABLE_ENGINE`, un pour un |
| **`INFÉR.`** | Le champ `owner` — décrit dans `feasibility.ts` comme « la propriété la plus importante de ce rapport » — est **contrôlé par le producteur du document** : 2 lignes d'AIR suffisent à disculper le document |
| **`CONCL.`** | Une échelle de sévérité **ne détecte pas** ce mécanisme : les deux configurations portent 2 écarts critiques. La correction prévue de D002 est **orthogonale** à D004 |
| **Preuve** | `docs/elite-protocol/evidence/exp1b.mjs` |
| **Statut** | 🔴 **OUVERT** — non corrigé |
| **Test de non-régression exigé** | l'imputation d'un écart ne doit pas pouvoir changer sans que la propriété sous-jacente change |

## PROTOCOL-D016 — Un écran sans route est compté atteignable

| | |
|---|---|
| **Date** | 2026-08-30 · EXP-1, sonde de l'hypothèse gelée **H-02** |
| **Type** | 🔴 **BLIND** |
| **`FACT`** | `reachableScreens()` teste `screenIds.has(target)`. L'émetteur ne crée un `Stack.Screen` que pour les entrées de `air.navigation.routes` (`emit-project.ts:332-334`). Le validateur sémantique vérifie routes → écrans, **jamais** écrans → routes |
| **`FACT`** | Document construit avec `scr_z` sans route : **0 écart**, atteignabilité effective **2/2** |
| **`INFÉR.`** | `navigate("scr_z")` cible une route non enregistrée. **`HYPO.`** — le comportement runtime attendu est un no-op ; **non observé**, faute d'exécution |
| **Niveau de preuve** | `FACT` N2 côté instrument · `HYPO.` côté runtime |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D017 — Une liste vide est comptée comme chemin de navigation

| | |
|---|---|
| **Date** | 2026-08-30 · EXP-1, sonde de **H-09** |
| **Type** | 🔴 **BLIND** |
| **`FACT`** | `AirList` ne porte `onItemPress` que sur un **item** ; 0 ligne ⇒ rien à presser. `reachableScreens()` n'a aucun test de cardinalité |
| **`FACT`** | Document où l'unique chemin est une liste à `rowCount: 0` : l'écran cible est compté atteignable (2/2). `EXEC_DATA_SOURCE_EMPTY` est bien émis — **et la métrique d'atteignabilité l'ignore** |
| **`INFÉR.`** | Deux étages du même instrument se contredisent sur le même document, sans qu'aucun ne le signale |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D018 — Désaccord `props.actionId` / `trigger.blockId` : deux erreurs opposées

| | |
|---|---|
| **Date** | 2026-08-30 · EXP-1, sondes de **H-07** et **H-12** |
| **Type** | 🔴 **BLIND** |
| **`FACT`** | `AirButton`/`AirEmptyState` dispatchent `props.actionId` **sans lire `trigger.kind`** ; `graph.ts` lit `trigger.blockId` et ignore `props.actionId` pour l'atteignabilité |
| **`FACT`** | Document où les deux désignent des actions différentes : l'écran cible de l'action au déclencheur `ui` est compté atteignable (**faux chemin**) **et** un `EXEC_GHOST_CONTROL` est émis sur un bouton qui agit réellement (**faux fantôme**) |
| **`INFÉR.`** | Un unique construit produit simultanément une erreur en Δ′ et une erreur en Δ |
| **Prévalence corpus** | `FACT` — **1 occurrence** (`plombier-urgence`), sans effet sur l'atteignabilité (un autre chemin existe) |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D019 — Les arêtes de retour de la pile native ne sont modélisées nulle part

| | |
|---|---|
| **Date** | 2026-08-30 · EXP-1, hypothèse gelée **H-03** |
| **Type** | 🟠 **BLIND** |
| **`FACT`** | L'artefact émis utilise `createNativeStackNavigator` ; toute transition franchie ouvre une arête retour (bouton d'en-tête, retour matériel Android). L'AIR n'exprime aucune arête retour ; `reachableScreens()` n'en modélise aucune |
| **`INFÉR.`** | Sans effet sur l'**ensemble** atteignable (on ne revient qu'où l'on est passé). Invalide en revanche tout raisonnement sur les cycles, l'état de formulaire inter-écrans et les parcours |
| **Niveau de preuve** | 🟠 **inspection seule** — aucun cas détecté, aucune exécution |
| **Statut** | 🟠 **OUVERT — fragile** |

## PROTOCOL-D020 — La métrique d'atteignabilité DÉCLARÉE n'a aucun référent observable

| | |
|---|---|
| **Date** | 2026-08-30 · EXP-1 |
| **Type** | 🔴 **BLIND — structurel** |
| **`FACT`** | `screensReachableDeclared` est calculée avec `ALL_TRIGGERS`, c'est-à-dire **sous un moteur qui exécuterait tous les déclencheurs**. Un tel moteur n'existe pas : l'enveloppe v1 porte `triggers: ["ui"]` |
| **`INFÉR.`** | Aucune observation d'aucun artefact produit ne peut établir la valeur de vérité de cette métrique. Elle énonce une propriété d'une machine contrefactuelle |
| **`CONCL.`** | Explique la survie de D004 : non par faiblesse du cas-tueur, mais parce qu'**aucun test observationnel n'était possible** sur la métrique attaquée |
| **🔴 Portée** | **ÉTABLI POUR CETTE MÉTRIQUE UNIQUEMENT.** La généralisation aux 25 gates est **INTERDITE sans mesure** — voir `GATE_SEMANTIC_OBSERVABILITY.md` |
| **Statut** | 🔴 **OUVERT** |

---

# DÉCOUVERTES CAMPAGNE 2 — versées le 2026-08-30 (RN-02 / P2)

> **Versement autorisé par le propriétaire le 2026-08-30.** Aucune de ces
> découvertes n'est corrigée. Chaque entrée conserve son niveau de preuve.
> Preuves exécutables : `docs/elite-protocol/evidence/`.
>
> **Réserve permanente** : les cas-tueurs `KT-C2-*` sont **inventés pour
> l'occasion**, ce que la règle de composition n°3 du `GATE_REGISTER` proscrit.
> Le résiduel assumé s'applique. Les découvertes **mesurées sur le corpus réel**
> (`D008`, `D012`, `D013`) ne sont pas concernées par cette réserve.

## PROTOCOL-D006 — Chemin fantôme par déclencheur `ui` sur un bloc inerte

| | |
|---|---|
| **Type** | 🔴 **BLIND** · `KT-C2-01` |
| **`FACT`** | Une action `{trigger: ui(blk_header), effect: navigate}` traverse les 3 validateurs. Le rapport produit **0 écart** · déclaré **2/2** · effectif **2/2** · effets exécutés **1/1** |
| **`FACT`** | `AirHeader` et `AirDetailHeader` ne portent **aucun** handler de pression ; `HeaderBlock({title, subtitle, testID})` n'accepte pas `onPress` |
| **`INFÉR.`** | L'écran cible est inatteignable au runtime tout en étant compté atteignable par les **deux** métriques. **Coût attaquant : 0 écart** — strictement plus fort que D004, qui en coûtait 4 |
| **Preuve** | `evidence/kt2.mjs` · **Prévalence corpus : 0** |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D007 — L'« atténuation par défense en profondeur » de D004 n'existe pas

| | |
|---|---|
| **Type** | 🔴 **BLIND** — falsification d'une conclusion enregistrée · `KT-C2-02` |
| **`FACT`** | Les métriques *déclarée* et *effective* appellent **la même fonction** `reachableScreens()`, avec un ensemble de déclencheurs différent. Elles partagent donc intégralement le défaut |
| **`FACT`** | Sous une enveloppe élargie à `data`, l'atteignabilité effective passe de **1/2 à 2/2** : elle tombe à son tour |
| **`CONCL.`** | Ce n'est pas une défense en profondeur : c'est une **coïncidence de l'enveloppe v1** (`triggers: ["ui"]`), qui **expirera** le jour où le moteur câblera les déclencheurs `data` |
| **Preuve** | `evidence/kt2.mjs` |
| **Statut** | 🔴 **OUVERT** — l'atténuation notée à la fiche D004 est **retirée** |

## PROTOCOL-D008 — Satisfiabilité de `visibleWhen` : bidirectionnelle et relative à l'enveloppe

| | |
|---|---|
| **Type** | 🔴 **BLIND** · `KT-C2-03` + mesure corpus |
| **`FACT`** | `entity_not_empty` sur une entité sans dataset : bloc jamais rendu, **0 écart** émis. C'est le miroir exact de D005 |
| **`FACT` (corpus réel)** | **2 des 4 blocs conditionnels** du corpus sont morts — et le restent **même sous un moteur complet** (aucune action `mutation delete` sur ces entités) |
| **`INFÉR.`** | Les 2 blocs morts sont ceux **introduits par D-044** pour corriger DET-017 : la correction a créé la classe inverse |
| **`INFÉR.`** | La satisfiabilité est **relative à l'enveloppe** : le couple `déclaré/effectif`, appliqué à l'atteignabilité, ne l'est à aucune autre propriété |
| **Preuve** | `evidence/kt2.mjs`, `evidence/deadness.mjs` |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D009 — Source d'`itemId` acceptée depuis un écran inatteignable

| | |
|---|---|
| **Type** | 🔴 **BLIND** · `KT-C2-04` |
| **`FACT`** | `detailScreens()` calcule `hasItemIdSource` sans aucun test d'atteignabilité. Un bloc `list` situé sur un écran mort satisfait la condition : **aucun** `EXEC_DETAIL_WITHOUT_ITEM_SOURCE` |
| **Preuve** | `evidence/kt2.mjs` |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D010 — Le cliquet de véracité de l'enveloppe atteste une proposition fausse

| | |
|---|---|
| **Type** | 🔴 **BLIND — le plus grave de la campagne** · `KT-C2-05` |
| **Proposition attestée** | `envelope-truth.test.ts` — décrit dans son propre en-tête comme « **le test le plus important du paquet** » — affirme : *« seul le déclencheur `ui` atteint un composant »* |
| **`FACT`** | `emit-project.ts` insère dans `screen.actions` **toute** action référencée par `props.actionId`, **sans lire `trigger.kind`** ; `AirButton`/`AirEmptyState` la dispatchent |
| **`INFÉR.`** | La proposition est **fausse**. Le cliquet teste la **présence d'une chaîne de caractères** dans l'émetteur, pas la propriété sémantique |
| **`CONCL.`** | Conséquences : (a) `EXEC_TRIGGER_INERT` peut viser une action vivante ; (b) `EXEC_GHOST_CONTROL` peut être un **faux positif** ; (c) **le verdict 🟢 de `KT-G05-B03` en campagne 1 est invalidé** ; (d) la mention « **Aucun faux FAIL détecté** » du `GATE_KILLER_TESTS` est **réfutée** |
| **Preuve** | `evidence/kt2.mjs`, `evidence/ratchet.mjs` · **Prévalence corpus : 0** — unsoundness **latente**, non exploitée |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D011 — Quatre « métriques » sont des constantes d'enveloppe

| | |
|---|---|
| **Type** | 🔴 **BLIND** · `KT-C2-07` |
| **`FACT`** | `capabilitiesWired`, `slotsInvoked`, `rulesEnforced`, `blockStatesReachable` valent `0` ou `N` selon un **booléen d'enveloppe**. Sous une enveloppe déclarant `capabilitiesEmitCode: true` : **0 écart**, `capabilitiesWired = 1/1` |
| **`INFÉR.`** | Elles ne peuvent prendre **aucune valeur intermédiaire** ni détecter **aucun défaut unitaire** : elles restituent la déclaration du moteur sur lui-même, jamais une observation de l'artefact |
| **Preuve** | `evidence/kt2.mjs` |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D012 — Dénominateur contaminé de la census de contrôles

| | |
|---|---|
| **Type** | 🟠 **BLIND** — mesure corpus |
| **`FACT`** | `controls()` parcourt **tous** les écrans, atteignables ou non. Mesuré : **53 sites de dispatch morts sur 108 (49 %)** |
| **`INFÉR.`** | Le ratio `ghostControls / controlsVisible` est calculé sur une population dont **la moitié n'est jamais rendue** |
| **Preuve** | `evidence/deadness.mjs` |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D013 — Événements `data` non productibles : défaut latent du corpus réel

| | |
|---|---|
| **Type** | 🔴 **BLIND** — mesure corpus |
| **`FACT`** | **15 déclencheurs `data` sur 36**, répartis sur **10 documents sur 13**, référencent un événement qu'**aucune** action `mutation` ne peut produire — **même sous un moteur complet** |
| **`INFÉR.`** | D004 n'est donc pas seulement une surface d'attaque synthétique : le défaut est **présent dans les documents réels**. La propriété est entièrement dérivable de l'AIR et n'est dérivée nulle part |
| **Preuve** | `evidence/deadness.mjs` |
| **Statut** | 🔴 **OUVERT** |

## PROTOCOL-D014 — Volatilité des preuves — 🟢 RÉSOLUE

| | |
|---|---|
| **Type** | 🟠 **BLIND (méthodologique)** |
| **`FACT`** | Le registre citait `scratchpad/exploit.mjs` et `scratchpad/kt.mjs` : ces chemins **n'existaient pas dans le dépôt**. Les fichiers vivaient dans `/private/tmp/claude-501/<session>/scratchpad/`, stockage temporaire propre à une session |
| **`INFÉR.`** | Violation directe de **P-G** : l'observation brute doit être conservée, adressée, et re-vérifiable sans refaire tourner l'agent |
| **Correction** | 🟢 **RÉSOLUE le 2026-08-30** — versement dans `docs/elite-protocol/evidence/` (10 scripts + README + empreintes SHA-256). `exp1b.mjs` ré-exécuté depuis le dépôt : résultat identique |
| **Reste ouvert** | `RN-04` — le dossier `docs/elite-protocol/` n'est lui-même **pas encore suivi par Git** |
| **Statut** | 🟢 **RÉSOLUE** — enregistrement conservé (règle de tenue) |

---

## PROTOCOL-D021 — Le modèle de sévérité ne peut pas représenter la composition (RN-03 / P4)

| | |
|---|---|
| **Date** | 2026-08-30 · EXP-1 étape 8 · versé par **RN-03** |
| **Type** | 🔴 **résultat expérimental structurel** |
| **Question posée** | le modèle peut-il représenter `severity(A + B) > max(severity(A), severity(B))` ? |
| **`FACT` (structure)** | `FeasibilityGap = {code, path, owner, detail}` — aucun identifiant, **aucun champ référençant un autre écart**. `analyzeFeasibility` n'examine jamais deux écarts conjointement. L'agrégat publié est `gaps.length` ; le verdict est `gaps.length === 0 ? … : …` |
| **`FACT` (mesure)** | A = 2 écarts · B = 2 écarts · A∪B = **4** — **strictement additif** |
| **`INFÉR.`** | Toute agrégation `Σ w(g)` ou `max w(g)` sur des items **indépendants** est une fonction du multi-ensemble des sévérités individuelles. La superadditivité exige un terme dépendant d'une **paire** ; **aucun porteur d'arité 2 n'existe** dans le modèle |
| **`CONCL.` 1** | **Non représentable aujourd'hui** — l'agrégat est un comptage de poids 1 |
| **`CONCL.` 2** | **Non représentable après la correction prévue de PROTOCOL-D002** (« sévérité dérivée de la nature ; le score agrège par sévérité ») : une sévérité **scalaire** change les poids, jamais l'arité. **Problème de porteur, pas de réglage** |
| **`CONCL.` 3** | **Le phénomène de `PROTOCOL-D015` n'est pas un phénomène de sévérité** : dans les deux configurations mesurées il y a **2 écarts critiques** ; seul le champ `owner` change, et le score ne l'agrège pas |
| **Preuve** | `docs/elite-protocol/evidence/exp1b.mjs` |
| **Statut** | 🔴 **OUVERT — non corrigé.** `E-11` interdit la correction prématurée ; `E-18` exige qu'un modèle retenu déclare explicitement la classe de comportements qu'il ne peut pas voir |

---

## GEN-D020 — Toute application publiée portant une base était MORTE : notre propre en-tête rendait son origine opaque

| | |
|---|---|
| **Date** | 2026-11-05 |
| **Type** | 🟢 **BLIND DISCOVERY** — la pile fournie par le propriétaire désignait la ligne ; la cause n'était dans aucun défaut connu |
| **Instrument** | Playwright WebKit **et** Chromium, chargement de la VRAIE adresse ; puis octets de production servis localement, en-tête seul changé |
| **`FACT` — l'écran** | `snenak.deribfy.app` **HTTP 200** → « Cette application s'est arrêtée en cours d'exécution » · **zéro requête sortie** |
| **`FACT` — la trame** | webkit : `SecurityError: Context's origin is opaque` · chromium : `Access to the Locks API is denied in this context` à `gi.Lr [as lock] (…/:14740:44)` |
| **`FACT` — la ligne 14740** | `return await globalThis.navigator.locks.request(e, t === 0 ? {` — colonne 51 = le `(` de l'appel. `Lr` est `navigatorLock` de `@supabase/gotrue-js` |
| **`FACT` — le contexte** | `origin=null` sur un document de **premier niveau**, en https, `isSecureContext=true`, `navigator.locks=object` |
| **Cause racine** | notre `Content-Security-Policy` portait `sandbox allow-scripts` **sans** `allow-same-origin` → origine opaque même hors cadre ; **et** `connect-src 'none'` → aucune requête possible. Deux murs **indépendants**. L'en-tête avait été écrite quand une œuvre publiée n'avait ni base ni réseau ; la base lui a été donnée le 2026-11-02 et l'en-tête n'a pas été revue |
| **🔴 Pourquoi l'instrument ne le voyait pas** | dans un **cadre** opaque `navigator.locks` est `undefined` : le SDK prend son repli et SURVIT. Sur la **vraie page** opaque il est `object` : le SDK l'appelle et ça jette. *Le cadre était plus clément que la page, parce que l'API y manquait au lieu d'être refusée.* Mes quatre montages en cadre étaient donc verts sur une œuvre morte |
| **Preuve du correctif** | octets de production, en-tête seul changé : ① actuelle → ARRÊTÉE · ② `connect-src` ouvert, bac à sable inchangé → **ARRÊTÉE** · ③ `+ allow-same-origin` → **DÉMARRE** · ④ sans bac à sable → DÉMARRE. Puis connexion tentée avec une adresse fausse : `POST /auth/v1/token → 400 → « Identifiants invalides. »` |
| **Étendue mesurée** | 3 publications vivantes : 2 portant une base **mortes**, 1 sans base qui démarre et **mentit** (voir GEN-D021) |
| **Impact** | 🔴 la promesse centrale du produit était inatteignable. Quatre tentatives de preuve du propriétaire ont échoué sur cette cause |
| **Contre-mesure** | **deux routes, deux régimes.** `*.deribfy.app` (domaine enregistrable distinct) : `sandbox allow-scripts allow-same-origin` + `connect-src https://<projet> wss://<projet>`. `/p/<jeton>` (**même origine que le produit**) : en-tête inchangée, et la route **redirige** vers le sous-domaine |
| **Pourquoi la dissymétrie** | MESURÉ : `src/lib/supabase.ts` appelle `createClient` sans options ⇒ `persistSession: true` ⇒ la session du propriétaire vit dans le `localStorage` de `www.deribfy.com`. Y lever le bac à sable donnerait à une application écrite par un modèle la lecture de son jeton de session |
| **🟠 Canal résiduel, dit avec sa forme** | avec `allow-same-origin` sur `*.deribfy.app`, l'application d'un client peut poser un cookie sur `.deribfy.app` — **que l'application d'un AUTRE client lira**. Pas le SDK (il emploie `localStorage`, cloisonné par origine), mais une application écrite par le modèle peut appeler `document.cookie` avec `domain=.deribfy.app`, et rien ne l'en empêche |
| **Parade connue, non faite** | inscrire **`deribfy.app` à la Public Suffix List** : un cookie de domaine parent devient structurellement impossible, le navigateur refusant `domain=.deribfy.app` comme il refuse `domain=.com`. **LONG à obtenir (des mois), donc à demander TÔT.** Non demandé au 2026-11-05 |
| **`wss:` n'est pas un détail** | le paquet embarqué porte `realtime` ×22 et `wss://` ×1. `connect-src` avec une URL `https:` n'autorise PAS `wss:` : une œuvre qui s'abonne démarrerait et échouerait **sans rien dire** — un plantage franc échangé contre une panne silencieuse |
| **Non-régression** | EP-270 ④bis — invariant **conditionnel à la route**, avec la mesure de `localStorage` écrite dedans, la borne `connect-src` comparée en **jetons** (pas en sous-chaînes), et la liste **close** des routes portant le régime permissif |
| **Statut** | 🟢 **CORRIGÉ** — 9 mutations rouges |

---

## GEN-D021 — Une œuvre publiée sans table promettait une base à ses visiteurs

| | |
|---|---|
| **Date** | 2026-11-05 |
| **Type** | 🟠 défaut d'écran, trouvé en mesurant GEN-D020 — et **signalé par moi comme trou de mon propre correctif** |
| **Instrument** | Playwright WebKit sur `sneapp.deribfy.app`, lecture du bandeau rendu |
| **`FACT`** | HTTP 200, publiée depuis le 2026-11-04, et l'écran affiche « **Votre base de données sera créée à la publication.** » |
| **Cause racine** | le bandeau d'aperçu s'affiche sur `url === ''`. `sneapp` n'a aucun `create table` (363 o de préambule), `jugerPersistance` rend `[]`, donc `baseDeLOeuvre` n'injecte rien — **à juste titre**. Mais la phrase d'un aperçu partait sur une page **servie au public** |
| **Portée de mon premier correctif** | il ne touchait que l'atelier (`direct/[id]`). `/a/<sous>` et `/p/<jeton>` laissaient `adressePubliee` à `null` et servaient le bandeau d'aperçu tel quel |
| **Contre-mesure** | quatrième destination `servie` : « Cette application ne conserve pas de données. Ce que vous saisissez disparaît au rechargement. » Ni « ce sera créé » (faux), ni « ouvrez la version publiée » (on y est) |
| **Non-régression** | EP-351 ⑦ et ⑧ |
| **Statut** | 🟢 **CORRIGÉ** |

---

## GEN-D022 — Un lien publié peut être mort pendant des heures, avec un avertissement de sécurité, et rien ne le dit

| | |
|---|---|
| **Date** | 2026-11-05 |
| **Type** | 🟠 défaut de parcours — signalé par le propriétaire (« Safari ne peut pas établir une connexion sécurisée »), cause mesurée ici |
| **Instrument** | `openssl s_client` sur les certificats servis ; `curl` sur un nom jamais demandé |
| **`FACT` — les deux délais** | `snenak` publiée **19:00:43** → certificat émis **19:01:56** = **73 s**. `cahier-des-charges-fonctionnel-technique` publiée **21:46:58** → certificat émis **10:04:39 le lendemain** = **12 h 18** |
| **`FACT` — pas de générique** | un nom jamais demandé (`jamais-demande-<ts>.deribfy.app`) : **3 échecs TLS sur 3**, aucun certificat. Il n'existe **pas** de certificat `*.deribfy.app` — chaque sous-domaine attend le sien, émis à la demande par Let's Encrypt |
| **Cause racine** | publier crée l'adresse (par le CNAME `*`) et **rend le lien immédiatement**, sans attendre l'émission du certificat. Le premier visiteur paie l'attente, et ce qu'il voit est un **avertissement de sécurité** — la pire formulation possible pour une attente |
| **Impact** | 🔴 pendant 12 h 18 le lien donné par le propriétaire était mort, et **rien dans le produit ne le disait**. Ce n'est pas rare : 2 publications mesurées, 2 délais, de 73 s à 12 h 18 — la variance est le défaut |
| **Contre-mesure** | **non faite, lot séparé** : la publication attend la poignée de main TLS avant de rendre le lien, ou le rend en disant son délai. La sonde `GET /api/generateur/direct` sait déjà mesurer TLS sur un nom neuf (mesuré le 2026-11-01) — la publication, elle, ne s'en sert pas |
| **Statut** | 🔴 **OUVERT** |
