-- VÉRIFICATION de mobile_money_telephone_masque.sql. Deux instructions.
--
-- ① LECTURE. Attendu : la définition contient « •{4,} », et 0 ligne non masquée.
select pg_get_constraintdef(c.oid) as definition,
       (select count(*)::int from public.mm_demandes where telephone_masque !~ '^[0-9]{0,3}•{4,}[0-9]{0,2}$') as non_masquees
  from pg_constraint c
 where c.conrelid = 'public.mm_demandes'::regclass and c.conname = 'mm_demandes_telephone_masque_check';

-- ② COMPORTEMENT, en UNE instruction : un numéro en clair est REFUSÉ, un
--    numéro masqué passe, puis une exception volontaire ANNULE TOUT.
--    Attendu : une erreur « VERIFICATION_OK : 3 refus sur 3 … ». Toute autre = un défaut.
do $$
declare
  v_app uuid;
  v_owner uuid;
  v_refus int := 0;
  v text;
begin
  select g.id, g.owner_id into v_app, v_owner from public.app_generations g
   where g.statut = 'livree'
     and not exists (select 1 from public.mm_demandes d where d.app_id = g.id and d.ferme_le is null)
   order by g.id limit 1;
  if v_app is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucune appli livrée sans demande ouverte'; end if;
  foreach v in array array['23566000001', '235•6600000', '66000001'] loop
    begin
      insert into public.mm_demandes (fournisseur, app_id, owner_id, operateur, telephone_masque, montant, prix, frais, ferme_le)
      values ('monerails', v_app, v_owner, 'AIRTEL', v, 14000, 12000, 2000, now());
    exception when check_violation then
      v_refus := v_refus + 1;
    end;
  end loop;
  insert into public.mm_demandes (fournisseur, app_id, owner_id, operateur, telephone_masque, montant, prix, frais, ferme_le)
  values ('monerails', v_app, v_owner, 'AIRTEL', '235••••••01', 14000, 12000, 2000, now());
  raise exception 'VERIFICATION_OK : % refus sur 3, le numéro masqué accepté — rien n''est gardé', v_refus;
end $$;
