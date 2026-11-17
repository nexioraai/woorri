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
- **INCONNU :** un utilisateur connecté peut-il réécrire son propre `profiles.generation_count` ? `login/page.tsx:70` écrit dans `profiles` (`welcomed`) avec la clé du navigateur, ce qui prouve qu'un droit d'UPDATE existe pour `authenticated`. Sa portée par colonne n'a pas pu être lue : je n'ai aucun accès SQL à nexiora-ai, puisque `.env.local` ne contient que les adresses de la base des œuvres. Si ce droit couvre la colonne, le quota des sites se contourne depuis le navigateur.
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
| 0 | **La règle** : combien de générations gratuites, sur quelle période (à vie ou par mois), si les retouches comptent, si un échec rembourse | propriétaire | une décision |
| 1 | **Quota serveur** : table et fonction atomique ; branchement dans `direct`, `retoucher` et `lire-brief` ; `revoke` ; tests de concurrence (N requêtes parallèles pour 1 place restante, 1 seule passe) ; migration jouée par le propriétaire | moi + migration en production | 1 à 1,5 jour |
| 2 | **Écran** : le compte restant affiché avant de générer ; le refus 402 dit en clair dans l'accueil et l'atelier | moi | 0,5 jour |
| 3 | **Stripe pour les applications** : prix créé dans Stripe ; `stripe_customer_id` et statut rattachés à l'**utilisateur** (aujourd'hui tout est rattaché au site) ; route de paiement ; webhook qui distingue un abonnement d'application d'un abonnement de site, faute de quoi il chercherait un site ; mode test de bout en bout | propriétaire (tableau de bord Stripe) + moi | 1,5 à 2 jours |
| 4 | **L'abonnement lève la limite** : la fonction de quota lit le statut ; le bouton de l'atelier passe de « Bientôt » à « S'abonner » | moi | 0,5 jour |

**Total : 3,5 à 4,5 jours de travail, avant le premier euro.** Les frais Stripe par transaction ne sont pas calculés ici : ils dépendent du pays du compte Stripe de Deribfy, qui est **INCONNU**.

## 4. Le chantier de l'atelier (préparé, non poussé)

1. **L'atelier s'ouvre tout seul après une génération.**
   - *Cause mesurée :* la route `direct` rend `id` (`direct/route.ts:1162-1163`), mais l'écran de création ne le lisait pas. `generationId` restait `null`, et le lien « Ouvrir dans l'atelier » (`ConversationApplication.tsx`) ne s'affichait jamais sous le moteur `direct`.
   - *Désormais :* une livraison avec `id` ouvre `/atelier/<id>`. Une livraison sans `id` reste sur l'aperçu.
   - *Preuve :* `ConversationApplication.ouvre-atelier.test.tsx`, 3 cas, avec contrôle négatif.
   - L'atelier porte la marque Deribfy dans sa barre.
2. **Le choix de l'appareil est au centre de la barre.** Mesuré dans Chromium : le centre du groupe coïncide avec le centre de la barre à 1440 et à 1024 px. Sous 1024 px, la barre passe sur trois rangées : à 390 px, une seule rangée chevauchait le titre. `CadreApercu` applique la largeur, il ne la choisit plus.
3. **« S'abonner », à côté de « Publier ».** Il affiche « Bientôt » et le dit au clic. Il n'appelle aucune route. L'état `ouvert` et le rappel `onAbonner` sont prêts pour l'étape 4.

La colonne de gauche n'a pas changé : le fil, la boîte de saisie et « Modifier — au plus 0,03 $ ».

**Ce qui change pour la personne :** le rapport de livraison qui s'affichait dans la conversation de création n'est plus lu à cet endroit, puisque l'écran part vers l'atelier :

- la couverture du cahier ;
- « montée dans un simulateur » ;
- les références mortes.

Les diagnostics **enregistrés** de l'œuvre restent sur la carte de « Mes projets » (`dashboard/page.tsx:752-758`, jusqu'à 12 lignes, `mes-applications/route.ts:103-104`). Les données non conservées s'affichent aussi dans l'atelier. **NON VÉRIFIÉ :** que la carte dise exactement ce que disait le message de création. Les deux ne sont pas construits par le même code.
