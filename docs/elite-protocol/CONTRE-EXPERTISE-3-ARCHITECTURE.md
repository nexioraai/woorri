# CONTRE-EXPERTISE #3 — ARCHITECTURE DU GÉNÉRATEUR
*2026-09-11 · mission d'analyse SEULE (0 modification de code, 0 génération,
0 $ API, 0 build). HEAD `634d947`. Destinée à confrontation avec une
contre-analyse externe avant toute décision d'implémentation.*

---

## A. CARTOGRAPHIE RÉELLE ACTUELLE — les 12 maillons, au code

Légende des 10 questions : ① qui décide ② depuis quoi ③ contrat d'entrée
④ contrat de sortie ⑤ stockage ⑥ qui modifie ⑦ validation ⑧ information
métier manquante ⑨ décision implicite ⑩ duplication/second chemin.

**INTENTION** — ① le propriétaire (texte libre, `intentions.mjs`) ② besoin
réel ③ aucun (prose) ④ `intent.needs[]` avec résolution fermée
satisfied/unexpressible — mais émis EN DERNIER (passe `intention`) ⑤ AIR
`intent` ⑥ générateur seul ⑦ AIR_INTENT_* + obligations ⑤ (liste fermée)
⑧ **AUCUNE structuration amont : les concepts, relations et parcours ne
sont JAMAIS extraits comme artefact** ⑨ oui — chaque passe RE-dérive le
domaine indépendamment ⑩ non.

**CAPABILITY** — ① générateur, passe `capacites` (réordonnée AVANT ecrans,
⑤) ② brief + registre digesté ③ allowlist `registry.CAPABILITIES` ④
`capabilities[]`+`permissions[]` ⑤ AIR ⑥ générateur ⑦
`validateAirCapabilities` (dépendances, permissions induites, classe
commerce) ⑧ le LIEN besoin→capacité n'est pas tracé (déclaré, pas dérivé)
⑨ oui : auth ancre `profileEntityId` — la SEULE entité structurellement
exigée, ce qui favorise le patron « profil seul » (EP-019) ⑩ non.

**DOCUMENT (AIR)** — ① générateur par 8 passes ordonnées base→entites→
donnees→capacites→ecrans→actions→cablage→intention ② passes précédentes
(JSON complet) + obligations mécaniques (actions/cablage/intention
seulement) ③ grammaires zod par passe, échelle de dégradation (PÉRIMÉE :
EP-021) ④ AIR 1.21.0 ⑤ corpus/results ⑥ générateur + `--reparer` ⑦
`validateLocal` (schéma + 10 familles) puis `resolveLock` fail-closed ⑧
**la passe `entites` n'a NI obligation NI artefact amont** — preuve
kaviva : 1 entité émise, 22 références d'entités inconnues en aval ⑨
navigation promise dans `base` AVANT les écrans (EP-016) ⑩ construire-
fixture NEUTRALISÉ ⑥, legacy en attic ⑥.

**PLAN** — ① `planifierComposition` (pur, compiler) ② document validé ③
ProjectAir ④ CompositionPlan {rôle, defile, sections{zone,mode,apercu},
provisionRequise} ⑤ recalculé (déterministe) puis SÉRIALISÉ dans
`screens/*.data.ts.composition` (①) ⑥ personne (dérivé) ⑦ `validerPlan`
INCONDITIONNEL dans emitProject (④ ; sévérité intrinsèque) ⑧ le plan ne
connaît ni besoins ni parcours — il compose ce qui EST, il ne sait pas ce
qui DEVRAIT être ⑨ non (depuis ①) ⑩ non (recalcul runtime supprimé ①).

**RÔLE** — ① planner (rôles STRUCTURELS porte/fenetre/fleuve/fiche/
formulaire/page) + `screenTraits` (execution-contract, dérivés, ensemble)
② blocs réels ③/④ tables fermées ⑤ plan sérialisé ⑦ tests ⑧ le rôle est
structurel, jamais FONCTIONNEL (« cet écran sert le parcours X ») ⑨ non
⑩ deux dérivations (roles planner / traits graphe) — COHÉRENTES car
dérivées des mêmes blocs, mais deux vocabulaires (consigné).

**PLACE** — ① table `ZONE_PAR_BLOCK_TYPE` (③, normative, couverte par le
registre sous cliquet) ④ zones chrome/contenu + AppShell (②) ⑦
contrat-capacite-role.test ⑧ néant ⑨ non ⑩ non.

