# GATE REGISTER

> ### 🔴 RÈGLE FONDAMENTALE
> **Une gate n'est PAS validée parce qu'elle existe.** Tant qu'aucun
> cas-tueur (`GATE_KILLER_TESTS.md`) n'a été exécuté contre elle, sa validité
> est **UNKNOWN**, jamais PASS.
>
> **Mise à jour du 2026-08-30** — **17 cas-tueurs ont été exécutés** (campagne 1 : 10 ·
> campagne 2 : 7), pour **9 échecs**. Le seuil quantitatif de 13 est franchi.
> **La colonne VALIDITÉ vaut néanmoins UNKNOWN pour la totalité des 25 gates**,
> et le statut `GATES: 🔴 VALIDITY NOT ESTABLISHED` est **maintenu** — pour trois
> raisons mesurées, chacune suffisante :
>
> 1. `FACT` — **0 / 25** gates possèdent une correspondance sémantique établie
>    avec le runtime (`GATE_SEMANTIC_OBSERVABILITY.md`) ;
> 2. `FACT` — les cas-tueurs étiquetés « G4 » / « G5 » ont attaqué un **proxy**,
>    la propriété énoncée de ces gates n'ayant aucune implémentation ;
> 3. `FACT` — un verdict de la campagne 1 (`KT-G05-B03`) est **invalidé** par
>    `PROTOCOL-D010` : le cas-tueur partageait l'erreur de l'instrument testé.
>
> **Franchir un seuil de comptage n'établit pas une validité** (P-C :
> `PARTIAL → PASS` ❌).

## MESURES RATTACHÉES — à lire avec ce registre

| Registre | Ce qu'il établit |
|---|---|
| `GATE_SEMANTIC_OBSERVABILITY.md` | pour les 25 gates : sémantique ↔ runtime · observabilité. **0/25** reliées au runtime · **9/25** observables sur artefact · **8/25** non observables · **1/25** ayant réellement refusé (G14) |
| `GATE_KILLER_TESTS.md` | 17 cas-tueurs · 9 échecs · réserve d'imputation G4/G5 |
| `DISCOVERY_REGISTER.md` | `PROTOCOL-D006`→`D021` — dont `D015` (transfert d'imputation), `D020` (métrique déclarée sans référent observable), `D021` (le modèle de sévérité ne peut pas représenter la composition) |
| `evidence/` | scripts ré-exécutables de toutes les campagnes et d'EXP-1 |

**Travaux ouverts sur ce registre** : `RN-09` classer les 25 gates en
`PREUVE AUTOMATISÉE` / `JUGEMENT HUMAIN` / `DÉPENDANTE D'UN LLM` / `DOCUMENTAIRE`
(**non fait**) · `RN-14` publier la couverture de cas-tueurs par gate.

---

**Six critères d'évaluation** — une gate qui échoue sur un seul est marquée :
`COUVERTURE` (quelle propriété) · `VALIDITÉ` (un PASS implique-t-il la
propriété) · `COMPLÉTUDE` (tous les défauts de la catégorie) · `RÉSISTANCE`
(gaming) · `INDÉPENDANCE` (preuves décorrélées) · `OBSERVABILITÉ`
(l'observation existe-t-elle).

---

## GATES SUR L'APPLICATION

| Gate | Propriété protégée | Observation requise | Oracle | Validité | Résistance | Indép. | Observabilité |
|---|---|---|---|---|---|---|---|
| **G0** obligations dérivées | ∀ élément ⇒ ≥1 obligation | schéma + AIR | dérivation | ❓ UNKNOWN | 🟠 visite triviale | 🟢 | 🟢 |
| **G1** faisabilité tranchée | 0 écart silencieux | AIR ∩ enveloppe | réconciliation | ❓ | 🟠 | 🔴 dépend de l'AIR | 🟢 |
| **G2** artefact instrumenté | ∀ contrôle adressable | artefact + exécution | croisement plan ↔ a11y | ❓ | 🔴 `testID` décoratif | 🟢 | 🟢 |
| **G3** double plateforme | **même artefact**, 2 OS | 2 exécutions | comparaison | ❓ | 🟢 | 🟢 | 🟢 |
| **G4** couverture d'observation | 100 % écrans + contrôles | captures + taps | comptage vs plan | ❓ | 🟠 capture sans exploitation | 🟢 | 🟢 |
| **G5** zéro contrôle fantôme | tout contrôle agit | delta + **contrôle négatif** | causalité | ❓ | 🟢 **la plus solide** | 🟢 instrument | 🟢 |
| **G6** persistance | survit à la mort du processus | dump base après relance | relecture | ❓ | 🟢 | 🟢 | 🟢 |
| **G7** géométrie mesurée | cibles ≥ seuil, 0 débordement | arbre a11y | comparaison de bornes | ❓ | 🟢 | 🟢 | 🟢 |
| **G8** fluidité | frames sous seuil | `gfxinfo` | histogramme | ❓ | 🟢 | 🟢 | 🟠 émulateur ≠ matériel |
| **G9** robustesse | réseau coupé, backend absent, données vides ⇒ état rendu | exécution dégradée | états observés | ❓ | 🟠 | 🟢 | 🔴 **outil réseau absent** |
| **G10** non-régression | pas de dégradation vs référence | diff captures + métriques | comparaison | ❓ | 🔴 **empoisonnement** | 🟠 | 🟢 |
| **G11** référence externe | rang face à l'état de l'art | banc externe | comparaison | ❓ | 🟠 | 🟢 | 🔴 **banc inexistant** |
| **G12** revue adverse | réfutation tentée et échouée | rapport adverse | jugement | ❓ | 🟠 | 🔴 même modèle | 🟢 |
| **G22** anti-minimalisme | richesse suffisante au besoin | **pool de tâches scellé** | taux de réussite | ❓ | 🟠 borné | 🟢 si tiers | 🔴 **pool inexistant** |

## GATES SUR LE GÉNÉRATEUR

| Gate | Propriété | Validité | Observabilité |
|---|---|---|---|
| **G13** corpus scellé | seuils au **1ᵉʳ passage**, 0 intervention | ❓ | 🔴 0 échantillon |
| **G14** distance de nouveauté | mesurée et publiée sur 10 axes | ❓ | 🟢 calculable |
| **G15** auto-diagnostic | le générateur signale ses propres écarts | ❓ | 🟢 |

### Décidées par le propriétaire le 2026-11-12 — NON IMPLÉMENTÉES

> Notées sur ordre, **sans implémentation**. Source des chiffres :
> `evidence/generateur-2026-11-12/` (instantané `145c4107…`, M1 et M4).

| Gate | Propriété | Validité | Observabilité | État |
|---|---|---|---|---|
| **G25** juge de navigation | **chaque entrée de menu mène à un écran valide ; aucun « Section inconnue » livré** | ❓ — n'existe pas | 🟢 les écrans visités sont déjà enregistrés par le juge d'exécution (`sections_acquises.execution.ecrans`) | ⏳ **premier juge à ajouter, après M5**. Cas-tueur **réel** disponible (règle de composition n° 3) : `f1b753a6`, livrée avec **6 écrans sur 8** disant « Section inconnue » (M4, `ecransNavigation`). Il l'aurait refusée. |
| **G26** *(candidate)* typage strict des appels à la bibliothèque fournie | **tout appel du code généré à une fonction ou une pièce de `systeme/` respecte sa signature (ordre, type et forme des arguments), vérifié par COMPILATION** | ❓ — n'existe pas | 🟢 le code généré et les signatures sont conservés | ⏳ candidate, **non implémentée**. Constat (M5, M7) : le modèle appelle `sommeParMois(paiements, 'montant', 'date')` (les deux champs inversés), `recents(paiements, 5)` (un nombre à la place d'un nom de champ), et passe `details={[{ libelle, valeur }]}` à `CarteVedette`, qui attend `[string, string][]` — la cause **lue** de `object is not iterable` dans 3 cas sur 3 (M7). `juge-contrat` ne le voit pas : il ne lit que les **noms** des réglages des composants, ni leur forme ni les arguments des fonctions. L'assembleur ne vérifie aucun type (`juge-execution.ts`, en-tête). |


**Note d'architecture — la boucle de trois tours (non implémentée, « pas
maintenant »).** M1 mesure que **27 transitions sur 48 (56 %)** gardent
uniquement les mêmes classes d'erreur : la boucle redemande la même chose au
modèle. Décision du propriétaire : elle sera **remplacée par une réparation
déterministe entre les tours**. Aucune modification de `boucle-directe.ts`
n'est autorisée par cette note.

