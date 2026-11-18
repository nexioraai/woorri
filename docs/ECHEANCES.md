# Échéances écrites

> « Un chantier reporté sans date écrite est un chantier abandonné. » — le propriétaire, 2026-11-18.
>
> Chaque chantier reporté porte ici sa date limite, son contenu et sa raison. Une ligne ne se retire que **faite et prouvée**, ou **replanifiée par le propriétaire** avec sa nouvelle date. On ne la retire pas parce qu'on l'a oubliée.

| Avant le | Chantier | Contenu | Pourquoi cette date |
|---|---|---|---|
| **2027-01-31** | Abonnement non renouvelé — la suite | Préavis au propriétaire (compte à rebours dans le tableau de bord) ; **retrait de la ligne après 30 jours** de retard, avec une page neutre pour ses clients ; **données conservées au moins 90 jours**, intactes au paiement ; retour immédiat au paiement ; un test qui échoue si le chemin du retrait écrit ou supprime quoi que ce soit | Les premiers abonnements sont payés au festival Dary (fin décembre 2026). Aucun ne peut avoir 30 jours de retard avant fin janvier. La demi-journée d'avant Dary (état, rappel, arrêt des modifications) fait partie du chantier du paiement. |

**La règle elle-même** (décision du propriétaire, 2026-11-18 ; c'est une règle, pas un réglage) :

- de 1 à 30 jours après l'échéance, l'appli reste **en ligne**, ses données accessibles, et ses clients continuent de s'en servir ;
- seules les modifications s'arrêtent ;
- un rappel s'affiche **au propriétaire seul**, jamais à ses clients ;
- après 30 jours, l'appli est retirée de la ligne, mais **les données sont conservées au moins 90 jours** et reviennent intactes dès qu'il paie ;
- **jamais de suppression sans préavis, jamais de perte de données pour cause d'impayé.**

La raison : couper une appli punit aussi les clients du commerçant, qui n'ont rien demandé. Au Tchad, avec le mobile money, les retards seront fréquents et souvent innocents.

## Après Dary — DATE À FIXER PAR LE PROPRIÉTAIRE

> Consignés le 2026-11-18. Selon la règle en tête de ce fichier, un chantier sans date est un chantier abandonné : chacun attend sa date.

| Avant le | Chantier | Contenu | Pourquoi |
|---|---|---|---|
| **à fixer** | **Juge des écritures promises** (moteur direct) | Vérifier qu'une écriture promise par le document de l'appli (ajouter, modifier, retirer) arrive **vraiment** dans la base. Le juge d'exécution compte les boutons muets ; il ne suit pas l'écriture | C'est le trou par lequel sont passées l'insertion cassée (`produit.emplacement`) et « Retirer » mort pendant deux semaines. Révélé par l'outil manuel `outils-manuels/une-app.comportement.une.tsx` (moteur AIR) |
| **à fixer** | **Export des données en CSV** | Clients, ventes, stocks : chaque table de l'appli, téléchargeable par son propriétaire | Garder les données 90 jours ne vaut rien si le commerçant ne peut pas les sortir. C'est ce qui rend crédible la promesse des 90 jours |
