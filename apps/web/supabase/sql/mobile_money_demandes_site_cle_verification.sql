-- VÉRIFICATION de mobile_money_demandes_site_cle.sql. Deux instructions.
--
-- ① LECTURE. Attendu : cle = 1 | orphelines = 0.
select (select count(*)::int from pg_constraint where conrelid = 'public.mm_demandes'::regclass and conname = 'mm_demandes_site_id_fkey' and contype = 'f') as cle,
       (select count(*)::int from public.mm_demandes d where d.site_id is not null and not exists (select 1 from public.sites s where s.id = d.site_id)) as orphelines;

-- ② COMPORTEMENT, en UNE instruction : une demande vers un site inexistant
--    est refusée ; vers un site réel, elle passe. Une exception volontaire
--    ANNULE TOUT. Attendu : une erreur « VERIFICATION_OK : … ».
do $$
declare
  v_site uuid;
  v_owner uuid;
  v_refus boolean := false;
begin
  select s.id, s.owner_id into v_site, v_owner from public.sites s
   where s.mode in (1, 2) and s.owner_id is not null
     and not exists (select 1 from public.mm_demandes d where d.site_id = s.id and d.ferme_le is null)
   order by s.id limit 1;
  if v_site is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucun site Vitrine ou Boutique'; end if;
  begin
    insert into public.mm_demandes (fournisseur, site_id, owner_id, operateur, telephone_masque, montant, prix, frais, ferme_le)
    values ('monerails', gen_random_uuid(), v_owner, 'AIRTEL', '235••••••01', 7000, 6000, 1000, now());
  exception when foreign_key_violation then v_refus := true;
  end;
  if not v_refus then raise exception 'DEFAUT: une demande vers un site inexistant est acceptée'; end if;
  insert into public.mm_demandes (fournisseur, site_id, owner_id, operateur, telephone_masque, montant, prix, frais, ferme_le)
  values ('monerails', v_site, v_owner, 'AIRTEL', '235••••••01', 7000, 6000, 1000, now());
  raise exception 'VERIFICATION_OK : site inexistant refusé, site réel accepté — rien n''est gardé';
end $$;
