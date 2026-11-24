-- VÉRIFICATION de mobile_money_remboursement.sql. Deux instructions.
--
-- ① LECTURE. Attendu : fonction = 1 | colonnes = 3 | etat_remboursee = true.
select (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'annuler_paiement_mobile_money') as fonction,
       (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'mm_demandes'
         and column_name in ('paiement_sortant', 'rembourse_par', 'rembourse_le')) as colonnes,
       (select pg_get_constraintdef(oid) like '%remboursee%' from pg_constraint
         where conrelid = 'public.mm_demandes'::regclass and conname = 'mm_demandes_etat_check') as etat_remboursee;

-- ② COMPORTEMENT, en UNE instruction, sur une appli livrée réelle : un paiement
--    mobile money est inscrit, puis remboursé — la ligne « annulation » pointe
--    le paiement, l'échéance passe à maintenant, l'appli est dépubliée ; le même
--    remboursement redemandé ne fait rien ; un paiement inconnu non plus ; un
--    montant trop haut est refusé. Une exception volontaire ANNULE TOUT.
--    Attendu : une erreur « VERIFICATION_OK : … ». Toute autre = un défaut.
do $$
declare
  v_app uuid;
  v_owner uuid;
  r jsonb;
  v_ligne public.app_paiements%rowtype;
  v_fin timestamptz;
  v_jeton text;
  v_refus boolean := false;
begin
  select g.id, g.owner_id into v_app, v_owner from public.app_generations g
   where g.statut = 'livree' order by g.id limit 1;
  if v_app is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucune appli livrée'; end if;
  update public.app_generations set publication_jeton = coalesce(publication_jeton, 'verification') where id = v_app;

  r := public.enregistrer_paiement('automatique', 'monerails', 'verif-encaissement', v_app, v_owner, 'abonnement',
                                   14000, 'XAF', null, 'monerails', 2000);
  if r->>'statut' <> 'enregistre' then raise exception 'DEFAUT: paiement non inscrit (%)', r; end if;

  r := public.annuler_paiement_mobile_money('monerails', 'verif-encaissement', 'po_verification', 14000, 'Youssouf');
  if r->>'statut' <> 'annule' or (r->>'derniere')::boolean is not true then raise exception 'DEFAUT: remboursement (%)', r; end if;
  select * into v_ligne from public.app_paiements where fournisseur = 'monerails' and reference = 'annulation:verif-encaissement';
  if v_ligne.objet <> 'annulation' or v_ligne.annule is null or v_ligne.saisi_par not like '%po_verification%' then
    raise exception 'DEFAUT: la ligne annulation (%, %, %)', v_ligne.objet, v_ligne.annule, v_ligne.saisi_par;
  end if;
  select paye_jusqu_au into v_fin from public.app_compteurs where app_id = v_app;
  select publication_jeton into v_jeton from public.app_generations where id = v_app;
  if v_fin > now() or v_jeton is not null then raise exception 'DEFAUT: service non coupé (fin %, jeton %)', v_fin, v_jeton; end if;

  r := public.annuler_paiement_mobile_money('monerails', 'verif-encaissement', 'po_verification', 14000, 'Youssouf');
  if r->>'statut' <> 'deja_annule' then raise exception 'DEFAUT: second remboursement (%)', r; end if;
  r := public.annuler_paiement_mobile_money('monerails', 'verif-inconnu', 'po_verification', 14000, 'Youssouf');
  if r->>'statut' <> 'paiement_inconnu' then raise exception 'DEFAUT: paiement inconnu (%)', r; end if;
  begin
    perform public.annuler_paiement_mobile_money('monerails', 'verif-encaissement', 'po_verification', 99999, 'Youssouf');
  exception when others then v_refus := sqlerrm like 'REMBOURSEMENT_MONTANT%';
  end;
  if not v_refus then raise exception 'DEFAUT: un montant trop haut est passé'; end if;
  raise exception 'VERIFICATION_OK : remboursé, échéance à maintenant, appli dépubliée, pas de double, inconnu sans effet — rien n''est gardé';
end $$;
