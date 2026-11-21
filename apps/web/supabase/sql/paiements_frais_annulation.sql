-- ANNULATION de paiements_frais.sql : la fonction redevient celle de
-- quota_lot_xaf.sql (10 arguments), la colonne `frais` est retirée.
--
-- REFUSÉE si une ligne du registre porte des frais : les retirer effacerait
-- une information réelle (le registre est en ajout seul). L'annulation ne
-- s'exécute alors pas du tout — rien n'est changé.
begin;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'app_paiements' and column_name = 'frais')
     and exists (select 1 from public.app_paiements where frais <> 0) then
    raise exception 'ANNULATION_REFUSEE: des paiements portent des frais — les retirer les effacerait';
  end if;
end $$;

drop function if exists public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text, numeric);

create or replace function public.enregistrer_paiement(
  p_source text, p_fournisseur text, p_reference text,
  p_app uuid, p_owner uuid, p_objet text,
  p_montant numeric, p_devise text, p_jusqu_au timestamptz, p_saisi_par text)
returns jsonb language plpgsql set search_path = public as $$
declare
  v_existant public.app_paiements%rowtype;
  v_compteur public.app_compteurs%rowtype;
  v_fin timestamptz;
  v_id uuid;
begin
  if not exists (select 1 from public.app_generations where id = p_app and owner_id = p_owner) then
    raise exception 'PAIEMENT_APPLI_ETRANGERE: cette appli n''appartient pas à ce compte';
  end if;
  if p_objet not in ('abonnement', 'lot') then
    raise exception 'PAIEMENT_OBJET: % (une annulation n''active rien)', p_objet;
  end if;

  -- LE VERROU D'ABORD. Deux webhooks simultanés pour la même facture se
  -- suivent ici : le second attend, puis trouve la ligne du premier.
  insert into public.app_compteurs (app_id, owner_id, statut, limite)
  values (p_app, p_owner, 'gratuite', public.quota_reglage_entier('modifications_gratuites'))
  on conflict (app_id) do nothing;
  select * into v_compteur from public.app_compteurs where app_id = p_app for update;

  -- La même référence, déjà là : on ne fait rien, et on dit pour QUELLE appli.
  select * into v_existant from public.app_paiements where fournisseur = p_fournisseur and reference = p_reference;
  if found then
    return jsonb_build_object('statut', 'deja_enregistre', 'app_id', v_existant.app_id, 'jusqu_au', v_existant.jusqu_au);
  end if;

  -- Un paiement en FCFA suppose SON prix réglé : le mois pour un abonnement,
  -- le lot pour un lot (2026-11-20). Vide, on refuse — jamais zéro.
  if p_devise = 'XAF' and p_fournisseur <> 'offert' then
    perform public.quota_reglage_entier(case when p_objet = 'lot' then 'lot_prix_xaf' else 'prix_mensuel_xaf' end);
  end if;

  if p_objet = 'abonnement' then
    v_fin := coalesce(p_jusqu_au,
      greatest(now(), coalesce(v_compteur.paye_jusqu_au, now()))
        + make_interval(days => public.quota_reglage_entier('duree_jours')));
    update public.app_compteurs
       set statut = 'abonnee', paye_jusqu_au = greatest(coalesce(paye_jusqu_au, v_fin), v_fin),
           periode_debut = now(), limite = public.quota_reglage_entier('modifications_incluses'),
           supplement = 0, utilisees = 0
     where app_id = p_app;
  else
    if v_compteur.statut <> 'abonnee' or v_compteur.paye_jusqu_au <= now() then
      raise exception 'PAIEMENT_LOT_SANS_ABONNEMENT: un lot s''ajoute à un abonnement en cours';
    end if;
    v_fin := v_compteur.paye_jusqu_au;
    update public.app_compteurs
       set supplement = supplement + public.quota_reglage_entier('lot_taille')
     where app_id = p_app;
  end if;

  -- Dernier rempart : la même référence pour DEUX applis différentes (deux
  -- verrous distincts) — la contrainte d'unicité refuse la seconde.
  insert into public.app_paiements (owner_id, app_id, source, fournisseur, reference, objet, montant, devise, jusqu_au, saisi_par)
  values (p_owner, p_app, p_source, p_fournisseur, p_reference, p_objet, p_montant, p_devise, v_fin, p_saisi_par)
  on conflict (fournisseur, reference) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'PAIEMENT_CONCURRENT: la même référence vient d''être enregistrée';
  end if;
  return jsonb_build_object('statut', 'enregistre', 'app_id', p_app, 'jusqu_au', v_fin);
end $$;

revoke all on function public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text) to service_role;

alter table public.app_paiements drop constraint if exists app_paiements_frais_check;
alter table public.app_paiements drop column if exists frais;

notify pgrst, 'reload schema';

commit;
