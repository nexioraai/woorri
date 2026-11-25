-- VÉRIFICATION de mobile_money_remboursement_lot.sql. Deux instructions.
--
-- ① LECTURE. Attendu : accepte_le_lot = true.
select pg_get_functiondef(p.oid) like '%objet in (''abonnement'', ''lot'')%' as accepte_le_lot
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'annuler_paiement_mobile_money';

-- ② COMPORTEMENT, en UNE instruction, sur une appli livrée réelle : elle est
--    abonnée, un LOT est payé puis remboursé — le lot est retiré du compteur,
--    l'échéance et la publication ne bougent pas, la ligne « annulation » pointe
--    le lot ; redemandé : « déjà annulé ». Une exception volontaire ANNULE TOUT.
--    Attendu : une erreur « VERIFICATION_OK : … ». Toute autre = un défaut.
do $$
declare
  v_app uuid;
  v_owner uuid;
  r jsonb;
  v_avant record;
  v_apres record;
  v_jeton_avant text;
  v_jeton_apres text;
  v_ligne public.app_paiements%rowtype;
begin
  select g.id, g.owner_id into v_app, v_owner from public.app_generations g where g.statut = 'livree' order by g.id limit 1;
  if v_app is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucune appli livrée'; end if;
  r := public.enregistrer_paiement('automatique', 'monerails', 'verif-abonnement', v_app, v_owner, 'abonnement', 14000, 'XAF', null, 'monerails', 2000);
  r := public.enregistrer_paiement('automatique', 'monerails', 'verif-lot', v_app, v_owner, 'lot', 3500, 'XAF', null, 'monerails', 500);
  if r->>'statut' <> 'enregistre' then raise exception 'DEFAUT: lot non inscrit (%)', r; end if;
  select supplement, paye_jusqu_au into v_avant from public.app_compteurs where app_id = v_app;
  select publication_jeton into v_jeton_avant from public.app_generations where id = v_app;

  r := public.annuler_paiement_mobile_money('monerails', 'verif-lot', 'po_verification_lot', 3500, 'Youssouf');
  if r->>'statut' <> 'annule' or r->>'objet' <> 'lot' or (r->>'derniere')::boolean then raise exception 'DEFAUT: remboursement du lot (%)', r; end if;
  select supplement, paye_jusqu_au into v_apres from public.app_compteurs where app_id = v_app;
  select publication_jeton into v_jeton_apres from public.app_generations where id = v_app;
  if v_apres.supplement <> greatest(0, v_avant.supplement - public.quota_reglage_entier('lot_taille')) then
    raise exception 'DEFAUT: lot non retiré (% → %)', v_avant.supplement, v_apres.supplement;
  end if;
  if v_apres.paye_jusqu_au is distinct from v_avant.paye_jusqu_au then raise exception 'DEFAUT: l''échéance a bougé'; end if;
  if v_jeton_apres is distinct from v_jeton_avant then raise exception 'DEFAUT: la publication a bougé'; end if;
  select * into v_ligne from public.app_paiements where fournisseur = 'monerails' and reference = 'annulation:verif-lot';
  if v_ligne.objet <> 'annulation' or v_ligne.annule is null then raise exception 'DEFAUT: ligne annulation'; end if;
  r := public.annuler_paiement_mobile_money('monerails', 'verif-lot', 'po_verification_lot', 3500, 'Youssouf');
  if r->>'statut' <> 'deja_annule' then raise exception 'DEFAUT: second remboursement (%)', r; end if;
  raise exception 'VERIFICATION_OK : lot remboursé — retiré du compteur, échéance et publication intactes, pas de double — rien n''est gardé';
end $$;
