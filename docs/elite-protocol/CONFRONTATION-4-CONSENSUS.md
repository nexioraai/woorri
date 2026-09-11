# CONFRONTATION #4 — VERS UN CONSENSUS ARCHITECTURAL
*2026-09-11 · analyse SEULE (0 code, 0 génération, 0 $, 0 build) · HEAD `d6820b4`.
Ce document CONTREDIT successivement l'hypothèse du propriétaire ET la
proposition Claude de la contre-expertise #3, puis propose la synthèse C.
CONSENSUS_REACHED = NO : confrontation externe attendue.*

---

## A. CAUSE RACINE DÉFINITIVE

L'information métier n'est jamais CAPTURÉE dans une représentation commune
opposable : chaque passe réinterprète le texte libre indépendamment
(preuve kaviva : passe `entites` = 1 entité ; passe `ecrans` postérieure =
22 références à des entités jamais émises). Les règles de prose perdent
contre les contraintes structurées ; la seule entité structurellement
exigée est le profil (config auth) — d'où le patron creux, REPRODUIT
malgré 15bis. Aggravants : enveloppe non véridique sur l'auth (EP-020 —
boucle de réparation ingagnable) et échelle de grammaires périmée (EP-021).

## B. ARCHITECTURE ACTUELLE (résumé de la cartographie #3-A)

Chaîne AVAL saine et unique (document→plan→émission→runtime, scellée
①–⑥). AMONT : 8 passes LLM ordonnées, obligations mécaniques sur 3 passes
seulement (actions/cablage/intention), AUCUN artefact entre l'intention et
le document. `executionGraph` = analyseur pur post-hoc. Enveloppe =
déclaration de ce que le moteur exécute — actuellement FAUSSE sur l'auth.

## C. ARCHITECTURE CIBLE PROPOSÉE (synthèse — recommandation)

```
INTENTION (prose)
  ↓ PASSE 0 « compréhension » (LLM, petite grammaire)
MODÈLE MÉTIER (artefact versionné, hors AIR)        ← LA représentation commune
  ↓ VALIDATION DE FORME (mécanique, 0 $) — refus AVANT toute passe chère
  ↓ OBLIGATIONS (module unique : modèle × registres → obligations par passe)
DOCUMENT AIR (8 passes existantes, contrat INCHANGÉ)
  ↓ validateLocal + VIVACITÉ (V1–V5, sur enveloppe VÉRIDIQUE)
PLAN (dérivé : rôles, zones, modes — tables existantes)
  ↓ validerPlan (inconditionnel, ④)
ÉMISSION → RUNTIME (inchangés)
executionGraph : JUGE de clôture des parcours — jamais source, jamais couche.
```
Différences avec la #3 : gestes = PATRONS STRUCTURELS (table fermée), plus
seulement des noms ; concepts enrichis (`origine`, `etats?`) sur preuves ;
obligations = SOURCE UNIQUE ; étape R « juge d'abord » (le vérificateur de
vivacité est prouvé sur les documents EXISTANTS avant de payer la passe 0).

## D. CRITIQUE DE L'HYPOTHÈSE DU PROPRIÉTAIRE

1. **COMPRÉHENSION → MODÈLE → OBLIGATIONS : RETENU tel quel** — c'est le
   cœur juste, et la mission #4 a raison d'interdire la réinterprétation.
2. **ÉCRANS → RÔLES → PLACE → COMPOSITION → PLAN en couches séparées :
   CONTESTÉ.** Au code réel, RÔLES/PLACE/COMPOSITION/PLAN sont UNE
   dérivation pure (`planifierComposition` + tables ③). Les séparer en
   couches créerait des points de décision qui n'existent pas et ne
   doivent pas exister — chaque couche nouvelle est une chance de
   réinterprétation. Il faut MOINS de couches décisionnelles, pas plus :
   décision (modèle) → dérivations (tout le reste).
3. **Couches absentes de la liste** : ACTIONS et DONNÉES (émises, donc
   sous obligations) ; la VALIDATION DU MODÈLE (sans elle, la passe 0
   devient un oracle non jugé) ; l'ENVELOPPE VÉRIDIQUE (sans R1, tout
   modèle amont meurt en aval sur l'auth — mesuré).