**Cas réel rattaché à cette note (M8, état a), tentative 3 — 2026-11-12).**
Tours 1 et 2 refusés pour les mêmes classes (« réglages inconnus » —
`juge-contrat` — et « exigences muettes ») ; le modèle avait en outre déclaré
une table **sans nom**, filtrée par le validateur de production. Le tour 3 n'a
pas été appelé (budget). C'est la boucle qui redemande sans réparer. Source :
`evidence/generateur-2026-11-12/sortie/m8-a-partiel.json`. Noté sans agir.

## GATES SUR LE PROTOCOLE

| Gate | Propriété | Validité | État |
|---|---|---|---|
| **G16** cas-tueurs | toute gate a été vue échouer | ❓ | 🟠 **17 exécutés · 9 échecs**, mais concentrés sur **4 proxys** (G0, G1/G22, G4, G5) — **21 gates n'ont jamais été attaquées** |
| **G17** indépendance | aucune proposition sur une seule chaîne de dépendance | ❓ | 🔴 intersection = {AIR, modèle, générateur} |
| **G18** corpus de régression | 100 % des défauts historiques rattrapés | ❓ | 🔴 **2/4** |
| **G19** taux de découverte externe | publié avec décorrélation des sondes | ❓ | 🟠 mesuré 100 %, sondes non qualifiées |
| **G20** généralisation du protocole | appliqué hors de son périmètre de conception | ❓ | 🔴 jamais |
| **G21** limites publiées | limites connues jointes au certificat | ❓ | 🟢 L1-L4 documentées |
| **G23** ratio de construction | l'analyse ne remplace pas la construction | ❓ | 🔴 **alarme : 9 vs 1** |
| **G24** totalité de la dérivation | 100 % des champs du schéma | ❓ | 🔴 **45 %** |

---

## RÈGLES DE COMPOSITION

1. **Conjonctives.** Aucune compensation entre gates.
2. **G24 seule est gamable** (visite triviale). **G16 seule est gamable**
   (cas-tueur artificiel). **Ensemble, elles ne le sont pas** — totalité et
   discrimination doivent être exigées conjointement.
3. Un cas-tueur doit provenir du **corpus de régression de défauts réels**,
   jamais être inventé pour l'occasion. *Résiduel assumé : les premiers
   seront forcément inventés, faute d'historique.*
4. Une gate ne doit **jamais** pouvoir être satisfaite par un artefact que
   personne n'a exploité.
