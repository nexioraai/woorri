# La création d'applications reste ouverte — et ce qui manque pour la vendre (2026-11-17)

## 1. Décision 1 du propriétaire : la pause du 14 novembre est levée

**Décision (2026-11-17).** La variable reste à `1`, définitivement.

**Raison donnée par le propriétaire.** La pause du 2026-11-14 (commit `27e83891`) disait : « arrêté tant que ça ne produit pas de résultat concret ». La condition est remplie. Le 2026-11-16, trois applications livrées fonctionnent : suivi, regi et atita. L'une est publiée sur atita.deribfy.app. Un client du garage la consulte depuis son téléphone, les prix sont protégés, et Youssouf a vérifié lui-même la lecture publique dans la base.

**Ce qui a été établi avant la décision** (aucune raison technique ne justifiait `0`) :

- **Le serveur ne lit pas cette variable.** La route `POST /api/generateur/direct` ne consulte que la connexion, le moteur et l'interrupteur de « Régénérer » (`direct/route.ts:307-336`). À `0`, la variable cachait la porte, elle ne la fermait pas.
- **Son sens d'origine est mort.** En octobre, elle armait l'écran de suivi du travailleur asynchrone AIR. Ce suivi est gardé par `moteurChoisi(...) === 'air'` et il est inerte sous le moteur `direct`.
- **« Régénérer » a son propre interrupteur** depuis le 2026-11-16 (`NEXT_PUBLIC_REGENERATION_OUVERTE`, `lib/apps/regeneration.ts`). Il n'est pas concerné.

**Note retirée.** La consigne « remettre à `0` en fin de séance » est abandonnée. Elle venait de la consigne du 2026-11-16 au matin : « mets 1 pour le test, remets 0 après ». Elle n'existait que dans la mémoire de session, pas dans le dépôt.

**L'état voulu est désormais `1`.** La règle « lire les interrupteurs dans Vercel avant tout push » reste en vigueur (`PLAN_MANQUE4.md` §6.9). Elle compare maintenant la valeur à `1`.

## 2. Décision 2 : le nom dit ce que fait la variable

