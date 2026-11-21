-- VÉRIFICATION de paiements_frais.sql — LECTURE, puis preuve de comportement.
-- Trois instructions, à lancer l'une après l'autre.
--
-- ① La colonne : attendu « frais | numeric | 12 | 2 | NO | 0 ».
select column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'app_paiements' and column_name = 'frais';

-- ② La fonction : attendu UNE SEULE ligne, finissant par « p_frais numeric DEFAULT 0 ».
--    Deux lignes = l'ancienne signature est restée : me le montrer.
select pg_get_function_arguments(p.oid) as arguments
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'enregistrer_paiement';

-- ③ Le comportement, en UNE instruction (l'éditeur SQL ne garde pas la
--    session), sur une appli livrée réelle. À la fin, une exception volontaire
--    ANNULE TOUT : aucune ligne n'est gardée au registre, aucun compteur ne
--    change. Résultat attendu : une erreur « VERIFICATION_OK : … ».
--    Toute autre erreur = un défaut, à me montrer telle quelle.
do $$
declare
  v_app uuid;
  v_owner uuid;
  v_frais numeric;
  v_refus int := 0;
begin
  select id, owner_id into v_app, v_owner from public.app_generations where statut = 'livree' order by id limit 1;
  if v_app is null then
    raise exception 'VERIFICATION_IMPOSSIBLE: aucune appli livrée';
  end if;

  -- Sans p_frais (le chemin de Stripe et des paiements manuels) : 0.
  perform public.enregistrer_paiement('manuelle', 'especes', 'VERIFICATION-FRAIS-1', v_app, v_owner, 'abonnement', 12000, 'XAF', null, 'verification');
  select frais into v_frais from public.app_paiements where fournisseur = 'especes' and reference = 'VERIFICATION-FRAIS-1';
  if v_frais is distinct from 0 then
    raise exception 'DEFAUT: sans p_frais, frais = % (attendu 0)', v_frais;
  end if;

  -- Avec p_frais (le chemin du mobile money) : 13 400 dont 1 400 de frais.
  perform public.enregistrer_paiement('automatique', 'monerails', 'VERIFICATION-FRAIS-2', v_app, v_owner, 'abonnement', 13400, 'XAF', null, 'verification', 1400);
  select frais into v_frais from public.app_paiements where fournisseur = 'monerails' and reference = 'VERIFICATION-FRAIS-2';
  if v_frais is distinct from 1400 then
    raise exception 'DEFAUT: frais = % (attendu 1400)', v_frais;
  end if;

  -- Frais négatifs, ou plus grands que le montant : refusés.
  begin
    perform public.enregistrer_paiement('automatique', 'monerails', 'VERIFICATION-FRAIS-3', v_app, v_owner, 'abonnement', 13400, 'XAF', null, 'verification', -1);
  exception when others then
    if sqlerrm like 'PAIEMENT_FRAIS%' then v_refus := v_refus + 1; else raise; end if;
  end;
  begin
    perform public.enregistrer_paiement('automatique', 'monerails', 'VERIFICATION-FRAIS-4', v_app, v_owner, 'abonnement', 13400, 'XAF', null, 'verification', 13401);
  exception when others then
    if sqlerrm like 'PAIEMENT_FRAIS%' then v_refus := v_refus + 1; else raise; end if;
  end;

  raise exception 'VERIFICATION_OK : sans p_frais → 0, avec p_frais → 1400, % refus sur 2 — rien n''est gardé', v_refus;
end $$;
