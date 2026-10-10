# Armer la génération d'applications — le jour J

Document de PROCÉDURE, écrit le 2026-10-10 pendant que tout était encore
désarmé. Il est LA source : le README du travailleur hébergé y renvoie au
lieu de répéter les gestes (le dépôt a vu quatre fois « une liste écrite
deux fois diverge »).

Tant que les trois gestes ci-dessous ne sont pas faits, la génération
d'applications **ne peut rien dépenser** : le kill-switch est vérifié avant
toute lecture de table et tout appel moteur (preuve par comptage,
`service-generations.test.ts`), et le bouton « Application » de l'accueil
porte son badge « Bientôt ».

---

## Les trois gestes, dans cet ordre

### 1. Poser la colonne `owner_id` (sinon le dépôt répond 500)

À coller une fois dans la console SQL Supabase — idempotent, rejouable,
aucune ligne existante modifiée, aucun index requis (les lectures filtrent
toujours par clé primaire + `owner_id`) :

```sql
alter table public.app_generations      add column if not exists owner_id uuid;
alter table public.app_generations_test add column if not exists owner_id uuid;
```

Source versionnée : `sqlPour` dans `apps/web/src/lib/apps/journal.ts` — un
cliquet compare le DDL aux colonnes que le code écrit.

### 2. Donner un porteur au moteur

L'appel d'écrans est **un seul appel de 15 à 30 minutes** : aucune durée
serverless ne le porte (Vercel Pro : 300 s par défaut, 800 s au maximum,
1800 s en beta — marge nulle sur le pire cas). Déployer le travailleur
hébergé (`services/generation-travailleur/`, Render worker ≈ 7 $/mois) avec
ses trois secrets et **sans** `GO_EMISSION_IA` : il démarre, tourne à vide,
ne dépense rien.

Le cron Vercel (`/api/cron/generations`, déjà cadencé) peut rester en
filet : les deux cohabitent sans risque — saisie par UPDATE conditionnel
atomique, jeton de clôture sur chaque écriture (preuves V1 et V2 de la
batterie jumelle, contre la vraie base).

### 3. Armer, côté serveur puis côté écran

- `GO_EMISSION_IA=1` sur le travailleur hébergé (et/ou le cron) — **c'est
  le geste qui autorise la dépense** ;
- `NEXT_PUBLIC_GENERATION_ASYNC=1` sur le site — un seul interrupteur
  réveille le bouton de l'accueil, l'aiguillage et l'écran de suivi.

---

## La vérification visuelle — cinq points, deux minutes

À dérouler soi-même après l'armement, sur une vraie demande. Elle remplace
sciemment un test navigateur : le dépôt n'embarque aucun outil de ce genre
(ni Playwright, ni Cypress, ni DOM simulé), et en installer un pour un seul
écran coûterait plus qu'il ne prouverait. La logique, elle, est déjà
couverte hors navigateur (4 états, drapeau, reprise par URL, markup de
l'escalier à l'octet, aperçu compilé depuis un acquis bouchonné).

| | À vérifier | Ce qu'on doit voir |
|---|---|---|
| 1 | **Déposer** une demande depuis l'accueil (« Application » ne porte plus « Bientôt ») | Un message : la demande est déposée, on peut fermer la page ; l'escalier apparaît sur « En file d'attente » |
| 2 | **L'identifiant dans l'URL** | L'adresse porte `?generation=<id>` — elle est partageable |
| 3 | **Rafraîchir (F5)**, puis fermer et revenir | L'escalier **reprend où il en était** (l'URL d'abord, le stockage local en secours) — jamais un écran vide |
| 4 | **Laisser tourner quelques minutes** | L'étape avance *réellement* ; sous l'escalier : « Sections écrites — n/22 », puis « Points à corriger — n restants » ; la ligne de durée dit « En cours depuis n min · travail actif il y a n s » — **jamais un compte à rebours**, jamais une barre qui avance toute seule |
| 5 | **L'aperçu, puis le zip** | L'iframe montre l'application **en construction** et se précise de tranche en tranche ; sur `livree`, le bouton « Télécharger l'application (zip) » rend une archive qui s'ouvre |

En cas de refus, l'écran doit afficher **un message d'utilisateur** — « La
génération n'a pas pu aboutir cette fois… » ou « Une erreur technique est
survenue… » — et **jamais** du jargon de moteur, un identifiant interne, un
coût, ni rien du fournisseur. Si une de ces choses apparaît, c'est une
régression de la traduction des refus (`traduireRaison`) : à corriger avant
toute ouverture au public.

---

## Ce qu'il faut savoir avant d'ouvrir au public

- **Le premier `livree` n'a jamais eu lieu** : la convergence est démontrée
  (le compte de défauts descend, mine de navigation fermée) mais aucune
  génération n'est allée au bout. Le premier armement est une mesure, pas
  une mise en service.
- **La fourchette affichée (« généralement 30 à 60 minutes ») est une
  estimation**, posée faute de succès réel. Dès les premiers `livree`,
  la recalibrer sur leur médiane (`select percentile_cont(0.5) within group
  (order by duree_ms) from app_generations where statut = 'livree'`) et
  corriger `FOURCHETTE_DUREE` dans `suivi-generation.ts`.
- **Le coût est visible** : chaque ligne porte le sien, et le coût d'une
  tranche dépossédée part dans `ai_usage_log` sous
  `usage_type: 'application_orpheline'` — ce qui a servi et ce qui a été
  payé en vain ne se mélangent pas.
