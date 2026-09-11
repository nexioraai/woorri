# CONFRONTATION #9 — FERMETURE F1→F10
*2026-09-11 · GO humain explicite (cette passe seule) · 0 génération, 0 $,
0 build, 0 push. Correspondance supposée avec les amendements du verdict
externe : C1≈F4, C2≈F5 (O.1) ; C6≈F6/F7 (O.2) ; C3/C5≈F8 (O.3).*

## F2 — TABLE D'ATTRIBUTION DES 5 DIAGNOSTICS KAVIVA (détermine l'ordre)

Artefact : `results/kaviva-spa.…reparation-partielle.air.json` (gelé).

| # | Diagnostic | Symptôme | Couche | Producteur | Artefact | Preuve | Correction | Reproduction (0 $) | Impact ordre |
|---|---|---|---|---|---|---|---|---|---|
| 1–4 | AIR_TEST_TARGET_MORTE ×4 | les 4 actions auth (signIn/Up/Out/reset), correctement câblées `ui` sur leurs formulaires, jugées « mortes » | **JUGEMENT (enveloppe)** — ni modèle, ni génération, ni composition, ni runtime | execution-contract | `EXECUTION_ENVELOPE_V1.effects` | `executed = effects.has(kind) ∧ …` (graph.ts:419-422) ; `effects=["navigate","mutation"]` (envelope.ts:109-123) exclut `capability` que `sessionEtablissable:true` (l.206) affirme exécutable — seule cette conjonction échoue (les 2 autres vraies, vérifié #6) | R1 : granularité d'enveloppe par méthode de capacité exécutable | harnais validateLocal extrait (scratchpad, rejoué 2×) : 5 diagnostics, 0 appel | R1 = correction du JUGE, indépendante, première |
| 5 | AIR_INTENT_SATISFAIT_PAR_DU_MORT | le besoin « création de compte » refusé | **JUGEMENT** (transitivité) | fidelity | `vivants` (intent.ts:430-437) | même prédicat `controls().executed` | R1 (identique) | idem | idem |

**CRITÈRE INVERSÉ, appliqué** : R1 seul rendrait le DOCUMENT kaviva
entièrement vert au niveau AIR (les 5 diagnostics sont 5/5 de la couche
jugement). DONC R1 n'est PAS la résolution de la cause racine — la cause
racine (EP-019 : modèle jamais capturé, patron creux de l'attempt1)
n'apparaît dans AUCUN des 5 diagnostics résiduels précisément parce
qu'elle a été payée en réparation AVANT eux. CONSÉQUENCE D'ORDRE :
R1 d'abord (un juge faux fausse toute mesure ultérieure — correction de
l'instrument), MAIS la fermeture de la cause racine est R2 (contrat
modèle, F1/F3/F4/F5/F7) et sa PREUVE est R3 : kaviva-modèle écrit à la
main, verdict attendu ENVELOPE=GREEN / MODEL=RED (#6-I). Kaviva reste
fixture de stress : le patron attempt1 est REPRODUIT en test de contrat
(modele-metier.test — « parcours riches, matière absente : REFUS »), sans
toucher à Kaviva. **F2 = CLOSED.**

## F1 — COUVERTURE + SUFFISANCE (contrat modifié, testé)

Livré dans `benchmarks/air-emission/modele-metier.mjs` (+ .d.mts) :
`couverture` AU CONTRAT — `couverts[{terme, noeuds[≥1]}]` (traçables vers
des nœuds existants), `nonRetenus[{terme, raison}]` à raisons FERMÉES
(hors_perimetre_mobile, expression_visuelle, doublon,
capacite_hors_enveloppe, infrastructure_technique, ambigu) ; `ambigu` ⇒
refus EXPLICITE (MODELE_TERME_AMBIGU). P1 = `validerModele` : forme
(schémas .strict()) + références (MODELE_REFERENCE_INCONNUE,
MODELE_ETAT_INCONNU) + SUFFISANCE déterministe (SANS_PARCOURS,
PARCOURS_SANS_PREUVE, CONCEPT_MORT, ACTEUR_MUET, COUVERTURE_VIDE).
Fixture de stress kaviva-attempt1 (structurale, non sectorielle) REFUSÉE ;
modèle suffisant de référence accepté ; 6 tests F1. **F1 = CLOSED.**

## F3 — SUPPRESSION DU TEXTE (test présent, passe, peut échouer)

`tests/suppression-texte.test.ts` (3 tests) : (a) aucun paquet MOTEUR ne
lit `intent.request`/`requestLocale` (hors commentaires — état mesuré :
1 commentaire fidelity, 1 définition de schéma air.ts) ; (b) les
DÉRIVATIONS (obligations-passes, modele-metier) ne connaissent ni
INTENTIONS, ni intention.text, ni « DEMANDE DU CLIENT », ni E/S ;
(c) le runtime embarqué ignore l'existence du brief. Réintroduire une
lecture ⇒ échec. INSCRIT COMME CRITÈRE DE FERMETURE DE R2 (volet
dynamique) : produire le modèle → retirer le brief → exécuter TOUTES les
dérivations depuis le modèle seul → plans byte-identiques. **F3 = CLOSED**
(volet statique exécuté ; volet dynamique = critère R2 inscrit).

## F4 — VISUEL DÉRIVÉ (contrat + test + mutation)

`estVisuel(concept) := ∃ attribut{nature=media, requis=true,
cardinalite≥1}`. P0 modélise l'ATTRIBUT (fait du brief) ; la propriété de
présentation se DÉRIVE. Le schéma strict REFUSE un champ `visuel` déclaré
(mutation testée). média présent→true / absent→false / non-requis→false :
testés. **F4 = CLOSED.**

## F5 — GRILLE SANS PROXY PRODUCTEUR (règle remplacée + 3 cas + 3 mutations)

Nouvelle règle CODÉE : `mailleDe := GRILLE ⇔ estVisuel ∧ accès catalogue`
(accès dérivé du GESTE : decouvrir/chercher=catalogue ;
consulter_historique=lecture). `producteur` supprimé du discriminant.
Cas exigés testés : publications visuelles d'un profil, « mes annonces »,
« mes véhicules » → GRILLE bien que produits par l'acteur ; le fil reste
LIGNES par son geste. Mutations : ¬visuel→lignes ; accès non
catalogue→lignes ; producteur=utilisateur n'empêche RIEN. **F5 = CLOSED.**

## F6 — FLUX : UN SEUL PRODUCTEUR (amendement)

AMENDEMENT à #8-O.1 : la notation « P2c-d » est SUPPRIMÉE. **P2c produit
les surfaces et leur nature ; P2d — SEUL — décide la matérialisation
(fenêtre/aperçu/rangée)**, car le flux dépend du résultat de
co-localisation (une surface n'est « unique sur son écran » qu'une fois
l'écran composé). Aucun code n'a aujourd'hui deux producteurs (P2 n'est
pas implémenté) — l'autorité est fixée AVANT l'implémentation ; le contrat
type de R4 devra donner à P2c un type de sortie SANS champ de flux.
**F6 = CLOSED.**

## F7 — ÉTAT VIDE DES COLLECTIONS MUTABLES (règle étendue + fixture + mutation)

`etatVideObligatoire := strategieInitiale="vide" ∨ ∃ étape retirer` — le
geste `retirer` (mutation delete, dans l'enveloppe) entre à la TABLE DES
GESTES. AMENDEMENT de forme normale : `producteur`/`strategieInitiale` ne
sont PLUS déclarés — DÉRIVÉS des parcours (∃ saisir ⇒ vide-né, l'acteur du
parcours est le producteur ; sinon amorcé). Fixture : favoris AMORCÉS mais
VIDABLES ⇒ état vide obligatoire ; mutation : sans étape réductrice, une
collection amorcée ne l'exige pas. **F7 = CLOSED.**

## F8 — NAVIGATION : DETTE DATÉE

INSCRIT AU PLAN : **objectif** — mécaniser l'émission de la section
navigation depuis P2d ; **cible : R5** ; **critère de fermeture** — P3 ne
produit plus structurellement la navigation ; la navigation émise provient
mécaniquement du plan P2d ; la gate plan↔document devient vérification
PURE ; le runtime ne crée aucune route (cliquets ① maintenus). Aucune
mécanisation anticipée ici (elle appartient à R5 — P2d n'existe pas
encore, il n'y a RIEN d'où mécaniser). **F8 = CLOSED** (en tant que dette
datée et critériée).

## F9 — GÉNÉRICITÉ : UNKNOWN

Le tableau statique de #8-G est un RAISONNEMENT, pas une preuve.
**GENERICITE = UNKNOWN.** Protocole de preuve (exécution = R4) :
(1) 7 fixtures de modèle écrites à la main AU FORMAT DU CONTRAT (le
contrat exécutable existe depuis cette passe — `modeleMetierSchema`) ;
(2) validées par `validerModele` ; (3) dérivations appliquées PAR CODE
(mailleDe, strategieInitiale, etatVideObligatoire + P2 quand livré) ;
(4) sorties comparées à des ATTENTES FIGÉES À L'AVANCE (fichiers
d'attendus commités AVANT l'exécution) ; (5) ablation statique : aucun nom
de domaine dans tables/index (cliquet d'agnosticisme étendu) ; (6) ≥1
mutation par règle ; (7) chaque mutation rejetée par LA règle visée (pas
une autre). Les mini-fixtures de cette passe (soins, social, favoris)
amorcent le format sans constituer R4. **F9 = UNKNOWN** (déclaré, protocole prêt).

## F10 — ORDRE R0→R8 FINAL (déterminé par F2, pas recopié)

| # | Contenu | Justification d'ordre (source) |
|---|---|---|
| R0 | gouvernance/jeton GO | EP-018 — conditionne toute dépense future |
| R1 | enveloppe véridique par méthode de capacité | F2 : 5/5 diagnostics = couche JUGEMENT ; un juge faux fausse R3+ ; PAS la cause racine (critère inversé) |
| R2 | contrat modèle (LIVRÉ ici : F1/F4/F5/F7) + intégration P0 + TEST DE SUPPRESSION DU TEXTE dynamique (critère F3) | EP-019 = cause racine → le contrat la ferme ; le volet statique F3 est déjà vert |
| R3 | juges + mutations : vivacité V1–V5, Conformance, kaviva-modèle manuel (attendu ENVELOPE GREEN / MODEL RED) | F2 : la preuve de cause racine se rend ICI, jamais par R1 |
| R4 | dérivations de construction P2a–e + 7 fixtures + ATTENDUS FIGÉS → GENERICITE peut passer PASS | F9 |
| R5 | AIR prescriptif + MÉCANISATION NAVIGATION (critère F8) + composition nourrie | F8 daté |
| R6 | correspondances (nomenclature, needs Option B, écrans↔plan) | dépend de R2/R4 |
| R7 | EP-021 (échelle grammaires) / runtime | indépendant, avant campagne |
| R8 | campagne multi-domaines + hold-out hostile (M) | dernier, GO dédié, budget chiffré |

## NON-FONCTIONNALITÉS V1 (déclarées, réouvrables par D6 sur défaut démontré)

1. **Deep links** — aucun déclencheur externe dans l'enveloppe.
2. **Pagination structurelle** — aucun défaut mesuré ne l'exige ;
   `pageSize` reste une borne validée non structurelle.
3. **Comparaison côte-à-côte de deux instances sur un même écran** —
   conséquence assumée de C4 (une identité d'instance max) et de
   FICHE×FICHE interdit. La comparaison v1 passe par la RANGÉE
   (aperçu de comparaison) puis la fiche.
Ce ne sont pas des bugs : ce sont des frontières déclarées.

## K — GATES CONSOLIDÉES (une gate refuse ou valide, ne décide JAMAIS)

| ID | Condition | Producteur jugé | Artefact | Preuve/test | En échec |
|---|---|---|---|---|---|
| G-P1 | forme+références+suffisance du modèle | P0 | modèle | modele-metier.test ×14 | refus AVANT toute passe |
| G-TXT | aucun lecteur du texte post-P0 | tous | sources | suppression-texte.test ×3 | échec de build |
| G-PLAN | plan cohérent (chrome dupliqué…) | planner | CompositionPlan | validation-avant-emission ×5 (④) | EMIT_PLAN_INVALIDE |
| G-TRANS | plan transporté, jamais recalculé | émetteur/runtime | composition | plan-transport ×4 (①) | échec de build |
| G-SHELL | un propriétaire des insets | shell | AppShell | app-shell ×5 (②) | échec de build |
| G-CTR | capacité→rôle→place, non-apparition | tables | émission | contrat-capacite-role ×6 (③) | échec de build |
| G-CHAINE | pas de chemin parallèle | pipeline | attic/neutralisations | chemins-paralleles ×3 (⑥) | échec de build |
| G-OBLIG | ordre des passes + obligations branchées | générateur | emit-v3 | obligations-passes ×4 (⑤) | échec de build |
| G-VIE | vivacité V1–V5 + Conformance | document+modèle | app+modèle | R3 (à livrer) | refus acceptation |
| G-CORR | correspondances modèle↔document↔plan | générateur | document | R6 (à livrer) | refus |
| G-EXPR | projection structurelle invariante | expression | émission | R5 (à livrer ; propriété déjà vraie : 1 fichier) | refus |
| G-GO | aucune dépense sans jeton | humain | GO/ | R0 (à livrer) | refus de lancement |

## M — HOLD-OUT : **NON EXERCÉ**

Protocole inscrit (#6-§8) : domaine séquestré hors dépôt · moteur gelé par
commit taggé AVANT révélation (antériorité prouvable au journal) · brief
révélé UNE fois · aucune règle du domaine (cliquet post-hoc) ·
symbolisation → isomorphisme · ablation · verdict PASS/FAIL. Statut
actuel : **NON EXERCÉ** — aucune exécution n'a eu lieu, aucun PASS n'est
prononcé.
