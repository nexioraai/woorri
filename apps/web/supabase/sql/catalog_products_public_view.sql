-- ============================================================
-- `catalog_products_public` — LA VUE ÉTROITE EN LIGNES, PAS EN COLONNES.
--
-- POURQUOI CE FICHIER EXISTE (2026-11-01). Mesuré : la table
-- `catalog_products` rend 40 832 lignes à la clef ANONYME, sans compte.
-- `supplier_product_id` permet de retrouver chaque produit chez le
-- fournisseur, donc son prix d'achat. Pour une activité de dropshipping,
-- c'est le sourcing entier.
--
-- ── ÉTROITE EN LIGNES, ET C'EST LÀ LE POINT.
--
-- Arbitrage du propriétaire : « un visiteur qui voit l'identifiant du
-- produit qu'il regarde : négligeable ; n'importe qui qui aspire 40 832
-- références fournisseur : c'est tout ton sourcing. » Le mal est la MASSE.
--
-- Retirer les colonnes ne marcherait pas : les quatre chemins anonymes
-- consomment `supplier_id` (`selectionServable`, le sitemap) ET
-- `supplier_product_id` (le chargement des variantes, mesuré dans
-- `ProductPageView.tsx:93`). Une vue amputée de ces colonnes casserait les
-- vitrines. On garde donc les colonnes et on restreint les LIGNES : seuls
-- les produits qu'un site a réellement sélectionnés sortent.
--
-- Mesure du jour : 40 832 lignes lisibles par anon contre 19 produits
-- réellement servis (les sélections approuvées). Le moissonnage tombe d'un
-- facteur 2 149, et SANS ÉLARGISSEMENT : voir le second filtre du `exists`.
--
-- ── `security_invoker` : OFF, ET C'EST DÉLIBÉRÉ.
--
-- Le propriétaire a demandé `security_invoker`, « puisque tu connais
-- maintenant la différence ». La connaître, c'est voir qu'ici elle doit
-- être ÉTEINTE :
--
--   · `security_invoker = on` fait tourner la vue avec les droits de
--     l'APPELANT sur la table sous-jacente. Or tout l'objet de cette vue
--     est que `anon` lise SANS droit sur `catalog_products` — on va
--     justement le lui révoquer. Avec `on`, la vue casserait au moment même
--     où la révocation prendrait effet.
--   · `off` (le défaut) fait tourner la vue avec les droits de son
--     PROPRIÉTAIRE. C'est ce qui permet de révoquer la table et de servir
--     la vue.
--
-- CE QUE CE CHOIX COÛTE, ÉCRIT ICI : la vue ne voit pas la RLS de
-- l'appelant. Le filtre de LIGNES est donc porté par le CORPS de la vue,
-- pas par une politique — et c'est pourquoi il est écrit en clair,
-- relisible, au lieu d'être supposé. Les DEUX conditions que la RLS
-- appliquait sont reportées dans le `exists` : la sélection, et
-- `merchant_approved`. Oublier la seconde élargissait la visibilité de 19 à
-- 87 — c'est le propriétaire qui l'a relevé.
--
-- ── ORDRE DE COLLAGE, ET IL N'EST PAS NÉGOCIABLE.
--
-- ÉTAPE 1 (ce fichier) : poser la vue et l'accorder à `anon`. Rien ne
-- casse — la table reste lisible, les quatre chemins continuent comme
-- avant.
-- ÉTAPE 2 : déployer le code qui lit la vue au lieu de la table, et MESURER
-- les quatre chemins (avant/après identiques).
-- ÉTAPE 3 seulement : `revoke select on catalog_products from anon`. Le
-- faire avant l'étape 2 éteindrait huit boutiques en ligne.
-- ============================================================

