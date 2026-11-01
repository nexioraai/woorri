# REGISTRE DES TIRS — un tir payé = une ligne, sans exception

Ouvert le 2026-10-31 sur ordre du propriétaire : treize tirs et ~66 $ étaient
partis sans attribution possible. Ce registre est ce qui permettra de dire
« une application coûte X » au lieu de l'estimer. La demande est VERBATIM :
les longues vivent dans `registre-tirs/<sha8>.demande.txt`, nommées par le
SHA-256 (8 premiers hexas) du texte — deux tirs à demande identique
partagent le même fichier, et ça se VOIT.

RÈGLE : toute ligne nouvelle se porte ICI au moment du tir, avec l'issue.
Les preuves (zip qui démarre ailleurs, natif) se portent quand elles sont
EXÉCUTÉES, jamais déclarées d'avance.

| date (UTC) | id | moteur/fournisseur | demande | tours | durée | coût | jetons e→s | fichiers | issue | preuves |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-31 14:50 | `88c94164` | direct/deepseek | [`9ee1ca86`](registre-tirs/9ee1ca86.demande.txt) — MÊME cahier, à l'octet ; devise répondue : XAF | 3 | 334 s | 0,0991 $ | 42 352→35 919 | 3 + 3 injectés (+ PERIMETRE.md) | ✅ livrée | **TIR DE VALIDATION, critères fixés avant départ — verdicts : ① rapport de couverture PRÉSENT (12 exigences chiffrées, première fois) ✓ ② natif déclaré : ✗ — PERIMETRE.md déclare 12 familles mais AUCUNE mention natif/Android/iPhone ; le modèle a pourtant TENTÉ react-native au tour 1 (refusé par le fail-closed) ; cause : le lexique du juge n'a pas de famille « application native » ③ paiement COUVERT (36→69, statuts Payé/En attente/Échoué/Retard) et le paiement en ligne déclaré avec motif ✓ ④ FCFA rendu, EUR = 0 partout (formaterMontant ×8, devise cuite) ✓ ⑤ agent IA : écran présent, contrôles liés (vivacité = 0) ou marqués démonstration VISIBLE ✓ ⑥ coût noté : 0,0991 $ = 2,8× le tir qui ne couvrait pas — couvrir coûte plus cher que s'assembler, c'est le premier prix citable.** Film des tours : ① react-native → refusé nommé ② « agences muette » → renvoyé par le juge de couverture ③ accepté. Preuves d'après-course : install ✓ build ✓ `npm start` → HTTP 200 ; manifeste standalone 192/512 dans la page servie ; « Démonstration » visible ; FCFA rendu. |
| 2026-10-31 11:08 | `eb7b62b5` | direct/deepseek | [`9ee1ca86`](registre-tirs/9ee1ca86.demande.txt) — cahier des charges 22 866 car., plateforme internationale de réservation/paiement + agent IA | 1 | 127 s | 0,0355 $ | 6 336→15 795 | 14 | ✅ livrée | P1 : install ✅ build ✅ (sortie = dev.html) `npm start` ❌ script absent ; `npm run dev` ✅ 200 ; index.html autonome ✅ zéro chargement externe. P2 : ❌ aucun artefact natif dans le zip (arrêt à l'étape a). Couverture partielle MESURÉE : paiement 2 occ. (cahier : 34), anglais/arabe/RTL/connexion : 0 ; devise rendue EUR, pas FCFA. Le 0,0355 $ n'est PAS « le prix d'une application » : c'est le prix d'UN tour accepté dont la couverture n'est pas mesurée. |
| 2026-10-31 08:18 | `96768b7f` | direct/deepseek | [`9ee1ca86`](registre-tirs/9ee1ca86.demande.txt) — MÊME demande que 11:08 (SHA identique) | 3 | 631 s | 0,2511 $ | 116 169→88 084 | 30/15/15 (non stockés) | 🔴 refusée — « react non embarqué » ×3, disque de fonction amputé (fermé par EP-294/295) | — |
| 2026-10-31 01:02 | `7d17287f` | direct/deepseek | [`03b9b664`](registre-tirs/03b9b664.demande.txt) | 3 | 363 s | 0,195 $ | — | 17/17/17 (non stockés) | 🔴 refusée — tour 1 : react-native/expo refusés (web), tours 2-3 : react non embarqué (même défaut de disque) | — |

## Tir de validation — CRITÈRES FIXÉS AVANT LE DÉPART (2026-10-31, après-midi)

Ordre du propriétaire : « fixe les critères avant, sinon on lira le résultat
avec l'envie d'y voir une réussite. » Même cahier (`9ee1ca86`), même entrée à
l'octet ; devise répondue : XAF. Les six points, dans l'ordre :

1. ① Le rapport de couverture ACCOMPAGNE la génération (première fois).
   Absent = l'étape ③ (juges) a échoué, quoi que dise le reste.
2. ② Le NATIF est déclaré hors périmètre — le cahier dit « Application
   mobile Android et iPhone » ; la génération doit le DIRE (web installable).
   Un web silencieux = N3 n'a pas pris.
3. ③ PAIEMENT (34 occurrences au cahier) : couvert, ou déclaré avec motif.
   Le silence est l'échec.
4. ④ FCFA partout, zéro EUR — la chaîne XAF de bout en bout.
5. ⑤ L'AGENT IA : câblé, OU marqué démonstration visible, OU déclaré hors
   périmètre. Une quatrième photo muette = le juge de vivacité ne tient pas.
6. ⑥ LE COÛT, noté tel quel. Plus cher que 0,0355 $ attendu — couvrir coûte
   plus cher que s'assembler. Ce chiffre est le premier vrai prix citable.

Après la course : preuve zip (install/build/start, répertoire neuf) et
vérification mécanique d'installabilité de la page publiée (manifeste,
icônes, CSP) — le geste du téléphone appartient au propriétaire.

