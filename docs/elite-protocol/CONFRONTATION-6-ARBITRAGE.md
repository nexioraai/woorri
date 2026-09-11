# CONFRONTATION #6 — ARBITRAGE CLAUDE CODE
*2026-09-11 · analyse/arbitrage SEULEMENT · HEAD `aa4446a` · 0 code, 0
génération, 0 $, 0 build. NOTE DE RÉCEPTION : le document du propriétaire
est TRONQUÉ après « 10. CE » — les sections 1–9 sont arbitrées ici ; les
sections 10+ restent dues et devront être re-soumises.*

---

## §1–2 — POINTS COMMUNS : RATIFIÉS

La chaîne INTENTION → COMPRÉHENSION → MODÈLE → VALIDATION → OBLIGATIONS →
DÉRIVATIONS → PLAN → ÉMISSION → RUNTIME est ratifiée telle quelle — elle
règle d'ailleurs l'ancien désaccord Q1 (#4) : les rôles/place/composition
y figurent comme DÉRIVATIONS, pas comme couches décisionnelles. Ratifiés
également : A (une source, le texte libre meurt à P0), B (GrapheParcours
dérivé du modèle / GrapheNavigation dérivé du plan / Conformance = juge ;
un juge qui manque d'information ⇒ on enrichit le MODÈLE), C (secteur
jamais décisionnel, À PROUVER — protocole en §8), D (D1–D6), E (états sous
condition de transition observable + invariants), F (producteur →
stratégieInitiale dérivée — meilleur que mon `origine` : l'acteur est la
cause, l'amorçage la conséquence ; j'abandonne `origine` déclaré), G
(vivacité V1–V5 par ACTEUR), H (structure/expression), I (Kaviva fixture,
voir infra), J (judge first, pay later).

---

## §3 — DÉSACCORD #1 : « un cerveau » — INTERPRÉTATION DE CLAUDE CHAT CONFIRMÉE

Oui, et sans réserve : « Brains = 1 » n'a jamais voulu dire « une fonction
géante qui décide tout » — P0 est le SEUL composant autorisé à résoudre une
ambiguïté sémantique du texte ; tout le reste est dérivation. Définition
CONTRACTUELLE proposée, sans ambiguïté :

- **CERVEAU** : composant dont l'entrée contient du texte libre et dont la
  sortie est un artefact structuré. Il en existe EXACTEMENT UN : P0.
- **DÉRIVATION** : fonction TOTALE sur les modèles valides (définie pour
  tout modèle valide, ou échec NOMMÉ — D5), dont chaque prédicat de
  branchement ne lit QUE : champs du modèle ∪ registres fermés ∪ artefacts
  dérivés antérieurs (D2/D4). Une dérivation qui aurait besoin d'autre
  chose ne « choisit » pas : elle échoue `DISCRIMINANT_ABSENT` en nommant
  les deux sorties candidates (D6) — et ce cas ouvre une proposition
  d'enrichissement du modèle (procédure §6).
- **VÉRIFICATION MÉCANIQUE** : (i) frontière de type — après P0, la
  signature d'aucune fonction n'accepte le brief (le texte libre n'existe
  plus dans le système de types) ; (ii) cliquet statique — aucun module
  aval n'importe/ne référence `intention.text` ; (iii) test D6 par
  mutation — deux modèles ne différant que par le champ F doivent produire
  des sorties dont la différence est attribuable à F.

Claude Chat ne se trompe nulle part sur ce point.

---

## §4 — DÉSACCORD #2 : M3 et la suffisance — DISTINCTION ACCEPTÉE DÉFINITIVEMENT

Oui. Formalisation à quatre questions, quatre instruments — aucun ne
remplace les autres :

| Question | Instrument | Ce que ça prouve |
|---|---|---|
| P0 a-t-il tout VU ? | **M3** : `couvert[]` + `nonRetenu[{terme, raison}]` | responsabilité/couverture lexicale — les omissions sont EXPLICITES et auditables ; ne prouve PAS la richesse |
| Ce qu'il a construit est-il BIEN FORMÉ ? | invariants du contrat (forme, clôture, états E) | cohérence interne à 0 $ |
| Est-ce SUFFISANT pour une app vivante ? | Conformance(GrapheParcours, GrapheNavigation) + V1–V5 sur le résultat | le modèle nourrit réellement des parcours matérialisables |
| La capacité est-elle GÉNÉRALE ? | hold-out hostile + ablation + invariance de paraphrase | généralisation, pas mémorisation |

Précision opératoire sur les MUTATION TESTS : chaque invariant du contrat
doit posséder sa mutation DISCRIMINANTE démontrée (retirer/altérer le champ
⇒ la classe de défaut attendue est attrapée) — la méthode déjà pratiquée
sur les gates (matière : Dougplace-avant=5 / Marketa-après=0).

---

## §5 — DÉSACCORD #3 : ATTRIBUTION DES 5 DIAGNOSTICS KAVIVA (table factuelle, code lu)

Artefact jugé : `results/kaviva-spa.2026-09-11T06-32-03-705Z.reparation-partielle.air.json`.
Chemin de jugement : `emit-v3 validateLocal` → `fidelity.evaluatePromises(air, ENV)` /
`fidelity.evaluateIntentCoverage(air, ENV)` avec `ENV = EXECUTION_ENVELOPE_V1`.

| # | Diagnostic | Cible | Couche responsable | Cause DÉMONTRÉE | Preuve dans le code | Conséquence |
|---|---|---|---|---|---|---|
| 1 | AIR_TEST_TARGET_MORTE | `act_inscription_soumettre` (effet `capability auth.signUp`, déclencheur `ui` sur `blk_inscription_form`) | **execution-contract (enveloppe/`controls`)** — PAS le document, PAS le générateur | `executed = executable.has(effect.kind) ∧ activable.has(trigger.kind) ∧ dispatcheReellement` (graph.ts:419-422) ; `executable = new Set(envelope.effects)` et `EXECUTION_ENVELOPE_V1.effects = ["navigate","mutation"]` (envelope.ts:109-123) ⇒ `capability` N'EST JAMAIS exécutable aux yeux du juge. Les deux autres conjonctions sont VRAIES : déclencheur `ui` ∈ triggers ; `form` n'a pas `actionId` dans `actionRefProps` ⇒ `dispatcheReellement`=true (graph.ts:383-393). Or la MÊME enveloppe déclare `sessionEtablissable: true` (envelope.ts:206) et l'exécution auth est prouvée sur appareil. | promesse jugée `cible_morte` (promises.ts:121-133 : « effet hors enveloppe ») alors que la règle 17 du prompt ORDONNE ce test — boucle de réparation INGAGNABLE (anti-amputation interdit de changer l'effet) |
| 2 | AIR_TEST_TARGET_MORTE | `act_connexion_soumettre` (`auth.signIn`, `ui` sur `blk_connexion_form`) | idem #1 | idem #1 — seule la conjonction `effects` échoue | idem #1 |
| 3 | AIR_TEST_TARGET_MORTE | `act_mot_de_passe_oublie_soumettre` (`auth.resetPassword`, `ui` sur `blk_oubli_form`) | idem #1 | idem #1 | idem #1 |
| 4 | AIR_TEST_TARGET_MORTE | `act_deconnexion` (`auth.signOut`, `ui` sur `blk_compte_deconnexion`) | idem #1 | idem #1 (bloc affordant, dispatch réel vérifié) | idem #1 |
| 5 | AIR_INTENT_SATISFAIT_PAR_DU_MORT | `need_creation_compte_cliente` (nodeIds : scr_inscription, blk_inscription_form, act_inscription_soumettre, scr_connexion, blk_connexion_form, act_connexion_soumettre, blk_oubli_form, act_mot_de_passe_oublie_soumettre) | idem #1 (par transitivité du prédicat de vie) | `evaluateIntentCoverage` construit `vivants` avec LE MÊME prédicat : `controls(air, envelope).filter((c) => c.executed)` (intent.ts:430-437) ; les 3 actions auth du besoin sont mesurables directes et ∉ vivants ⇒ `morts.length > 0` ⇒ `satisfait_par_du_mort` (intent.ts:546-556). Les écrans/blocs du besoin sont vivants (propriétaire résolu, D-100) — SEULES les actions échouent. | le besoin « création de compte » — réellement satisfait par le document et exécutable par le moteur — est refusé |

