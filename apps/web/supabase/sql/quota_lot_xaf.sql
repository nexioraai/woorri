-- LE PRIX DU LOT EN FCFA (2026-11-20).
--
-- Décision du propriétaire : abonnement d'un mois 12 000 FCFA, lot de 50
-- modifications 3 000 FCFA. Le réglage du lot en FCFA n'existait pas
-- (seulement `lot_prix_usd`) : ce fichier l'ajoute, VIDE — le propriétaire le
-- règle ensuite, à son nom, par `regler_quota` (historisé).
--
-- Et un paiement de LOT en FCFA vérifie désormais le prix du LOT (il vérifiait
-- le prix mensuel). Rien d'autre ne change dans les deux fonctions.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, après
-- quota_modifications.sql. Annulation : quota_lot_xaf_annulation.sql.

begin;

-- GARDE (2026-11-21). Ce fichier recrée enregistrer_paiement à 10 arguments.
-- Rejoué APRÈS paiements_frais.sql (11 arguments, p_frais par défaut), il en
-- ferait DEUX versions : l'appel par noms de Stripe et de l'activation
-- manuelle deviendrait ambigu (« function … is not unique ») et plus aucun
-- paiement ne s'enregistrerait. Il refuse donc de s'exécuter — rien n'est changé.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'enregistrer_paiement' and p.pronargs = 11) then
    raise exception 'FICHIER_DEPASSE: paiements_frais.sql est appliqué — ne pas rejouer ce fichier, il recréerait l''ancienne signature d''enregistrer_paiement';
  end if;
end $$;

alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement'));

insert into public.quota_reglages (cle, valeur) values ('lot_prix_xaf', '') on conflict (cle) do nothing;

create or replace function public.regler_quota(p_cle text, p_valeur text, p_par text)
returns void language plpgsql set search_path = public as $$
declare v_avant text;
begin
  if p_par is null or btrim(p_par) = '' then
    raise exception 'QUOTA_REGLAGE_AUTEUR: qui change ce réglage ?';
  end if;
  -- Les nombres restent des nombres : 0 est permis pour un lot ou des
  -- modifications gratuites, pas pour la durée ni les modifications incluses.
  if p_cle in ('modifications_incluses', 'duree_jours', 'lot_taille') and (p_valeur !~ '^[0-9]+$' or p_valeur::integer < 1) then
    raise exception 'QUOTA_REGLAGE_INVALIDE: % doit être un entier ≥ 1', p_cle;
  end if;
  if p_cle in ('modifications_gratuites', 'prix_mensuel_xaf', 'lot_prix_xaf') and p_valeur <> '' and p_valeur !~ '^[0-9]+$' then
    raise exception 'QUOTA_REGLAGE_INVALIDE: % doit être un entier', p_cle;
  end if;
  if p_cle = 'lot_prix_usd' and p_valeur !~ '^[0-9]+(\.[0-9]{1,2})?$' then
    raise exception 'QUOTA_REGLAGE_INVALIDE: lot_prix_usd doit être un montant';
  end if;
  select valeur into v_avant from public.quota_reglages where cle = p_cle for update;
  if not found then
    raise exception 'QUOTA_REGLAGE_INCONNU: %', p_cle;
  end if;
  update public.quota_reglages set valeur = p_valeur, modifie_le = now(), modifie_par = p_par where cle = p_cle;
  insert into public.quota_reglages_historique (cle, avant, apres, par) values (p_cle, v_avant, p_valeur, p_par);
end $$;

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

revoke all on function public.regler_quota(text, text, text) from public, anon, authenticated;
revoke all on function public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.regler_quota(text, text, text),
  public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text) to service_role;

commit;
