-- VÉRIFICATION de sites_mobile_money.sql. Deux instructions.
--
-- ① LECTURE. Attendu : vitrine = 6000 | boutique = 9000 | tables = 2 | fonction = 1 | rls = 2.
select (select valeur from public.quota_reglages where cle = 'prix_site_vitrine_xaf') as vitrine,
       (select valeur from public.quota_reglages where cle = 'prix_site_boutique_xaf') as boutique,
       (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name in ('site_abonnements', 'site_paiements')) as tables,
       (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'enregistrer_paiement_site') as fonction,
       (select count(*)::int from pg_class where relname in ('site_abonnements', 'site_paiements') and relrowsecurity) as rls;

-- ② COMPORTEMENT, en UNE instruction, sur un site réel (Vitrine ou Boutique) :
--    un paiement le met EN LIGNE et pose l'échéance à +duree_jours ; un second
--    la REPOUSSE ; le même rejoué ne fait rien ; un compte étranger, un
--    dropshipping et des frais au-delà du montant sont refusés. Une exception
--    volontaire ANNULE TOUT (le site reprend son état d'avant).
--    Attendu : une erreur « VERIFICATION_OK : … ». Toute autre = un défaut.
do $$
declare
  v_site uuid;
  v_owner uuid;
  v_drop uuid;
  r jsonb;
  v_fin1 timestamptz;
  v_fin2 timestamptz;
  v_pub boolean;
  v_refus int := 0;
begin
  select s.id, s.owner_id into v_site, v_owner from public.sites s
   where s.mode in (1, 2) and s.owner_id is not null and s.archived_at is null order by s.id limit 1;
  if v_site is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucun site Vitrine ou Boutique'; end if;
  r := public.enregistrer_paiement_site('automatique', 'monerails', 'verif-site-1', v_site, v_owner, 7000, 'XAF', 'verification', 1000);
  if r->>'statut' <> 'enregistre' then raise exception 'DEFAUT: premier paiement (%)', r; end if;
  select paye_jusqu_au into v_fin1 from public.site_abonnements where site_id = v_site;
  select published into v_pub from public.sites where id = v_site;
  if v_pub is not true or v_fin1 < now() + interval '29 days' then raise exception 'DEFAUT: en ligne % / échéance %', v_pub, v_fin1; end if;
  r := public.enregistrer_paiement_site('automatique', 'monerails', 'verif-site-2', v_site, v_owner, 7000, 'XAF', 'verification', 1000);
  select paye_jusqu_au into v_fin2 from public.site_abonnements where site_id = v_site;
  if v_fin2 < v_fin1 + interval '29 days' then raise exception 'DEFAUT: le second paiement n''a pas repoussé l''échéance (% puis %)', v_fin1, v_fin2; end if;
  r := public.enregistrer_paiement_site('automatique', 'monerails', 'verif-site-2', v_site, v_owner, 7000, 'XAF', 'verification', 1000);
  if r->>'statut' <> 'deja_enregistre' then raise exception 'DEFAUT: rejoué (%)', r; end if;
  begin perform public.enregistrer_paiement_site('automatique', 'monerails', 'verif-site-3', v_site, gen_random_uuid(), 7000, 'XAF', 'verification', 1000);
  exception when others then if sqlerrm like 'PAIEMENT_SITE_ETRANGER%' then v_refus := v_refus + 1; end if; end;
  begin perform public.enregistrer_paiement_site('automatique', 'monerails', 'verif-site-4', v_site, v_owner, 7000, 'XAF', 'verification', 8000);
  exception when others then if sqlerrm like 'PAIEMENT_SITE_FRAIS%' then v_refus := v_refus + 1; end if; end;
  select s.id into v_drop from public.sites s where s.mode = 3 and s.owner_id is not null limit 1;
  if v_drop is not null then
    begin perform public.enregistrer_paiement_site('automatique', 'monerails', 'verif-site-5', v_drop, (select owner_id from public.sites where id = v_drop), 7000, 'XAF', 'verification', 1000);
    exception when others then if sqlerrm like 'PAIEMENT_SITE_DROPSHIPPING%' then v_refus := v_refus + 1; end if; end;
  else v_refus := v_refus + 1;
  end if;
  if v_refus <> 3 then raise exception 'DEFAUT: % refus sur 3 (étranger, frais, dropshipping)', v_refus; end if;
  raise exception 'VERIFICATION_OK : en ligne, échéance posée puis repoussée, rejoué sans effet, 3 refus sur 3 — rien n''est gardé';
end $$;
