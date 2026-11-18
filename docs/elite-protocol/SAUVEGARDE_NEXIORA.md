# nexiora-ai n'a AUCUNE sauvegarde (2026-11-17)

**Le plan gratuit de Supabase ne sauvegarde rien, et rien d'autre ne sauvegarde nexiora-ai aujourd'hui.**

- **Plans** (capture de Youssouf, 2026-11-17) :
  - organisation `nexioraai's Org`, **Free Plan**, 4 projets, dont nexiora-ai (`lefumezaxfsttigpmzhr`), la base de Deribfy ;
  - organisation `supabase-bench-test`, **Pro Plan**, 1 projet : psxbil (`psxbilpmnojtlzosokzz`), les données des applications publiées.
- **Décision d'architecture du propriétaire (2026-11-17), validée et à ne pas inverser :** deux bases, deux rôles.
  - **nexiora-ai** porte les comptes, les générations, le code des applications et les jetons de publication.
  - **psxbil** porte les données métier des clients de Deribfy.
  - **Raison :** le chiffre d'affaires d'un garage ne dort pas dans la même base que la table des utilisateurs de Deribfy. Un trou dans une application générée atteint son schéma, pas la plateforme.
  - **Option écartée :** déplacer le Pro de psxbil vers nexiora-ai. Elle ne protège pas davantage ; elle change seulement lequel des deux côtés est exposé.

## a) Ce que le plan gratuit sauvegarde — RIEN

| Question | Réponse | Source |
|---|---|---|
| Sauvegardes automatiques ? | **Non.** « Automatic backups — Free: *Not included* · Pro: *7 days* » | supabase.com/pricing, lu le 2026-11-17 |
| Fréquence, durée ? | Sans objet sur Free. Sur Pro : chaque jour, 7 jours gardés (« We automatically back up all Pro, Team, and Enterprise Plan projects on a daily basis ») | supabase.com/docs/guides/platform/backups |
| Restauration à un instant précis (PITR) ? | Free : *Not included* ; Pro : 100 $ par mois pour 7 jours | supabase.com/pricing |
| Déclencher une sauvegarde à la main ? | **Pas de sauvegarde de plateforme à la main.** La documentation renvoie à un export logique : « free tier projects should regularly export their data using the Supabase CLI `db dump` command » | supabase.com/docs/guides/platform/backups |
| Les fichiers stockés sont-ils sauvegardés ? | **Jamais, quel que soit le plan** : « Database backups do not include objects you store via the Storage API » | idem |
| Journaux gardés | Free : 1 jour | supabase.com/pricing |

**Dans le dépôt :** aucun workflow ne sauvegarde la base. `.github/workflows/` ne contient que `ci.yml` et `sonde-apres-deploiement.yml`.

## b) Un export automatique chaque nuit — ce qu'il coûterait

### Le volume, mesuré le 2026-11-17 en lecture seule (clé de service)

- **Base :** environ **40 Mo** de données brutes, extrapolées depuis des échantillons CSV.
  - `app_generations` : 12,5 Mo (83 lignes, le code des applications) ;
  - `catalog_products` : 16,9 Mo (43 894 lignes) ;
  - `app_generation_versions` : 5,9 Mo ;
  - le reste : moins de 5 Mo.
  - La taille d'un dump compressé n'est pas mesurée (**INCONNUE**). Elle sera plus petite que 40 Mo.
- **Fichiers stockés :** **2 095 fichiers, 320,7 Mo** :
  - `site-images` : 1 870 fichiers, 256,4 Mo ;
  - `pod-designs` : 32,4 Mo ;
  - `custom-designs` : 20,1 Mo ;
  - `site-fichiers` : 11,8 Mo.

  Aucun dump de base ne les contient.

### Le moyen proposé (le plus simple qui tienne)

**Une contrainte mesurée d'abord : le dépôt `nexioraai/woorri` est PUBLIC** (`gh repo view` : `visibility: PUBLIC`). Ses journaux et artefacts d'Actions ne doivent jamais voir un dump. Celui-ci contient les adresses, les empreintes de mots de passe et les commandes.