## Le juge mesurait un simulateur, et disait « démarre » — 2026-11-01

L'œuvre `950e1b9e` a été LIVRÉE avec, au journal :

    monte dans happy-dom → demarre = true · 0 erreur

Ouverte dans le Safari du propriétaire, elle affiche **« Cette application
s'est arrêtée en cours d'exécution »**. Le juge a donc laissé livrer du
cassé en annonçant que ça démarrait.

**La cause** : il monte l'œuvre dans `happy-dom`, un simulateur, et non
dans un navigateur. Le mot « démarre » promettait ce qu'il ne mesurait pas.
Troisième écran de ce dépôt à dire le faux — après « TOUT ROULE » pendant
qu'un maillon était mort, et « indisponible » en silence — et celui-ci
était **le nôtre**.

**Correction du mot, partout** (diagnostics, écran, sonde, registre) :
`monteDansSimulateur`, et l'écran écrit en toutes lettres **« NON VÉRIFIÉE
DANS UN NAVIGATEUR »**. Un cliquet interdit le retour de « Démarrage
vérifié » et de « ne démarre pas ».

**Condition de réouverture** : ce vocabulaire tombe le jour où un vrai
navigateur entre dans la chaîne de livraison. L'arbitrage du propriétaire :
la BOUCLE garde le simulateur (rapide, gratuit, il attrape déjà beaucoup) ;
la PORTE DE LIVRAISON exigera un vrai navigateur, et aucune œuvre ne pourra
être appelée « livrée » avant qu'il ait répondu — « en vérification »
jusque-là. Mesures à produire avant : taille du paquet Chromium sans tête,
démarrage à froid, durée d'un montage réel contre les 900–2300 ms de
happy-dom.

