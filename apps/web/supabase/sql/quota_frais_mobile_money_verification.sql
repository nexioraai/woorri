-- VÉRIFICATION de quota_frais_mobile_money.sql (+ _valeurs.sql), LECTURE et
-- preuve de comportement. Deux instructions, à lancer l'une après l'autre.
--
-- ① Ce qui est en base : les quatre réglages, et leur historique signé.
--    Attendu après _valeurs.sql : 7 · 5 · 3.5 · 100, chacun « Youssouf ».
select r.cle, r.valeur, r.modifie_par, r.modifie_le,
       (select count(*) from public.quota_reglages_historique h where h.cle = r.cle) as lignes_historique
  from public.quota_reglages r
 where r.cle in ('frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct', 'frais_reversement_pct', 'arrondi_frais_xaf')
 order by r.cle;

-- ② Le comportement, en UNE instruction (l'éditeur SQL ne garde pas la
--    session) : chaque mauvaise valeur doit être REFUSÉE ; à la fin, une
--    exception volontaire ANNULE tout (aucune ligne d'historique n'en reste).
--    Résultat attendu : une erreur « VERIFICATION_OK : 9 refus sur 9, … ».
--    Toute autre erreur = un défaut, à me montrer telle quelle.
do $$
declare
  v_refus int := 0;
  v_cas text[][] := array[
    array['frais_encaissement_airtel_pct', 'abc'],
    array['frais_encaissement_airtel_pct', '100'],
    array['frais_encaissement_moov_pct', '-1'],
    array['frais_encaissement_moov_pct', '3,5'],
    array['frais_reversement_pct', '3.555'],
    array['frais_reversement_pct', '7%'],
    array['arrondi_frais_xaf', '0'],
    array['arrondi_frais_xaf', '10001'],
    array['arrondi_frais_xaf', '1.5']];
  i int;
begin
  for i in 1 .. array_length(v_cas, 1) loop
    begin
      perform public.regler_quota(v_cas[i][1], v_cas[i][2], 'verification');
    exception when check_violation then
      v_refus := v_refus + 1;
    end;
  end loop;
  -- Et une bonne valeur passe (puis tout est annulé ci-dessous).
  perform public.regler_quota('frais_reversement_pct', '3.5', 'verification');
  raise exception 'VERIFICATION_OK : % refus sur 9, une bonne valeur acceptée — rien n''est gardé', v_refus;
end $$;