1. **Un dépôt GitHub PRIVÉ séparé**, par exemple `deribfy-sauvegardes`, avec un workflow planifié chaque nuit.
2. **`pg_dump` en format compressé**, avec l'adresse de connexion de nexiora-ai en secret de ce dépôt.
   - Il emporte aussi le schéma `auth`, donc les comptes, mots de passe chiffrés compris : les utilisateurs se reconnecteraient sans tout refaire.
   - Le client doit être de la même version majeure que le serveur. La version de nexiora-ai est **INCONNUE** : psxbil est en 17.6, et nexiora-ai n'a pas été lue faute d'accès SQL.
3. **Chiffrement avant de sortir du runner**, avec `age` et une clé publique. La clé privée est gardée hors ligne par Youssouf. Même une fuite du stockage ne livre rien.
4. **Envoi vers Cloudflare R2**, avec une règle de cycle de vie à **30 jours**. Le compte Cloudflare existe déjà : `CLOUDFLARE_API_TOKEN` sert aux sous-domaines, `supprimer/route.ts:111`.
5. **Les fichiers stockés** : copie incrémentale des seaux vers R2 (`rclone sync`, compatible S3) ; seuls les nouveaux fichiers voyagent.
6. **Une restauration d'essai**, obligatoire : relire le dump dans un Postgres 17 local, et comparer le nombre de lignes de chaque table à la source. Une sauvegarde jamais restaurée n'est pas une sauvegarde. Ensuite, un essai par mois, ou une étape du workflow qui restaure dans un Postgres jetable du runner.

### Le coût

| Poste | Calcul | Par mois |
|---|---|---|
| Stockage R2 | 30 dumps de moins de 40 Mo, plus 0,32 Go de fichiers : **moins de 1,6 Go**, sous les 10 Go gratuits par mois | **0 $** (au-delà : 0,015 $/Go par mois) |
| Sortie R2 | gratuite | 0 $ |
| Opérations R2 | quelques milliers par mois, contre 1 million (classe A) et 10 millions (classe B) gratuites | 0 $ |
| GitHub Actions (dépôt privé, compte Free) | quelques minutes par nuit, prises sur l'allocation de **12 $ par mois** incluse. Le prix exact à la minute n'est pas relevé ici : la marge n'est donc **pas mesurée** | 0 $ attendu |
| **Total** | | **0 $**, tant que la base reste sous quelques Go |

**Mise en place estimée (non mesurée) : 4 à 5 heures**, dont 1 heure pour la restauration d'essai.

**Ce qu'il faut du propriétaire :**

- l'adresse de connexion Postgres de nexiora-ai, en secret ;
- l'activation de R2 sur le compte Cloudflare ;
- la création du dépôt privé ;
- la paire de clés `age` (la clé privée ne quitte jamais son poste).

**Alternative écartée :** ranger les dumps dans le stockage de psxbil (Pro, 100 Go inclus). C'est gratuit et déjà payé, mais cela remettrait la table des utilisateurs de Deribfy dans la base des données métier. C'est exactement ce que la décision d'architecture interdit.

## c) Ce que Youssouf perdrait si nexiora-ai disparaissait demain

Inventaire du 2026-11-17, 15:56 UTC : 58 tables et vues exposées, nombre de lignes par `count=exact`.

