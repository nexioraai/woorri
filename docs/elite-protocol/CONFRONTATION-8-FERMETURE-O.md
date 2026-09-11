# CONFRONTATION #8 — FERMETURE O.1→O.4 (version longue)
*2026-09-11 · analyse seule · HEAD `1a508c0` · 0 code, 0 génération, 0 $,
0 build, 0 push. La synthèse au format exigé est rendue dans la réponse de
mission ; ce document porte le détail contractuel.*

## O.1 — COLLECTIONS : table de décision déterministe

DEUX décisions orthogonales, deux producteurs, aucun recouvrement :
**FLUX** (fenêtre | aperçu | rangée) — producteur P2c/P2d (modèle + plan
d'écrans) ; **MAILLE** (lignes | grille) — producteur : règle R-maille
prescrite en P2e, portée par le document (prop layout), consommée par le
plan. Le « détail unique » n'est pas une collection (geste consulter →
fiche). La « collection paginée » N'EST PAS un mode structurel en v1 :
aucune classe de défaut mesurée ne l'exige ; pageSize reste une borne de
confort validée — réévaluable par la procédure D6 sur défaut réel.

ENRICHISSEMENT DU MODÈLE PAR LA PROCÉDURE D6 (les 4 pièces, #6-§6) :
la MAILLE exige un discriminant absent → nouveau champ `visuel: bool` sur
concept. (1) Fixtures déclenchantes : kaviva (« avec photo, durée et
prix »), automobile (comparaison visuelle) — le brief NOMME le visuel,
c'est une décision de P0, pas une conclusion ; (2) invariant : `visuel` ⇒
obligation d'attribut image (passe donnees) + gate imagesDeVitrine ;
(3) consommateur : R-maille ; (4) mutation : basculer `visuel` change la
maille prescrite et les obligations, rien d'autre.

TABLE DE DÉCISION (conditions exhaustives ; hors table ⇒ DISCRIMINANT_ABSENT) :
| Mode | Entrée | Exclusions | Suite | États |
|---|---|---|---|---|
| FENÊTRE | la surface est l'UNIQUE surface de contenu de son écran (résultat de co-localisation) | jamais en fleuve | — (rien à tronquer) | selon stratégieInitiale* |
| RANGÉE | surface en fleuve ∧ le concept porte, EN AVAL du même parcours, une étape consulter/choisir (comparer-puis-élire) | concept à consulter_historique (une chronologie se lit verticalement) ; surface unique | seeAllLabel + geste secondaire OBLIGATOIRES si troncature | idem* |
| APERÇU (vertical borné) | surface de données en fleuve ne qualifiant pas RANGÉE | surface unique | idem RANGÉE | idem* |
| MAILLE GRILLE | concept.visuel ∧ accès catalogue (geste decouvrir/chercher) ∧ producteur ≠ utilisateur | producteur=utilisateur (un FLUX se lit par récence unitaire, un CATALOGUE se balaie — structurel, pas sectoriel) ; ¬visuel | — | idem* |
| MAILLE LIGNES | défaut (historiques, flux, résultats à métadonnées) | — | — | idem* |

\* États par stratégieInitiale (dérivée de producteur) : `seed` ⇒ loading+
error déclarés (règle 14), vide facultatif ; `vide` (créé par acteur) ⇒
état VIDE déclaré OBLIGATOIRE (première ouverture légitime), loading/error
si source distante. Comportement mobile : rangée défile sur son axe propre
(DET-006), fenêtre est LE défileur, aperçus coulent dans le fleuve —
règles déjà scellées ①④.

Mutations O.1 (0 $) : visuel→false ⇒ grille interdite ; retirer l'étape
aval consulter ⇒ rangée disqualifiée → aperçu ; co-localisation rendant la
surface unique ⇒ fenêtre forcée ; forcer aperçu sur surface unique ⇒
refus (règle fenêtre⇔unique, testée).

## O.2 — CO-LOCALISATION : règle formelle

A (précédente) et B co-localisables SSI **toutes** :
C1 même ACTEUR · C2 consécutives dans un parcours OU premières étapes de
parcours primaires sur l'ENTRÉE (seule exception, R-éc3) · C3 surfaces
compatibles par MATRICE FERMÉE · C4 au plus UNE identité d'instance par
écran (la fiche la fixe, les collections scopées la consomment — relation
du modèle exigée) · C5 une seule racine de navigation par écran (servir
deux racines ⇒ l'écran vit dans l'une, l'autre y NAVIGUE — jamais de
duplication de surface) · C6 une étape point-d'entrée-de-parcours reste
directement atteignable (co-localisée ailleurs qu'à sa racine ⇒ refus).
AUCUNE borne numérique de charge : les bornes sont structurelles (une
fenêtre max, aperçus bornés) — pas de seuil arbitraire (#6).

MATRICE C3 : COLLECTION×COLLECTION ✔ (fleuve ; 2 collections ⇒ aucune
n'est fenêtre) · COLLECTION×ENTRÉE_RECHERCHE ✔ (chrome) · FICHE×COLLECTION
✔ SSI relation possede/reference du modèle relie leurs concepts (liste
SCOPÉE à l'instance) · FICHE×FICHE ✘ (conflit d'identité C4) ·
FORMULAIRE×(FICHE|COLLECTION) ✔ SSI saisie CONTEXTUELLE (relation au
concept affiché) ∧ effet non destructif · FORMULAIRE de conclusion de
parcours (suivi de confirmer) ✘ autonome · effet delete ✘ toujours
autonome · CONFIRMATION ✘ toujours autonome (c'est l'observation V4).
États : deux sections filtrées sur des états différents d'un même concept
✔ (pas un conflit). Tout cas hors matrice ⇒ DISCRIMINANT_ABSENT.

Mutations O.2 (0 $) : FICHE×FICHE forcée ⇒ refus · formulaire delete
co-localisé ⇒ refus · étape acteur B sur écran acteur A ⇒ refus ·
fiche+liste sans relation au modèle ⇒ refus.

## O.3 — NAVIGATION : autorité unique

AUTORITÉ = LE PLAN D'ÉCRANS (P2d), artefact unique : destinations
principales ET leur ordre (parcours primaires du modèle — l'ordre des
parcours est une décision de P0, la barre le projette) · destinations
secondaires (suites d'aperçus, gestes secondaires) · routes de détail
(étapes consulter, itemId transporté par patron) · post-action
(confirmer → cible d'observation du plan) · transitions = ARCS du plan
(chaque paire d'étapes consécutives). RETOUR = mécanisme de plateforme
(pile native), aucune autorité à attribuer. DEEP LINKS = HORS ENVELOPPE v1
(aucun déclencheur externe ; toute règle serait de l'invention — entrée
future par extension d'enveloppe, procédure D6).
RÈGLE DOUBLE : route ∉ plan ⇒ NON ÉMISE (gate de correspondance, refus) ;
route ∈ plan ⇒ RÉALISABLE (V2/Conformance la traverse). Le runtime ne crée
JAMAIS une route (mécanismes scellés : racines-navigation, dispatcher —
cliquets ①).
ÉTAT CONTRACTUEL : déjà contractuel — navigation AIR (routes/primary/
entry) + racines runtime + composition transportée ; TEMPORAIREMENT assuré
par gate — la correspondance plan↔document (le générateur tient encore le
stylo de la section navigation, la gate refuse toute divergence) ; À
MÉCANISER EN AIR 2.x — émission mécanique de la section navigation depuis
P2d (le générateur perd le stylo) ; POURQUOI PAS UNE 2e AUTORITÉ
AUJOURD'HUI — une gate qui REFUSE n'est pas une autorité qui DÉCIDE :
toute divergence est fail-closed, aucun arbitrage n'existe.
Mutations O.3 (0 $) : route ajoutée hors plan ⇒ refus · route du plan
absente du document ⇒ refus · navigate runtime hors mécanismes déclarés ⇒
cliquet.

## O.4 — EXPRESSION : périmètre V1 fermé

AUTORISÉS V1 (liste FERMÉE — tous via le SEUL module de thème émis) :
palette (rôles de couleur) · échelle typographique · échelle d'espacement
(densité) · rayons (forme des surfaces) · élévation/ombres · style
d'accent des états actifs · iconographie de MARQUE (logo). RIEN d'autre —
en particulier PAS les libellés (autorité du document, jugés par les
gates), PAS l'ordre des sections, PAS les tailles d'aperçu.
INTERDITS : l'intégralité de la liste de la mission (concepts, relations,
parcours, étapes, obligations, capacités, actions, navigation, zones,
persistance, défilement, type structurel d'une collection, présence d'un
élément obligatoire, états obligatoires).
MOMENT : après P5 (structure figée par le plan validé), à l'émission du
module de thème (P6). Le runtime ne consomme l'expression QUE par
useStyles/tokens — déjà vrai au code.
PREUVE D'INVARIANCE — et fait mesurable DÈS AUJOURD'HUI : dans le moteur
actuel, une surcharge d'expression ne modifie QU'UN fichier émis
(lib/tokens/theme.generated.ts, additivité prouvée byte-identique). Le
test scelle cette propriété : émettre le même document sous E1 et E2 ⇒
EXACTEMENT un fichier peut différer ; projection structurelle (tout sauf
le module de thème) byte-identique. Toute expression future qui exigerait
un 2e fichier devra étendre LE TEST consciemment, jamais silencieusement.
Mutations O.4 (0 $) : « expression » éditant un écran ⇒ la projection
diffère ⇒ refus · surcharge visant une clé structurelle ⇒
THEME_OVERRIDE_INVALID (existant, testé).
