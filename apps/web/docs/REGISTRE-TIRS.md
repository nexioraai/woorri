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

## Ce que le registre a déjà appris (2026-10-31)

- **Même demande, trois issues** : `9ee1ca86` a coûté 0,2511 $ (refus
  d'infrastructure), puis 0,0355 $ (livrée, 14 fichiers). Le tir refusé de
  08:18 avait produit 30 fichiers au tour 1 — plus que la version livrée.
  Les fichiers des tours refusés ne sont PAS stockés : la comparaison de
  couverture est impossible après coup. Défaut de journalisation consigné.
- **Le critère d'acceptation est « ça s'assemble », pas « ça couvre »** : la
  boucle livre la première version qui compile. Rien ne mesure la part du
  cahier réellement rendue.
