-- Vérification de boite_noire.sql. Doit finir par une ERREUR qui commence par
-- « VERIFICATION_OK » : c'est voulu, l'erreur annule tout, rien n'est gardé.
do $$
declare v_id uuid; v_n integer; v_refus boolean := false;
begin
  insert into public.app_boite_noire (nature, issue, debut_le, fin_le, etapes, taille_octets, garder_jusqu_au)
  values ('generation', 'livree', now(), now(), '[{"n":1}]', 10, now() - interval '1 day') returning id into v_id;
  begin
    update public.app_boite_noire set issue = 'x' where id = v_id;
  exception when others then v_refus := true;
  end;
  if not v_refus then raise exception 'ECHEC : une mise à jour a été acceptée'; end if;
  v_n := public.purger_boite_noire();
  if v_n < 1 or exists (select 1 from public.app_boite_noire where id = v_id) then raise exception 'ECHEC : la purge n’a pas effacé la ligne expirée'; end if;
  if has_table_privilege('anon', 'public.app_boite_noire', 'select') or has_table_privilege('authenticated', 'public.app_boite_noire', 'select') then
    raise exception 'ECHEC : anon ou authenticated peut lire';
  end if;
  raise exception 'VERIFICATION_OK : ajout seul, purge des lignes expirées, aucune lecture hors service — rien n’est gardé';
end $$;
