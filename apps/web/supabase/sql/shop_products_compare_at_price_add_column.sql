-- M2-217 — LE PRIX BARRÉ (Mode 2). Le marchand affiche deux prix :
-- l'ancien, barré (compare_at_price), et le prix actuel, moins cher.
-- C'est aussi le support de l'outil Promo : appliquer une réduction
-- mémorise l'ancien prix ici ; la retirer le restaure.
-- NULL = pas de prix barré, affichage strictement inchangé.
alter table public.shop_products
  add column if not exists compare_at_price numeric;