| Avant | Après | Ce qu'elle commande |
|---|---|---|
| `NEXT_PUBLIC_GENERATION_ASYNC` (lu par l'accueil) | `NEXT_PUBLIC_CREATION_APPLICATION_OUVERTE` | le bouton « Application » de l'accueil et l'aiguillage de la conversation (`OnboardingChat.tsx`, `lib/apps/creation-application.ts`) |
| `NEXT_PUBLIC_GENERATION_ASYNC` (lu par l'écran de création) | inchangé | le suivi asynchrone d'AIR seulement, inerte sous `direct` (`ConversationApplication.tsx`) |

- Le nom suit le modèle de `NEXT_PUBLIC_REGENERATION_OUVERTE`. Seule la valeur exacte `1` ouvre.
- **Cliquet :** `lib/apps/__tests__/creation-application.test.ts`. L'accueil lit le nouveau nom, littéralement, et l'ancien nom n'est plus lu que par le suivi AIR.
- **Les documents historiques gardent l'ancien nom**, car ils racontent l'état à leur date : `PLAN_MANQUE4.md`, `ETUDE_LANGSMITH.md`, `ENQUETE_QUALITE_GENERATEUR.md`, `REPARATION_REGENERATION.md` et `docs/generation-asynchrone/ARMEMENT.md`.

**Ordre obligatoire pour la mise en ligne.** Les `NEXT_PUBLIC_*` sont figées au build : un push rebâtit la production avec les valeurs **présentes** dans Vercel.

1. Créer `NEXT_PUBLIC_CREATION_APPLICATION_OUVERTE=1` dans Vercel (production), **avant** le push.
2. Pousser.
3. Relire le JavaScript servi : il doit contenir `creationApplicationOuverte)("1")`, ou la forme minifiée équivalente.
4. Ensuite seulement, retirer `NEXT_PUBLIC_GENERATION_ASYNC` de Vercel. Sous le moteur `direct`, son absence ne change rien.

Si l'étape 1 est oubliée, le bouton « Application » repasse à « Bientôt » au déploiement. La faute ferme la porte, elle ne l'ouvre jamais.

## 3. Décision 3 : le quota d'abord, Stripe ensuite (état des lieux, rien de construit)

Mesuré le 2026-11-17 vers 12 h 46 UTC, en lecture seule sur la base de Deribfy (nexiora-ai, `lefumezaxfsttigpmzhr`), avec la clé de service.

### a) Existe-t-il une notion de compte payant, de plan, d'abonnement ou de quota ?

**Pour les applications : rien.**

- `app_generations` n'a aucune colonne de plan, de quota ou de crédit. Ses 28 colonnes ont été relues depuis le schéma servi par PostgREST.
- La route `direct` n'a aucun compteur. Son seul plafond porte sur **une** génération, 0,50 $ (`direct/route.ts:75`).

**Pour les sites (modes 1, 2 et 3) : un quota et un abonnement existent, mais ils ne touchent pas les applications.**

- **Quota de sites :**
  - `FREE_LIMIT = 3` dans `api/chat/route.ts:473` et `api/onboarding/route.ts:131-140`, avec une réponse 402 : « Passez à l'abonnement… » ;
  - le compteur est `profiles.generation_count`. Les 15 lignes se répartissent ainsi : 0 → 1, 1 → 8, 2 → 1, 3 → 5 ;
  - les comptes exemptés sont `EMAILS_SANS_QUOTA` (`lib/admin-emails.ts:66-73`, deux adresses).
- **Ce quota n'est pas sûr face à des requêtes simultanées.** Il est lu au début (`chat/route.ts:474-486`) et incrémenté à la fin, par `upsert(generation_count: usedGenerations + 1)` (`:1220`). Deux requêtes parallèles passent toutes les deux. Ce défaut est consigné, pas corrigé.
- **FERMÉ le 2026-11-17 : un utilisateur NE PEUT PAS réécrire son `generation_count`.** Youssouf l'a mesuré dans l'éditeur SQL de nexiora-ai, sur `public.profiles` :

  | rls_active | nb_politiques | anon_lit | anon_ecrit | connecte_lit | connecte_ecrit |
  |---|---|---|---|---|---|
  | true | 0 | true | false | true | false |

  - **La raison décisive est RLS.** RLS est actif sans aucune politique : il refuse toute ligne, en lecture comme en écriture, à `anon` et à `authenticated`, quels que soient leurs droits. Seule la clé de service (`supabaseAdmin`, qui contourne RLS) touche le compteur (`chat/route.ts:474-478`, `:1218-1220`).
  - **La seconde raison est le droit de table**, `connecte_ecrit = false`. Une précision sur sa portée : une mesure par `has_table_privilege` ne voit pas un droit accordé **par colonne**. Elle seule ne suffirait donc pas à exclure un `grant update (generation_count)`. Le refus de RLS, lui, couvre ce cas.
  - **Conséquence :** le quota des sites n'a qu'un défaut, la course entre la lecture (`chat/route.ts:473-480`) et l'incrément (`:1220`). La colonne n'a pas à être verrouillée : elle l'est déjà.
  - **Observation hors chantier, consignée sans correction.** `login/page.tsx:54-71` lit puis écrit `profiles.welcomed` avec la clé du navigateur. Sous RLS sans politique, la lecture ne rend aucune ligne, donc `profile` vaut `null`, et la branche qui appelle `/api/welcome` puis pose `welcomed = true` ne s'exécute jamais par ce chemin [DÉDUIT de la mesure ci-dessus, pas d'une vraie connexion]. En base, `welcomed` vaut `false` sur 14 profils et `true` sur 1 (mesuré le 2026-11-17).
- **Abonnement de site :**
  - `sites.subscription_status` et `sites.stripe_customer_id` ;
  - la session de paiement se crée par `api/checkout/route.ts:103-108` (`mode: 'subscription'`, prix `STRIPE_PRICE_ID`, **par site**, via `requireSiteOwner`) ;
  - le webhook `api/stripe/webhook/route.ts:130-158` publie ou dépublie le **site**.
  - **Il ne lève pas le quota de 3 sites.** La vérification `chat/route.ts:481` ne lit pas `subscription_status`.

### b) Y a-t-il du code Stripe ?

Oui, beaucoup, mais rien pour les applications :

- les dépendances `stripe` ^22.2.1, `@stripe/stripe-js` ^9.8.0 et `@stripe/react-stripe-js` ^6.8.0 (`apps/web/package.json:24-25, 47`) ;
- `lib/payments/stripe.ts`, utilisé pour les paiements de boutique (Stripe Connect) ;
- `api/checkout`, l'abonnement du marchand **par site** ;
- `api/stripe/portal` ;
- `api/stripe/webhook`, pour l'abonnement de site et les domaines ;
- `api/stripe/connect-webhook`, pour les boutiques ;
- l'abonnement annuel des domaines (`site_domains.stripe_subscription_id`) ;
- la politique de sécurité du contenu, qui autorise `js.stripe.com` (`next.config.ts:31-43`).

Rien de tout cela ne connaît un **utilisateur** abonné : tout est rattaché à un **site**.

### c) Combien de comptes, et combien ont généré ?

| Mesure | Valeur |
|---|---|
| Comptes (`auth.users`) | **24**, dont 23 avec e-mail confirmé et 4 connectés depuis 30 jours |
| Lignes `app_generations` | 83, du 2026-10-10 au 2026-11-17. Statuts : 77 `supprimee`, 5 `livree`, 1 `refusee` |
| Comptes **existants** ayant généré au moins une application | **1**, celui du propriétaire (`cd5f2d90`) : 81 lignes, 4 livrées, 59,66 $ |
| Autres lignes | 1 ligne d'un compte qui n'existe plus (`26d55fd4`, 1 livrée, 0,03 $) ; 1 ligne sans propriétaire : moteur `air`, 2026-10-10, 3 174 s, 16,03 $, `refusee` |
| Coût total enregistré | 75,73 $ |
| Tentatives directes (`app_generation_attempts`, depuis le 2026-11-16) | 8, toutes `livree`, 0,86 $ au total, de 0,056 à 0,186 $ chacune |

Aucun compte autre que celui du propriétaire n'a encore généré. L'exposition au coût est **ouverte** mais **inemployée**.

### d) Où poser un quota que l'appel direct à la route ne contourne pas ?

**Dans la route, avant toute dépense, appuyé sur une réservation atomique en base.** Jamais côté écran : l'écran se contourne, c'est exactement le défaut de la variable de la décision 2.

1. **Où, dans la route.** Dans `POST /api/generateur/direct`, juste après `requireAuthenticatedUser` et les deux refus 409 (`direct/route.ts:307-336`), avant la clé du fournisseur, le corps et tout appel payant. C'est l'endroit où « Régénérer » a déjà son verrou.
2. **Comment.** Par une réservation en **une seule instruction SQL**. Un `select count` suivi d'un `insert` laisse passer deux requêtes simultanées, comme le quota des sites aujourd'hui.
   - Exemple : une fonction appelée avec la clé de service, `insert … on conflict (owner_id, periode) do update set n = n + 1 where n < limite returning n`.
   - Pas de ligne rendue signifie refus 402.
   - La ligne se pose **au lancement**. `app_generations` ne peut pas servir de compteur : sa ligne n'est écrite qu'à la fin du travail (`PLAN_MANQUE4.md` §6.8).
3. **Une table que l'utilisateur ne peut pas toucher.** Supabase accorde par défaut tous les droits sur une table neuve à `anon` et `authenticated` (mémoire « privilèges par défaut sur les VUES »). Il faut un `revoke all … from anon, authenticated` explicite et un test qui le prouve.
4. **Les autres portes payantes.** `POST /api/generateur/retoucher` (au plus 0,03 $) et `POST /api/generateur/lire-brief` (`MODELE_LEGER`) appellent aussi le modèle. Un quota sur `direct` seul laisserait ces deux portes ouvertes. Il faut soit les compter, soit leur donner un plafond propre.
5. **Exemption.** `EMAILS_SANS_QUOTA` existe déjà (`lib/admin-emails.ts:66`) : il faut le réutiliser, pas en créer un second.

### Ce que cela coûterait, par étape

Ce sont des estimations de travail, **non mesurées**. Aucune génération payante n'est nécessaire pour les prouver. Il n'existe pas de base de développement : les preuves de concurrence se font sur un Postgres local jetable, comme la simulation du 2026-11-16.

| Étape | Contenu | Qui | Estimation |
|---|---|---|---|
| 0 | **La règle** — **TRANCHÉE le 2026-11-17**, voir ci-dessous | propriétaire | fait |
| 1 | **Quota serveur** : table et fonction atomique ; branchement dans `direct`, `retoucher` et `lire-brief` ; `revoke` ; tests de concurrence (N requêtes parallèles pour 1 place restante, 1 seule passe) ; migration jouée par le propriétaire | moi + migration en production | 1 à 1,5 jour |
| 2 | **Écran** : le compte restant affiché avant de générer ; le refus 402 dit en clair dans l'accueil et l'atelier | moi | 0,5 jour |
| 3 | **Stripe pour les applications** : prix créé dans Stripe ; `stripe_customer_id` et statut rattachés à l'**utilisateur** (aujourd'hui tout est rattaché au site) ; route de paiement ; webhook qui distingue un abonnement d'application d'un abonnement de site, faute de quoi il chercherait un site ; mode test de bout en bout | propriétaire (tableau de bord Stripe) + moi | 1,5 à 2 jours |
| 4 | **L'abonnement lève la limite** : la fonction de quota lit le statut ; le bouton de l'atelier passe de « Bientôt » à « S'abonner » | moi | 0,5 jour |

