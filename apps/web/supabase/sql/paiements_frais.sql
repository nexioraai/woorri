-- LA PART « FRAIS » DE CHAQUE PAIEMENT (2026-11-21).
--
-- Décision du propriétaire : le registre dit, pour chaque paiement, la part
-- abonnement et la part frais. Un paiement mobile money de 13 400 FCFA (Airtel)
-- = 12 000 d'abonnement + 1 400 de frais du prestataire, payés par le client.
--
--   app_paiements.frais    numeric(12,2), 0 PAR DÉFAUT, de 0 au montant.
--                          Les lignes déjà là prennent 0 (aucune n'est
--                          réécrite : le registre reste en ajout seul).
--   enregistrer_paiement   un 11e argument `p_frais`, 0 par défaut. Stripe,
--                          les paiements manuels et « offert » ne le passent
--                          pas : rien ne change pour eux. Le reste de la
--                          fonction est celui de quota_lot_xaf.sql, à
--                          l'identique.
--
-- La signature à 10 arguments est RETIRÉE : deux versions côte à côte
-- rendraient un appel par noms ambigu.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, APRÈS
-- quota_lot_xaf.sql. Vérification : paiements_frais_verification.sql.
-- Annulation : paiements_frais_annulation.sql (refusée si une ligne porte des
-- frais — ils seraient perdus).

begin;

alter table public.app_paiements add column if not exists frais numeric(12,2) not null default 0;
alter table public.app_paiements drop constraint if exists app_paiements_frais_check;
alter table public.app_paiements add constraint app_paiements_frais_check check (frais >= 0 and frais <= montant);

drop function if exists public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text);

create or replace function public.enregistrer_paiement(
  p_source text, p_fournisseur text, p_reference text,
  p_app uuid, p_owner uuid, p_objet text,
  p_montant numeric, p_devise text, p_jusqu_au timestamptz, p_saisi_par text,
  p_frais numeric default 0)
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
  -- La part FRAIS du montant (2026-11-21) : 0 quand rien n'est dit (Stripe,
  -- espèces, offert) ; jamais négative, jamais plus que le montant.
  if p_frais is null or p_frais < 0 or p_frais > p_montant then
    raise exception 'PAIEMENT_FRAIS: % pour un montant de % (attendu : de 0 au montant)', p_frais, p_montant;
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
  insert into public.app_paiements (owner_id, app_id, source, fournisseur, reference, objet, montant, devise, jusqu_au, saisi_par, frais)
  values (p_owner, p_app, p_source, p_fournisseur, p_reference, p_objet, p_montant, p_devise, v_fin, p_saisi_par, p_frais)
  on conflict (fournisseur, reference) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'PAIEMENT_CONCURRENT: la même référence vient d''être enregistrée';
  end if;
  return jsonb_build_object('statut', 'enregistre', 'app_id', p_app, 'jusqu_au', v_fin);
end $$;

revoke all on function public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text, numeric) from public, anon, authenticated;
grant execute on function public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text, numeric) to service_role;

-- PostgREST relit les signatures (sinon l'ancienne reste en cache).
notify pgrst, 'reload schema';

commit;