-- ── `security_invoker = false` EXPLICITE, ET PAS POUR LE MOTEUR.
--
-- C'est le DÉFAUT de Postgres, donc cette clause ne change rien à
-- l'exécution. Elle est là pour le LECTEUR : c'est ce défaut qui permettra à
-- `anon` de lire la vue APRÈS la révocation sur la table, et un défaut
-- porteur qui n'est écrit nulle part est une mine.
--
-- Le propriétaire l'a demandé parce qu'il a lui-même proposé
-- `security_invoker = true` une heure plus tôt, « en croyant durcir la
-- sécurité ». Avec `true`, les huit vitrines meurent à l'instant du
-- `revoke` : la vue vérifierait les droits de l'APPELANT sur la table
-- sous-jacente, et il n'en aurait plus.
create or replace view public.catalog_products_public
  with (security_invoker = false) as
  select
    c.id,
    c.name,
    c.description,
    c.price,
    c.currency,
    c.images,
    c.in_stock,
    c.category,
    c.shipping_days_min,
    c.shipping_days_max,
    -- ── LES TROIS COLONNES DE SOURCING, GARDÉES, ET CHACUNE A SON LECTEUR
    -- MESURÉ. Leur divulgation À L'UNITÉ est l'arbitrage assumé ; c'est le
    -- moissonnage qui ferme.
    --
    --   supplier_id         → `selectionServable` (admission du fournisseur)
    --                         et sitemap.ts:166
    --   supplier_product_id → chargement des variantes,
    --                         ProductPageView.tsx:93
    --   supplier_parent_id  → `requiresVariant: !cp.supplier_parent_id`,
    --                         fetchProduct.ts:192 ET shared.tsx:557 — il
    --                         commande le sélecteur de variantes et la garde
    --                         du checkout (409 sans variante). Le
    --                         propriétaire a demandé de la retirer faute de
    --                         consommateur mesuré ; la mesure en a trouvé
    --                         deux, sur deux des quatre chemins.
    c.supplier_id,
    c.supplier_product_id,
    c.supplier_parent_id
  from public.catalog_products c
  where exists (
    select 1
      from public.site_catalog_selections s
     where s.catalog_product_id = c.id
       -- ── LE SECOND FILTRE, ET IL SUPPRIME L'ELARGISSEMENT.
       --
       -- MESURE DU 2026-11-01 : la RLS ne filtre pas par SITE, elle filtre
       -- par `merchant_approved`. anon voit 19 selections sur 87 -- les 19
       -- approuvees. Sans cette ligne, la vue en rendrait 87 : les 68
       -- presellections NON approuvees du marchand, suggerees par l'IA et
       -- pas encore validees, deviendraient lisibles. Son travail en cours.
       --
       -- SANS RISQUE, ET CE N'EST PAS UNE SUPPOSITION : anon ne voit pas ces
       -- 68 aujourd'hui, donc aucun chemin anonyme ne peut en dependre -- un
       -- chemin qui en dependrait serait DEJA casse. La vue filtree reproduit
       -- exactement la visibilite anonyme actuelle, ni plus ni moins.
       --
       -- Et c'est ce qui rend la preuve propre : les quatre mesures
       -- avant/apres doivent sortir IDENTIQUES. Un avant/apres identique
       -- vaut mieux qu'un avant/apres qui change et qu'il faut expliquer.
       and s.merchant_approved
  );

-- ── `anon` SEUL, ET PAS « authenticated AU CAS OÙ ».
--
-- MESURÉ : aucun composant client ne lit ces tables — les lectures des
-- vitrines se font côté serveur avec la clef anonyme (donc en rôle `anon`,
-- sans session), et l'éditeur du marchand passe par des routes en clef de
-- service. Il n'existe donc aucun lecteur en rôle `authenticated`.
--
-- « Un droit qu'on accorde au cas où est un droit que personne ne retirera. »
--
-- ── ET LE `REVOKE` VIENT D'ABORD, SINON LE `GRANT` NE BORNE RIEN.
--
-- Le cliquet DEBT-073 a refusé ce fichier : « REVOKE absent ». Il a raison,
-- et pour une raison mesurée dans ce dépôt — Supabase pose des privilèges
-- PAR DÉFAUT (`alter default privileges ... grant all on tables`) qui
-- couvrent AUSSI les vues. Une vue simple sur une seule table est
-- AUTO-MODIFIABLE par Postgres : un `grant all` hérité donnerait à `anon`
-- un `UPDATE` sur `catalog_products` À TRAVERS la vue. C'est exactement ce
-- qui avait été trouvé puis fermé sur `sites_public`.
--
-- MESURÉ SUR LA BASE VIVANTE avant d'écrire ces lignes : un PATCH anonyme
-- sur la vue rend HTTP 401 — le droit n'a pas été hérité ici. Mais une base
-- RECONSTRUITE depuis ce fichier pourrait l'hériter, et l'état final doit
-- être reproductible : c'est la famille des quinze tables déclarées nulle
-- part.
revoke all on public.catalog_products_public from anon, authenticated;
grant select on public.catalog_products_public to anon;

-- ── ÉTAPE 3, FAITE LE 2026-11-01 : LA RÉVOCATION.
--
-- Décommentée APRÈS que les onze mesures sont revenues identiques à l'octet
-- (trois chemins + huit vitrines) et que la révocation a été prouvée par son
-- CORPS : code 42501, « permission denied for table catalog_products ».
--
-- `anon` SEULEMENT, PAS `authenticated` : son cas n'est pas mesuré et
-- l'éditeur marchand pourrait en dépendre. C'est une QUESTION au registre,
-- pas une dette.
revoke select on public.catalog_products from anon;
--
-- Retour arrière, si un cinquième chemin apparaissait un jour :
--   grant select on public.catalog_products to anon;
--
-- À ne coller QU'APRÈS le déploiement du code qui lit la vue, et après que
-- les quatre chemins anonymes ont été mesurés identiques avant/après :
--   ① themes/shared.tsx:487        prix des produits POD
--   ② themes/shared.tsx:509        vitrine d'un site (19 liens /produits/)
--      ↑ ce 19 est le MEME que celui de la vue : c'est le filet.
--   ③ produits/[id]/fetchProduct   fiche produit (HTTP 200)
--   ④ sitemap.ts:159               indexation (251 <url>, 206 produits)
--
-- Le `revoke` est GLOBAL : il coupe les quatre d'un coup, y compris les deux
-- qui n'appellent pas la table mais l'ATTEIGNENT par embarquement.