**COMPONENT** — ① `WRAPPER_BY_BLOCK_TYPE` (émission) → blocs gelés →
primitives ② blockType ③ registre fermé (8) ④ composants scellés (train)
⑦ registre + tsc app + couverture-runtime ⑧ néant ⑩ icônes : 1 source + 1
liste schéma SOUS CLIQUET (③).

**PROPS / STATE** — ① document (props) + runtime (états atteints) ②
screenData canonique ③ propsSchema zod strict ④ AirScreenData (composition
comprise) ⑦ BLOCK_PROPS_INVALID + états d'enveloppe + obs ⑧ demoValues
riches mais AUCUN modèle de cohérence inter-entités (une réservation ne
sait pas que son créneau doit exister) ⑨ non ⑩ non.

**ACTION** — ① générateur (passe `actions`, obligations ⑤ : promesses
directes + « Voir plus ») ② écrans émis ④ trigger/effect fermés ⑦
validateAir + ACTION_DECLENCHEUR_DECORATIF + dispatch réel dérivé du
registre ⑧ les actions ne composent PAS de parcours — aucune notion de
séquence (chercher→choisir→réserver→confirmer) ⑨ **`controls().executed`
décide de la VIE d'une action sur `effects=["navigate","mutation"]` — en
CONTRADICTION avec `sessionEtablissable:true` et la règle 17 (EP-020)** ⑩
double convention de dispatch (prop vs déclencheur) — dérivée du registre,
maîtrisée.

**ÉMISSION** — ① emitProject ② AIR + plan ③ resolveLock fail-closed +
validerPlan bloquant ④ fichiers canoniques + manifestes + provision ⑤
app émise (écrivain UNIQUE avec élagage, ②/⑥) ⑦ 27/27 gate, tsc app ⑩ un
seul chemin (compileProject) — contre-audit #2 confirmé.

**RUNTIME** — ① exécute, ne décide plus ② screenData transporté ③
AirScreenData (composition OBLIGATOIRE, fail-closed) ④ rendu ⑦ obs +
cliquets anti-reconstruction ⑨ plus aucune (①/②) ⑩ non.

**Verdict A** : la chaîne AVAL (document→appareil) est saine, unique et
tracée. Le trou est ENTIÈREMENT EN AMONT : entre l'INTENTION (prose) et le
DOCUMENT (8 passes), il n'existe AUCUNE représentation intermédiaire
opposable. C'est le maillon manquant — pas un maillon cassé.

---

## B. CAUSE RACINE KAVIVA — pourquoi 15 écrans / 1 entité

Fait mesuré (journal `campagne-v2-2026-09-11T06-32-03-705Z`) : 46
diagnostics en 1re passe dont 22 « entité inconnue » — les écrans
référencent `ent_soin`, `ent_creneau`, `ent_rendez_vous` que la passe
`entites` n'a pas émis. DONC :

1. **L'information métier ne se PERD pas — elle n'est jamais CAPTURÉE.**
   La passe `ecrans` (tardive) comprenait le domaine ; la passe `entites`
   (précoce) ne l'a pas exprimé. Chaque passe re-dérive le domaine du texte
   libre ; leurs interprétations divergent ; seule la validation POST-HOC
   (payée en réparation) réconcilie.
2. **Les contraintes structurées gagnent toujours sur la prose.** La seule
   entité STRUCTURELLEMENT exigée est le profil (config auth
   `profileEntityId`). La règle 15bis (prose, ajoutée après Dougplace) a
   été ignorée UNE DEUXIÈME FOIS — la récidive prouve que la médecine de
   prompt ne soigne pas une absence d'architecture.
3. **Aucune obligation mécanique ne couvre `entites`** (⑤ couvre actions/
   cablage/intention) — et il n'y a RIEN aujourd'hui d'où la dériver : le
   seul amont est la prose.
4. Aggravant (EP-021) : `base` et `entites` ont tourné à des niveaux de
   grammaire dégradés (400 API dont un `maxItems` que l'échelle ne connaît
   pas) — des contraintes perdues précisément sur les passes lourdes.
5. Réponses aux questions posées : le secteur n'est PAS représenté (voulu,
   D-086) ; l'archétype n'est PAS représenté ; le domaine n'est PAS
   modélisé ; entités/relations/workflows ne sont PAS dérivés — ils sont
   improvisés par passe ; les écrans sont déduits AVANT que les workflows
   existent nulle part (les actions arrivent après, l'intention en
   dernier) ; les capacités sont DÉCLARÉES (allowlist) et non dérivées
   d'un besoin tracé ; la représentation intermédiaire est INSUFFISANTE —
   c'est le verdict central.

---

## C. ANALYSE CRITIQUE D'EP-017

