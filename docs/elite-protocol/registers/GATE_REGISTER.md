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
| **G27** *(candidate)* aucun réglage coûteux par défaut | **fournisseur absent → DeepSeek, ou refus de démarrer avec un message explicite ; JAMAIS Anthropic par défaut. Même règle pour tout réglage qui engage un coût** | ❓ — n'existe pas | 🟢 lisible dans le code (`fournisseurChoisi` : tout ce qui n'est pas `deepseek` donne `anthropic`, `apps/web/src/lib/apps/fournisseur.ts:69-71`) | ⏳ candidate, **non implémentée**. Constat du 2026-11-12 : les variables du générateur n'existaient qu'en Production ; une prévisualisation aurait appelé Anthropic sans que personne l'ait choisi. |
| **G28** *(candidate)* toute conversation avec le modèle laisse une ligne | **tout appel au modèle — conversation d'accueil (`/api/onboarding`) comprise — écrit une ligne, succès ou échec** | ❓ — n'existe pas | 🔴 aujourd'hui : un échec de `/api/onboarding` n'écrit **aucune** ligne | ⏳ candidate, **non implémentée**. Constat (étape 1, 2026-11-13) : deux envois de test ont échoué dans la conversation d'accueil (`401 authentication_error`) ; **0 ligne** en base, seuls les logs Vercel les montraient. L'étape 1 ne couvre que la génération. |
| **G29** *(candidate)* aucun global de Node dans le code client | **aucune référence à `process` ni à `require` dans le code client livré** | ❓ — n'existe pas | 🟢 statique sur les fichiers livrés | ⏳ candidate pour `process`/`require` (avec G25/G26) — **moitié « syntaxe de module » FERMÉE le 2026-11-13 (étape 3b)** : l'assembleur élague les exports de l'entrée (`preserveEntrySignatures: false`, rolldown) et REFUSE tout paquet qui exporterait encore (`exportsSurvivants`, liste de l'empaqueteur) ; la consigne (règle 1) dit « index.tsx n'exporte rien » ; cliquet `etape3-demarrage.test.ts` (4b8b1d20 et 9cc16d10 rejouées : script de la page compilé, zéro export — rouge sur « Unexpected token 'export' » avec l'ancien assembleur) ; tir gratuit `src/tirs/demarrage-chromium.tir.ts` : les deux œuvres s'affichent dans Chromium, 0 erreur (avant : « Unexpected token 'export' » ×2). **PROUVÉ en prévisualisation le 2026-11-13** : ligne `e9e1803f` (commit `4eecbde`, Hayine PDF) — le modèle n'a écrit aucun export, le paquet n'en porte aucun, et les fichiers livrés rejoués dans Chromium (assembleur et page réels) rendent l'accueil et `#gestion` avec **0 erreur** (`evidence/…/sortie/etape3-preuve-chromium.txt`). Fait mesuré au passage : `juge-navigateur-enfant.mjs` charge le paquet dans un `<script type="module">` SANS l'enveloppe `try{}` de la page — il ne voyait donc pas cette faute non plus (étape 4 : charger `pageAutonome`). Cas réel : `44ca6bbe` (étape 1, 2026-11-13) — `process.env.REACT_APP_SUPABASE_URL` écrit par le modèle (`App.tsx` l. 23-24) ; plante dans l'aperçu (`ReferenceError: process is not defined`), **« démarre, 0 erreur » dans le juge d'exécution**, qui tourne sous Node où `process` existe.  **Décision du propriétaire (2026-11-13) : G29 sera implémentée AVEC G25 et G26** — vérification statique, gratuite, cas réel `44ca6bbe`.  **Élargie le 2026-11-13 (décision du propriétaire) : aucun global Node ET aucune syntaxe de module non supportée dans le code client livré.** Cas réel n° 2 : `4b8b1d20` — `export default App;` écrit par le modèle dans `index.tsx`, conservé par rolldown en fin de paquet, enveloppé dans `try{ … }catch` par `pageAutonome` → `SyntaxError: Unexpected token 'export'`, rien ne s'exécute ; le juge d'exécution importe le paquet NU (`juge-execution-enfant.mjs:205`) et dit « démarre, 6 écrans ». Preuve : `evidence/generateur-2026-11-12/sortie/m12-*.json`. |
| **G30** *(candidate)* aucune borne de saisie silencieuse | **aucun champ de saisie ne tronque un collage en silence : toute borne est visible et dite, et le texte reçu par la route a la longueur du texte envoyé** | ❓ — n'existe pas | 🟢 mesurable : `demande.length` en base contre le texte collé | 🟢 **implémentée (G30 élargi) et PROUVÉE le 2026-11-13** — ligne `9cc16d10` (prévisualisation `d5302fd4` : 22 866 signes lus = envoyés, 16/16 écrans de la section 10, 8 questions ouvertes, nom `Hayine`) et tir `src/tirs/lecture-par-tranches.tir.ts` (Hayine + CPA, 43 526 signes, **2 tranches**, 12 tables, 0 doublon, 16/16 écrans, nom de la 1ʳᵉ tranche à l'essai 2 ; 0,006 $ pour deux essais, coût **mesuré** dans `lecture.coutUsd`). Cadrage final du propriétaire : **aucune limite visible** (ni compteur ni message) ; seul garde-fou, un fusible serveur de 1 000 000 signes (413, 0 appel). **Limite mesurée restante (défaut à part)** : `lire-brief` a `maxDuration = 60` s, ≈ 8 s par tranche → ≈ 7 tranches ; au-delà, la coupure de passerelle serait MUETTE côté client (`rl.json().catch(() => ({}))` → aucune note). **Variance mesurée** : 1 essai sur 2, la 1ʳᵉ tranche ne rend pas de nom valide (famille M13). Historique :  **Mesuré** : trois lignes `[TEST-ETAPE-2]` (`f29323f6`, `4b8b1d20`, `c4522e43`) portent une `demande` de **1 000 signes exactement** pour un cahier de ~1 900 ; une quatrième (école, ~2 600) affichée coupée à « renvo ». Chaîne lue : la conversation d'accueil rend `<Composeur>` sans `longueurMax` (`OnboardingChat.tsx:918-926`) → défaut `longueurMax = 1000` (`Conversation.tsx:299`) → `<textarea maxLength={longueurMax}>` (l. 348) tronque le collage sans un mot → le bouton « Application » emporte `input.trim()` tel quel (`OnboardingChat.tsx:738-742`) → fil → route → base. Le composeur de l'écran Application passe `LONGUEUR_AVEC_DOCUMENT = 200 000` (`document-joint.ts:124`) : l'étape 1 (`44ca6bbe`, 1 709 signes) est passée par lui. |