**Et l'aperçu ne masque plus** : il servait la page dans un `iframe
sandbox="allow-scripts"` à **origine opaque**, où le navigateur réduit
toute erreur à « Script error. ». L'erreur est désormais capturée DANS le
module — même royaume, message et pile entiers. Mesuré sur un témoin :
« Cannot read properties of undefined (reading 'montant') ».

## Leçon — 2026-11-01 : ce n'était pas le vocabulaire, c'était l'AXE

Le tir 88c94164 a produit ONZE noms inventés — et AUCUN n'était un nom de
composant : GRIS 5, SEMANTIQUE 2, RAYON 1, TYPO 3. Le modèle n'a jamais
inventé `CarteDeChiffre` ni `EtatVide` ; il a inventé des couleurs et des
tailles de texte.

LA CAUSE, lue dans les usages réels :

    TYPO.corps → fontSize d'un bloc de texte courant
    TYPO.petit → fontSize d'un message d'erreur
    TYPO.h1    → titre de la barre latérale

Notre échelle était par RÔLE (surtitre, libellé, valeur, légende). Le modèle
cherchait des TAILLES — « du texte normal », « du petit texte », « un
titre ». **Aucun rôle ne lui répondait.** Ce n'était donc pas seulement un
vocabulaire qu'il ne connaissait pas : c'était le MAUVAIS AXE.

Correction : les couleurs, rayons et tailles deviennent des VARIABLES CSS
aux noms que le modèle a réellement vus — shadcn pour les couleurs et le
rayon (`--background`, `--muted-foreground`, `--radius`…), Tailwind pour
l'échelle de texte (`--text-sm`, `--text-2xl`…). On emprunte les NOMS, ni
shadcn ni Tailwind ne sont installés. Les rôles survivent À L'INTÉRIEUR de
la bibliothèque, avec une règle d'emploi dite dans la consigne : les rôles
quand un composant décide, les tailles quand le modèle écrit lui-même.

### « 11 sur 11 » DIT MOINS QUE ÇA N'EN A L'AIR

Le chiffre signifie : **chacune des onze inventions passées a désormais un
équivalent connu du modèle**. Il ne dit PAS que le modèle n'inventera plus.
C'est une preuve de COUVERTURE, pas de COMPORTEMENT — et la preuve de
comportement n'existe que par un tir.

Au passage, une mesure qui a tué une preuve mal conçue : re-rendre le
document stocké ne peut rien prouver, puisqu'il contient littéralement
`TYPO.corps` et le contiendra toujours. Changer notre vocabulaire ne
réécrit pas un fichier déjà écrit.

### Et shadcn lui-même : refusé, pas enterré

MESURÉ : licence MIT (donc livrable à des clients payants, avis de
copyright à conserver) ; mais ses composants sont écrits en classes
Tailwind et importent `radix-ui` et `class-variance-authority` — notre
assembleur les REFUSE (fail-closed), notre liste blanche aussi, et la page
autonome n'a AUCUNE feuille de style (mesuré : un seul `<style>` de remise
à zéro, zéro classe Tailwind). shadcn est bloqué par Tailwind, pas par sa
licence. À rouvrir si une mesure montre un jour que le modèle invente des
COMPOSANTS — sur un échantillon de un, il n'en invente aucun.

## Décision en attente — la couverture du juge de démarrage (2026-11-01)

MESURÉ en production (`?oeuvres=5`), après correction de l'empreinte
d'écran : l'œuvre `7be93be8` est éprouvée à **24 contrôles sur 155**
découverts. Les autres : `eb7b62b5` 19/59, `4a6e160d` 8/12, `cbf1cb34` 8/8.

Le rapport le DIT (« ⚠ Application PARTIELLEMENT éprouvée »), donc rien
n'est tu. Mais la couverture reste faible sur les œuvres riches, et la
cause est le budget de 24 visites — une borne de COÛT, pas de vérité :
couvrir les 155 demanderait dix à quatorze secondes, soit le plafond de
15 s lui-même.

CE N'EST PAS UNE DETTE, C'EST UNE DÉCISION À PRENDRE : le parcours actuel
visite des CONTRÔLES ; il faudrait qu'il visite des ÉCRANS d'abord (chaque
écran distinct au moins une fois, puis ses contrôles), ce qui couvrirait
l'essentiel pour une fraction du coût. Changement de stratégie de parcours,
soumis à l'arbitrage du propriétaire — inscrit ici pour qu'il ne se perde
pas, et à reprendre APRÈS le lot des jetons.

À remesurer alors : le plafond du juge. Il monte à chaque fois que le juge
voit davantage (1 777 → 1 850 → 2 367 ms).

## Leçon de méthode — 2026-10-31 : la discipline a évité deux correctifs faux

Trois gates d'affilée ont rougi sur des étapes différentes (`test_marge`,
`app_rendu`, `backend`). J'avais DÉDUIT une cause — « les tests qui exercent
la boucle paient un processus d'exécution » — et j'allais injecter un juge
muet dans EP-299 ③ et inscrire EP-302 ④ au registre des tests lents.

Le propriétaire a imposé l'arrêt : **rien ne tourne pendant la gate, et on
ne corrige rien tant qu'on ne sait pas ce qui est fiable.** La gate relancée
sur un arbre libre, machine au repos :

    GATE COMPLET EXIT=0 · 29 étapes · aucun rouge hors dette

Les trois rouges étaient MES PROPRES INTERFÉRENCES : j'avais lancé des
tests et un `npm ci` pendant que les gates tournaient. Les deux correctifs
auraient donc « réparé » deux tests sains — et rendu EP-302 ④ aveugle au
passage, puisque sa lenteur EST son sujet (il lance trois processus pour
prouver que le verrou réseau mord).

Règle qui en sort, et qui vaut plus que les deux correctifs évités :
**toute mesure chronométrée prise pendant une gate est nulle.** Un seuil
calibré sur une machine perturbée est faux dans le sens dangereux — trop
généreux — et laissera passer demain ce qu'il devait attraper.

Corollaire appliqué au plafond du juge d'exécution : il ne se calibre pas
sur une machine de développement, puisque le juge tourne dans la lambda.
Les mesures qui comptent sont celles de production, sur PLUSIEURS œuvres,
la plus grosse comprise.

## Ce que le registre a déjà appris (2026-10-31)

- **Même demande, trois issues** : `9ee1ca86` a coûté 0,2511 $ (refus
  d'infrastructure), puis 0,0355 $ (livrée, 14 fichiers). Le tir refusé de
  08:18 avait produit 30 fichiers au tour 1 — plus que la version livrée.
  Les fichiers des tours refusés ne sont PAS stockés : la comparaison de
  couverture est impossible après coup. Défaut de journalisation consigné.
- **Le critère d'acceptation est « ça s'assemble », pas « ça couvre »** : la
  boucle livre la première version qui compile. Rien ne mesure la part du
  cahier réellement rendue.

## 2026-11-01 — DEUX LEÇONS D'UNE SUPPRESSION QUI A ÉCHOUÉ

Le propriétaire a supprimé une application. Bandeau rouge : « la suppression
a échoué — rien n'a changé ».

### Son hypothèse, et pourquoi elle était fausse

Il soupçonnait deux de mes lots de se croiser : la suppression écrite quand
la publication posait un CNAME par nom, puis le passage au `*` générique.
MESURÉ : `retirerSousDomaine` ne touche plus Cloudflare du tout — un seul
DELETE chez Vercel, où le 404 est un succès. Le changement d'architecture
avait bien été propagé. **Hypothèse réfutée par la lecture du code.**

### La vraie cause, mesurée sur la vraie table

```
UPDATE {"statut":"supprimee"} → 23514
  violates check constraint "app_generations_statut_valide"