Ce qu'est `executionGraph` (packages/execution-contract/src/graph.ts, lu
intégralement) : un ensemble de FONCTIONS PURES d'ANALYSE calculées sur le
document FINI — atteignabilité (déclarée vs effective), écrans de détail
avec source d'itemId, traits structurels dérivés, formulaires muets,
liaisons de données, contrôles fantômes vs enveloppe. Il est construit à la
demande (validation, gates, oracle), ne stocke rien, ne représente NI les
parcours utilisateur NI les transitions voulues NI les données nécessaires
— seulement ce que le document déclare déjà.

**Verdict : EP-017 était partiellement FAUX.**
- Vrai : les obligations ⑤ ferment l'inexistant, pas le non-vivant.
- Faux : « dériver la liste injectée d'executionGraph » n'aurait PAS fermé
  le cas mesuré. Les 5 diagnostics restants de kaviva ciblent les 4 actions
  AUTH, correctement câblées, jugées mortes par la contradiction
  enveloppe/règle 17 (EP-020) — une liste de « cibles vivantes » les aurait
  EXCLUES du prompt, poussant le modèle à ne pas tester l'auth… que la
  règle 17 ordonne de tester. Boucle ingagnable, argent brûlé.
- `executionGraph` ne peut pas être source de vérité : il est une
  CONSÉQUENCE du document, donc du modèle insuffisant (la question 5 de la
  mission contenait la bonne réponse). Il reste un excellent VALIDATEUR de
  clôture des parcours — une fois que des parcours existent quelque part.

---

## D. EXAMEN CONTRADICTOIRE DE L'HYPOTHÈSE (secteur→…→runtime)

**A. Correcte ?** Sur le fond, OUI : il manque une couche de compréhension
structurée entre INTENTION et DOCUMENT. La preuve B est directe.

**B/C. Incomplète / couches mal placées ?** Trois désaccords précis :
1. **SECTEUR et NATURE/ARCHÉTYPE ne doivent PAS être des couches
   normatives.** Le moteur est agnostique par construction (D-086,
   agnostic.test) et c'est sa force. Un « secteur » consommé en aval
   devient inévitablement un routeur de gabarits — exactement le hack que
   la mission §12 interdit. L'archétype EXISTE déjà là où il est légitime :
   comme RÔLES STRUCTURELS dérivés (porte/fenetre/fleuve…, screenTraits) —
   conclusions, jamais causes. Je propose de NE PAS créer ces deux couches.
2. **EXECUTION GRAPH n'est pas une couche de construction** (voir C) :
   c'est un instrument de VALIDATION. Le placer dans la chaîne de
   production inverserait cause et conséquence.
3. **CAPACITÉS se dérive des PARCOURS, pas après le graphe** : un parcours
   « créer un compte » exige auth ; c'est le lien besoin→capacité
   aujourd'hui manquant (cartographie A).

**D. Autres représentations nécessaires ?** Une : l'ENVELOPPE VÉRIDIQUE PAR
CAPACITÉ (EP-020). Sans elle, tout modèle amont continuera de mourir à la
validation sur les actions auth.