**RÈGLE PRODUIT EN VIGUEUR — décidée par Youssouf le 2026-11-17, elle REMPLACE celle juste en dessous :**

- **créer** une application : gratuit, **une seule par compte** ;
- **l'essayer dans l'atelier** : gratuit, sans limite de retouches ;
- **publier** : payant, **toujours**, même la première ;
- **une deuxième application** : payante.

Le montant et la forme (abonnement, paiement unique, par application) **ne sont pas tranchés**. Avant de fixer un prix, il faut mesurer ce que coûte une application **publiée**, par mois : voir §6. Ni Stripe ni le quota des applications ne sont construits avant la décision de prix.

~~**Étape 0, la règle du propriétaire (2026-11-17, matin) :**~~ remplacée, gardée pour l'historique.

- **3 applications gratuites par compte**, comme les 3 sites gratuits ;
- **abonné : aucune limite de total** ;
- **10 générations par jour au plus, pour tout le monde**, abonnés compris. C'est une protection contre une boucle, pas contre un client ;
- les comptes exemptés de `admin-emails.ts` (`EMAILS_SANS_QUOTA`) gardent leur exemption ;
- **la même règle s'applique à `retoucher` et à `lire-brief`.**

**Ordre fixé par le propriétaire.** On répare d'abord le quota des **sites**, qui est en ligne (réservation atomique, §5). Le quota des applications vient ensuite.

