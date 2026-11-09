-- ============================================================================
-- LOT 12.2 — LES PIÈCES QU'UN FOURNISSEUR DOIT FOURNIR.
--
-- ── POURQUOI LA CENTRALE LES ÉCRIT ELLE-MÊME.
--
-- Arbitrage du propriétaire, 2026-11-09. Une liste en dur dans le code
-- aurait voulu dire : agrément pharmaceutique, registre du commerce,
-- attestation fiscale — devinés par moi, depuis Paris, pour un pays dont je
-- ne connais pas les formulaires. La Centrale sait ce qu'elle exige ; elle
-- l'écrit, et elle le change sans nous.
--
-- ── DEUX COLONNES, PAS UNE, ET VOICI POURQUOI.
--
-- Déclarer les pièces ne suffit pas à dire « il manque l'attestation
-- fiscale » : il faut RATTACHER un document déposé à la pièce qu'il honore.
-- Sans `comptes_documents.piece`, l'écran ne saurait que compter des
-- fichiers — et un fournisseur qui aurait déposé trois fois son registre du
-- commerce passerait pour complet.
--
-- ── LA CLÉ EST STABLE, LE LIBELLÉ NON.
--
-- `{ cle, libelle, obligatoire }`. La Centrale peut corriger « Attestation
-- fiscale » en « Attestation de régularité fiscale » sans que les documents
-- déjà rattachés se détachent. Lier par le libellé aurait fait perdre le
-- rattachement à la première faute de frappe corrigée.
--
-- ── `piece` EST FACULTATIF, ET LE RESTERA.
--
-- Les documents du lot 12.1 n'en ont pas, et beaucoup n'en auront jamais :
-- une facture envoyée par la Centrale n'honore aucune exigence. Rendre la
-- colonne obligatoire aurait cassé le dépôt libre, qui est le cas courant.
--
-- ── `[]` PAR DÉFAUT : AUCUN DES 42 SITES NE GAGNE UNE EXIGENCE.
-- ============================================================================

-- AVANT — l'état réel, pour pouvoir comparer après.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'sites'
       and column_name = 'pieces_fournisseur')        as pieces_deja_la,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'comptes_documents'
       and column_name = 'piece')                     as rattachement_deja_la,
  (select count(*) from public.comptes_documents)     as documents;

alter table public.sites
  add column if not exists pieces_fournisseur jsonb not null default '[]'::jsonb;

comment on column public.sites.pieces_fournisseur is
  'Les pieces qu''un fournisseur doit fournir, declarees PAR LA CENTRALE '
  'depuis /edit. Tableau d''objets { cle, libelle, obligatoire }. La CLE est '
  'stable : corriger un libelle ne detache pas les documents deja rattaches. '
  'Vide par defaut — aucun site ne gagne une exigence parce qu''une '
  'migration est passee.';

alter table public.comptes_documents
  add column if not exists piece text;

comment on column public.comptes_documents.piece is
  'La CLE de la piece exigee que ce document honore, ou NULL. Facultatif et '
  'destine a le rester : une facture envoyee par la Centrale n''honore '
  'aucune exigence, et le depot libre est le cas courant.';

-- Un index sur le couple : « quelles pieces ce compte a-t-il deja
-- honorees ? » est la question que l'ecran pose a chaque affichage.
create index if not exists comptes_documents_piece_idx
  on public.comptes_documents (compte_id, piece)
  where piece is not null and retire_le is null;

-- L'ÉCRITURE, COLONNE PAR COLONNE.
grant update (pieces_fournisseur) on table public.sites to authenticated;

notify pgrst, 'reload schema';

-- APRÈS — la preuve, dans la même exécution.
select
  (select bool_or(column_name = 'pieces_fournisseur') from information_schema.columns
     where table_schema = 'public' and table_name = 'sites')            as pieces_posee,
  (select bool_or(column_name = 'piece') from information_schema.columns
     where table_schema = 'public' and table_name = 'comptes_documents') as rattachement_pose,
  (select count(*) from public.sites
     where jsonb_array_length(pieces_fournisseur) > 0)                   as sites_avec_exigences,
  (select count(*) from public.comptes_documents where piece is not null) as documents_rattaches;
