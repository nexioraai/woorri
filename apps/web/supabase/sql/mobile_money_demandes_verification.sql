-- VÉRIFICATION de mobile_money_demandes.sql. Deux instructions, l'une après l'autre.
--
-- ① LECTURE : la table, ses deux index uniques, la fonction.
--    Attendu : table_existe = true, index = 2, fonction = 1.
select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'mm_demandes') as table_existe,
       (select count(*)::int from pg_indexes where schemaname = 'public' and tablename = 'mm_demandes'
          and indexname in ('mm_demandes_une_ouverte', 'mm_demandes_reference')) as index,
       (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'mm_ouvrir_demande') as fonction;

-- ② LE COMPORTEMENT, en UNE instruction, sur une appli livrée réelle : une
--    demande s'ouvre, une SECONDE (autre numéro) est refusée, une demande
--    ancienne libère le verrou. Une exception volontaire ANNULE TOUT à la fin.
--    Attendu : une erreur « VERIFICATION_OK : … ». Toute autre = un défaut.
do $$
declare
  v_app uuid;
  v_owner uuid;
  r1 jsonb;
  r2 jsonb;
  r3 jsonb;
begin
  -- Une appli livrée SANS demande ouverte : sinon la première serait refusée à tort.
  select g.id, g.owner_id into v_app, v_owner from public.app_generations g
   where g.statut = 'livree'
     and not exists (select 1 from public.mm_demandes d where d.app_id = g.id and d.ferme_le is null)
   order by g.id limit 1;
  if v_app is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucune appli livrée'; end if;
  r1 := public.mm_ouvrir_demande('monerails', v_app, v_owner, 'AIRTEL', '235••••••01', 13400, 12000, 1400, 600);
  r2 := public.mm_ouvrir_demande('monerails', v_app, v_owner, 'MOOV', '235••••••02', 13100, 12000, 1100, 600);
  if r1->>'statut' <> 'ouverte' or r2->>'statut' <> 'deja_ouverte' then
    raise exception 'DEFAUT: première %, seconde % (attendu ouverte puis deja_ouverte)', r1->>'statut', r2->>'statut';
  end if;
  update public.mm_demandes set cree_le = now() - interval '11 minutes' where id = (r1->>'id')::uuid;
  r3 := public.mm_ouvrir_demande('monerails', v_app, v_owner, 'MOOV', '235••••••02', 13100, 12000, 1100, 600);
  if r3->>'statut' <> 'ouverte' then raise exception 'DEFAUT: la demande ancienne bloque encore (%)', r3->>'statut'; end if;
  raise exception 'VERIFICATION_OK : une ouverte, la seconde refusée, l''ancienne libère le verrou — rien n''est gardé';
end $$;
