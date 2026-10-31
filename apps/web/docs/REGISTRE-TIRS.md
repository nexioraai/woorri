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
| 2026-10-31 11:08 | `eb7b62b5` | direct/deepseek | [`9ee1ca86`](registre-tirs/9ee1ca86.demande.txt) — cahier des charges 22 866 car., plateforme internationale de réservation/paiement + agent IA | 1 | 127 s | 0,0355 $ | 6 336→15 795 | 14 | ✅ livrée | P1 : install ✅ build ✅ (sortie = dev.html) `npm start` ❌ script absent ; `npm run dev` ✅ 200 ; index.html autonome ✅ zéro chargement externe. P2 : ❌ aucun artefact natif dans le zip (arrêt à l'étape a). Couverture partielle MESURÉE : paiement 2 occ. (cahier : 34), anglais/arabe/RTL/connexion : 0 ; devise rendue EUR, pas FCFA. Le 0,0355 $ n'est PAS « le prix d'une application » : c'est le prix d'UN tour accepté dont la couverture n'est pas mesurée. |
| 2026-10-31 08:18 | `96768b7f` | direct/deepseek | [`9ee1ca86`](registre-tirs/9ee1ca86.demande.txt) — MÊME demande que 11:08 (SHA identique) | 3 | 631 s | 0,2511 $ | 116 169→88 084 | 30/15/15 (non stockés) | 🔴 refusée — « react non embarqué » ×3, disque de fonction amputé (fermé par EP-294/295) | — |
| 2026-10-31 01:02 | `7d17287f` | direct/deepseek | [`03b9b664`](registre-tirs/03b9b664.demande.txt) | 3 | 363 s | 0,195 $ | — | 17/17/17 (non stockés) | 🔴 refusée — tour 1 : react-native/expo refusés (web), tours 2-3 : react non embarqué (même défaut de disque) | — |

## Ce que le registre a déjà appris (2026-10-31)

- **Même demande, trois issues** : `9ee1ca86` a coûté 0,2511 $ (refus
  d'infrastructure), puis 0,0355 $ (livrée, 14 fichiers). Le tir refusé de
  08:18 avait produit 30 fichiers au tour 1 — plus que la version livrée.
  Les fichiers des tours refusés ne sont PAS stockés : la comparaison de
  couverture est impossible après coup. Défaut de journalisation consigné.
- **Le critère d'acceptation est « ça s'assemble », pas « ça couvre »** : la
  boucle livre la première version qui compile. Rien ne mesure la part du
  cahier réellement rendue.
