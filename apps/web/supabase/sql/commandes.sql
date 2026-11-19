-- ============================================================================
-- LES COMMANDES DES STRUCTURES SANITAIRES (CPA, 2026-11-19).
--
-- À exécuter manuellement dans l'éditeur SQL Supabase (projet nexiora-ai),
-- même convention que les autres fichiers de ce dossier. Rejouable.
--
-- Contient aussi la colonne `site_comptes.service` (agents de la DDM, plus bas).
--
-- ── CE QUE LE PROPRIÉTAIRE A DÉCIDÉ, 2026-11-19.
--
-- « Il faut ajouter un espace client, où les clients peuvent créer un compte
-- et avoir un espace où commander. » Arbitrages :
--   · un BON DE COMMANDE — des produits et des quantités, sans prix ni
--     paiement : la Centrale traite la commande, elle n'est pas encaissée ici ;
--   · la Centrale la reçoit dans son TABLEAU DE BORD (pas de courriel pour
--     l'instant — « on va leur demander plus tard »).
--
-- ── CE QUI EXISTAIT DÉJÀ, ET QU'ON NE REFAIT PAS.
--
-- Le compte client existe : `site_comptes.role = 'structure'` (« Structure
-- sanitaire »), son inscription, sa connexion, son espace `/espace-client`.
-- Il ne manquait que l'endroit où une commande arrive.
--
-- ── POURQUOI PAS `shop_orders`.
--
-- `shop_orders` est le circuit marchand (prix, paiement Stripe), réservé aux
-- sites qui encaissent (modes 2 et 3, verrouillé par déclencheur). Une
-- centrale d'achats publique ne vend pas en ligne : la réutiliser aurait
-- exigé des prix, un paiement et un changement de mode que personne n'a
-- demandés.
--
-- ── UNE LIGNE PEUT NE PAS VENIR DU CATALOGUE.
--
-- Mesuré le 2026-11-19 : le catalogue de la CPA compte 0 produit publié. Une
-- commande limitée au catalogue serait donc impossible. `produit_reference`
-- est rempli quand la ligne vient du catalogue, NULL sinon ; la DÉSIGNATION
-- est toujours écrite, et figée : si le catalogue change, la commande dit
-- encore ce qui a été demandé ce jour-là.
-- ============================================================================

-- AVANT — l'état réel, pour pouvoir comparer après.
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'commandes')       as commandes_deja_la,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'commande_lignes') as lignes_deja_la;

create table if not exists public.commandes (
  id uuid primary key default gen_random_uuid(),

  site_id   uuid not null references public.sites(id)        on delete cascade,
  -- Le compte qui commande. `cascade` : un client qui supprime son compte
  -- emporte ses bons de commande — la route de suppression des comptes n'a
  -- pas à apprendre un nouveau refus.
  compte_id uuid not null references public.site_comptes(id) on delete cascade,

  -- La référence montrée au client et à la Centrale (« CMD-2026-7K4Q2M »).
  reference text not null
    constraint commandes_reference_unique unique,

  etat text not null default 'recue'
    constraint commandes_etat_chk
    check (etat in ('recue', 'en_cours', 'validee', 'livree', 'annulee')),

  -- Ce que le client précise (lieu de livraison, urgence…).
  note text
    constraint commandes_note_chk check (note is null or length(note) <= 2000),

  -- La réponse de la Centrale, lue dans l'espace du client.
  reponse text
    constraint commandes_reponse_long_chk check (reponse is null or length(reponse) <= 4000),
  repondu_le timestamptz,

  cree_le timestamptz not null default now(),
  maj_le  timestamptz not null default now(),

  -- Une réponse et sa date vont ensemble — même invariant que les offres et
  -- les demandes.
  constraint commandes_reponse_chk check ((reponse is null) = (repondu_le is null))
);

create index if not exists commandes_site_idx   on public.commandes (site_id, cree_le desc);
create index if not exists commandes_compte_idx on public.commandes (compte_id, cree_le desc);

create table if not exists public.commande_lignes (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commandes(id) on delete cascade,
  rang smallint not null default 0,
  produit_reference text,
  designation text not null
    constraint commande_lignes_designation_chk check (length(btrim(designation)) between 2 and 300),
  quantite integer not null
    constraint commande_lignes_quantite_chk check (quantite between 1 and 1000000),
  unite text
    constraint commande_lignes_unite_chk check (unite is null or length(unite) <= 40)
);

create index if not exists commande_lignes_commande_idx on public.commande_lignes (commande_id, rang);

-- ---------------------------------------------------------------------------
-- AUCUN PRIVILÈGE À PERSONNE — comme `site_comptes` et `offres`.
--
-- Une commande dit ce qu'un hôpital a demandé : aucune session ne doit
-- pouvoir lire celle d'un autre. Tout passe par une route serveur qui
-- vérifie soit le compte du client, soit le propriétaire du site.
-- ---------------------------------------------------------------------------
alter table public.commandes       enable row level security;
alter table public.commande_lignes enable row level security;
revoke all on table public.commandes       from anon, authenticated;
revoke all on table public.commande_lignes from anon, authenticated;
grant  all on table public.commandes       to   service_role;
grant  all on table public.commande_lignes to   service_role;

-- ---------------------------------------------------------------------------
-- L'ESPACE CLIENT EST CONFIÉ À LA DIVISION DDM (CPA, 2026-11-19).
--
-- « Donner à la division DDM la gestion de l'espace client. » Un compte de
-- rôle `agent` (personnel de la Centrale, jamais auto-déclaré) porte un
-- SERVICE. `ddm` : il voit et traite les commandes et les comptes clients,
-- depuis l'espace client du site. Le propriétaire garde tous ses droits.
--
-- Le service n'existe que pour un agent : un client ou un fournisseur
-- n'appartient à aucune division de la Centrale.
-- ---------------------------------------------------------------------------
alter table public.site_comptes add column if not exists service text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_comptes_service_chk') then
    alter table public.site_comptes
      add constraint site_comptes_service_chk
      check (service is null or (role = 'agent' and service in ('ddm')));
  end if;
end $$;

notify pgrst, 'reload schema';

-- APRÈS — les deux tables existent, et personne d'autre que le service ne les lit.
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name in ('commandes', 'commande_lignes')) as tables_presentes,
  (select count(*) from information_schema.role_table_grants
     where table_schema = 'public' and table_name in ('commandes', 'commande_lignes')
       and grantee in ('anon', 'authenticated'))                                       as privileges_publics,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'site_comptes'
       and column_name = 'service')                                                    as colonne_service;
