# Plan : les vrais rôles

*Ouvert le 2026-11-27. Jusqu'ici, ce plan n'existait que dans la conversation de travail. Le dépôt fait désormais foi.*

## Ordre approuvé

É0 (mécanismes prouvés sur base jetable, 26/26) → **É1** → É2 → É3 → É3bis → É4 → É4bis → É5.

| Étape | Objet | État au 2026-11-27 |
|---|---|---|
| É1 | Lecture par clé : une page publique lit UNE ligne par son numéro, jamais la liste | en production (`3300ce35`), **preuve en attente** : appli d'épreuve générée et publiée par le propriétaire |
| É2 | Table `personne`, écran « Équipe » dans Deribfy, comptes téléphone + mot de passe, annuaire côté Deribfy (plafond des 10 000) | pas commencé ; le SQL de l'annuaire est remis au propriétaire, à exécuter par lui |
| É3 | Rôles déclarés, politiques par rôle, sonde par rôle | pas commencé |
| É3bis | Droits par colonne (vue des montants, déclencheur des colonnes modifiables) | pas commencé |
| É4 | Prompts sans faux rôles, juge « faux rôles », « Voir en tant que » dans l'aperçu | pas commencé |
| É4bis | Boucle de correction des modifications ; le refus nomme l'erreur ; la boîte noire garde le message | pas commencé |
| É5 | Une modification qui ajoute des rôles | pas commencé |

Décisions du propriétaire : A = la table `personne` est la source du rôle ; B = l'équipe se gère dans Deribfy seulement (manque assumé : le client de l'agence de développement n'a pas de compte Deribfy) ; C = téléphone + mot de passe.

## Règles d'arrêt (rappel)

Une vérification en production échoue → arrêt à l'étape. Un rôle voit plus que son dû → arrêt. Une appli publiée cesse de fonctionner → arrêt et retour arrière (47b83e4e ne doit jamais casser). Le plan est faux sur un point → arrêt, et on le dit.

## Noté, à ne pas résoudre maintenant

- La chaîne du mot de passe oublié est trop longue (employé → patron → agence de développement → Deribfy) : même trou que B.
- Une appli existante ne reçoit la lecture par clé que si son champ clé est déjà unique : la plupart des applis déjà générées ne sont pas rattrapables. À annoncer aux agences de développement.

## Petits lots après l'épreuve d'É1

- **FAIT le 2026-11-27 (commit local, non poussé).** **/admin, liste de recherche** (`apps/web/src/components/admin/ActivationManuelle.tsx`) : afficher « offerte jusqu'au … » au lieu de « payée jusqu'au … » pour une appli dont le paiement en cours est `offert`, y compris les 4 du lancement (`lancement-<id>`) et les épreuves (`epreuve-<id>`). Aujourd'hui, toute appli abonnée y est dite « payée ». C'est un mot à l'écran, pas un total : aucun total ne lit `app_paiements` (relevé le 2026-11-27).
