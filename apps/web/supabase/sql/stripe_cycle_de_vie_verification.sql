-- VÉRIFICATION de stripe_cycle_de_vie.sql — à lancer APRÈS lui, seule.
--
-- UNE instruction (l'éditeur SQL ne garde pas la session). Elle joue le
-- remboursement total d'une facture d'essai sur une appli PUBLIÉE réelle, puis
-- une exception volontaire ANNULE TOUT : aucune ligne n'est gardée au
-- registre, l'appli reste publiée, son compteur ne bouge pas.
-- Résultat attendu : une erreur « VERIFICATION_OK : … ».
-- Toute autre erreur = un défaut, à me montrer telle quelle.
do $$
declare
  v_app uuid;
  v_owner uuid;
  v_r jsonb;
  v_r2 jsonb;
  v_jeton text;
  v_fin timestamptz;
  v_lignes int;
begin
  select id, owner_id into v_app, v_owner from public.app_generations
   where statut = 'livree' and publication_jeton is not null order by id limit 1;
  if v_app is null then
    raise exception 'VERIFICATION_IMPOSSIBLE: aucune appli publiée';
  end if;

  -- Une facture d'essai payée par carte, qui porte la fin de période la plus lointaine.
  perform public.enregistrer_paiement('automatique', 'stripe', 'VERIFICATION-in_cycle', v_app, v_owner, 'abonnement',
    20, 'USD', now() + interval '400 days', 'verification');

  v_r := public.annuler_paiement_stripe('VERIFICATION-in_cycle', 'remboursement', 20);
  select publication_jeton into v_jeton from public.app_generations where id = v_app;
  select paye_jusqu_au into v_fin from public.app_compteurs where app_id = v_app;
  select count(*) into v_lignes from public.app_paiements where reference = 'annulation:VERIFICATION-in_cycle' and objet = 'annulation';
  v_r2 := public.annuler_paiement_stripe('VERIFICATION-in_cycle', 'litige', 20);

  if v_r->>'statut' <> 'annule' or (v_r->>'derniere')::boolean is not true then raise exception 'DEFAUT: premier appel %', v_r; end if;
  if v_jeton is not null then raise exception 'DEFAUT: appli toujours publiée'; end if;
  if v_fin > now() then raise exception 'DEFAUT: période payée non ramenée (%)', v_fin; end if;
  if v_lignes <> 1 then raise exception 'DEFAUT: % ligne(s) d''annulation', v_lignes; end if;
  if v_r2->>'statut' <> 'deja_annule' then raise exception 'DEFAUT: second appel %', v_r2; end if;
  if (public.annuler_paiement_stripe('VERIFICATION-inconnue', 'remboursement', 1))->>'statut' <> 'paiement_inconnu' then
    raise exception 'DEFAUT: facture inconnue mal dite';
  end if;

  raise exception 'VERIFICATION_OK : annulée, dépubliée, période ramenée, 1 ligne, doublon refusé, facture inconnue dite — rien n''est gardé';
end $$;
