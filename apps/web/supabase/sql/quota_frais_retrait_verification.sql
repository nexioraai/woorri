-- VÉRIFICATION de quota_frais_retrait.sql. Deux instructions, l'une après l'autre.
--
-- ① LECTURE. Attendu : frais_retrait_pct | 4 | Youssouf | 1 (au moins une ligne d'historique).
select r.cle, r.valeur, r.modifie_par,
       (select count(*)::int from public.quota_reglages_historique h where h.cle = r.cle) as lignes_historique
  from public.quota_reglages r where r.cle = 'frais_retrait_pct';

-- ② COMPORTEMENT, en UNE instruction : chaque mauvaise valeur est REFUSÉE, une
--    bonne passe, puis une exception volontaire ANNULE TOUT.
--    Attendu : une erreur « VERIFICATION_OK : 4 refus sur 4 … ». Toute autre = un défaut.
do $$
declare
  v_refus int := 0;
  v text;
begin
  foreach v in array array['abc', '100', '-1', '4.555'] loop
    begin
      perform public.regler_quota('frais_retrait_pct', v, 'verification');
    exception when check_violation then
      v_refus := v_refus + 1;
    end;
  end loop;
  perform public.regler_quota('frais_retrait_pct', '4', 'verification');
  raise exception 'VERIFICATION_OK : % refus sur 4, une bonne valeur acceptée — rien n''est gardé', v_refus;
end $$;