| Perdu | Volume | Reconstructible ? |
|---|---|---|
| **Les comptes de Deribfy** (`auth.users`) | 24 comptes | **Non.** Chacun devrait se réinscrire. Les clients payants se retrouvent par Stripe (adresses des customers), pas les autres |
| **Les sites** et leur contenu (`sites`, `site_pages`, `site_blog_posts`, `blog_posts`, `site_comptes`, `site_domains`…) | 46 sites, 79 pages, 9 articles | **Non.** Le contenu n'existe qu'ici. Les domaines restent enregistrés chez le registraire, mais pointeraient sur du vide |
| **Les images et fichiers des sites** (Storage) | 2 095 fichiers, 320,7 Mo | **Non**, sauf si les commerçants les ont gardés |
| **Les boutiques** : `shop_products`, `shop_orders`, `shop_order_items` | 596 produits, 26 commandes, 8 lignes de commande | **En partie.** Stripe garde les paiements (montants, dates, clients), pas le détail des produits ni des adresses de livraison |
| **Le code des applications générées** (`app_generations.document`) | 83 générations, dont les **3 applications publiées** | **Non.** Il faudrait régénérer, en payant, et sans garantie d'obtenir la même application |
| **Les applications publiées elles-mêmes** | atita, une, atel | **Elles s'arrêteraient**, alors que leurs données sont saines dans psxbil : la page est servie depuis le document de nexiora-ai (`a/[sous]/route.ts:37`). Les données métier survivent, l'application qui les lit disparaît |
| L'historique des générations : versions, tentatives, appels, coûts | 59 versions, 8 tentatives, 79 appels | Non. C'est la mémoire des mesures (coûts, D16…) |
| Les compteurs de quota (`profiles`) | 15 lignes | Remis à zéro ; sans gravité |
| Le catalogue fournisseurs (`catalog_products`, `catalog_prix_public`) | 43 894 lignes | **Oui**, par une nouvelle importation (crons du catalogue). Durée non mesurée |
| Les journaux : `cron_runs`, `system_health_checks`, `journal_audit`, `ai_usage_log`, `checkout_anomalies` | 7 707 + 658 + 5 + 33 + 166 lignes | Non, et le manque se supporte |

**Ce qui survit ailleurs :**

- le **code de Deribfy** (GitHub) ;
- **psxbil** : les données métier des applications et leurs comptes, sauvegardés 7 jours par le plan Pro ;
- **Stripe** : clients, abonnements, paiements ;
- **Vercel** : déploiements et variables ;
- **Cloudflare** : DNS ;
- **Resend** : envois.

**En une phrase :** la perte de nexiora-ai efface les comptes, les sites des commerçants et leurs images, ainsi que le code des applications. Elle arrête aussi les applications publiées, alors que leurs données sont intactes de l'autre côté.

## d) Mise en place — 2026-11-17 (validée par le propriétaire)

**Dépôt :** `nexioraai/deribfy-sauvegardes`, **PRIVATE** (vérifié par `gh repo view`). Il contient `scripts/sauvegarder.py` et `.github/workflows/sauvegarde-nexiora.yml`, qui tourne chaque nuit à 03:17 UTC, ou à la main.