UPDATE {"statut":"annulee"}   → 23514   (la MÊME contrainte)
```

La contrainte n'acceptait que quatre statuts. Mon lot en avait inventé DEUX,
et le DDL qui porte cette liste est versionné à deux fichiers de là
(`journal.ts`, `sqlPour`). Je ne l'ai pas lu. Le lot n'avait jamais été
exercé contre une base réelle : ni la suppression (② modifier le statut), ni
l'arrêt d'une génération en vol (③), ne pouvaient fonctionner.

**LEÇON 1 — UN LOT QUI INVENTE UNE VALEUR N'A PAS LE DROIT DE NE PAS LIRE LA
CONTRAINTE.** Une colonne contrainte est une liste fermée comme les autres :
on la lit, on ne la devine pas. Le cliquet voisin comparait depuis des mois
le SQL et le code — mais des COLONNES. Une valeur interdite dans une colonne
existante passait. EP-310 ferme la classe : la liste du `check (statut in …)`
est confrontée aux statuts que le code écrit, les deux listes DÉRIVÉES.

**LEÇON 2 — UNE CONTRAINTE DONT LA DÉFINITION PEUT ÉVOLUER NE SE POSE PAS
AVEC `exception when duplicate_object then null`.** Cette forme ne crée que
si la contrainte est ABSENTE : allonger la liste dans le dépôt n'aurait RIEN
changé sur une base déjà posée. Le dépôt aurait dit six statuts, la base en
aurait refusé deux, et l'écart serait resté invisible jusqu'à la prochaine
suppression ratée. `drop ... if exists` puis `add`.

**LEÇON 3 — L'ERREUR EXISTAIT, ET LA ROUTE L'A JETÉE.** Postgres avait nommé
le coupable. La route rendait « la suppression a échoué — rien n'a changé » :
vrai, et inutile. Il a fallu sonder la base pour retrouver ce que la route
tenait déjà dans la main. Un message d'échec qui ne porte pas sa cause coûte
une journée. La route nomme maintenant le cas 23514 et dit le geste à faire.

Et la leçon que le propriétaire voulait au registre quelle que soit la cause,
qui reste vraie même si ce n'est pas celle-ci : **un lot écrit avant un
changement d'architecture n'est pas repassé en revue après.**

### Trois leçons de méthode, portées au registre sur ordre du propriétaire

**① UN CONTRÔLE QUI SE SATISFAIT DE SA PROPRE PROSE.** Le cliquet EP-310 ⑤
est resté VERT pendant sa mutation : il testait `SQL_TABLE.includes(colonne)`
et trouvait le nom de la colonne dans un COMMENTAIRE que je venais d'écrire
pour raconter le défaut. Forme neuve de faux vert, et elle vaut pour TOUT
contrôle qui cherche une chaîne dans un fichier : retirer les commentaires
d'abord, et chercher une DÉCLARATION, pas une occurrence.

**② `publication_slug` : écrit par 4 routes, déclaré 0 fois dans le DDL.** La
vraie table ne le portait que parce que quelqu'un l'y avait ajouté à la main
un jour, dans une console. Toute base reconstruite depuis le dépôt naissait
sans la colonne qui tient la quarantaine des noms. C'est le genre de défaut
qui ne se voit que le jour où l'on reconstruit — c'est-à-dire le pire jour
possible.

**③ UN « AVANT » QUI NE MESURAIT RIEN.** Ma preuve de suppression rendait 404
AVANT comme APRÈS : j'avais forgé un jeton hors de la grammaire de
`jetonValide`, qui rend 404 sans même lire la base. Vu et corrigé avant de le
présenter ; sans cela j'aurais montré un avant/après sans valeur. Un « avant »
doit être prouvé VIVANT, sinon il ne prouve pas que l'« après » est mort.

**ET LA MESURE QUI A SUIVI, exhaustive cette fois.** Mon relevé à la main
disait trois colonnes manquantes sur la jumelle. Le moteur de comparaison en
a trouvé SIX (`attente_validation`, `fournisseur`, `moteur`,
`publication_jeton`, `publication_slug`, `publie_le`). Le propriétaire a
refusé de coller un SQL fondé sur un relevé partiel — il avait raison : la
moitié manquait.

### LA FORME GÉNÉRALE DU DÉFAUT DU JOUR (au registre sur ordre du propriétaire)

**« LE SECOND SENS EST CELUI QU'ON OUBLIE TOUJOURS : la base refusait ce
qu'elle devait accepter. »** Un contrôle qui ne vérifie qu'un sens laisse
passer la moitié des écarts. Appliqué partout dans `schema-vivant.ts` : la
colonne manquante ET la colonne non déclarée ; la contrainte absente ET la
contrainte trop étroite ; le type trop large ET le type trop strict.

### LE RECENSEMENT DES TABLES — mesuré le 2026-11-01

```
tables vivantes (OpenAPI)              : 42
tables LUES par notre code             : 36
tables ÉCRITES par notre code          : 28
tables déclarées quelque part au dépôt : 21
🔴 ÉCRITES et DÉCLARÉES NULLE PART     : 15
   ai_usage_log, ai_visibility_checks, catalog_products, checkout_anomalies,
   cron_runs, cron_state, messages, order_item_designs, profiles,
   promo_codes, score_history, shipping_cache, shipping_quote_cache,
   site_catalog_selections, sites_sous_domaines
