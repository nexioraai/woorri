-- VÉRIFICATION de mobile_money_demandes_sites.sql. Deux instructions.
--
-- ① LECTURE. Attendu : site_id = true | app_id_facultatif = true | une_cible = true | verrou_site = true | fonction = 1.
select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mm_demandes' and column_name = 'site_id') as site_id,
       (select is_nullable = 'YES' from information_schema.columns where table_schema = 'public' and table_name = 'mm_demandes' and column_name = 'app_id') as app_id_facultatif,
       exists (select 1 from pg_constraint where conrelid = 'public.mm_demandes'::regclass and conname = 'mm_demandes_une_cible') as une_cible,
       exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'mm_demandes_une_ouverte_site') as verrou_site,
       (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'mm_ouvrir_demande_site') as fonction;

-- ② COMPORTEMENT, en UNE instruction, sur un site réel (Vitrine ou Boutique) :
--    une demande s'ouvre, la seconde est refusée (verrou), une demande sans
--    cible ou avec deux cibles est refusée. Une exception volontaire ANNULE TOUT.
--    Attendu : une erreur « VERIFICATION_OK : … ». Toute autre = un défaut.
do $$
declare
  v_site uuid;
  v_owner uuid;
  r jsonb;
  v_refus int := 0;
begin
  select s.id, s.owner_id into v_site, v_owner from public.sites s
   where s.mode in (1, 2) and s.owner_id is not null
     and not exists (select 1 from public.mm_demandes d where d.site_id = s.id and d.ferme_le is null)
   order by s.id limit 1;
  if v_site is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucun site Vitrine ou Boutique'; end if;
  r := public.mm_ouvrir_demande_site('monerails', v_site, v_owner, 'AIRTEL', '235••••••01', 7000, 6000, 1000, 600);
  if r->>'statut' <> 'ouverte' then raise exception 'DEFAUT: première demande (%)', r; end if;
  r := public.mm_ouvrir_demande_site('monerails', v_site, v_owner, 'MOOV', '235••••••02', 7000, 6000, 1000, 600);
  if r->>'statut' <> 'deja_ouverte' then raise exception 'DEFAUT: le verrou du site n''a pas tenu (%)', r; end if;
  begin
    insert into public.mm_demandes (fournisseur, owner_id, operateur, telephone_masque, montant, prix, frais, ferme_le)
    values ('monerails', v_owner, 'AIRTEL', '235••••••01', 7000, 6000, 1000, now());
  exception when check_violation then v_refus := v_refus + 1;
  end;
  begin
    insert into public.mm_demandes (fournisseur, app_id, site_id, owner_id, operateur, telephone_masque, montant, prix, frais, ferme_le)
    values ('monerails', gen_random_uuid(), v_site, v_owner, 'AIRTEL', '235••••••01', 7000, 6000, 1000, now());
  exception when check_violation then v_refus := v_refus + 1;
  end;
  if v_refus <> 2 then raise exception 'DEFAUT: % refus sur 2 (sans cible, deux cibles)', v_refus; end if;
  raise exception 'VERIFICATION_OK : demande de site ouverte, la seconde refusée, 2 refus sur 2 — rien n''est gardé';
end $$;