**Attribution : 5/5 DÉMONTRÉES, même cause racine unique (EP-020)** : la
granularité de `envelope.effects` ne sait pas exprimer « l'effet
`capability` est exécutable POUR les méthodes auth » que `sessionEtablissable`
affirme par ailleurs. Aucune attribution NON DÉMONTRÉE. Le document
kaviva n'est PAS fautif sur ces 5 points ; le générateur non plus (il a
obéi à la règle 17). RIEN N'A ÉTÉ CORRIGÉ.

---

## §6 — DÉSACCORD #4 : D6 sans modèle infini — LA FRONTIÈRE NETTE

**Contrat minimal (dedans)** : concepts {id, nom, donnees, producteur,
etats? sous condition E} · relations {de, vers, nature} · parcours
{besoin, acteur, etapes{concept, geste, etat?}} · la table fermée des
gestes (patrons structurels dérivés de l'enveloppe). C'est tout.

**Volontairement dehors** : champs détaillés des entités (travail de la
passe donnees sous obligations), style/expression, liste d'écrans, secteur,
libellés, quantités d'interface, tout ce qui est DÉRIVABLE.

**Règle de normalisation (anti-fourre-tout n°1)** : le modèle ne stocke que
des DÉCISIONS, jamais des conclusions — toute propriété calculable depuis
les autres champs est REFUSÉE du contrat (ex. : `stratégieInitiale` est
DÉRIVÉE de `producteur`, elle n'entre pas dans le modèle).

**Détection d'un manque** : unique et mécanique — une dérivation échoue
`DISCRIMINANT_ABSENT{champManquant?, sortiesCandidates[2]}` (D5/D6). C'est
le SEUL canal d'extension ; « je sens qu'il faudrait un champ » n'en est
pas un.

**Procédure d'entrée d'un champ (les 4 pièces, sinon refus)** : (1) la
fixture réelle qui a produit le DISCRIMINANT_ABSENT ; (2) ses invariants ;
(3) sa dérivation consommatrice ; (4) son test de mutation discriminant.
Enregistrée au registre (comme un EP-xxx), versionnée (contrat modèle
v1→v2, migrations comme l'AIR).

**Anti-fourre-tout n°2** : « aucune propriété sans consommateur » — un
champ que nulle dérivation ne lit est refusé par le test du contrat
(symétrique de la gate capacité fantôme). **n°3** : vocabulaires fermés
uniquement, aucune map libre. La frontière est donc : *un champ existe si
et seulement si une dérivation en a eu besoin, preuve à l'appui — et il
meurt si plus personne ne le lit.*

---

## §7 — DÉSACCORD #5 : STRUCTURE vs EXPRESSION — la preuve mécanique demandée

Le contrat d'interdiction est accepté tel quel (ne peut créer/supprimer
concept, relation, parcours, obligation ; ne peut modifier navigation ni
capacité obligatoires). GARANTIES, à trois étages vérifiables :

1. **Frontière de TYPE** : l'expression est une fonction
   `exprimer(PlanRéalisé, ParamètresExpression) → ChoixExpressifs` — elle
   ne REÇOIT ni le modèle ni l'AIR en écriture, et son type de sortie ne
   contient AUCUN champ structurel. L'interdiction est d'abord une
   impossibilité de signature.
2. **PROJECTION STRUCTURELLE INVARIANTE (le vrai verrou)** : une fonction
   pure `projectionStructurelle(artefact émis)` — {écrans, blocs+types,
   entités, actions+effets, navigation, zones/modes du plan} — doit être
   BYTE-IDENTIQUE entre deux émissions du même document sous deux
   expressions différentes. Test mécanique : émettre sous E1 et E2,
   comparer les projections. Toute autorité structurelle passée en
   contrebande casse ce test par construction.
3. **RE-JUGEMENT AVAL** : vivacité V1–V5, obligations et Conformance
   s'exécutent sur l'ARTEFACT FINAL (post-expression) — même un
   contournement des étages 1–2 retomberait devant les mêmes juges.

Où dans le pipeline : étage 1 au contrat du module d'expression (à créer —
aujourd'hui seule la thématisation existe) ; étage 2 en test/gate de
campagne ; étage 3 déjà en place (④ + gates), étendu par R5/R6.

---

## §8 — QUESTION #6 : HOLD-OUT HOSTILE — protocole exact

1. **Séquestre** : le 8e brief est écrit par le propriétaire et reste HORS
   dépôt (jamais commité, jamais collé dans une session de développement)
   jusqu'au jour de campagne.
2. **Gel chronologique prouvable** : le moteur+campagne sont FIGÉS par un
   commit taggé AVANT la première divulgation du brief ; le journal de
   campagne enregistre {hash du commit, hash du brief, horodatages} — la
   preuve d'antériorité est vérifiable par n'importe qui.
3. **Cliquet de nomenclature post-hoc** : après la campagne, scan
   mécanique du moteur/campagne au commit gelé : aucun nom de domaine, de
   concept ou de slug du hold-out n'y apparaît.
4. **Test de SYMBOLISATION (renommage)** : le même brief avec tous les
   noms de domaine substitués par des symboles neutres (X1…Xn, cohérents) ;
   le modèle produit par P0 doit être ISOMORPHE au modèle du brief réel
   (mêmes cardinalités, mêmes arités de relations, mêmes formes de
   parcours, mêmes séquences de gestes — comparaison mécanique à 0 $ après
   les deux appels P0). Mesure : la structure vient de la SYNTAXE du
   besoin, pas d'un lexique mémorisé.
5. **Ablation** : re-dérivations avec chaque famille de champs du modèle
   neutralisée ⇒ chaque échec ATTENDU doit se produire (prouve que les
   décisions viennent du modèle, pas d'heuristiques cachées).
6. **Paraphrases** : deux formulations indépendantes du même besoin ⇒
   équivalence STRUCTURELLE des modèles (jamais octets).
7. **Usage unique** : un hold-out ne sert qu'une fois ; il rejoint ensuite
   le corpus visible et un nouveau est écrit pour la campagne suivante.

Coût : les appels P0 du hold-out et de sa symbolisation sont payants —
chiffrés dans le budget R8, GO dédié (gouvernance §16 de la mission #4).

---

## §9 — INTENT.NEEDS : RECOMMANDATION = OPTION B (projection dérivée), avec critère de retrait

Pourquoi pas A (suppression) MAINTENANT : (1) `intent` est dans le contrat
AIR GELÉ — le supprimer rouvre le schéma, casse `evaluateIntentCoverage`,
la gate F4 et la comparabilité de TOUT le corpus historique, en plein
milieu d'une refonte amont ; (2) la machinerie d'HONNÊTETÉ
(satisfied/unexpressible vs drapeaux d'enveloppe) vit sur `intent.needs`
et garde une valeur propre : le DOCUMENT doit rester auto-descriptif — une
app doit être jugeable sans avoir le modèle sous la main ; (3) l'option B
donne la sémantique « une seule source » IMMÉDIATEMENT : needs DÉRIVÉS des
parcours par obligation (⑤/R5) + gate de correspondance
besoins↔parcours↔needs — toute divergence est un refus, donc needs ne peut
plus « décider » quoi que ce soit.

Critère de retrait (B → A éventuel) : après le verdict R8 ET deux
campagnes consécutives sans AUCUNE divergence attrapée par la gate de
correspondance, ET le traitement d'EP-021 (qui conditionne toute évolution
de grammaire AIR) — alors instruire la migration `intent` vers un AIR 2.x
comme décision de contrat séparée. Jusque-là, needs = projection,
jamais source.

---

## KAVIVA (§2-I) — ACCORD RENFORCÉ, avec la précision de Claude Chat

Je ratifie la précision : R1 ne doit PAS servir de « mise au vert »
artificielle. Attendu APRÈS R1 : `ENVELOPE = GREEN` (les 5 diagnostics
ci-dessus tombent — c'est la correction du JUGE, pas du document) ET,
séparément, `MODEL = RED` est ACCEPTABLE et même PROBABLE quand le modèle
métier écrit à la main pour kaviva (R3, « juge d'abord ») confrontera ses
parcours (choisir un créneau, historique à venir/passés) au document — la
traversabilité V2 et les états E n'y sont probablement pas. Kaviva entre
au corpus comme FIXTURE À DOUBLE VERDICT : verte à l'enveloppe, rouge à la
conformance tant que le moteur n'a pas gagné les couches R2–R6. Aucune
réparation spécifique, jamais.

---

## SECTIONS 10+ : NON REÇUES

Le document s'interrompt à « 10. CE ». Aucun arbitrage n'est rendu sur ces
sections — elles restent dues et devront être re-soumises.

## ÉTAT DU CONSENSUS

Convergents et contractualisés : §1–2 (A–J), désaccords #1, #2, #4, #5,
question #6, intent.needs (recommandation B motivée). Factuel livré : table
d'attribution 5/5 démontrée (#3). Restent : ratification humaine des
définitions contractuelles ci-dessus, et les sections 10+ manquantes.