```

C'est la maladie de `publication_slug` multipliée par quinze : une base
reconstruite depuis le dépôt naîtrait sans ces quinze tables, dont
`profiles` et `sites_sous_domaines`. **C'est un chantier, pas une
curiosité** — mais il est hors du périmètre du jour, et il est consigné.

### QUATRE FAUX POSITIFS DE MON PROPRE CONTRÔLE, trouvés avant de conclure

La première version du comparateur accusait la base de cinq écarts. Quatre
venaient de mon analyseur, un de l'OpenAPI :

1. **`id` : « la base la veut NOT NULL, le dépôt non »** — `primary key`
   implique `not null`, et mon analyseur ne le savait pas. Vrai du littéral,
   faux de Postgres.
2. **`cout_usd` : ni `not null` ni défaut lus** — `numeric(10,4)` contient une
   VIRGULE, et mon `[^,\n]*` s'arrêtait dessus : la déclaration devenait
   « numeric(10 ». Le contrôle accusait la base de ce que son propre
   analyseur n'avait pas su lire.
3. **`sections_acquises` et `diagnostics` : « défaut au dépôt, aucun en
   base »** — DIAGNOSTIC DISCRIMINANT : une ligne posée sans ces colonnes est
   relue `{}` et `[]`. La base APPLIQUE les défauts ; c'est l'OpenAPI qui ne
   les publie pas pour jsonb et les tableaux. Le contrôle aurait été rouge en
   permanence, pour rien. Fermé en les EXERÇANT (poser le minimum, relire)
   plutôt qu'en ajoutant une exception.
4. **`{}` relu comme objet** devenait « [object Object] » dans ma
   normalisation : un défaut parfaitement appliqué passait pour un écart.

**LEÇON : un contrôle neuf accuse d'abord son propre auteur.** Quatre des cinq
premiers « écarts » étaient à moi. Les présenter comme une dérive de la base
aurait envoyé le propriétaire coller du SQL contre un défaut qui n'existait
pas.

### L'INSTRUMENT QUI ACCUSE LE MONDE DE SES PROPRES BOGUES (ordre du propriétaire, mot pour mot)

« Mon contrôle accusait la base de cinq écarts. Quatre étaient à moi : une clé
primaire qui implique not null, une virgule dans numeric(10,4) qui cassait ma
lecture, des défauts jsonb que l'OpenAPI ne publie pas, et un {} devenu
[object Object] dans ma normalisation. Si je les avais présentés comme une
dérive, le propriétaire aurait collé du SQL contre un défaut inexistant. »

C'est la forme la plus pure du faux positif : **un instrument neuf qui accuse
le monde de ses propres bogues.** Un contrôle qui vient de naître doit d'abord
être soupçonné lui-même.

### UNE ACTION NE DÉPEND JAMAIS D'UNE CONDITION QUI NE LA CONCERNE PAS

**QUATRIÈME OCCURRENCE.** Le 19 octobre, une génération refusée laissait
l'écran sans aucun bouton et le propriétaire a vidé le stockage de son
navigateur à la main. Le 1er novembre, la suppression existait, prouvée de
bout en bout contre la vraie base — et restait INVISIBLE sur les lignes
refusées : toute la rangée était conditionnée à `a.revoyable` (« les fichiers
existent-ils »). Or la plupart de ses cartes sont des refusées : la fonction
qu'on venait de construire ne résolvait pas son problème.

« Revoir », « Publier », « Télécharger » ont besoin de la matière — sans elle
ils promettent un 404. « Supprimer » n'a besoin que du droit de supprimer.

**L'AUDIT DEMANDÉ, six actions du tableau de bord :**

| action | condition | verdict |
|---|---|---|
| `revoir` | fichiers | légitime |
| `publier` | fichiers | légitime |
| `telecharger` | fichiers | légitime |
| `supprimer` | fichiers | 🔴 **corrigé** — aucune condition |
| `renommer` | aucune | légitime |
| `adresseSite` | site publié | légitime (une adresse sur un brouillon rendrait 404) |

EP-312 fige cet audit : une action neuve posée sous une condition étrangère
fait rougir, et le message dit laquelle. Le cliquet vérifie les DEUX sens —
sans quoi « sortir tout de la condition » passerait pour un correctif.

**À NOTER, hors périmètre :** les SITES n'ont aucune action de suppression.

### TROIS FOIS LE MÊME ACCENT GRAVE

Trois fois dans la journée, un commentaire citant « pg_constraint » ou
« publication_slug » entre accents graves a FERMÉ le gabarit JavaScript qui
porte le SQL de `sqlPour` — erreur de syntaxe, trois cycles perdus. La
consigne est maintenant écrite EN TÊTE du bloc concerné : dans ce fichier, des
guillemets français, jamais d'accent grave.

### DEUX DETTES SUR LE MÊME ÉCRAN — à faire ensemble (2026-11-01)

Trouvées en passant, consignées sans être touchées. Elles concernent toutes
les deux la carte d'un SITE dans le tableau de bord :

1. **Les sites n'ont AUCUNE action de suppression.** Les applications en ont
   une, prouvée de bout en bout ; les sites, rien. Un site mort s'accumule,
   et c'est exactement le problème qui a fait vider le stockage du navigateur
   à la main le 19 octobre.
2. **L'adresse d'un site passe par un slug maison** (`dashboard/page.tsx`,
   `normalize('NFD')`) qui IGNORE les noms réservés : l'écran propose
   `admin` ou `support`, et la route refuse après le clic. Le cliquet EP-309
   ⑧ est volontairement restreint à la publication des APPLICATIONS pour ne
   pas rougir sur une dette qui n'est pas la sienne — la restriction est
   écrite à l'endroit même.

Décision du propriétaire : **ces deux dettes se feront ensemble**, puisque
c'est le même écran.

### « DÉCLARÉE » N'EST PAS « APPLIQUÉE » — convalidated

J'avais nommé le trou en section D : une contrainte posée NOT VALID existe,
rend une définition parfaite, et ne vérifie que les écritures FUTURES. Les
lignes déjà en base y échappent. Le propriétaire : « Alors lis-la. C'est un
champ de `pg_constraint`, dans la requête que tu viens d'écrire. »

C'était vrai : une colonne de plus dans ma propre requête. Désormais une
contrainte non validée fait ROUGIR, et une validité INCONNUE (une RPC d'une
version antérieure) fait rougir aussi — on ne suppose pas qu'une contrainte
s'applique.

### DEUX AFFIRMATIONS RÉFUTÉES PAR LA MESURE EN DIX MINUTES (2026-11-01)

**① « `create or replace` remplace la précédente, les droits survivent. »**
FAUX. Postgres a refusé : `42P13` — on ne change pas le type de retour d'une
fonction existante. Il a fallu `drop function` d'abord, et les droits sont
partis avec. Le propriétaire a dû les reposer dans le même collage. Changer
la SIGNATURE d'une fonction, c'est la détruire et la recréer ; seul un corps
identique en signature se « remplace ».

**② « La fonction est révoquée pour anon. »** FAUX AUSSI, et c'est la mesure
qui l'a dit — pas un raisonnement :
```
ANONYME  AUTORISE → 5 regles rendues
SERVICE  AUTORISE → 5 regles rendues
```
`revoke all on function … from anon, authenticated` ne suffit pas : Postgres
accorde `EXECUTE` à **PUBLIC** par défaut sur toute fonction neuve, et `anon`
en HÉRITE. Révoquer le rôle nommé laisse l'héritage intact. C'est `PUBLIC`
qu'il faut révoquer.

**LA LEÇON COMMUNE : deux fois dans la même heure, j'ai affirmé le
comportement de Postgres au lieu de l'interroger.** Les deux affirmations
étaient plausibles, documentées dans ma tête, et fausses. La sonde mesure
désormais l'ouverture au public À CHAQUE DÉPLOIEMENT, avec la clef anonyme :
une capacité ouverte sans qu'on le sache reste une capacité ouverte.

### LES INDEX UNIQUES VIVENT AILLEURS

`publication_jeton_unique` est posé par `create unique index` : il n'apparaît
PAS dans `pg_constraint`. La première version de la RPC ne le voyait donc pas,
et un index unique disparu en production aurait laissé **deux applications
partager un jeton de publication** — la route publique n'ayant aucun moyen de
choisir laquelle servir. La requête lit maintenant `pg_index` en plus, avec
`indisvalid` comme équivalent de `convalidated`.

## RÈGLE 8bis DU PROTOCOLE (ajoutée le 2026-11-01, sur ordre du propriétaire)

> **UNE GATE INTERROMPUE N'A PAS DE VERDICT, ET L'ABSENCE DE VERDICT N'EST PAS
> UN VERT.**

C'est le revers manquant de la règle 8 (« rien ne tourne pendant la gate »).
Trois fois dans la journée, j'ai arrêté une gate pour avancer sur le lot
suivant, puis j'ai parlé de l'état du dépôt comme s'il était établi — jusqu'à
écrire « il est fini et vert » sur la foi d'une gate que j'avais tuée avant son
verdict. Elle était rouge, deux fois de suite, et pour des défauts de mon
propre lot.

C'est la même faute que « le dépôt est cohérent avec lui-même » pris pour « la
base est conforme » : confondre l'absence de contradiction avec une preuve.

**Conséquence pratique** : on ne cite une gate que par son `EXIT=` imprimé. Une
gate arrêtée se dit « arrêtée, sans verdict », jamais autrement.

## LE PIÈGE DE L'`undefined` — il vaut pour tout test qui éprouve une absence

J'ai écrit un cliquet pour prouver qu'une route REFUSE une requête sans nom de
produit. Le constructeur de requête avait une valeur par défaut, et j'ai passé
`undefined` pour dire « n'envoie rien ».

En JavaScript, `undefined` passé à un paramètre à valeur par défaut **réveille
le défaut**. La requête portait donc « Facture SNE », la route a répondu
`ok: true`, et **je mesurais un succès en croyant mesurer un refus**.

**La règle** : pour éprouver une ABSENCE, la sentinelle est `null`, ou le champ
est omis de l'objet — jamais `undefined`. Et un test d'absence qui PASSE du
premier coup mérite d'être muté : s'il ne rougit pas quand on lui donne une
valeur, il ne mesurait rien.

## ET LE CLIQUET D'ISOLATION A EU RAISON CONTRE MOI

J'avais posé `schema-vivant.verif.mts` dans `lib/apps`. La gate l'a refusé : un
cliquet interdit la séquence `delete(` partout dans `lib/apps` sauf dans
`banc-jumelle.ts` — leçon du 2026-10-09, ~6,9 $ d'état payé effacé parce que la
jumelle mêlait banc d'essai purgeable et entrepôt d'état.

Mon script retire ses témoins, donc il efface. Sa place est dans `scripts/`,
avec les outils. **Un cliquet écrit il y a trois semaines m'a attrapé
aujourd'hui sur un fichier qui n'existait pas alors.** C'est exactement ce
qu'on attend d'eux.

## NUANCE À LA RÈGLE 8bis (ajoutée le 2026-11-01, sur ordre du propriétaire)

La règle 8 vise ce qui consomme le processeur **de façon mesurable** : un
build, une suite de tests, une compilation. Elle ne vise pas la lecture d'un
fichier. J'avais commencé à m'interdire un `grep` pendant neuf minutes de
gate, ce qui rend le travail impossible sans rien protéger.

**Le critère est l'ordre de grandeur** : si ce que je lance peut déplacer une
mesure de plusieurs centaines de millisecondes, la règle s'applique. Quatre
lectures de fichier, non.

## `$?` APRÈS UN TUYAU N'EST PAS L'ÉTAT DE LA COMMANDE

```
git push … 2>&1 | tail -6; echo "PUSH EXIT=$?"     → 0
git ls-remote origin -h refs/heads/main            → 8e8e218b (INCHANGÉ)
```

La commande entière avait avorté sur `timeout: command not found` — `timeout`
n'existe pas sur macOS, c'est `gtimeout` (coreutils). Et dans un tuyau, `$?`
rend l'état du **dernier maillon**, pas du premier : je lisais l'état du
`tail`.

**AUDIT DE MA PROPRE JOURNÉE** : au moins une sortie publiée était vide de
sens — « corps forgé RPC ouverte → EXIT=0 », alors que le vérificateur sort
en **1**. Le verdict rouge affiché était juste ; le code imprimé à côté ne
disait rien. Reprise sans filtre, les cinq corps donnent bien `EXIT=1`.

**LE REMÈDE, ET IL EST DÉJÀ EN PLACE POUR LES GATES** : rediriger vers un
fichier, lire le code AVANT de filtrer. C'est pour cela que les verdicts de
gate, eux, sont fiables. Ailleurs : `set -o pipefail`.

## LA MARGE D'EP-302 ④ — CLASSÉE, MESURE À L'APPUI

```
dans quatre journaux de gate :  1771 · 1824 · 2078 · 2519 ms
suite complète, machine au repos (vitest-results.json) :  735 ms
l'étape de marge lancée seule :  🟢 tous les cas tiennent · EXIT=0
```

Les quatre dépassements ont eu lieu pendant des gates où je lançais autre
chose. Au repos, le test tient sa marge à ×6,8 — très loin du ×3 exigé.

**AUCUNE ACTION.** Ni alléger la fixture, ni inscrire le test au registre des
lenteurs : il n'est pas lent. Ce qui était faux, c'est la condition de
mesure. Consigné ici pour que le prochain dépassement ne soit pas re-débattu
depuis zéro : **vérifier d'abord que rien d'autre ne tournait.**

Et la CI, elle, exécute ses étapes **en série** (un seul job, aucune matrice,
aucun `needs` — `spawnSync` côté gate) : la condition fidèle est donc bien
« suite complète, rien d'autre ».

