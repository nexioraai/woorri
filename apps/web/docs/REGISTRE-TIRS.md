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
