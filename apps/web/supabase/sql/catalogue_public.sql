-- ============================================================================
-- LOT 6 — LE CATALOGUE PUBLIC D'UNE CENTRALE N'EST PAS UNE BOUTIQUE
--
-- MESURÉ AVANT D'ÉCRIRE : `shop_products` existe, avec 18 colonnes dont
-- `price`, `stock`, `for_sale` et `compare_at_price`. La réemployer aurait
-- évité une table — mais aurait laissé les colonnes de prix À PORTÉE.
--
-- LE PLAN DIT, §5 décision 1 : « Niveau du catalogue — information publique
-- seule ? » (hypothèse retenue). Donc PAS de prix, PAS de stock, PAS de
-- commande.
--
-- LA MEILLEURE GARANTIE EST UNE IMPOSSIBILITÉ, PAS UNE RÈGLE. Avec
-- `shop_products`, « ne pas afficher le prix » serait une consigne qu'on
-- oublie — et sur un marché d'État, un prix public ENGAGE. Ici la table
-- N'A PAS de colonne de prix : il n'y a rien à oublier.
--
-- UN STOCK AFFICHÉ FAUX EST PIRE QU'UN STOCK ABSENT : il déclenche des
-- commandes impossibles, et la structure qui a prévu sur cette foi se
-- retrouve en rupture.
-- ============================================================================

create table if not exists public.catalogue_produits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,

  -- La référence interne de la Centrale. Deux produits ne peuvent pas la
  -- partager sur un même site : une référence ambiguë rend la commande
  -- ambiguë.
  reference text not null
    constraint catalogue_reference_chk check (length(btrim(reference)) between 1 and 60),

  denomination text not null
    constraint catalogue_denomination_chk check (length(btrim(denomination)) between 1 and 300),

  -- La famille thérapeutique. Vocabulaire LIBRE ici, parce que chaque pays
  -- suit sa propre liste nationale : un vocabulaire fermé écrit au Tchad ne
  -- vaudrait pas ailleurs, et le moteur sert 42 sites.
  famille text
    constraint catalogue_famille_chk check (famille is null or length(btrim(famille)) between 1 and 120),

  forme text        -- comprimé, sirop, injectable…
    constraint catalogue_forme_chk check (forme is null or length(btrim(forme)) <= 120),
  dosage text
    constraint catalogue_dosage_chk check (dosage is null or length(btrim(dosage)) <= 120),
  conditionnement text
    constraint catalogue_cond_chk check (conditionnement is null or length(btrim(conditionnement)) <= 200),

  -- `true` = produit de la chaîne du froid. Une donnée de CONSERVATION, pas
  -- de commerce : elle dit comment transporter, pas combien ça coûte.
  chaine_du_froid boolean not null default false,

  note text
    constraint catalogue_note_chk check (note is null or length(note) <= 2000),

  publie boolean not null default false,
  ordre integer not null default 0,
  cree_le timestamptz not null default now(),
  maj_le  timestamptz not null default now(),

  constraint catalogue_reference_unique unique (site_id, reference)
);

-- AUCUNE COLONNE DE PRIX, DE STOCK NI DE DISPONIBILITÉ N'EXISTE ICI, ET
-- C'EST LE POINT DU LOT. Les ajouter demanderait un ALTER TABLE — un geste
-- bruyant, qui se voit en revue, et qui devra être justifié.

create index if not exists catalogue_site_publie_idx
  on public.catalogue_produits (site_id, publie, ordre, denomination);
create index if not exists catalogue_famille_idx
  on public.catalogue_produits (site_id, publie, famille);

-- ---------------------------------------------------------------------------
-- LE PATRON MAISON : la table ne rend RIEN, la vue rend le publié d'un site
-- publié. `sites_public` n'expose ni `published` ni `archived_at`, donc
-- l'invariant devient syntaxiquement irreproductible en aval.
-- ---------------------------------------------------------------------------
alter table public.catalogue_produits enable row level security;
revoke all on table public.catalogue_produits from anon, authenticated;
grant  all on table public.catalogue_produits to   service_role;

create or replace view public.catalogue_produits_public
with (security_invoker = false) as
select p.id, p.site_id, s.slug as site_slug,
       p.reference, p.denomination, p.famille,
       p.forme, p.dosage, p.conditionnement,
       p.chaine_du_froid, p.note, p.ordre, p.maj_le
from public.catalogue_produits p
join public.sites_public s on s.id = p.site_id
where p.publie = true;

revoke all    on public.catalogue_produits_public from anon, authenticated;
grant  select on public.catalogue_produits_public to   anon, authenticated;

notify pgrst, 'reload schema';
