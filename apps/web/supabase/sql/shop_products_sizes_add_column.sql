-- M2-202 — LES TAILLES D'UN PRODUIT (Mode 2, boutique du marchand).
--
-- DEMANDE DE YOUSSOUF : « chaque produit : image(s), titre, description,
-- taille(s), prix ». La table ne portait AUCUNE notion de déclinaison :
-- un marchand de vêtements ne pouvait pas dire qu'une chemise existe en
-- S, M, L — l'information vivait au mieux dans la description, invisible
-- aux filtres et au panier.
--
-- text[] et non une table de variantes : les tailles du Mode 2 sont un
-- ATTRIBUT d'affichage et de choix, pas des lignes de stock distinctes.
-- Le stock reste porté par le produit, comme avant. Si un jour chaque
-- taille doit porter SON stock, ce sera une décision séparée, avec sa
-- propre migration — pas un agrandissement silencieux de celle-ci.
--
-- DEFAULT '{}' : les produits existants ne changent pas de sens, et un
-- INSERT qui omet la colonne reste valide. Aucun backfill nécessaire.
alter table public.shop_products
  add column if not exists sizes text[] not null default '{}';
