# Échéances écrites

> « Un chantier reporté sans date écrite est un chantier abandonné. » — le propriétaire, 2026-11-18.
>
> Chaque chantier reporté porte ici sa date limite, son contenu et sa raison. Une ligne ne se retire que **faite et prouvée**, ou **replanifiée par le propriétaire** avec sa nouvelle date. On ne la retire pas parce qu'on l'a oubliée.

| Avant le | Chantier | Contenu | Pourquoi cette date |
|---|---|---|---|
| **2027-01-15** | **Juge des écritures promises** (moteur direct) | Vérifier qu'une écriture promise par le document de l'appli (ajouter, modifier, retirer) arrive **vraiment** dans la base. Le juge d'exécution compte les boutons muets ; il ne suit pas l'écriture | Les premiers clients sont activés à la main dès Dary : en décembre, on peut les regarder un par un ; en janvier, non. Une écriture qui n'atterrit pas chez un client qui paie se paie en remboursement et en confiance perdue. C'est le trou par lequel sont passées l'insertion cassée (`produit.emplacement`) et « Retirer » mort pendant deux semaines |
| **2027-01-31** | **Export des données en CSV** | Clients, ventes, stocks : chaque table de l'appli, téléchargeable par son propriétaire | **MÊME PROMESSE que le chemin hors-ligne ci-dessous : les deux partent ensemble, ou ni l'un ni l'autre.** On ne met pas une appli en pause en annonçant « vos données sont gardées 90 jours » si le commerçant ne peut pas les sortir |
| **2027-01-31** | Abonnement non renouvelé — la suite | Préavis au propriétaire (compte à rebours dans le tableau de bord) ; **retrait de la ligne après 30 jours** de retard, avec une page neutre pour ses clients ; **données conservées au moins 90 jours**, intactes au paiement ; retour immédiat au paiement ; un test qui échoue si le chemin du retrait écrit ou supprime quoi que ce soit | Les premiers abonnements sont payés au festival Dary (fin décembre 2026). Aucun ne peut avoir 30 jours de retard avant fin janvier. La demi-journée d'avant Dary (état, rappel, arrêt des modifications) fait partie du chantier du paiement. |
| **2027-11-01** | **Renouveler le jeton GitHub des sauvegardes** | `GITHUB_SAUVEGARDES_TOKEN` (Vercel, Production) : jeton à grain fin, seul dépôt `nexioraai/deribfy-sauvegardes`, Actions en lecture-écriture. Il **expire le 2027-11-19**. En créer un nouveau avec les mêmes droits, le poser dans Vercel, puis lancer `vercel crons run /api/cron/sauvegardes` et relire les deux passages | Un jeton renouvelé le jour même, c'est une sauvegarde qui s'arrête un matin (propriétaire, 2026-11-19). À l'expiration, GitHub refuse le lancement : `cron_runs` passe en « error » et le chien de garde alerte — mais une nuit est déjà perdue |

**La règle elle-même** (décision du propriétaire, 2026-11-18 ; c'est une règle, pas un réglage) :

- de 1 à 30 jours après l'échéance, l'appli reste **en ligne**, ses données accessibles, et ses clients continuent de s'en servir ;
- seules les modifications s'arrêtent ;
- un rappel s'affiche **au propriétaire seul**, jamais à ses clients ;
- avertissements au jour 27 et au jour 29 ;
- au jour 30, mise en pause : une page sobre « momentanément indisponible », ni erreur ni publicité ;
- **les données restent intactes 90 jours à partir de la mise en pause** (du jour 30 au jour 120) et tout revient au paiement : même adresse, mêmes données, même compte ;
- avertissement final au jour 113, effacement au jour 120 ; l'export reste possible tout du long (tranché le 2026-11-19, `MODELE_PRIX.md` règle 4) ;
- **jamais d'effacement sans avertissement.** L'effacement ne se construit pas avant l'export CSV.

La raison : couper une appli punit aussi les clients du commerçant, qui n'ont rien demandé. Au Tchad, avec le mobile money, les retards seront fréquents et souvent innocents.
