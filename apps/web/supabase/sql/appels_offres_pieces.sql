-- ============================================================================
-- LOT 5b — UN APPEL D'OFFRES PORTE SES PIÈCES
--
-- LE DÉFAUT, MESURÉ. `appels_offres` a 24 colonnes et pas UNE ne tient un
-- fichier. Il existe `document_url` : UNE adresse, pour UN document. Or un
-- dossier de consultation, c'est le règlement, le cahier des charges, le
-- bordereau de prix et les annexes — quatre pièces au moins. Un fournisseur
-- qui n'a qu'un lien ne peut pas répondre.
--
-- `document_url` N'EST PAS SUPPRIMÉE. Des avis la portent peut-être déjà ;
-- la retirer casserait ce qui marche. Elle devient le cas particulier d'un
-- dossier à une pièce, et le rendu affichera les deux sans doublon.
--
-- LA FORME EST FERMÉE, COMME POUR LES BLOCS. La base refuse une pièce sans
-- nom ou sans adresse : un lien mort annoncé comme un dossier de consultation
-- est pire qu'une absence, parce que le fournisseur croit avoir le dossier.
-- ============================================================================

create or replace function public.appels_offres_pieces_valides(p jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) <= 30
     and not exists (
       select 1
       from jsonb_array_elements(p) as e
       where jsonb_typeof(e) <> 'object'
          -- nom ET url obligatoires, non vides
          or jsonb_typeof(e -> 'nom') is distinct from 'string'
          or btrim(e ->> 'nom') = ''
          or jsonb_typeof(e -> 'url') is distinct from 'string'
          or btrim(e ->> 'url') = ''
          -- les champs facultatifs, s'ils sont là, sont des chaînes
          or (e ? 'format' and jsonb_typeof(e -> 'format') <> 'string')
          or (e ? 'poids'  and jsonb_typeof(e -> 'poids')  <> 'string')
     );
$$;

revoke all on function public.appels_offres_pieces_valides(jsonb) from public, anon, authenticated;

comment on function public.appels_offres_pieces_valides(jsonb) is
  'LOT 5b — la forme FERMÉE des pièces d''un appel d''offres. Nom et adresse obligatoires : un lien mort annoncé comme un dossier est pire qu''une absence.';

alter table public.appels_offres
  add column if not exists pieces jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appels_offres_pieces_chk') then
    alter table public.appels_offres
      add constraint appels_offres_pieces_chk
      check (public.appels_offres_pieces_valides(pieces));
  end if;
end $$;

-- La vue publique : `pieces` s'ajoute EN FIN de liste, ce qui autorise le
-- `create or replace` sans supprimer la vue — donc sans perdre ses droits.
-- `security_invoker = false` est REPOSÉ : `pg_get_viewdef` ne montre pas les
-- options `with`, et s'y fier ferait croire qu'elles survivent au replace.
create or replace view public.appels_offres_public
with (security_invoker = false) as
select
  a.id, a.site_id, s.slug as site_slug,
  a.reference, a.reference_slug, a.etat, a.objet, a.description,
  a.methode, a.methode_detail, a.valeur, a.devise,
  a.remise_le, a.questions_avant, a.ouverture_plis,
  a.criteres_elim, a.criteres_notes, a.soumission, a.allotissement,
  a.local_prix_dossier, a.local_caution, a.local_validite_jours,
  a.canal_officiel_url, a.document_url, a.cree_le,
  a.pieces
from public.appels_offres a
join public.sites_public s on s.id = a.site_id
where a.publie = true;

revoke all    on public.appels_offres_public from anon, authenticated;
grant  select on public.appels_offres_public to   anon, authenticated;

notify pgrst, 'reload schema';
