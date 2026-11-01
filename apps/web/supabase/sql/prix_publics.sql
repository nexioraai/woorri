-- ============================================================
-- `prix_publics` — LES PRIX PAR LISTE D'IDENTIFIANTS, NON ENUMERABLES.
--
-- POURQUOI UNE FONCTION ET PAS UNE VUE (arbitrage du proprietaire,
-- 2026-11-01).
--
-- Le chemin POD (`loadPodBrandCatalogPrices`) relit prix et devise des
-- maquettes rangees dans `sites.pod_designs`. Il ne passe PAS par
-- `site_catalog_selections` -- en mode pod_brand elles ne sont meme pas
-- chargees. Mesure sur la base vivante : sur 3 ids demandes, la table en
-- rend 3, la vue restreinte aux selections approuvees n'en rend que 2. Une
-- vue unique aurait rendu ZERO prix le jour du premier design d'un
-- marchand, en production, silencieusement.
--
-- MA PREMIERE REPONSE ETAIT UNE VUE A TROIS COLONNES, TOUTES LIGNES
-- OUVERTES. Le proprietaire l'a refusee, et il avait raison : elle
-- reintroduisait en plus petit la forme qu'on venait de passer six heures a
-- fermer -- 40 832 lignes ENUMERABLES par `anon` via `select=*`.
--
-- Or le chemin lit PAR LISTE D'IDENTIFIANTS : il les connait deja, il ne les
-- enumere pas. Une fonction prend donc ses identifiants en parametre et ne
-- s'enumere pas du tout. La forme supprime le jugement au lieu de le
-- documenter.
--
-- ── TROIS DETAILS QUI NE SONT PAS OPTIONNELS.
--
--   · `security definer` ET PAS `invoker` : c'est ce qui la fait survivre a
--     la revocation de `anon` sur `catalog_products`. La RPC voisine
--     (`contraintes_vivantes`) est en `invoker` a juste titre -- elle est
--     reservee a `service_role`, qui a deja les droits. Ici c'est l'inverse :
--     l'indirection de privilege est l'objet meme de la fonction.
--   · `set search_path` EPINGLE : une fonction `security definer` sans
--     search_path fixe est un vecteur d'elevation de privilege classique --
--     un appelant qui place un schema devant `public` ferait resoudre
--     `catalog_products` vers SA table. Non negociable.
--   · `revoke ... from public` AVANT le grant : Postgres accorde EXECUTE a
--     PUBLIC par defaut sur toute fonction neuve, et `anon` en HERITE.
--     Mesure du 2026-11-01 sur la fonction voisine : apres un collage qui ne
--     revoquait que les roles nommes, la clef ANONYME appelait quand meme
--     (AUTORISE, 5 regles rendues). Sans ce revoke, le grant ne veut rien
--     dire.
--
-- Types mesures avant d'ecrire la signature : `id` uuid, `price` numeric,
-- `currency` text.
-- ============================================================

create or replace function public.prix_publics(ids uuid[])
returns table (id uuid, price numeric, currency text)
language sql
security definer
set search_path = public, pg_temp
stable
as $FN$
  select c.id, c.price, c.currency
    from public.catalog_products c
   where c.id = any(ids)
$FN$;

revoke all on function public.prix_publics(uuid[]) from public;
grant execute on function public.prix_publics(uuid[]) to anon;