4. **OBLIGATIONS comme couche** : oui comme ARTEFACT DÉRIVÉ, non comme
   étage décisionnel — la nuance interdit qu'une passe « négocie » ses
   obligations.

## E. CRITIQUE DE LA PROPOSITION CLAUDE (#3) — autocontradiction exigée

1. **Vocabulaire de gestes = NOMS : DÉFAUT RÉEL.** « choisir » vs
   « consulter » est ambigu (choisir un créneau : ligne pressée ? champ de
   formulaire ?). Des noms sans définition structurelle recréent une
   COUCHE D'INTERPRÉTATION — la maladie remonte d'un étage au lieu de
   disparaître. CORRECTION (F) : un geste EST un patron structurel fermé
   {bloc, déclencheur, effet, transport, preuve}. Le nom n'est qu'une clé.
2. **Modèle trop pauvre, deux fois.** (a) Kaviva exige « rendez-vous à
   venir et passés » : aucun moyen de l'exprimer → `etats?` par concept,
   consommé par les étapes. (b) « commandes » d'un nouvel utilisateur
   VIDES à juste titre vs « soins » qui doivent être amorcés :
   indistinguable → `origine: amorce|utilisateur` par concept, qui décide
   MÉCANIQUEMENT si l'obligation est « dataset > 0 » ou « état vide
   déclaré » — cela corrige au passage une rigidité de PLAN_VITRINE_VIDE.
3. **Risque de doublon besoins/parcours.** intent.needs (AIR, émis en
   dernier) et parcours (modèle, émis en premier) décriraient deux fois
   les besoins → DEUX sources. CORRECTION : le MODÈLE est la source ;
   intent.needs devient un MIROIR sous obligation + gate de
   correspondance (chaque besoin du modèle ↔ une entrée needs, résolution
   par les nœuds du parcours).
