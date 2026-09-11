# CONFRONTATION #10 — RÔLES DES SURFACES, ASSEMBLAGE, IDENTITÉ, ANTI-RÉPÉTITION
*2026-09-11 · analyse SEULE (0 code, 0 génération, 0 $, 0 build, 0 push) ·
HEAD `a7097a6`. Verdict global : PARTIAL — les lacunes réelles sont
nommées, aucune n'est fermée artificiellement.*

## Constats vérifiés au code (avant toute proposition)

1. **Identité — la mécanique EXISTE** : `useItemNavigate`
   (air-runtime:460-474) refuse la ligne muette (APP-D002) et transporte
   `{itemId}` vers la cible câblée ; l'écran de détail lit
   `route?.params?.itemId` ; sans source, `DETAIL_SANS_SOURCE` juge
   l'INVERSE (un détail que rien n'atteint).
2. **Le bug du test N'EST PAS mécaniquement exclu** : rien n'exige que la
   cible du navigate d'une LIGNE soit une surface DÉTAIL du MÊME concept.
   Un document « Produit A → Catalogue » est schéma-valide aujourd'hui —
   il perdrait l'identité en silence (le provider retomberait sur rows[0]
   au prochain détail). LACUNE RÉELLE → gate à créer (G-CIBLE-DETAIL).
3. **Rôles** : `screenTraits` (dérivés : entry/detail/listing/form/
   statique) et rôles du plan (porte/fenetre/fleuve/fiche/formulaire/page)
   existent — ce sont des rôles STRUCTURELS, pas des RESPONSABILITÉS
   (données admissibles, actions admissibles, destinations, exclusions).