**Total : 3,5 à 4,5 jours de travail, avant le premier euro.** Les frais Stripe par transaction ne sont pas calculés ici : ils dépendent du pays du compte Stripe de Deribfy, qui est **INCONNU**.

## 4. Le chantier de l'atelier — EN LIGNE le 2026-11-17

**Mise en ligne, dans l'ordre fixé par le propriétaire :**

1. `NEXT_PUBLIC_CREATION_APPLICATION_OUVERTE` créée dans Vercel (production).
2. Valeur relue par `vercel env pull` : `"1"`. Les autres interrupteurs : `GENERATEUR_MOTEUR` et `NEXT_PUBLIC_GENERATEUR_MOTEUR` = `"direct"`, `NEXT_PUBLIC_REGENERATION_OUVERTE` absente.
3. Push `c37adaac..16103d41` sur `main`. Le hook de pré-push a trouvé une vérification à jour, et `ls-remote` lit `16103d41`.
4. `/api/version` rend `{"commit":"16103d4"}` à 13:32:16 UTC. Dans Chromium, sans session, l'accueil servi montre un bouton « Application » sans « Bientôt », et le clic mène à `/login` : c'est la branche ouverte. Fermé, il aurait affiché « arrive très bientôt ».
5. Ensuite seulement, `NEXT_PUBLIC_GENERATION_ASYNC` a été retirée de Vercel (production).

⚠ **Effet sur téléphone :** l'ouverture automatique mène à un atelier qui, sous 1024 px, n'affiche pas l'application. Ce défaut est antérieur, mais il est aggravé. Il est consigné en **M2** dans `DEFAUTS_MOBILE.md`.


1. **L'atelier s'ouvre tout seul après une génération.**
   - *Cause mesurée :* la route `direct` rend `id` (`direct/route.ts:1162-1163`), mais l'écran de création ne le lisait pas. `generationId` restait `null`, et le lien « Ouvrir dans l'atelier » (`ConversationApplication.tsx`) ne s'affichait jamais sous le moteur `direct`.
   - *Désormais :* une livraison avec `id` ouvre `/atelier/<id>`. Une livraison sans `id` reste sur l'aperçu.
   - *Preuve :* `ConversationApplication.ouvre-atelier.test.tsx`, 3 cas, avec contrôle négatif.
   - L'atelier porte la marque Deribfy dans sa barre.
2. **Le choix de l'appareil est au centre de la barre.** Mesuré dans Chromium : le centre du groupe coïncide avec le centre de la barre à 1440 et à 1024 px. Sous 1024 px, la barre passe sur trois rangées : à 390 px, une seule rangée chevauchait le titre. `CadreApercu` applique la largeur, il ne la choisit plus.
3. **« S'abonner », à côté de « Publier ».** Il affiche « Bientôt » et le dit au clic. Il n'appelle aucune route. L'état `ouvert` et le rappel `onAbonner` sont prêts pour l'étape 4.

La colonne de gauche n'a pas changé : le fil, la boîte de saisie et « Modifier — au plus 0,03 $ ».

**Ce qui change pour la personne :** le message de livraison de la conversation de création n'est plus lu, puisque l'écran part vers l'atelier.

**Vérifié le 2026-11-17 : les avertissements restent sur la carte.**

- La route enregistre dans `app_generations.diagnostics` (`direct/route.ts:783-870`) une ligne pour chacun des avertissements du message de création :
  - « partiellement éprouvée » ;
  - juge indisponible ;
  - « ne se monte pas » ;
  - jetons inexistants ;
  - contrôles sans action ;
  - dates décalées ;
  - couverture absente, ou non mesurée ;
  - données non conservées.
- La carte de « Mes projets » les montre pour une œuvre livrée (`dashboard/page.tsx:752-758`, jusqu'à 12 lignes, `mes-applications/route.ts:103-104`).
- En base : 4 œuvres livrées sur 5 portent un diagnostic (« Application PARTIELLEMENT éprouvée : 24 sur 77 à 87 contrôles »). La cinquième, `d3ece28a`, n'en porte aucun.
- **Ce qui est perdu :** seulement les lignes **positives** — « prête en N secondes », « Couverture X/Y couvertes », « Montée dans un simulateur » sans réserve.

## 5. Réparation du quota des sites — préparée, NON poussée (2026-11-17)

**Ordre fixé par le propriétaire :** ce quota est en ligne, il passe avant celui des applications. Après la mesure de Youssouf (§3 a), il n'a qu'un défaut : la course entre la lecture et l'incrément. La colonne n'a pas à être verrouillée, RLS la ferme déjà.

### Ce qui change

- **Une place réservée avant toute dépense.** Elle se prend au point de l'ancienne lecture (`chat/route.ts`, bloc « PLAFOND DE GENERATION »), avant le premier appel au modèle, par `reserverPlace` (`lib/quota/reservation.ts`). C'est un compare-and-set, **une seule instruction SQL** : `UPDATE profiles SET generation_count = k+1 WHERE id = … AND generation_count = k RETURNING …`.
  - Il passe par PostgREST avec la clé de service, déjà employée par la route. **Aucune migration en production.**
  - Une fonction SQL `insert … on conflict do update … where` aurait été l'autre forme. Elle exigeait de modifier le schéma de nexiora-ai, qui n'a pas de base de développement.
- **La place est rendue si aucun site n'est créé.** Le `finally` de `traiter` la rend (`rendrePlace`, même CAS dans l'autre sens) sur **toutes** les sorties en échec : le refus du pré-contrôle (400), le JSON invalide (500), le sous-type absent (400), l'insertion refusée (500) et une exception.
  - La place est consommée au point exact de l'ancien incrément, une fois le site inséré.
  - Le compteur garde son sens : le nombre de sites **créés**.
