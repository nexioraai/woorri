-- ============================================================================
-- LOT 5c — UN AVIS ATTRIBUÉ DIT QUI A GAGNÉ
--
-- LE DÉFAUT, MESURÉ. `etat` accepte 'attribue', et l'écran affiche
-- « Attribué ». Rien d'autre : ni l'attributaire, ni le montant, ni la date.
-- Or c'est EXACTEMENT ce qu'un portail d'achats publics existe pour publier.
-- Annoncer qu'un marché est attribué sans dire à qui, c'est de l'opacité
-- avec l'apparence de la transparence.
--
-- LES TROIS CHAMPS SONT FACULTATIFS, ET C'EST VOULU. Une centrale peut
-- publier l'attributaire sans le montant — certaines règles l'imposent,
-- d'autres l'interdisent. Les rendre obligatoires empêcherait de publier
-- l'information qu'on A le droit de donner.
--
-- MAIS ILS NE PEUVENT PAS EXISTER SANS ATTRIBUTION. Un attributaire sur un
-- avis « ouvert » annoncerait un résultat avant l'ouverture des plis : la
-- contrainte le refuse, et c'est la base qui le refuse, pas une convention.
-- ============================================================================

alter table public.appels_offres
  add column if not exists attributaire       text,
  add column if not exists montant_attribue   numeric,
  add column if not exists attribue_le        date;

do $$
begin
  -- Les bornes de forme : un attributaire vide vaut absent, pas « inconnu ».
  if not exists (select 1 from pg_constraint where conname = 'appels_offres_attributaire_chk') then
    alter table public.appels_offres
      add constraint appels_offres_attributaire_chk
      check (attributaire is null or length(btrim(attributaire)) between 1 and 300);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appels_offres_montant_attribue_chk') then
    alter table public.appels_offres
      add constraint appels_offres_montant_attribue_chk
      check (montant_attribue is null or montant_attribue >= 0);
  end if;

  -- L'INVARIANT QUI COMPTE : aucun résultat avant l'attribution.
  if not exists (select 1 from pg_constraint where conname = 'appels_offres_attribution_chk') then
    alter table public.appels_offres
      add constraint appels_offres_attribution_chk
      check (
        etat = 'attribue'
        or (attributaire is null and montant_attribue is null and attribue_le is null)
      );
  end if;
end $$;

-- La vue publique : les trois colonnes s'ajoutent EN FIN de liste, ce qui
-- autorise le `create or replace` sans supprimer la vue — donc sans perdre
-- ses droits. `security_invoker = false` est REPOSÉ : `pg_get_viewdef` ne
-- montre pas les options `with`, et s'y fier ferait croire qu'elles survivent.
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
  a.pieces,
  a.attributaire, a.montant_attribue, a.attribue_le
from public.appels_offres a
join public.sites_public s on s.id = a.site_id
where a.publie = true;

revoke all    on public.appels_offres_public from anon, authenticated;
grant  select on public.appels_offres_public to   anon, authenticated;

notify pgrst, 'reload schema';