**E/F/G. Sans templates, généricité réelle, anti-hack ?** Oui, à une
condition stricte : la couche manquante manipule des NOMS PROPRES À
L'APPLICATION (concepts du brief : « soin », « créneau », « rendez-vous »),
jamais des catégories universelles. Le validateur de la couche vérifie des
PROPRIÉTÉS DE FORME (chaque besoin → ≥1 parcours ; chaque parcours → étapes
en gestes de l'enveloppe ; chaque concept porteur de données → entité),
jamais un contenu attendu. Aucune liste de secteurs nulle part. Le cliquet
d'agnosticisme s'étend à la nouvelle couche.

**H. Représentation minimale suffisante** — le MODÈLE MÉTIER (proposition) :
```
modele = {
  concepts:  [{ id, nom, donnees: bool }],          // les OBJETS du domaine
  relations: [{ de, vers, nature: possede|reference }],
  parcours:  [{ id, besoinId, etapes: [{ concept, geste }] }]
             // geste ∈ vocabulaire FERMÉ dérivé de l'enveloppe :
             // decouvrir | chercher | consulter | choisir | saisir |
             // confirmer | consulter_historique | s_identifier
}
```
Trois tables, un vocabulaire fermé, zéro secteur. SUFFISANT car chaque
défaut mesuré s'y refuse mécaniquement : app creuse → concept à données
sans entité ; écran creux → étape sans bloc ; cible morte → étape sans
geste câblé ; workflow incomplet → besoin sans parcours ou parcours sans
confirmation. MINIMAL car toute réduction rouvre un défaut mesuré.

---

## E. ARCHITECTURE CIBLE PROPOSÉE

```
INTENTION (prose, propriétaire)
   ↓ passe 0 « comprehension » (LLM, grammaire du modèle métier — PETITE)
MODÈLE MÉTIER {concepts, relations, parcours}     ← artefact NOUVEAU, versionné
   ↓ validation MÉCANIQUE du modèle (forme, clôture besoins↔parcours)     [0 $]
   ↓ obligations DÉRIVÉES injectées dans CHAQUE passe :
     entites ← concepts(donnees)   ecrans ← étapes des parcours
     actions ← gestes              capacites ← gestes (s_identifier→auth)
     cablage/intention ← parcours (une promesse e2e par parcours)
DOCUMENT AIR (8 passes existantes, inchangées de contrat)
   ↓ validateLocal + ENVELOPPE VÉRIDIQUE PAR CAPACITÉ (corrige EP-020)
PLAN → validerPlan → ÉMISSION → RUNTIME            (chaîne ①–⑥, inchangée)
   ↓ executionGraph = VALIDATEUR de clôture (chaque parcours traversable)
```
Le modèle métier vit AU NIVEAU CAMPAGNE (comme les obligations ⑤) : l'AIR
gelé n'est pas modifié, aucune migration, le moteur aval reste intact.
Alternative écartée : section `modele` DANS l'AIR — plus traçable mais
rouvre le contrat gelé et alourdit chaque grammaire (EP-021 déjà critique) ;
réévaluable plus tard.

## F. PLAN D'IMPLÉMENTATION ORDONNÉ (NE PAS EXÉCUTER — GO requis par étape)

**R0 — Gouvernance mécanique (EP-018)** · proprio : pipeline · entrée :
néant · sortie : garde `GO_PROPRIETAIRE` — emit-v3, --reparer et tout
lanceur de build REFUSENT sans jeton d'autorisation explicite (fichier
one-shot docs/elite-protocol/GO/<horodatage>-<action>.md écrit par le
propriétaire, consommé au lancement) · test : lancement sans jeton = refus,
avec jeton = passe, jeton réutilisé = refus · risque : friction assumée ·
interdit : toute valeur par défaut permissive.

**R1 — Enveloppe véridique par capacité (EP-020)** · proprio :
execution-contract + fidelity · sortie : `executed` tient compte des
méthodes de capacité RÉELLEMENT exécutables (auth × sessionEtablissable),
déclaré PAR L'ENVELOPPE, jamais par cas spécial · tests : les 4 actions
auth de kaviva (fixture locale) deviennent vivantes ; contrôle négatif :
camera reste morte · preuve : les 5 diagnostics kaviva tombent à 0 SANS
appel API · risque : élargir trop (cliquet envelope-truth existant) ·
interdit : toucher au document kaviva.

**R2 — Contrat du MODÈLE MÉTIER** · proprio : nouveau module campagne
(benchmarks/air-emission/modele-metier.mjs + schéma zod) · sortie : schéma
+ validateurs de forme (0 $) + tests · critère : les briefs des 17
intentions EXISTANTES passent le validateur de forme à la main (fixtures
écrites sans LLM) · interdit : tout champ « secteur », toute énumération de
domaines.

**R3 — Passe 0 « comprehension »** · proprio : emit-v3 · entrée : brief ·
sortie : modèle métier validé mécaniquement AVANT toute passe AIR (refus =
arrêt à ~0,10 $ au lieu de 3,5 $) · gate : modèle invalide ⇒ AUCUNE passe
suivante · risque : grammaire — petite par construction (3 tables).

**R4 — Obligations dérivées du modèle pour TOUTES les passes** · proprio :
obligations-passes.mjs (extension) · sortie : entites/ecrans/actions/
capacites/cablage reçoivent leurs obligations dérivées · tests purs ·
preuve attendue : disparition de la CLASSE « app creuse » — mesurée en R6.

**R5 — Gates de clôture des parcours** · proprio : fidelity +
executionGraph · sortie : chaque parcours du modèle est TRAVERSABLE dans le
document (étapes → nœuds vivants, ordre respecté par les navigations) ·
c'est ICI qu'executionGraph sert — en juge, pas en source.

**R6 — Validation multi-domaines (matrice H)** · UNE campagne mesurée,
plafond chiffré à l'avance, GO explicite par R0.

Chaque étape : tests, non-régression, git, journaux, commit local, AUCUN
push, AUCUN enchaînement automatique vers une étape à dépense.