- **Une panne de `profiles` laisse passer**, comme l'ancien code : il lisait 0 sur erreur et avalait l'échec de l'incrément. La différence est que c'est maintenant journalisé (`[quota sites] réservation impossible…`). Un client ne peut pas provoquer cette panne.
- **Inchangés :** le message 402 et `limitReached` ; l'exemption `sansQuota` ; la limite de 3 ; le pré-contrôle en lecture seule de `api/onboarding/route.ts:131-140`. Ce pré-contrôle ne consomme rien : il refuse tôt, et le verrou est dans `api/chat`.

### Preuves

| Preuve | Résultat | Niveau |
|---|---|---|
| `lib/__tests__/quota-reservation.test.ts` ① : 10 réservations simultanées pour 3 places, 20 tirages | 3 passent, 7 refusées, compteur 3, à chaque tirage | modèle en mémoire de la sémantique du CAS |
| ① contrôle négatif : l'ancien algorithme sur la même rafale | plus de 3 passent, et le compteur reste sous le nombre de passages | idem |
| ⑤ le port émet exactement `upsert(… ignoreDuplicates: true)` puis `update(k+1).eq('id').eq('generation_count', k)` | conforme | client factice |
| ⑥ cliquet de route : réservation avant le premier `.messages.create(`, consommation après l'insertion, restitution dans `finally`, plus d'incrément `lu + 1` | vert ; l'ancienne route le fait tomber | lecture du source |
| **Postgres 17 réel, local et jetable : 30 sessions `psql` simultanées**, avec l'instruction exacte du CAS | **nouveau : 3 places, 27 refus, compteur 3. Ancien : 30 places, 0 refus, compteur 1.** Trois passages identiques | SIMULATION sur un vrai moteur Postgres, sans PostgREST et sans la base de production |
| Tests existants de la route `chat` (7 fichiers, 64 tests) | verts. Le faux client de `maxTokensRetry.test.ts` a reçu `.update`, assertions inchangées | |

### Ce qui n'est PAS prouvé

- Le passage par PostgREST en production.
- La concurrence en production : elle ne se provoquera pas en production, car ce serait créer des sites pour une démonstration.

Ce qui se vérifie après mise en ligne, depuis l'interface : une création de site par un compte non exempté fait passer `generation_count` de 1 exactement, et une création qui échoue ne le fait pas bouger.

## 6. Ce que coûte une application PUBLIÉE, par mois — mesuré le 2026-11-17

Toutes les mesures sont en **lecture seule**, faites vers 14 h 50 – 16 h UTC. Aucun appel payant, aucune écriture.

### Ce qui est servi aujourd'hui

- **3 applications publiées et servies** : atita, une et atel (`app_generations`, `publication_jeton` posé).
- suivi, regi et neuf autres adresses sont en `supprimee`. suivi.deribfy.app et regi.deribfy.app répondent **404** (mesuré par `curl`).
- **Les applications supprimées gardent leur schéma et leur compte** dans la base des œuvres : 9 schémas `oeuvre_*`, 14 comptes. Ce reste est consigné, il n'est pas corrigé.

### a) Ce qu'une application publiée consomme

| Poste | Mesure | Source |
|---|---|---|
| Base (schéma `oeuvre_<id>`) | **16 à 131 Ko** par application ; 728 Ko pour les 9 schémas ; 0 à 6 lignes chacun | `pg_total_relation_size`, `pg_stat_user_tables` (psql, `read only`) |
| Base entière (psxbil) | 13 Mo, dont 10 Mo de catalogue Postgres | `pg_database_size` |
| Fichiers | 2 fichiers, 7 Ko au total (`marque`) | `storage.objects` |
| Comptes | 1 compte par application publiée, à la publication | `auth.users`, `app_metadata.oeuvre` |
| Sous-domaine | **0 € par application** : `*.deribfy.app` est servi par une seule route, `/a/[sous]`, à travers le proxy. Aucun enregistrement par application | `x-matched-path: /a/[sous]` sur une et atita |
| Liste des schémas exposés | +44 caractères par application ; aujourd'hui 10 schémas et 382 caractères (`authenticator`, `pgrst.db_schemas`) | psql ; `poser-oeuvre.ts:129-165, 365` |
| **Chaque visite** | Une fonction Vercel **sans cache** (`no-store`, `x-vercel-cache: MISS`). Elle lit le document complet (`a/[sous]/route.ts:37`) puis **réassemble** le code (`:49`). Environ 183 Ko compressés par page, 2,4 à 4,4 s mesurées par `curl` | `curl` ; `route.ts` |

