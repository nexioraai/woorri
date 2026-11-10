-- ============================================================================
-- LOT 16 bis — LA PORTÉE D'UN AVIS DEVIENT VISIBLE DU PUBLIC.
--
-- Trouvé le 2026-11-10 en limitant l'assistant : `appels_offres.portee`
-- (national · international · tous) existait depuis le lot 13.1, la
-- Centrale pouvait la choisir — et la VUE PUBLIQUE ne la portait pas. Ni la
-- fiche de l'avis, ni l'assistant ne pouvaient dire à un fournisseur s'il
-- avait le droit de répondre.
--
-- LA VUE EST RECRÉÉE À L'IDENTIQUE, PLUS UNE COLONNE EN FIN. Définition de
-- départ : `appels_offres_attribution.sql`, VÉRIFIÉE contre la vue en ligne
-- le 2026-11-10 colonne par colonne (29/29, seules `publie` et `portee`
-- absentes). PostgreSQL accepte d'ajouter une colonne en fin de vue sans
-- toucher aux autres.
-- ============================================================================

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
  a.attributaire, a.montant_attribue, a.attribue_le,
  a.portee
from public.appels_offres a
join public.sites_public s on s.id = a.site_id
where a.publie = true;

revoke all    on public.appels_offres_public from anon, authenticated;
grant  select on public.appels_offres_public to   anon, authenticated;

notify pgrst, 'reload schema';

select count(*) as colonnes,
       bool_or(column_name = 'portee') as portee_visible,
       bool_or(column_name = 'publie') as publie_cache_toujours
from information_schema.columns
where table_schema = 'public' and table_name = 'appels_offres_public';
