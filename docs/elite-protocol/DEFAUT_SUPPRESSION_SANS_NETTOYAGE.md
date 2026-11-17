# Défaut — supprimer une application ne nettoie pas la base des œuvres (2026-11-17)

- **Statut :** consigné, **non ouvert** (consigne du propriétaire, 2026-11-17).
- **Mesures :** psql en `begin transaction read only` sur la base des œuvres (psxbil), et lecture du code.

## 1. Ce que fait la suppression aujourd'hui

**`POST /api/generateur/supprimer`** — une suppression douce, voulue :

- statut `supprimee`, `publication_jeton = null`, `publie_le = null` (`supprimer/route.ts:133-143`) ;
- le lien répond 404 tout de suite ;
- le slug reste réservé, en « pierre tombale » (`:12-19`).

**Le cron `purge-supprimees`**, chaque jour à 04:30 (`vercel.json:100-101`) : 30 jours après la suppression (`JOURS_AVANT_PURGE = 30`, `supprimer/route.ts:52`), il efface le `document` dans la base **Deribfy** (`purge-supprimees/route.ts:55-62`).

**Aucun des deux ne touche la base des œuvres.** Le dépôt ne contient aucun `drop schema` hors des scripts de tir, et aucune suppression de compte d'application.

## 2. Ce qui reste — mesuré le 2026-11-17

| Schéma | Application | Statut Deribfy | Exposé à l'API (`pgrst.db_schemas`) | Compte d'application |
|---|---|---|---|---|
| `oeuvre_4d480027…` | suivi | `supprimee` | **oui** | 1 |
| `oeuvre_bbf07fd6…` | regi | `supprimee` | **oui** | 1 |
| `oeuvre_ba20655a…` | asso | `supprimee` | **oui** | 1 |
| `oeuvre_35ed32c1…` | asosa | `supprimee` | **oui** | 1 |
| `oeuvre_faa9f0c3…` | cahier-des-charges-fonctionnel-technique | `supprimee` | **oui** | 1 |
| `oeuvre_15158240…` | snenak | `supprimee` | non | 1 |

Et dans `auth.users` : 14 comptes d'application, pour 3 applications servies.

## 3. Conséquences

- **PROUVÉ le 2026-11-17 (§3 bis) : les données d'une application supprimée restent lisibles par son compte.**
- **La liste exposée grandit avec les suppressions.** Elle compte 44 caractères par schéma (`GENERATION_OUVERTE_ET_QUOTA.md` §6). Le temps de rechargement du cache de schémas en fonction de sa taille n'est pas mesuré.
- **Coût :** négligeable. Les 9 schémas pèsent 728 Ko.
- **Ce que la suppression dit à la personne n'est pas ce qu'elle fait aux données.** Le lien meurt ; les données, non.

## 3 bis. La preuve, sur suivi et regi — en lecture seule

Aucune écriture : psql dans `begin transaction read only` … `rollback`, et des appels à l'API sans session.

| Maillon | Mesure | Résultat |
|---|---|---|
| **1. Le compte existe et peut se connecter** | `auth.users` | Pour suivi comme pour regi : une adresse, un mot de passe posé, `banned_until` vide, `deleted_at` vide. Dernière connexion le 2026-11-16 |
| **2. L'API sert encore le schéma** | `GET /rest/v1/…` avec `Accept-Profile`, clé publiable, sans session | suivi et regi : `42501` (schéma servi, accès refusé sans compte). **Témoin** `15158240` (non exposé) : `PGRST106` (schéma non servi) |
| **3. Une session de ce compte lit des lignes** | `set local role authenticated`, puis les revendications que PostgREST pose après avoir vérifié le jeton du compte (`app_metadata.oeuvre`) | **suivi : `article` 3 lignes, `mouvement_stock` 3 lignes. regi : `produit` 2 lignes, `vente` 1 ligne.** Témoin : le compte de regi lit **0** ligne de suivi, la politique filtre donc bien par application |

**Le seul maillon non joué** est la connexion réelle avec le mot de passe. Il n'est connu de personne et ne doit pas l'être. Chaque maillon qui la suit est mesuré.

## 4. La conception — la corbeille à délai (proposée, rien n'est construit)

**La règle de Youssouf :** ce qui est effacé doit l'être vraiment, mais on ne doit pas pouvoir effacer par erreur. La corbeille à 30 jours réconcilie les deux.

### Ce que la suppression fait DÉJÀ, et qu'on garde

- La ligne passe à `supprimee`, `publication_jeton` passe à `null`, la date est rangée dans `sections_acquises.supprimeeLe` (`supprimer/route.ts:133-143`). L'application quitte la liste et cesse de répondre.
- **L'adresse est retirée tout de suite**, DNS Cloudflare et domaine Vercel (`:108-128`). Ce n'est pas fait au bout de 30 jours.
- Le cron du jour 30 vide le `document` (`purge-supprimees/route.ts:55-62`).