**Secrets** (noms vérifiés par `gh secret list`, valeurs jamais lues) : `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `NEXIORA_DATABASE_URL` (Session pooler), `AGE_RECIPIENT` (clé publique). La clé privée est chez Youssouf seul.

**Le dispositif :**

1. Une transaction `repeatable read` exporte son instantané. Les 92 tables y sont comptées.
2. `pg_dump --snapshot` lit **le même** instantané.
3. Le dump est restauré dans `supabase/postgres:17.11.0.019`, à l'intérieur du runner.
4. **Toute erreur de `pg_restore`, ou tout écart de lignes, fait échouer le passage en rouge, et rien n'est envoyé.**
5. Ensuite seulement : chiffrement `age`, envoi vers R2 (`deribfy-sauvegardes/nexiora/<jour>/`), relecture de la liste dans R2.

Le journal ne contient que des noms de tables et des nombres : 0 occurrence d'adresse de connexion.

**Les passages :**

| Passage | Mode | Résultat |
|---|---|---|
| `44190905793` | essai | vert ; 92/92 tables identiques ; **27 erreurs de `pg_restore`** : « role supabase_realtime_admin does not exist », absent de l'image d'essai. Le script a été durci : le rôle est créé dans la cible, et toute erreur fait désormais échouer |
| `44191293947` | essai | vert ; Postgres 17.6 ; 92 tables, 56 914 lignes ; dump de 15,4 Mo ; **`pg_restore` code 0, 0 erreur, 0 écart** |
| `44191593421` | **contrôle négatif** (une ligne retirée de la COPIE d'essai) | **rouge, comme attendu** : « ✗ public.cron_runs, source 7728, restauré 7727 », « rien n'est envoyé ». La preuve sait échouer |
| `44193403294` | **réel** | vert ; 56 916 lignes ; 0 erreur, 0 écart ; puis chiffré, envoyé et **relu dans R2** : `nexiora-2026-11-17.pgdump.age` (15 386 959 octets) et `comptes-2026-11-17.json` (2 968 octets) |

**Reste à faire :**

- ~~le déchiffrement d'essai par Youssouf~~ **FAIT le 2026-11-17** : `age -d -i <clé privée> nexiora-2026-11-17.pgdump.age | head -c 5` a affiché **`PGDMP`**, la signature d'un dump Postgres au format custom. La clé privée de Youssouf ouvre la sauvegarde, et rien de déchiffré n'a été écrit sur le disque ;
- ~~la copie des fichiers Storage~~ **FAITE le 2026-11-17**, voir ci-dessous.

## e) La copie des fichiers — 2026-11-17

**Secrets** (geste ⑤ ; noms vérifiés) : `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY`.

**Portée de cette clé, dite à Youssouf** (documentation Supabase) : « full access to all S3 operations across all buckets and bypass RLS ». Elle ouvre tout le stockage, en lecture et en écriture, mais **pas** la base. Le script ne fait que lire avec elle.

**Le dispositif** (`scripts/copier_fichiers.sh`, travail `fichiers` du même workflow, chaque nuit) :

- **Seaux publics** (`site-images`, `pod-designs`, `custom-designs`, `site-fichiers`), déjà lisibles par tous sur Internet : copie telle quelle.
- **Seaux privés, et tout seau inconnu par prudence** : chaque fichier est chiffré avec la clé publique `age` avant de sortir du runner.
- **`rclone copy`, jamais `sync`** : une suppression accidentelle chez Supabase n'efface pas la sauvegarde.
- **La règle de cycle de vie de R2 (30 jours) s'applique aussi aux fichiers.** Une copie expirée est renvoyée la nuit suivante, puisqu'elle manque. **Limite dite :** un fichier supprimé chez Supabase disparaît de la sauvegarde au plus 30 jours après sa dernière copie.
- **La preuve, en rouge au moindre manque :**
  - pour un seau public, chaque fichier de la source doit être présent dans R2 avec la même taille (`rclone check --one-way --size-only`) ;
  - pour un seau privé, chaque fichier doit avoir un `.age` d'au moins sa taille plus 32 octets. Une copie tronquée est rechiffrée et renvoyée.

**Les passages :**

| Passage | Résultat |
|---|---|
| `44199157960` | **rouge** : R2 renvoyait `501 NotImplemented` au premier envoi avec rclone 1.60.1 (paquet Ubuntu). La deuxième tentative passait, mais pas l'envoi en flux (`rcat`) des fichiers privés. **Corrigé** : rclone officiel 1.68.2 épinglé ; privés chiffrés dans un fichier, puis `copyto` rejouable |
| `44199524274` | vert ; 2 095 fichiers. Mais la preuve des privés ne vérifiait que les noms. **Durcie** par la taille |
| `44200189109` | **contrôle négatif, rouge comme attendu** : `site-fichiers` 12 sur 13. `offres` en ✗ aussi, mais avec « 3 manquants » pour une seule copie retirée. Cela a **révélé un défaut de mon script** : le suffixe `.age` n'était pas retiré, car il est en fin de ligne avec `--format sp`. Corrigé |
| `44200899423` | **vert**. Base : 0 erreur, 92/92. Fichiers : `site-images` 1 870 fichiers (256 400 679 octets), `pod-designs` 187, `custom-designs` 22, `site-fichiers` 13 (rétabli), `offres` 3 (dont **1** rechiffré cette nuit, exactement la copie retirée par le contrôle négatif), `comptes-documents` et `oeuvres-medias` vides. **2 095 fichiers sur 2 095**, aucun `501` |