**Sur la route `/a/[sous]`, en production, du 2026-10-19 au 2026-11-17 16:00 UTC** (`vercel metrics`) :

| Mesure | Valeur |
|---|---|
| Invocations | 5 639 |
| CPU actif | 594,8 s, soit 105 ms par invocation en moyenne |
| Durée | 1 491 s, soit 264 ms en moyenne |
| Mémoire provisionnée | **2 048 Mo** (pointe moyenne : 299 Mo) |
| Fast Origin Transfer sortant | 659 Mo |
| Fast Data Transfer sortant | 680 Mo |

Une part de ces invocations vient de **robots** qui sondent des sous-domaines jamais publiés : grafana (37), minio (39), gitea (48), backend (52), jenkins (5), phpmyadmin (5)… Chacun déclenche la fonction. La liste rendue est tronquée à 50 noms, donc le total des robots n'est **pas** calculé.

**Ce qui n'a PAS pu être mesuré :**

- l'egress Supabase par visite ;
- le nombre de requêtes PostgREST par application.

Ni l'un ni l'autre n'est lisible sans le tableau de bord Supabase.

### b) Les paliers, et le palier suivant

**Vercel : le projet est déjà en Pro** (`vercel billing usage`, cycle du 19 oct. au 19 nov.).

- 1 licence Pro à 20 $. Le crédit d'usage inclus de 20 $ est **épuisé à 100 %**.
- L'infrastructure est à 25,08 $, pour un total estimé de 45,08 $.
- Prix unitaires **déduits de cette facture** : CPU actif 0,130 $/h ; mémoire provisionnée 0,0114 $/Go-h ; Fast Origin Transfer 0,084 $/Go ; invocations 0,605 $ le million.
- Inclus dans Pro (vercel.com/pricing) : 1 To de Fast Data Transfer et 10 M de requêtes CDN par mois.
- **Le palier Vercel ne dépend pas du nombre d'applications, mais du nombre de visites** : 1 To de transfert inclus correspond à environ **8 millions de pages** à 120 Ko.

**Supabase, base des œuvres (psxbil) : le plan est INCONNU.**

- Non lisible sans le tableau de bord. L'organisation « supabase-bench-test » vient d'une note non remesurée. `max_connections = 60` ne distingue pas Nano de Micro.
- Paliers officiels (supabase.com/pricing, lus le 2026-11-17) :

| | Free | Pro |
|---|---|---|
| Prix | 0 $ | à partir de 25 $/mois, 10 $ de crédit de calcul (une instance Micro) |
| Base | 500 Mo | 8 Go, puis 0,125 $/Go |
| Egress | 5 Go | 250 Go, puis 0,09 $/Go |
| Fichiers | 1 Go | 100 Go, puis 0,0213 $/Go |
| Utilisateurs actifs par mois | 50 000 | 100 000, puis 0,00325 $ par utilisateur |
| Pause | **après 1 semaine d'inactivité** | jamais |
| Projets | 2 actifs gratuits au plus | — |

- **Seuil de la base gratuite, sur les applications telles que mesurées** : (500 − 13 Mo) / 131 Ko ≈ **3 700 applications**. Ce chiffre vaut pour des applications presque vides (6 lignes au plus). Le vrai seuil viendra des **données saisies** par les commerçants, dont la croissance est **INCONNUE**.
- **Le vrai palier, s'il s'agit du plan Free, n'est pas un nombre d'applications** : c'est la **pause après une semaine d'inactivité**. Une semaine sans visite, et **toutes** les applications publiées s'arrêtent ensemble. Pour une publication **payante**, cela impose le plan Pro, à 25 $ par mois.

### c) Le coût mensuel par application publiée qui en découle

**Le coût récurrent d'une visite**, sur la route `/a/[sous]`, ce cycle :

| Poste | Calcul | Coût |
|---|---|---|
| CPU | 0,1652 h × 0,130 | 0,0215 $ |
| Mémoire | 0,828 Go-h × 0,0114 | 0,0094 $ |
| Fast Origin Transfer | 0,659 Go × 0,084 | 0,0553 $ |
| Invocations | 5 639 × 0,605 $ le million | 0,0034 $ |
| **Total** | | **0,0896 $ pour 5 639 invocations** |

Soit **0,000016 $ par visite** (16 $ par million). Ce total représente 0,36 % de l'infrastructure Vercel du cycle.

**Coût mensuel par application** = part fixe de Supabase Pro + visites :

| Applications publiées | Part de 25 $ | + 1 000 visites/mois | + 10 000 visites/mois |
|---|---|---|---|
| 10 | 2,50 $ | 2,52 $ | 2,66 $ |
| 50 | 0,50 $ | 0,52 $ | 0,66 $ |
| 100 | 0,25 $ | 0,27 $ | 0,41 $ |
| 1 000 | 0,025 $ | 0,041 $ | 0,184 $ |