### Une tension à trancher

« Après 30 jours, tout part » ne doit **pas** inclure le **nom** `xxx.deribfy.app`.

La pierre tombale le garde réservé pour toujours (A1, `supprimer/route.ts:12-19`). Le libérer laisserait quelqu'un d'autre le reprendre, et les anciens liens (cartes de visite, WhatsApp) mèneraient chez un inconnu. **Recommandation : l'entrée DNS part (elle part déjà), le nom reste réservé.**

### Étapes, avec leurs durées (estimées, non mesurées)

| # | Étape | Contenu | Durée |
|---|---|---|---|
| 1 | **Les nombres réels de l'avertissement** | Une lecture serveur (clé de service, base des œuvres) rend, pour l'application, le nombre de lignes de chaque table avec son libellé lisible (`contenu-public.ts`, déjà écrit), et l'adresse. Exemple réel aujourd'hui : « les 3 articles, les 3 mouvements de stock et l'adresse suivi.deribfy.app » | 0,5 j |
| 2 | **La zone dangereuse** | Le bouton quitte la rangée principale pour une section repliée « Zone dangereuse ». Il reste inactif tant que le **nom exact** de l'application n'est pas tapé. L'avertissement dit ce qui part, avec les nombres de l'étape 1, et qu'on peut **restaurer pendant 30 jours** | 0,5 j |
| 3 | **Supprimer = rendre illisible tout de suite, réversible** | En plus de l'existant : retirer le schéma de `pgrst.db_schemas` (l'API cesse de le servir, preuve attendue : `PGRST106` comme le témoin) et **bannir** le compte de l'application (`ban_duration` de l'API d'administration de psxbil). Rien n'est détruit. Le jeton de publication est rangé, pas perdu | 1 j, tests compris |
| 4 | **Restaurer avant 30 jours** | Statut `livree` ; remettre le schéma dans `pgrst.db_schemas` ; lever le bannissement ; reposer l'adresse (le code de `publier` existe) ; remettre le jeton rangé, pour que les anciens liens `/p/<jeton>` revivent. Un bouton « Restaurer » dans une liste « Supprimées récemment » | 1 j |
| 5 | **Au jour 30, tout part** | Le cron existant fait en plus : `drop schema … cascade` dans la base des œuvres, suppression du compte de l'application, oubli du jeton rangé. Le nom reste réservé (pierre tombale). Il faut une preuve réelle sur un schéma jetable, comme `porte-deux-regimes.tir.ts`, **avec l'accord du propriétaire** | 1 j |
| 6 | **Les 5 applications déjà supprimées** | Voir ci-dessous | 0,25 j |
| | **Total** | | **environ 4 à 4,5 jours** |

### Les 5 applications déjà supprimées qui gardent leurs données aujourd'hui

Date de suppression lue dans `sections_acquises.supprimeeLe` (base Deribfy, 2026-11-17) :

| Application | Supprimée le | Jour 30 | Aujourd'hui |
|---|---|---|---|
| suivi (`4d480027`) | 2026-11-17 | 2026-12-17 | schéma exposé, compte actif, 6 lignes |
| regi (`bbf07fd6`) | 2026-11-17 | 2026-12-17 | schéma exposé, compte actif, 3 lignes |
| asso (`ba20655a`) | 2026-11-13 | 2026-12-13 | schéma exposé, compte actif |
| asosa (`35ed32c1`) | 2026-11-13 | 2026-12-13 | schéma exposé, compte actif |
| `faa9f0c3` (cahier-des-charges-fonctionnel-technique) | 2026-11-13 | 2026-12-13 | schéma exposé, compte actif |
| snenak (`15158240`) | 2026-11-06 | 2026-12-06 | schéma **non** exposé, compte actif |

**Recommandation :** leur appliquer la règle commune, sans exception. Dès que l'étape 3 existe, un passage unique les rend illisibles (retrait de `pgrst.db_schemas`, bannissement du compte). Leurs données restent restaurables jusqu'à leur jour 30, puis la purge de l'étape 5 les efface. Aucune n'atteint son jour 30 avant le 2026-12-06. **Personne n'a demandé à les restaurer ; personne ne doit pouvoir les lire d'ici là.**

## 5. Avant la conception (version d'origine de ce fichier)

Elle doit suivre la même douceur que la suppression : rien d'irréversible avant la purge des 30 jours.

- **À la suppression :** retirer le schéma de `pgrst.db_schemas` (l'API cesse de servir les données), et bannir ou supprimer le compte.
- **À la purge (30 jours) :** `drop schema … cascade` et suppression du compte.
- **Preuve attendue :** sur une copie jetable, une application supprimée ne doit plus se lire par l'API, et une application restaurée avant 30 jours doit se relire. Preuve réelle sur la base, comme `porte-deux-regimes.tir.ts`, avec l'accord du propriétaire.
