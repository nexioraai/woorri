-- ============================================================================
-- LOT 12.0 — LES DOCUMENTS D'UN COMPTE, DANS LES DEUX SENS.
--
-- ── CE QUE LE PROPRIÉTAIRE A TRANCHÉ, 2026-11-09.
--
-- « le cpa depose les documents et les fournisseurs ou les etablissement ou
-- hopitaux peuvent upload, et de leur coté fournisseurs et les
-- etablissements peuvent upload pour le cpa, c de 2 cotés pas un coté. »
--
-- D'où `sens`, et non un simple drapeau « déposé par nous » : les deux
-- directions existent, et elles ne se déduisent pas l'une de l'autre.
--
-- ── UN DOCUMENT CONCERNE UN COMPTE. UN SEUL.
--
-- Pas « tous les fournisseurs », pas « toutes les structures du Logone ».
-- Une diffusion collective est une AUTRE forme — avec ses règles de retrait
-- et de traçabilité — et l'inventer ici en passant produirait une table
-- qu'on n'oserait plus toucher. La Centrale qui veut atteindre dix
-- structures dépose dix fois : visible, dénombrable, retirable une par une.
--
-- ── IL NE DISPARAÎT PAS, IL EST RETIRÉ.
--
-- Dans un marché public, « ce document a existé et a été retiré le 12 » est
-- une information. Une disparition sans trace permettrait de nier un dépôt.
-- La LIGNE reste avec sa date de retrait ; le FICHIER part du seau, donc
-- plus personne ne le télécharge.
--
-- ── ET CHACUN NE RETIRE QUE CE QU'IL A DÉPOSÉ.
--
-- `depose_par` décide. La Centrale ne fait pas disparaître l'agrément qu'un
-- fournisseur lui a remis, et réciproquement.
--
-- ── AUCUNE SUPPRESSION AUTOMATIQUE.
--
-- Effacer seule une pièce de marché public serait une décision que personne
-- n'a prise. Si une durée de conservation s'impose un jour, elle se décidera
-- et s'écrira ; elle ne se subira pas.
-- ============================================================================

-- AVANT — l'état réel, pour pouvoir comparer après.
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'comptes_documents') as table_deja_la,
  (select count(*) from storage.buckets where id = 'comptes-documents')  as seau_deja_la;

create table if not exists public.comptes_documents (
  id uuid primary key default gen_random_uuid(),

  site_id   uuid not null references public.sites(id)         on delete cascade,
  -- LE COMPTE CONCERNÉ. `cascade` : un compte retiré emporte ses documents,
  -- parce qu'ils n'ont plus de destinataire ni de déposant.
  compte_id uuid not null references public.site_comptes(id)  on delete cascade,

  -- LES DEUX SENS, nommés. Vocabulaire FERMÉ : un troisième sens inventé
  -- plus tard devra passer par une migration, donc par une décision.
  sens text not null
    constraint comptes_documents_sens_chk
    check (sens in ('vers_le_compte', 'vers_la_centrale')),

  -- QUI A DÉPOSÉ. C'est lui, et lui seul, qui pourra retirer.
  depose_par uuid not null,

  nom text not null
    constraint comptes_documents_nom_chk
    check (length(btrim(nom)) between 1 and 200),

  -- LA CLÉ DANS LE SEAU. Unique : deux lignes qui pointeraient le même
  -- fichier rendraient le retrait ambigu — retirer l'une couperait l'autre.
  chemin text not null
    constraint comptes_documents_chemin_unique unique,

  octets bigint not null
    constraint comptes_documents_octets_chk check (octets > 0),

  type_mime text not null,

  depose_le  timestamptz not null default now(),
  retire_le  timestamptz,
  retire_par uuid,

  -- L'INVARIANT DU RETRAIT. Une date sans auteur, ou un auteur sans date,
  -- décrit un retrait que personne ne peut raconter. Même forme que
  -- l'attribution d'un marché, pour la même raison.
  constraint comptes_documents_retrait_chk
    check ((retire_le is null) = (retire_par is null))
);

create index if not exists comptes_documents_compte_idx
  on public.comptes_documents (compte_id, depose_le desc);
create index if not exists comptes_documents_site_idx
  on public.comptes_documents (site_id, depose_le desc);

-- ---------------------------------------------------------------------------
-- AUCUN PRIVILÈGE À PERSONNE, comme `site_comptes`.
--
-- Pas même en lecture à `authenticated`. Une politique « je lis mes
-- documents » paraîtrait raisonnable — mais elle ouvrirait la table à toute
-- session, et il suffirait d'une politique mal écrite pour qu'un fournisseur
-- lise les pièces d'un concurrent.
-- ---------------------------------------------------------------------------
alter table public.comptes_documents enable row level security;
revoke all on table public.comptes_documents from anon, authenticated;
grant  all on table public.comptes_documents to   service_role;

-- ---------------------------------------------------------------------------
-- LE SEAU EST PRIVÉ. C'EST TOUTE LA DIFFÉRENCE AVEC `site-fichiers`.
--
-- `site-fichiers` est `public = true` : n'importe qui connaissant l'adresse
-- lit le fichier, et c'est voulu — il sert les dossiers de consultation,
-- qui sont publics. Y ranger l'agrément d'un fournisseur en ferait une
-- fuite à URL devinable.
--
-- Ici : `public = false`, et AUCUNE politique pour `anon` ni
-- `authenticated`. Le service seul écrit et lit, et nos routes délivrent des
-- liens signés à durée courte APRÈS avoir vérifié qui demande.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comptes-documents', 'comptes-documents', false,
  26214400,  -- 25 Mio, comme l'autre seau : un dossier complet passe, un film non
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'text/csv',
    'image/jpeg', 'image/png', 'image/webp', 'image/avif'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Les politiques d'un essai précédent, s'il y en a eu : on ne laisse pas une
-- permission oubliée derrière soi.
drop policy if exists "comptes-documents lecture"  on storage.objects;
drop policy if exists "comptes-documents depot"    on storage.objects;
drop policy if exists "comptes-documents retrait"  on storage.objects;

notify pgrst, 'reload schema';

-- APRÈS — la preuve, dans la même exécution.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'comptes_documents')   as colonnes,
  (select public from storage.buckets where id = 'comptes-documents')      as seau_public,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'comptes-documents%')                           as politiques_sur_le_seau,
  (select count(*) from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'comptes_documents'
       and grantee in ('anon', 'authenticated'))                           as privileges_publics;