4. **Anti-secteur** : moteur = 0 condition sectorielle (agnostic.test +
   contre-audits #2/#3) ; MAIS la règle 19 du prompt P3 NOMME des secteurs
   (« Restaurant | Boutique | Réservation ») comme références
   conceptuelles (emit-v3:311-314) — TROUVAILLE classée : hint sectoriel
   côté génération, à neutraliser quand P2d prescrira la navigation (R5) ;
   pas un routeur (aucune branche de code), mais un vecteur de
   mémorisation de FORMES à retirer dès que la dérivation le remplace.
5. **Dédoublonnage** : R-éc2 (surfaces identiques unifiées) est PRÉVU
   (#7), pas codé ; PLAN_CHROME_DUPLIQUE existe et juge le chrome.

## Le contrat de RESPONSABILITÉ (ce qui doit devenir invariant)

**SURFACE_ROLE dérivé** (jamais déclaré, jamais sectoriel) :
rôle := f(geste, cardinalité, identité, concept) —
DÉCOUVERTE (decouvrir, collection, sans identité) · RECHERCHE (chercher,
collection filtrée) · COLLECTION (accès complet) · DÉTAIL (consulter,
UNE instance IDENTIFIÉE) · SAISIE (saisir, création/édition) ·
CONFIRMATION (confirmer, observation) · HISTORIQUE (consulter_historique,
collection de l'acteur, états) · IDENTITÉ (s_identifier, session/profil) ·
RETRAIT (retirer). « Paramètres » : DISCRIMINANT_ABSENT (aucun geste v1 —
n'apparaît que si un parcours l'exige un jour, D6).

**Frontière de responsabilité — la règle ACCÈS ≠ ABSORPTION, dérivable des
modes existants** : un APERÇU (borné + suite) est un ACCÈS à une
responsabilité ; une FENÊTRE/FICHE/FORMULAIRE en est l'EXERCICE PLEIN.
INVARIANT proposé (anti-absorption) : **un écran exerce AU PLUS UNE
responsabilité pleine** (sa fenêtre, sa fiche OU son formulaire — la
matrice C3 l'implique déjà en partie) **et peut porter n'importe quel
nombre d'accès**. HOME = zéro responsabilité pleine (que des accès +
entrées de parcours) SAUF app à parcours unique de flux (le fil = la
fenêtre EST la home). ACCOUNT = exercice plein d'IDENTITÉ seulement ;
commandes/historique y sont des ACCÈS (aperçu + suite), jamais la fenêtre.
C'est la formalisation STRUCTURELLE de §9/§10 — aucune convention.

## COLLECTION → INSTANCE → DÉTAIL (le point bloquant)

Chaîne formelle : concept → collection(surface, cardinalité=N) →
instance(ligne, identité=itemId) → arc de parcours (consulter) →
DÉTAIL(surface, cardinalité=1, identité CONSOMMÉE) → données de
l'instance. INVARIANTS à créer (R4/R6, tests 0 $) :
- **G-CIBLE-DETAIL** : toute étape `consulter` (et tout navigate porté par
  une LIGNE de liste) cible une surface DÉTAIL du MÊME concept (ou d'un
  concept relié par relation déclarée) qui CONSOMME l'identité ; cible
  collection/catalogue = REFUS. Discriminant du type de destination :
  rôle de l'étape × cardinalité de la cible — jamais le runtime.
- **G-IDENTITE (mutation obligatoire)** : au rendu (obs, 0 $), presser la
  ligne A puis la ligne B doit produire deux détails DIFFÉRENTS ;
  détail(A) = détail(B) ⇒ refus. (Aujourd'hui : g2-adressabilite couvre
  l'adressage des données ; la mutation ligne→détail explicite manque.)
- La cohérence route/identité/donnée/action jusqu'au runtime est déjà
  transportée (①, uiActionsByBlock, itemId) — c'est la POSE du câble qui
  n'est pas encore jugée.

## ANTI-RÉPÉTITION STRUCTURELLE (règle à créer, discriminants)

Définition : une occurrence est LÉGITIME ssi son quadruplet
**(concept, geste, état, portée)** est UNIQUE sur son écran — et, à
l'échelle de l'app, ssi la surface n'a pas déjà une jumelle exacte
(R-éc2). Produit A dans « Recommandés » (decouvrir) ≠ dans « Favoris »
(consulter_historique/possession) ≠ dans une recherche (chercher) :
gestes/portées distincts ⇒ légitime. Deux sections (produit, decouvrir,
∅, globale) sur le même écran ⇒ REFUS. Cas G (navigation répétée dans le
contenu) : un bouton de contenu visant une RACINE de la barre est
suspect SAUF s'il matérialise un ARC de parcours (post-confirmation
« voir mes commandes ») — discriminant : l'arc existe dans le
GrapheParcours. Cas H/I (écrans dupliqués par passes) : R-éc2 +
correspondance R6 les rendent inexprimables. AUCUNE interdiction de
répéter une INSTANCE — seuls les rôles se dédoublonnent.

## §19 — ARBITRAGE : SURFACE CONTRACT / COMPOSITION CONTRACT

**SURFACE CONTRACT : NÉCESSAIRE — mais PAS une couche nouvelle.** C'est le
SCHÉMA de l'artefact P2c déjà planifié (plan de surfaces), à formaliser en
R4 avec exactement les champs proposés : surfaceId, rôle DÉRIVÉ, acteur,
concept, cardinalité (collection|instance|singleton), identité
(consommée/produite), données, actions (patrons), états (F7/enveloppe),
destinations (arcs), exclusions (anti-absorption), justification
(étapes) — chaque champ DÉRIVÉ du modèle, aucun n'est déclaré par un
humain ou un LLM. **COMPOSITION CONTRACT : EXISTE DÉJÀ** — c'est le
CompositionPlan sérialisé (①), et P5 n'a besoin d'aucune autorité
nouvelle : il devra CONSOMMER le plan de surfaces au lieu de re-dériver
les rôles depuis les blocs (aujourd'hui screenTraits et rôles du plan
sont deux dérivations COHÉRENTES mais parallèles — consigné #7 ; R4 les
unifie par consommation, pas par un 2e cerveau).

## UNIVERSAL / CONDITIONAL / SPECIFIC — faits déclencheurs

UNIVERSEL (déjà #7) : App, Shell, Écran, Zone, Section, Surface,
Composant, Donnée, Action, Geste, État d'enveloppe, Transition,
Navigation d'entrée, Identité d'instance, Acteur, Parcours, Observation.
CONDITIONNEL — chaque item avec SON fait de modèle : recherche ← geste
chercher · collection ← decouvrir/chercher sur concept donnees · détail ←
consulter · formulaire ← saisir · historique ← consulter_historique
(+etats) · favoris ← UN CONCEPT relié à l'acteur (saisir/retirer) — pas
une surface spéciale · session ← s_identifier · barre persistante ←
R-nav ≥ 2 racines · état vide ← F7 (vide-né ∨ vidable) · grille/rangée ←
F5/R-collection · chrome recherche ← R-chrome. SPÉCIFIQUE : paiement ←
geste payer ; carte/caméra/notifications ← DISCRIMINANT_ABSENT v1 (aucun
geste : entrée par extension d'enveloppe + table, D6 — déclaré, pas
contourné).

## FIXTURE CONCEPTUELLE « Produit A → DÉTAIL(A) » (papier, exécutable en R4)

Modèle : concept produit {nom, description, prix(nombre), photo(media,
requis)} ; parcours acheter : decouvrir → chercher → consulter →
saisir(commande) → confirmer. Dérivations attendues : P2c —
DÉCOUVERTE(produit), RECHERCHE(produit), DÉTAIL(produit, identité
consommée), SAISIE(commande), CONFIRMATION ; P2d — HOME = accès
(aperçu produits GRILLE [F4/F5 : media requis + catalogue] + chrome
recherche [R-chrome]) ; arc ligne→DÉTAIL(même concept) [G-CIBLE-DETAIL] ;
mutation : presser A puis B ⇒ détails distincts [G-IDENTITE] ; INTERDIT
émis : ligne → collection (perte d'identité). Le même squelette vaut
voitures/logements/cours/profils — seul le NOM des concepts change.

## PREUVE 7 DOMAINES (préparée, NON exécutée — GENERICITE reste UNKNOWN)

R4 : 7 fixtures de MODÈLE au format du contrat (#9) + attendus FIGÉS
AVANT exécution (surfaces, rôles, navigation, mailles, co-localisations)
+ ablation des noms + 1 mutation/règle (rejet par LA règle visée) + tests
collection→détail, identité, anti-répétition, séparation des rôles sur
CHAQUE fixture. Aucun PASS sans exécution.

## NOUVELLES LACUNES (Q) — démontrées, non fermées ici

| # | Lacune | Preuve | Propriétaire |
|---|---|---|---|
| L1 | cible d'une ligne non contrainte au DÉTAIL du même concept | air-runtime:471-474 câble ce que le document dit ; aucun validateur du sens direct (DETAIL_SANS_SOURCE = inverse) | R4 (G-CIBLE-DETAIL) + R6 |
| L2 | mutation d'identité (A≠B au rendu) non testée explicitement | g2-adressabilite ne presse pas deux lignes | R3 (obs, 0 $) |
| L3 | anti-absorption (« une responsabilité pleine max ») non formulé comme invariant | C3 l'implique partiellement (fenêtre unique) sans le dire pour fiche/form vs accès | R4 (invariant du plan d'écrans) |
| L4 | anti-répétition (quadruplet concept×geste×état×portée) inexistant | aucune gate section-level | R4/R6 |
| L5 | règle 19 du prompt nomme des secteurs (références conceptuelles) | emit-v3:311-314 | R5 (retirée quand P2d prescrit la navigation) |
| L6 | screenTraits et rôles du plan = deux dérivations parallèles cohérentes | #7 consigné | R4 (unification par consommation) |

## IMPACT R0→R8 (S) — aucun réordonnancement

R3 += G-IDENTITE (obs) · R4 += SURFACE CONTRACT (schéma P2c),
G-CIBLE-DETAIL, anti-absorption, anti-répétition, unification L6 ·
R5 += retrait règle 19 · R6 += correspondances associées. R0→R2 inchangés.

## AUTORISÉ APRÈS CETTE CONFRONTATION (T)

Rien de nouveau : R0→R8 attend le GO humain (EP-018). Aucune génération,
aucune dépense, aucun build, aucun push. Les lacunes L1–L6 s'implémentent
DANS les étapes désignées, jamais avant.
