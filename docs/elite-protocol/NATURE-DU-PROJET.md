# NATURE DU PROJET DERIBFY — document architectural officiel
*Établi le 2026-09-11 (mission contre-expertise). Source de vérité sur CE QUE
le projet construit. Complète docs/mobile-generation/ (le chantier) et ne
modifie aucune décision figée — toute intégration à ARCHITECTURE.md suit la
gouvernance du chantier (règle 3, D-017).*

## Ce que Deribfy construit

UN SYSTÈME GÉNÉRIQUE DE GÉNÉRATION D'APPLICATIONS MOBILES DE POINTE,
MULTI-DOMAINES ET MULTI-TYPES.

Le produit est LE GÉNÉRATEUR — jamais une application générée. Le système
doit, à terme, produire des applications mobiles modernes et réellement
utilisables dans des domaines très différents, par exemple et sans s'y
limiter : marketplace, réservation, restaurant, hôtel, soins/rendez-vous,
livraison, automobile, immobilier, éducation, réseau social, événements,
voyage, services, SaaS, gestion, et des domaines futurs non listés ici.

## Ce que cette liste N'EST PAS

Ces exemples ne sont PAS une liste de gabarits à coder en dur. Ils
DÉMONTRENT l'objectif de généricité ; ils ne dessinent aucune architecture.
Le moteur est agnostique au secteur PAR CONSTRUCTION (D-086 : l'AIR ne
connaît aucune catégorie métier ; le cliquet `agnostic.test.ts` refuse
jusqu'au NOM d'un secteur dans les modules du compilateur). Toute mécanique
conditionnée à un secteur, à un nom d'application ou à un cas particulier
est un défaut d'architecture, jamais une solution.

## Statut des applications générées

| Application | Statut | Ce qu'elle prouve |
|---|---|---|
| Dougplace | cas HISTORIQUE / test | premier cadavre mesuré (app creuse, 6,81 $) puis première marketplace assemblée ; référence de non-régression |
| Marketa | cas de VALIDATION marketplace | preuve d'assemblage indépendant (même archétype, autre voix de client) |
| Kaviva | cas de VALIDATION réservation/soins | premier archétype non-marketplace ; a reproduit le patron creux (EP-019) — preuve que les gardes mordent ET que le générateur reste insuffisant |

AUCUNE de ces applications ne constitue le modèle architectural du moteur.
Aucune correction ne peut être spécifique à l'une d'elles (règle absolue
anti-hack : preuve du défaut → couche propriétaire → correction générique →
tests multi-domaines → non-régression → fermeture).