## G. GATES NÉCESSAIRES (état réel → manquant)

Existants et prouvés : action sans cible (validateAir), navigation morte
(reachableScreens + racines), données sans consommateur/consommateur sans
source (dataBindings + PLAN_VITRINE_VIDE), états impossibles (enveloppe +
obs), composition incohérente (validerPlan bloquant ④), reconstruction
runtime (cliquets ①), chemin parallèle (cliquets ⑥), logique spécifique à
une app (agnostic.test — à ÉTENDRE aux nouveaux modules), matière
(preuveDeMatiere — a mordu 2×).
Manquants (portés par le plan) : génération sans domaine défini (R3),
écran sans purpose fonctionnel (R5 : étape de parcours), workflow
incomplet (R5), capacité nécessaire absente / déclarée non consommée (R4 :
gestes↔capacités, les deux sens), entité inutilisée (R4 : concept↔entité,
les deux sens), génération sans autorisation (R0), secteur contourné
(cliquet : le mot « secteur » et toute énumération de domaines interdits
dans les modules moteur/campagne).

## H. MATRICE DE TESTS MULTI-DOMAINES

7 briefs (marketplace, réservation, éducation, social, livraison,
automobile, SaaS) × propriétés STRUCTURELLES mesurées mécaniquement :
concepts↔entités bijectifs · besoins↔parcours clos · parcours traversables
(R5) · 0 cible morte · 0 diagnostic qualité · diversité des rôles du plan
(un fleuve n'est pas exigé partout — la FORME doit varier avec le brief).
**Anti-mémorisation** (le moteur ne doit pas « connaître » ces 7 cas) :
(a) cliquet d'agnosticisme étendu : aucun slug/nom/secteur des cas de test
dans le code moteur/campagne ; (b) test d'INVARIANCE DE PARAPHRASE : le
même besoin reformulé (patron marketa vs dougplace, déjà pratiqué) doit
produire des documents STRUCTURELLEMENT équivalents (mêmes propriétés,
jamais mêmes octets) ; (c) un 8e brief TENU SECRET jusqu'à la campagne ;
(d) les seuils portent sur des propriétés de forme, jamais sur des noms.

## I. RISQUES ET ALTERNATIVES

1. Passe 0 = appel LLM de plus (~0,05-0,15 $) — mais elle REMPLACE des
   réparations à 0,75 $ l'appel ; net attendu négatif sur le coût.
2. Le modèle métier peut être faux (LLM) — c'est accepté : il est VALIDÉ en
   forme à 0 $ et refusé AVANT les passes chères ; un modèle faux mais
   bien formé produit un document que les gates aval jugent — défense en
   profondeur, pas oracle unique.
3. Sur-structuration (le vocabulaire de gestes trop pauvre pour un domaine
   futur) — le vocabulaire est DÉRIVÉ de l'enveloppe : il grandit avec
   elle, jamais par secteur.
4. Alternative « tout dans le prompt » (renforcer 15bis) : RÉFUTÉE par la
   récidive kaviva — deux incidents, même patron, malgré la règle.
5. Alternative « modèle dans l'AIR » : écartée (contrat gelé, grammaires),
   réévaluable quand EP-021 sera traité.

## J. DÉSACCORDS AVEC L'HYPOTHÈSE SOUMISE

1. SECTEUR et NATURE/ARCHÉTYPE comme couches : NON — dangereux (routeur de
   gabarits), inutile (les rôles structurels dérivés couvrent le besoin
   légitime), contraire à D-086. Le modèle métier suffit.
2. EXECUTION GRAPH comme couche de construction : NON — c'est un juge de
   clôture ; le placer en amont inverserait cause et conséquence.
3. EP-017 (ma propre hypothèse d'hier) : partiellement RÉFUTÉE par l'audit
   — voir C. La correction prioritaire est EP-020, pas l'injection de
   vivacité.

## K. DÉCISIONS HUMAINES REQUISES

1. GO/NO-GO sur l'architecture cible E (après contre-analyse externe).
2. Ordre R0→R6 : accepter, amender, ou réordonner (R0 et R1 sont
   indépendants du reste et fermables en premier).
3. Kaviva : reprise de la réparation (~1-1,5 $ — mais ATTENDRE R1, qui
   pourrait la rendre GRATUITE : les 5 diagnostics tombent si l'enveloppe
   devient véridique), ou gel de l'artefact en l'état comme pièce à
   conviction.
4. Budget et plafond de la campagne R6.
5. Intégration de NATURE-DU-PROJET.md dans docs/mobile-generation/
   (gouvernance du chantier, D-017).