**Note de méthode — un secret ne se vérifie pas par comparaison (2026-11-13).**
Une variable Vercel de type « Secret » ne peut être ni relue ni vérifiée par la
CLI : `vercel env pull` écrit `[SENSITIVE]` à la place de la valeur. Le
2026-11-12, une copie Production → Preview a recopié ce texte de substitution,
et une comparaison d'empreintes a déclaré les deux « identiques » — deux
`[SENSITIVE]` identiques ne prouvent rien. **Toute copie de secret se prouve
par un appel réel qui réussit, jamais par comparaison.**

**Décision d'architecture — le juge d'exécution exécute LA PAGE TELLE QUE SERVIE (2026-11-13, étape 4).**
Mesuré (M9, M12) : le juge monte le paquet NU sous Node — `process` y existe (`44ca6bbe`
« démarre » puis plante au navigateur), un `export` d'entrée y est légal (`4b8b1d20` « démarre,
6 écrans », `SyntaxError` au navigateur), et `DERIBFY_BASE` n'y est pas injecté (`f29323f6`
« ne se monte pas » à tort, s'affiche au navigateur). Le juge doit charger `pageAutonome(…)`
— enveloppe `try{}` et base injectée comprises — dans **Chromium**, comme l'atelier
(outillage : `evidence/generateur-2026-11-12/m12-navigateur.mjs`). C'est l'**étape 4**, avant
G25/G26/G29, qui restent en complément statique gratuit. Implémentation après l'étape 3.
Le fait annexe « `import ws from "ws"` survit ×2 » se mesure à l'étape 4, pas avant.

**Notes du propriétaire pour l'étape 3c (2026-11-13, consignées sans implémenter).**

1. **La génération ignore la lecture.** Cas réel `9cc16d10` : la lecture a rendu 16 écrans, 4 rôles,
   6 tables, 8 questions ouvertes ; l'œuvre livre 1 écran distinct, 6/6 tables ni lues ni écrites,
   couverture 0,41, 4 exigences centrales absentes (multilingue, agent IA, recherche, administration).
   **Mesuré par lecture du code** : `direct/route.ts` passe à `boucleEcriture` `demande`,
   `configuration`, `entites`, `nom` ; `consignePour(entites)` ne reçoit ni rôles, ni écrans, ni
   questions ouvertes — `lectureBrief` n'est qu'ENREGISTRÉ. Correction 3c : la génération consomme ce
   que la lecture a produit, écran par écran.
2. **Règle du dernier tour** (`boucle-directe.ts:685`) : un tour refusé est livré quand même. Cas réel
   `9cc16d10` (tours 1 et 2 refusés, tour 3 accepté par la règle, persistance finale 6/6 ni lue ni
   écrite). C'est la boucle à remplacer (voir la note d'architecture ci-dessus).
3. **Messages d'attente honnêtes** : « Cahier lu : N signes, N tables, N écrans » dès la lecture
   terminée (≈ 12 s), puis « Génération : environ N minutes » avec un avancement réel — jamais un
   indicateur qui disparaît sans mot (observation du propriétaire, étape 2b).
4. **M14** : par génération, temps et jetons de sortie par tour, et part de réflexion si elle est
   encore activée sur la génération.

**Limite mesurée de G30 (défaut à part)** : `lire-brief` a `maxDuration = 60` s, ≈ 8 s par tranche →
≈ 7 tranches (≈ 170 000 signes) ; au-delà, la coupure de la passerelle serait **muette** côté client
(`rl.json().catch(() => ({}))` → `noteDeLecture(undefined)` = `''`).

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