- Le stockage d'une application telle que mesurée (131 Ko au plus) est négligeable : moins de 0,00002 $ par mois au tarif de dépassement.
- **Non comptés :**
  - la licence Vercel de 20 $, payée de toute façon pour tout Deribfy ;
  - l'egress Supabase par visite (INCONNU) ;
  - les comptes des utilisateurs de chaque application (INCONNU tant qu'aucun commerçant n'en a créé).

**Les coûts ponctuels de la règle produit**, payés par Deribfy avant toute publication :

| Geste | Coût mesuré | Source |
|---|---|---|
| L'application gratuite (une génération directe) | **0,056 à 0,186 $** (8 tentatives depuis le 2026-11-16) ; plafond 0,50 $ | `app_generation_attempts` |
| Une retouche (« essayer gratuit, sans limite ») | **0,0025 $ et 0,0030 $**, les **deux seules** retouches enregistrées. Plafond annoncé : 0,03 $ par retouche | `app_generation_versions`, étape « modifiée : … » |

**À retenir pour fixer un prix :**

1. **Le coût mensuel d'une application publiée est dominé par la part fixe de Supabase** (25 $ divisés par le nombre d'applications), pas par les visites. Avec peu d'applications, chacune coûte quelques dollars par mois ; à partir de la centaine, quelques dizaines de centimes.
2. **La dépense non bornée vient d'ailleurs : des retouches gratuites et illimitées.** À 0,03 $ au plafond, 100 retouches coûtent 3 $ pour une application qui ne sera peut-être jamais publiée. L'échantillon réel (2 retouches à 0,003 $) est trop petit pour conclure.
3. **Deux économies sont visibles, et ne sont pas faites :**
   - chaque visite réassemble le code sans cache ;
   - des robots déclenchent la fonction sur des sous-domaines inexistants.

   Toutes deux sont minimes aux volumes actuels.

**À fournir par le propriétaire pour fermer les INCONNUS** (une lecture du tableau de bord, pas de SQL) :

- le **plan** du projet Supabase des œuvres ;
- son **egress** sur 30 jours.

## 7. Le quota des sites et les 9 comptes sans ligne `profiles` — vérifié le 2026-11-17

**Question du propriétaire :** la réservation lit et incrémente `profiles`. Pour un compte sans ligne, échoue-t-elle, ou passe-t-elle sans compter ?

**Réponse : elle compte. Ce n'est pas un trou.**

- **La ligne est créée avant la réservation.** `reserverPlace` commence par `creerSiAbsente` (`lib/quota/reservation.ts:63-64`), soit `INSERT … ON CONFLICT (id) DO NOTHING` (`:126`), puis prend la place par CAS. Le test « ligne absente : créée à 0, puis la première place est prise » le couvre (`quota-reservation.test.ts`).
- **L'insertion `{ id, generation_count: 0 }` est valide.** Schéma servi par PostgREST, mesuré : les colonnes obligatoires sont `id`, `generation_count`, `created_at` et `welcomed`, et toutes sauf `id` ont une valeur par défaut (`0`, `now()`, `false`).
- **C'est déjà ainsi que les 15 profils existants sont nés.** Aucun déclencheur ne les crée : ils sont apparus de 165 s à 27 jours **après** leur compte, à la première création de site, par l'ancien `upsert`. Aucun autre code du dépôt n'insère dans `profiles`.
- **Les 9 comptes sans ligne sont donc des comptes qui n'ont jamais réussi à créer un site.** À leur première demande, la ligne naît à 0, et la place est prise.

**Le seul passage sans compter, dit franchement : la panne.** Si l'insertion, la lecture ou le CAS **échouent côté base**, la réservation laisse passer sans compter (`reservee: false`, journalisé). C'est un choix délibéré, repris de l'ancien code, qui lisait 0 sur erreur. Il vaut pour **tous** les comptes, pas pour ces 9. Un client ne peut pas provoquer cette panne.

**Ce qui n'est pas prouvé :** le passage réel par PostgREST en production, pour un compte sans ligne. Il se verra à la première création de site par l'un de ces comptes : sa ligne `profiles` doit apparaître avec `generation_count = 1`.

## 8. Le risque de pause — prêt à répondre dès que Youssouf donne le plan

**Le plan de la base des œuvres reste INCONNU** tant que Youssouf ne l'a pas lu.

### a) Si c'est le plan gratuit — d'après la documentation officielle (supabase.com/docs/guides/platform/free-project-pausing, lue le 2026-11-17)

- **Combien de jours :** « inactive if it does not receive sufficient user database activity **over the past week** ». Donc 7 jours.
  - Le seuil exact n'est pas défini : « typically a few user requests to the database each day over the previous week is enough ».
  - **Il est donc INCONNU** pour une application de garage visitée irrégulièrement.
- **Au réveil, rien ne revient seul.**
  - La documentation ne décrit **aucune** reprise automatique à l'arrivée de requêtes.
  - Elle décrit seulement un geste manuel : « Click **Resume project** and confirm », depuis le tableau de bord.
  - La durée de la reprise n'est pas donnée : **INCONNUE**.
