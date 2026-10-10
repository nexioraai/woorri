# Travailleur hébergé — générations asynchrones

Porte le moteur HORS serverless (l'appel écrans est un appel unique de
15-30 min). NON DÉPLOYÉ tant que le propriétaire n'en décide pas : ce
dossier est du texte, 0 $.

## Les 3 secrets exigés au démarrage (refus nommé sinon)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

## L'interrupteur
- `GO_EMISSION_IA` — ABSENT par défaut = DÉSARMÉ : le runner tourne à vide
  (60 s de sommeil par ronde), zéro appel moteur, zéro lecture de table.
  Seul `1` arme. C'est la même serrure prouvée par comptage que le cron.

## Avant d'armer (dans l'ordre, décision propriétaire)
1. Poser le SQL `owner_id` en console (versionné dans `sqlPour`) ;
2. Déployer ce service (Render worker ~7 $/mois) avec les 3 secrets, GO absent ;
3. Armer `GO_EMISSION_IA=1` ici (et/ou sur le cron Vercel — les deux
   cohabitent : saisie CAS atomique + jeton de clôture, V1/V2).
