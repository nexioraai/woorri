-- ALLUMER LE MODULE ACTUALITÉS SUR LA CPA (2026-11-26).
--
-- Le module du moteur s'allume quand un site DÉCLARE la page `actualites`
-- (src/app/sites/[slug]/pages/actualites.ts). Ce fichier, et lui seul, le
-- fait pour la CPA :
--   ① déclare la page `actualites` (titre « Actualités »), publiée, DANS LE
--      MENU, rangée en dernier des entrées déclarées (Contact reste après) ;
--   ② range Agenda et Communiqués SOUS elle, dans le menu (sous-menu).
-- Rien d'autre ne change : aucun article, aucun texte existant.
--
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS le déploiement du
-- code du module (sinon la page s'afficherait vide de liste). Idempotent.
-- Vérification : cpa_actualites_verification.sql. Annulation :
-- cpa_actualites_annulation.sql.

begin;

do $$
declare
  v_site uuid;
  v_n int;
begin
  select count(*) into v_n from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814';
  if v_n <> 1 then raise exception 'CPA_INTROUVABLE: % site(s) pour ce slug', v_n; end if;
  select id into v_site from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814';

  insert into public.site_pages (site_id, chemin, parent, titre, chapeau, ordre, menu, publie)
  values (v_site, 'actualites', null, 'Actualités',
          'Les communiqués, l’agenda et les articles de la Centrale.',
          coalesce((select max(ordre) from public.site_pages where site_id = v_site and parent is null and menu), 0) + 1,
          true, true)
  on conflict (site_id, chemin) do nothing;

  update public.site_pages
     set parent = 'actualites', menu = true, maj_le = now()
   where site_id = v_site and chemin in ('actualites/communiques', 'actualites/evenements');
end $$;

commit;