4. **Modèle hors AIR = traçabilité affaiblie** (l'artefact peut se perdre
   du document qu'il a produit). CORRECTION : artefact versionné dans
   `results/` + hash du modèle consigné dans le journal ET dans
   l'artefact du document généré. L'entrée dans l'AIR reste écartée
   (contrat gelé, grammaires — EP-021) et réévaluable.
5. **R2/R3 de la #3 payaient trop tôt.** Rien ne prouvait que le
   vérificateur de vivacité DISCRIMINE avant de financer la passe 0.
   CORRECTION (O) : étape « juge d'abord » — modèles écrits À LA MAIN pour
   3 documents existants, le vérificateur doit dire vivant/mort
   correctement à 0 $.

## F. CONTRAT EXACT DU MODÈLE MÉTIER (v1 proposée)

Règle d'admission d'une propriété : elle entre SSI (a) un défaut MESURÉ ne
peut être refusé mécaniquement sans elle, OU (b) une obligation de passe
s'en dérive. Tout le reste RESTE DEHORS (champs détaillés, style, secteur,
liste d'écrans — trop riche = passe 0 chère et fausse).

```
modele = {
  concepts: [{
    id, nom,                       // le NOM DU BRIEF (« soin »), jamais une catégorie
    donnees: bool,                 // porte des données affichables → exige une entité
    origine?: "amorce"|"utilisateur", // si donnees : amorcé (dataset>0 exigé)
                                   // ou créé à l'usage (état vide déclaré exigé)
    etats?: [string],              // partitions nommées PAR LE BRIEF (« a_venir », « passe »)
  }],
  relations: [{ de, vers, nature: "possede"|"reference" }],   // endpoints ∈ concepts
  parcours: [{
    id, besoin,                    // la phrase du besoin, reprise du brief
    etapes: [{ concept, geste, etat? }],   // etat ∈ concepts[concept].etats
  }],
}
```
**TABLE DES GESTES (fermée, DÉRIVÉE de l'enveloppe — le contrat qui tue
l'ambiguïté)** — un geste = patron structurel vérifiable :

| geste | bloc porteur | déclencheur | effet (enveloppe) | transport | preuve de l'étape |
|---|---|---|---|---|---|
| decouvrir | list (aperçu/rangée) sur écran racine | — | — | — | section rendue, données présentes |
| chercher | search_entry (chrome) → écran de liste | ui | navigate | — | paire structurelle complète (gate existante) |
| consulter | ligne de list → detail_header | ui | navigate | itemId OBLIGATOIRE | DETAIL_SANS_SOURCE généralisé |
| choisir | ligne de list (du concept choisi) | ui | navigate(+itemId) | itemId | idem consulter, cible = étape suivante |
| saisir | form (concept cible) | ui | mutation create/update | instance | FORM_SANS_ACTION + règle 13 |
| confirmer | mutation.thenScreenId | — | mutation | — | écran de confirmation atteint |
| consulter_historique | list filtrée (etat) | ui | navigate | — | filtre/tri déclaré sur l'etat nommé |
| s_identifier | form auth | ui | capability auth.* | — | EXIGE l'enveloppe véridique (R1) |
| payer | déclaration payments.* + saisir/confirmer | ui | mutation (+capacité déclarée) | — | honnêteté règle 17 : déclaré, jamais promis |

Invariants du modèle (validés à 0 $) : ids uniques · endpoints des
relations ∈ concepts · chaque étape référence un concept existant et un
geste de la table · chaque `etat` consommé existe · chaque parcours ≥ 2
étapes et se TERMINE par un geste à preuve observable (confirmer,
consulter, consulter_historique) · chaque concept `donnees` est traversé
par ≥ 1 étape (sinon : concept mort, refusé) · ≥ 1 parcours par besoin.
Producteur : passe 0. Consommateurs : module d'obligations, gate de
vivacité, gate de correspondance intent.needs. Personne d'autre.

## G. POSITION DÉFINITIVE D'EXECUTIONGRAPH

DÉRIVÉ et JUGE — à deux niveaux : (1) juge de clôture du DOCUMENT
(atteignabilité, sources d'itemId, contrôles réels) ; (2) avec le modèle,
juge de TRAVERSABILITÉ des parcours (V2). JAMAIS source de vérité, JAMAIS
couche de construction, JAMAIS pansement : quand un jugement paraît faux
(EP-020), on corrige l'ENVELOPPE qu'il croise, pas le juge ni le document.
Le juge est lui-même jugé : cliquet envelope-truth étendu (le mensonge de
l'enveloppe est un défaut de niveau R1, prioritaire sur tout le reste).

## H. DÉFINITION FORMELLE — APPLICATION VIVANTE

APPLICATION VIVANTE ⇔ ∀ parcours p du modèle :
- **V1 MATÉRIALISATION** : chaque étape de p est portée par un bloc dont le
  PATRON du geste (table F) est entièrement satisfait ;
- **V2 TRAVERSABILITÉ** : l'écran de la 1re étape est une racine atteignable
  ET pour chaque paire d'étapes consécutives il existe une transition
  EXÉCUTABLE (navigate / mutation.thenScreenId / onglet racine) de l'écran
  de l'une vers l'autre, avec transport d'identifiant là où le patron
  l'exige (entrée → étape → action → transition) ;
- **V3 DONNÉES** : chaque concept traversé avec donnees=true a une entité
  liée à un bloc rendu — amorcée (origine=amorce, rowCount>0) ou à état
  vide déclaré (origine=utilisateur) ;
- **V4 RÉSULTAT OBSERVABLE** : l'étape terminale produit un constat rendu
  (écran de confirmation atteint, ou historique listant l'etat nommé) ;
- **V5 SINCÉRITÉ** : chaque besoin ↔ ≥1 parcours vivant, et intent.needs
  le déclare par les nœuds mêmes de ce parcours.
Invariants négatifs : aucun écran hors parcours (hors gestes
d'infrastructure déclarés) · aucune entité hors concept · aucune capacité
hors geste. Les gates actuelles (cible morte, détail sans source, vitrine
vide, matière) sont des PROJECTIONS partielles de V1–V4 — la vivacité les
unifie au lieu de les empiler.

## I. OBLIGATIONS — SOURCE UNIQUE

Un seul module : `obligations(modele, registres, sectionsEmises)`. Deux
familles, toutes deux mécaniques : (1) obligations DE MODÈLE (a priori) —
entites ← concepts(donnees) ; donnees ← origine/relations ; capacites ←
gestes ; ecrans ← étapes ; actions ← patrons des gestes ; cablage ← une
promesse e2e par parcours ; intention ← besoins du modèle ; (2) obligations
DE COHÉRENCE (a posteriori, l'existant ⑤) — identifiants promis par les
sections émises. AUCUNE passe ne décide d'une obligation localement.

## J. CAPACITÉS — dérivées, plus déclarées

`s_identifier` ⇒ auth (+profileEntityId ∈ concepts) ; `payer` ⇒
payments.psp|iap selon la classe commerce ; futur geste ⇒ future capacité,
PAR LA TABLE, jamais par secteur. Gates des deux sens : capacité déclarée
sans geste = fantôme ; geste sans capacité = manquante.

## K. ÉCRANS — ce qu'il faut savoir avant (réponses à la question centrale)

- **avant de CHOISIR UN ÉCRAN** : les parcours (quelles étapes se
  co-localisent) + les relations (quel détail appartient à quoi) ;
- **avant de CHOISIR UN COMPOSANT** : le geste de l'étape (la table F
  désigne le bloc) + l'état des données du concept (origine/etats) ;
- **avant de DÉFINIR UNE ACTION** : l'étape — source, cible, transport
  d'identifiant, effet dans l'enveloppe VÉRIDIQUE ;
- **avant de COMPOSER LA HOME** : TOUS les parcours — la home est le point
  d'entrée des parcours principaux (découverte + chercher + reprise
  d'historique). Kaviva a eu une home creuse précisément parce qu'elle se
  composait sans connaître les parcours ;
- **prouver qu'une app est VIVANTE** : V1–V5 (H).

## L. COMPOSITION — inchangée, mieux nourrie

`planifierComposition` et ses tables (rôles structurels, zones, modes,
aperçus) restent LA dérivation ①–④. Le modèle ne dicte AUCUN écran : il
fournit les parcours que le plan doit servir, et la vivacité juge le
résultat. Aucune nouvelle décision de composition n'est créée.

## M. GATES (les 19 demandées → mécanisme, propriétaire)

Modèle absent/incohérent → validation de forme F (refus AVANT passes) ·
parcours incomplet → invariants F + V2 · écran orphelin → invariant
négatif H · action sans cible → validateAir (existant) · capacité
fantôme/manquante → J (deux sens) · navigation morte → reachableScreens
(existant) · données sans consommateur / consommateur sans source →
dataBindings + V3 (origine corrige la rigidité actuelle) · état impossible
→ enveloppe + obs (existant) · composition incohérente → validerPlan ④
(existant) · RÉINTERPRÉTATION PAR LES PASSES → gate de nomenclature :
aucune entité/écran/action ne peut introduire un objet métier hors
concepts, et tout concept est consommé (bijection concepts↔entités, les
deux sens) · logique spécifique à une app / template sectoriel →
agnostic.test ÉTENDU aux nouveaux modules + interdiction du mot « secteur »
et de toute énumération de domaines dans moteur ET campagne ·
reconstruction runtime → cliquets ① (existants) · chemin parallèle →
cliquets ⑥ (existants) · génération sans GO → R0 (jeton one-shot).

## N. MATRICE DE TESTS MULTI-DOMAINES

7 briefs (marketplace, réservation, éducation, social, livraison,
automobile, SaaS) + **8e brief SECRET** (écrit par le propriétaire, jamais
montré au développement) + **paraphrases** (2 formulations par besoin —
patron marketa/dougplace déjà pratiqué). Mesures STRUCTURELLES uniquement :
modèle bien formé · bijection concepts↔entités · V1–V5 par parcours ·
0 diagnostic · diversité des rôles du plan (la FORME doit suivre le brief,
pas un patron unique) · coût par app et nombre de passes de réparation
(objectif : ↓ vs baseline kaviva 3,55 $/2 attempts). Anti-mémorisation :
cliquet de nomenclature (aucun slug de test dans le code), invariance de
paraphrase (équivalence structurelle, jamais octets), le 8e cas ne sert
qu'une fois.

## O. PLAN R0→R8 (NE PAS EXÉCUTER — un GO par étape, gouvernance §16)

| # | Objectif | Sortie/preuve | Fermeture |
|---|---|---|---|
| R0 | Gouvernance mécanique (EP-018) | emit-v3/--reparer/lanceurs de build REFUSENT sans jeton one-shot `docs/elite-protocol/GO/…` ; tests refus/passe/rejouer | lancement sans jeton impossible |
| R1 | Enveloppe VÉRIDIQUE par capacité (EP-020) | `executed` reconnaît les méthodes réellement exécutables (auth×sessionEtablissable), déclaré PAR l'enveloppe ; contrôle négatif caméra | les 5 diagnostics kaviva tombent à 0, SANS appel API |
| R2 | Contrat modèle métier + table des gestes (F) | schéma zod + validateurs de forme + fixtures | invariants tous testés |
| R3 | **JUGE D'ABORD** : vérificateur de vivacité V1–V5 sur documents EXISTANTS, modèles écrits à la main (marketa, dougplace, bus) | il déclare vivant ce qui marche sur appareil et mort les cadavres connus (attempt1 kaviva) — 0 $ | discrimination prouvée |
| R4 | Passe 0 « compréhension » (grammaire PETITE) + refus de forme avant toute passe | arrêt à ~0,1 $ sur modèle invalide | branchée, testée à blanc |
| R5 | Obligations UNIFIÉES dérivées du modèle (toutes passes, `entites` comprise) | module unique I + tests purs | plus aucune obligation locale |
| R6 | Gates : nomenclature anti-réinterprétation + correspondance needs↔parcours + capacités 2 sens | tests + contrôles négatifs | M couvert |
| R7 | Traiter EP-021 (échelle grammaires : maxItems) — mesure puis correctif | passes lourdes remontent de niveau | 0 refus 400 évitable |
| R8 | Campagne multi-domaines (N) — budget chiffré, GO dédié | matrice complète mesurée | verdict de généricité |

Dépendances : R1 indépendant (fermable en premier) ; R3 exige R2 ;
R4–R6 exigent R2/R3 ; R8 exige tout + GO.

## P/Q. RISQUES ET DÉSACCORDS RESTANTS

Risques : passe 0 fausse mais bien formée (accepté : défense en profondeur,
les gates aval jugent) · vocabulaire de gestes trop pauvre pour un domaine
futur (il grandit AVEC l'enveloppe, jamais par secteur) · modèle hors AIR =
artefact à disciplin er (hash consigné, R2) · coût +0,1 $/app en passe 0
(contre 0,75 $/appel de réparation économisé — pari mesurable en R8).
Désaccords restants avec l'hypothèse du propriétaire : (Q1) RÔLES/PLACE/
COMPOSITION/PLAN ne sont pas des couches — une seule dérivation (D-2) ;
(Q2) le secteur n'existe PAS comme information consommable — réponse
complète au §7 : NON comme entrée d'une décision, l'« archétype » est la
FORME DES PARCOURS, émergente et jamais nommée ; si une trace humaine est
voulue, elle vit dans le JOURNAL de campagne, hors artefacts consommés.

## R. DÉCISIONS HUMAINES NÉCESSAIRES

1. Trancher Q1/Q2 (couches et secteur) après contre-analyse externe.
2. Valider le contrat F (notamment `origine`, `etats`, table des gestes).
3. Valider la définition de vivacité H comme critère d'acceptation.
4. Ordre O (R1 d'abord ? R0 d'abord ?) et budget R8.
5. Kaviva (§14) : AUCUNE réparation spécifique — R1 devrait faire tomber
   ses 5 diagnostics GRATUITEMENT ; il devient alors la PREMIÈRE preuve de
   non-régression ; s'il reste invalide, sa réparation passe par les
   obligations GÉNÉRIQUES (R5) sous GO dédié.
6. Emplacement du modèle (campagne vs AIR) — revoir après R7/EP-021.
