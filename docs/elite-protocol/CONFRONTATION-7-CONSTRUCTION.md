# CONFRONTATION #7 — ARCHITECTURE UNIVERSELLE DE CONSTRUCTION
*2026-09-11 · arbitrage architectural SEUL (0 code, 0 génération, 0 $, 0
build, 0 push) · HEAD `acbd511`. Document définitif de la GRAMMAIRE DE
CONSTRUCTION — version longue ; la synthèse A→P est rendue dans la réponse
de mission. Ce document complète #4 (modèle), #6 (arbitrages) et ne les
répète pas.*

---

## 1. PRIMITIVES — le tri demandé (§2)

**UNIVERSELLES** (toute app mobile, sans exception — chacune existe déjà
dans le moteur ou est due par le plan R) :
App (identité, locales, racine de thème) · Shell (zones + insets — même
sans chrome, ② l'a prouvé) · Écran (unité de présentation ET de
navigation) · Zone (chrome | contenu | navigation) · Section (groupement
titré du contenu) · Surface (matérialisation d'une étape — voir grammaire)
· Composant (bloc du registre) · Donnée (valeurs typées) · Relation —
universelle EN PUISSANCE (dès 2 concepts ; app à 1 concept : dégénérée
vide) · Action (déclencheur→effet) · Geste (vocabulaire fermé, atomes des
parcours) · État D'ENVELOPPE (loading/error/empty/ready — toute surface de
données ; écran statique : dégénéré ready) · Transition (changement
d'écran OU d'état causé par un effet) · Navigation (entrée + transitions ;
la barre persistante est CONDITIONNELLE) · Identité d'instance (transport
d'itemId dès qu'une collection existe) · Acteur (≥1 ; l'anonyme EST un
acteur) · Parcours (≥1 — une app sans parcours n'a pas de raison d'être) ·
Observation/feedback (le résultat d'un effet doit être constatable — V4).

**CONDITIONNELLES** (dérivées par règle, jamais par défaut) :
chrome persistant (règle de promotion §7) · navigation principale
persistante (≥2 destinations racines) · recherche (geste chercher) ·
formulaire (saisir) · fiche (consulter) · historique filtré
(consulter_historique + états métier E) · session (s_identifier) · états
MÉTIER (règle E de #6 : cible d'un effet mutant à transition observable) ·
modes de collection (fenêtre/aperçu/rangée — discriminants §7).

**SPÉCIFIQUES** (autorisées, jamais promues universelles) : paiement,
carte, caméra/visuel, notifications — toutes sous capacité déclarée,
honnêteté règle 17.

**ANTI-PRIMITIVES** (interdites comme primitives) : secteur · archétype
nommé · « dashboard » / « feed » / « page d'accueil type » (ce sont des
COMPOSITIONS dérivées) · template d'écran · nombre d'écrans (une SORTIE,
jamais une cible) · tout ce qui est expression (couleur, ton, marque).

## 2. GRAMMAIRE DE CONSTRUCTION (§15) — productions et règles

```
APP        := IDENTITÉ · ACTEURS · MODÈLE · NAVIGATION · ÉCRAN+
ÉCRAN      := SHELL — justifié par ≥1 ÉTAPE de parcours (aucun orphelin)
SHELL      := STATUS_AREA · CHROME_HAUT? · CONTENU · NAV_PERSISTANTE? · INSET_BAS
CONTENU    := SECTION+  |  COLLECTION_FENÊTRE  |  FORMULAIRE
SECTION    := TITRE? · SURFACE · SUITE?     (aperçu tronquant ⇒ SUITE obligatoire)
SURFACE    := COLLECTION(mode, concept, états) | FICHE(concept) |
              FORMULAIRE(concept) | ÉDITORIAL | ACTION | ÉTAT_VIDE
ACTION     := DÉCLENCHEUR(geste) → EFFET(enveloppe) → OBSERVATION
```
**Liaisons besoin→élément** (la phrase demandée, rendue mécanique) :
les BESOINS déterminent les PARCOURS (P0) ; les ÉTAPES déterminent les
SURFACES (table des gestes, contrat F de #4) ; les surfaces se groupent en
ÉCRANS (règles de co-localisation §5) ; les écrans reçoivent leur
COMPOSITION (planner, tables) ; la composition se résout en COMPOSANTS
(registre) ; les ACTIONS relient le tout (patrons des gestes).
**Compositions VALIDES** : chrome avant contenu (ordre de l'arbre) · une
seule collection-fenêtre par écran · aperçus bornés ailleurs · toute
troncature offre sa suite · toute surface de données déclare ses états.
**INVALIDES** (refus mécaniques, existants ou R4/R6) : deux chromes de
même rôle · défilement imbriqué même axe · contenu en zone chrome · action
sans effet · surface sans concept · écran sans étape · étape sans surface.

## 3. DÉRIVATION DES ÉCRANS (§5) — le cœur nouveau

```
MODÈLE → P2c PLAN DE SURFACES : chaque étape (concept×geste×état?) exige
         sa surface (table F) ; DÉDUPLICATION par (concept, geste, état) —
         une surface partagée sert N parcours.
       → P2d PLAN D'ÉCRANS : co-localisation par règles :
  R-éc1  étapes consécutives d'un parcours se co-localisent si leurs
         surfaces sont COMPOSABLES (matrice fermée : découverte+recherche
         composables ; fiche seule ; formulaire seul ; confirmation seule)
  R-éc2  surfaces identiques unifiées entre parcours (le catalogue unique)
  R-éc3  l'ENTRÉE agrège les PREMIÈRES étapes des parcours primaires —
         c'est POURQUOI une home est un fleuve (ou une fenêtre si un seul
         parcours de flux : un fil social)
  R-éc4  les gestes d'infrastructure (s_identifier) déploient leur jeu
         standard de surfaces — dérivé de la table, pas d'un secteur
```
Traçabilité inverse OBLIGATOIRE : « pourquoi cet écran ? » → la liste des
étapes qu'il matérialise, portée par l'artefact du plan d'écrans. Le
générateur NE CHOISIT PLUS les écrans : il les NOMME et les remplit sous
obligation de correspondance exacte (gate R6). Le nombre d'écrans est une
sortie.

## 4. PLACEMENT STRUCTUREL (§7) — règles génériques, discriminants du modèle

**R-chrome (promotion au chrome persistant)** : un geste/capacité est
promu SSI (a) requis par ≥2 parcours OU marqué global par sa table,
(b) invocable SANS contexte d'instance, (c) de forme compacte
(entrée/déclencheur, pas exécution). `chercher` qualifie ; `s_identifier`
non (écrans contextuels) ; rien d'autre par défaut.
**R-nav (promotion en navigation persistante)** : destinations = écrans
racines des parcours dont la PREMIÈRE étape est invocable à tout moment
par l'acteur (découverte, reprise d'historique, compte) ; ≥2 ⇒ barre ;
ordre = priorité des parcours. 0 ou 1 ⇒ pas de barre (la porte).
**R-collection** : contenu répétitif de même concept ⇒ collection ; mode :
FENÊTRE si la collection EST l'écran (surface unique) · APERÇU si elle
coule parmi d'autres (suite obligatoire si troncature) · RANGÉE si la
section est un APERÇU DE COMPARAISON — discriminant proposé : aperçu dans
un fleuve dont le concept porte une étape `consulter`/`choisir` en aval
(comparer-puis-élire) ; GRILLE si dominante visuelle (champ image déclaré).
⚠ O.1 : ces deux derniers discriminants sont PROPOSÉS — s'ils s'avèrent
insuffisants sur fixtures (R4), la procédure D6 enrichit le MODÈLE, jamais
une heuristique.
**R-actions** : l'action vit là où son patron la met (ligne de liste pour
consulter/choisir ; bouton du formulaire pour saisir ; geste secondaire
pour la suite) — jamais un bouton flottant de remplacement (mesuré : 103
boutons/108 navigations, règle 18).

## 5. PIPELINE EXACT (§4) — et interdits par étage

| Étape | Entrée → Sortie | Décide | INTERDIT de décider |
|---|---|---|---|
| P0 compréhension (LLM, SEUL cerveau) | brief → MODÈLE MÉTIER + M3 | concepts, relations, acteurs, parcours, états métier, producteurs | tout le reste ; aucune structure d'écran |
| P1 validation modèle (méca) | modèle → verdict | rien (juge) | — |
| P2a capacités (dériv.) | modèle → capacités requises | liaison geste→capacité | ajouter une capacité sans geste |
| P2b graphe de parcours (dériv.) | modèle → GrapheParcours | rien (projection) | — |
| P2c plan de surfaces (dériv.) | modèle → surfaces dédupliquées | matérialisation des étapes | inventer une surface sans étape |
| P2d plan d'écrans + navigation (dériv.) | surfaces → écrans justifiés + destinations | co-localisation, racines, chrome (R-règles) | créer un écran sans étapes |
| P2e obligations (dériv.) | P2a–d → checklists par passe | rien (projection) | — |
| P3 génération AIR (LLM, sous obligations) | obligations + modèle → document | noms, libellés, champs, graines de données | écrans, entités-concepts, navigation, capacités — tout cela est PRESCRIT |
| P4 validation document | document → verdict (validateLocal + CORRESPONDANCE modèle↔document) | rien | — |
| P5 plan de composition (existant ①–④) | document → CompositionPlan validé | zones, modes, rôles structurels, defile, aperçus | métier, écrans, données |
| P6 émission (existant) | document+plan → app | rien (exécute le plan) | recomposer, replacer |
| P7 runtime (existant) | app → exécution | rien | TOUTE décision structurelle (cliquets ①) |
| P8 validation finale | app+modèle → vivacité V1–V5 + Conformance | rien (juge) | — |

**Modification d'une décision** : UNIQUEMENT à son étage producteur, par
RÉ-EXÉCUTION du pipeline aval complet. Aucun artefact aval ne s'édite à la
main ; une réparation cible la SECTION propriétaire (repair-scope, D-088)
et rejoue la suite. C'est la réponse à « qui a le droit de la modifier » :
son producteur, personne d'autre, et jamais en place.

## 6. DONNÉES → ACTIONS → ÉTATS (§10) et NAVIGATION (§11)

Chaîne par concept : concept → entité (obligation P2e) → dataset selon
stratégieInitiale(producteur) OU état vide déclaré → surface (états
d'enveloppe déclarés, règle 14) → action (patron du geste) → effet
(enveloppe VÉRIDIQUE, R1) → transition (thenScreenId / état métier E) →
observation (V4 : confirmation atteinte, historique listant l'état, ou
changement rendu). Les six impossibilités demandées sont couvertes :
bouton sans effet (actionId requis + déclencheur décoratif D-105/D-123) ·
action sans cible (validateAir) · donnée sans consommateur (bijection
concepts↔entités R6 + dataBindings) · état inatteignable (invariants E) ·
mutation invisible (règle 13 + V4) · parcours dans le vide (V2/V4 +
Conformance).
Navigation : PARCOURS → destinations nécessaires (R-nav) → relations entre
destinations (transitions des étapes) → navigation PLANIFIÉE (P2d) →
émise (document sous obligation de correspondance — ferme EP-016 au niveau
gouvernance du pipeline) → runtime (racines-navigation : bascule = racine
remplacée, retour = pile native, transition d'action = thenScreenId).
Types distincts : principale persistante (racines) / secondaire (liens,
gestes secondaires) / détail (ligne→fiche, itemId transporté) / retour
(pile) / post-action (thenScreenId). Le runtime n'invente RIEN (①, D-086).

## 7. APP SHELL (§8) — vérifié CONTRE le code réalisé (étape ②)

L'architecture proposée est correcte avec 3 précisions déjà codées :
STATUS AREA ≠ STATUS BAR (l'inset ET le style, deux propriétés, un seul
propriétaire : AppShell) · l'inset HAUT est conditionnel à l'en-tête natif
(règle unique enteteMasquee) · l'inset BAS s'écrit UNE fois (sous la barre
si elle existe, sinon sous le contenu). Propriétés : chaque inset a UN
propriétaire = AppShell (cliquet : `useSafeAreaInsets` n'existe QUE là) ;
le conteneur de défilement appartient à la zone contenu, UN seul par
écran, jamais imbriqué même axe (DET-006) ; le clavier appartient à la
zone contenu (KAV). RÉALISÉ et prouvé par tests — la seule pièce en
attente est la preuve visuelle appareil (EP-013).

## 8. RÔLE DU COMPOSITION PLANNER (§13) — tranché

Combinaison contrôlée : MOTEUR DE COMPOSITION pour zones, persistance,
défilement, modes, aperçus, rôles structurels, ordre (l'ordre du document
DANS les règles de la grammaire — le planner n'a pas le droit de
réordonner le contenu, il place) ; SIMPLE FORMATEUR pour tout le reste.
Entrées : document validé (+ demain : plan d'écrans P2d). Sorties :
CompositionPlan sérialisé (①). Il n'invente JAMAIS de métier — il ne
connaît ni concepts ni parcours, seulement des structures. Les nouvelles
décisions de placement (R-chrome, R-nav, modes) montent en P2d/P5 comme
TABLES, pas comme intelligence.

## 9. DÉMONSTRATION MULTI-DOMAINES SUR FIXTURES STATIQUES (§16 — sur papier,
fixtures exécutables dues en R3/R4)

Mêmes règles, formes DIFFÉRENTES — dérivation manuelle :
| Domaine | Parcours dominants | Home (R-éc3) | Chrome (R-chrome) | Nav (R-nav) |
|---|---|---|---|---|
| marketplace | acheter (découvrir→chercher→consulter→saisir→confirmer→historique) | FLEUVE (aperçus+rangées) | recherche | découverte/commandes/compte |
| réservation (patron kaviva) | réserver (découvrir→chercher→consulter→choisir créneau→confirmer→historique à_venir/passés) | FLEUVE | recherche | soins/rendez-vous/compte |
| social | suivre le fil (découvrir flux) · publier (saisir→confirmer→observer au fil) | FENÊTRE (fil unique — PAS un fleuve) | pas de recherche promue (1 parcours) | fil/publier/profil |
| éducation | suivre un cours (consulter→progresser par états) | fleuve court | selon modèle | cours/progression/compte |
| livraison | commander + suivre (états métier forts) | fleuve | recherche | catalogue/suivi/compte |
| automobile | comparer puis contacter (rangées de comparaison, fiches riches) | fleuve à rangées | recherche | parc/favoris/compte |
| SaaS/gestion | saisir + consulter par états (aucune vitrine) | LISTE D'ÉTATS (aperçus d'historique — pas de « dashboard » primitif) | rarement | objets/activité/compte |
La DIVERSITÉ DES FORMES est produite par les discriminants du modèle (nb
de parcours primaires, gestes présents, états), jamais par le nom du
domaine. Hold-out : protocole #6-§8 inchangé.

## 10. R0→R8 FINAL (§20 de la mission — consolidé)

R0 gouvernance mécanique (jeton GO) · R1 enveloppe véridique (EP-020 ;
kaviva ENVELOPE GREEN / MODEL RED attendu) · R2 contrat modèle métier +
table des gestes + M3 · R3 JUGE D'ABORD : vivacité + Conformance sur
modèles MANUELS de 3 documents existants (0 $) · R4 dérivations de
construction (P2a–P2e : surfaces, écrans, navigation, promotions, modes)
prouvées sur les 7 fixtures manuelles §9 · R5 passe 0 + générateur sous
obligations prescriptives (P3) · R6 gates de correspondance
(modèle↔document↔plan d'écrans, nomenclature, needs Option B) · R7 EP-021
(échelle de grammaires) · R8 campagne multi-domaines + hold-out hostile +
paraphrases (GO dédié, budget chiffré). Chaque étape : GO humain, preuve,
commit, AUCUN enchaînement automatique vers une dépense (EP-018).