- **Les données sont gardées** : « The project will return to its previous state, including data and configurations ». La reprise reste possible pendant un an.
- **Ce que voit le client du garage pendant la pause [DÉDUIT du code, non observé] :**
  - la page de l'application **s'affiche quand même**, car elle est servie par Vercel depuis le document rangé dans la base **Deribfy** (`a/[sous]/route.ts:37`), pas depuis la base des œuvres ;
  - en revanche, **toute lecture et toute saisie échouent**, puisque l'application parle à la base des œuvres en pause.
  - L'application est donc **morte en apparence vivante**, jusqu'à ce que quelqu'un clique « Resume » dans le tableau de bord.
- **Après la reprise [DÉDUIT] :** la liste des schémas exposés est un réglage du rôle `authenticator`, rangé **dans** la base (`poser-oeuvre.ts:365`). Elle fait partie des « configurations » restaurées, et l'application devrait revenir sans republication. **Ce n'est pas vérifié** : aucune pause n'a été observée.

**Pour une application de garage en service, la conséquence est nette :** une semaine creuse, et ses données deviennent inaccessibles sans prévenir personne, jusqu'à un geste manuel de Deribfy.

### b) Supabase Pro rapporté aux 3 applications publiées aujourd'hui

- **Prix :** Supabase Pro coûte **25 $ par mois** par organisation, avec 10 $ de crédit de calcul, ce qui couvre une instance Micro (supabase.com/pricing, lu le 2026-11-17).
- **Par application :** si la base des œuvres est seule dans son organisation, 25 / 3 = **8,33 $ par application et par mois**. Les visites ajoutent environ 0,000016 $ chacune (§6) : négligeable.
- **Si l'organisation contient d'autres projets** : chaque projet de plus est facturé en calcul au-delà du crédit. Le contenu de l'organisation « supabase-bench-test » est **INCONNU**, faute d'avoir été remesuré.
- **Le même calcul à mesure que les publications payantes arrivent :** 10 applications → 2,50 $ ; 100 → 0,25 $ (§6 c).

**Observation, sans décision :** la base de **Deribfy lui-même** (nexiora-ai) est dans une organisation affichée **FREE**, sur la capture du propriétaire du 2026-11-17. Elle est soumise à la même règle de pause. Son activité est quotidienne (le site, et les crons de `vercel.json`), donc le risque y est faible. Il n'est pas nul si le trafic s'arrête.

## 9. Borner les retouches — proposition chiffrée (rien n'est construit)

**Le constat du propriétaire :** la règle produit tient, mais les retouches gratuites et illimitées forment la seule dépense non bornée. Il faut les borner, non pour vendre, mais pour qu'**un seul utilisateur acharné ne coûte pas plus que dix abonnés ne rapportent**.

**Les mesures disponibles :**

- **Plafond d'une retouche :** il est calculé **par application**, selon la taille de son code et au tarif de pointe (`plafondRetouche`, `retouche.ts:54` ; `retoucher/route.ts:311`). Il vaut « au plus 0,03 $ » sur l'atelier d'atita.
- **Coût réel :** 0,0025 $ et 0,0030 $, sur **les deux seules** retouches enregistrées (`app_generation_versions`). L'échantillon est trop petit pour connaître la distribution : **INCONNU** au-delà de ces deux points.
- **La génération gratuite :** de 0,056 à 0,186 $ mesurés, plafond 0,50 $.

**Proposition :**

| Situation | Borne proposée | Pire cas (au plafond, 0,03 $) | Cas mesuré (environ 0,003 $) |
|---|---|---|---|
| Application **gratuite**, pas encore publiée | **30 retouches au total** | 0,90 $ ; avec la génération, **1,40 $ par compte au plus** | 0,09 $ ; avec la génération, environ 0,28 $ |
| Application **publiée** (payante) | **100 retouches par mois et par application** | **3,00 $ par mois** | 0,30 $ par mois |
| Tout le monde | **20 retouches par jour au plus** (protection contre une boucle, comme les 10 générations par jour) | 0,60 $ par jour | 0,06 $ par jour |

- **La règle « un acharné ≤ dix abonnés » devient une condition sur le prix :** au pire cas, 3,00 $ par mois ≤ 10 × P, donc **P ≥ 0,30 $ par mois et par application publiée**. Le plancher d'hébergement du §8 b (8,33 $ à 3 applications sur Pro) est bien au-dessus. **À l'échelle actuelle, c'est l'hébergement qui fixe le plancher du prix, pas les retouches.**
- **Une borne en dollars plutôt qu'en nombre.** Le plafond varie d'une application à l'autre. Un budget en dollars (0,90 $ gratuit ; 3,00 $ par mois publié) est donc exact, quand un nombre ne l'est qu'au plafond d'atita. L'écran afficherait le nombre restant, calculé avec le plafond de **cette** application.
- **La même mécanique que le quota des sites** : réservation atomique avant l'appel au modèle, restitution si la retouche échoue avant de rien dépenser.
- **À revoir dès qu'il y aura plus de deux retouches réelles en base**, et avec le prix décidé. Ces bornes sont une proposition, pas une mesure.
