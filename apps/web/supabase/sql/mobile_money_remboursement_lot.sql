-- REMBOURSER UN LOT DE MODIFICATIONS PAYÉ EN MOBILE MONEY (2026-11-25).
--
-- Décision du propriétaire : « Rembourser » (/admin/mobile-money) marche aussi
-- pour un LOT. L'argent, il le renvoie LUI-MÊME depuis MoneRails ; Deribfy
-- écrit seulement. `annuler_paiement_mobile_money` accepte désormais un lot :
--   · la même ligne « annulation » qui pointe le paiement (une seule, jamais deux) ;
--   · pour un LOT : le lot est retiré du compteur (`supplement` diminué de
--     `lot_taille`, jamais sous zéro) ; l'échéance et la publication NE
--     BOUGENT PAS — un lot ne porte pas l'abonnement ;
--   · pour un abonnement : inchangé (dernier paiement → échéance à maintenant,
--     appli dépubliée).
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- mobile_money_demandes_sites.sql (n° 8). Vérification :
-- mobile_money_remboursement_lot_verification.sql. Annulation : rejouer
-- mobile_money_remboursement.sql (n° 6), qui remet la version abonnement seul.

begin;

create or replace function public.annuler_paiement_mobile_money(
  p_fournisseur text, p_reference text, p_payout text, p_montant numeric, p_par text)
returns jsonb language plpgsql set search_path = public as $$
declare
  v_paye public.app_paiements%rowtype;
  v_compteur public.app_compteurs%rowtype;
  v_existante public.app_paiements%rowtype;
  v_reference text := 'annulation:' || p_reference;
  v_derniere boolean;
begin
  if p_fournisseur is distinct from 'monerails' then
    raise exception 'REMBOURSEMENT_FOURNISSEUR: %', p_fournisseur;
  end if;
  if p_payout is null or p_payout !~ '^[A-Za-z0-9_:-]{4,100}$' then
    raise exception 'REMBOURSEMENT_PAIEMENT_SORTANT: référence illisible';
  end if;
  if p_par is null or btrim(p_par) = '' then
    raise exception 'REMBOURSEMENT_AUTEUR: qui rembourse ?';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'REMBOURSEMENT_MONTANT: %', p_montant;
  end if;

  select * into v_paye from public.app_paiements
   where fournisseur = p_fournisseur and reference = p_reference and objet in ('abonnement', 'lot');
  if not found then
    return jsonb_build_object('statut', 'paiement_inconnu');
  end if;
  if p_montant > v_paye.montant then
    raise exception 'REMBOURSEMENT_MONTANT: % au-delà du paiement (%)', p_montant, v_paye.montant;
  end if;

  select * into v_compteur from public.app_compteurs where app_id = v_paye.app_id for update;

  select * into v_existante from public.app_paiements where fournisseur = p_fournisseur and reference = v_reference;
  if found then
    return jsonb_build_object('statut', 'deja_annule', 'app_id', v_paye.app_id, 'objet', v_paye.objet,
      'derniere', v_existante.saisi_par like '%:derniere');
  end if;

  -- Un LOT ne porte jamais l'abonnement : il n'est jamais « le dernier paiement ».
  v_derniere := v_paye.objet = 'abonnement' and v_compteur.paye_jusqu_au is not null and v_paye.jusqu_au is not null
                and v_paye.jusqu_au >= v_compteur.paye_jusqu_au;

  insert into public.app_paiements (owner_id, app_id, source, fournisseur, reference, objet, montant, devise, jusqu_au, saisi_par, annule)
  values (v_paye.owner_id, v_paye.app_id, 'manuelle', p_fournisseur, v_reference, 'annulation', p_montant, v_paye.devise, now(),
          'remboursement:' || p_par || ':sortant:' || p_payout || case when v_derniere then ':derniere' else ':ancienne' end, v_paye.id);

  if v_paye.objet = 'lot' then
    update public.app_compteurs
       set supplement = greatest(0, supplement - public.quota_reglage_entier('lot_taille'))
     where app_id = v_paye.app_id;
  elsif v_derniere then
    update public.app_compteurs set paye_jusqu_au = now() where app_id = v_paye.app_id;
    update public.app_generations set publication_jeton = null where id = v_paye.app_id;
  end if;

  update public.mm_demandes
     set etat = 'remboursee', paiement_sortant = p_payout, rembourse_par = p_par, rembourse_le = now(),
         ferme_le = coalesce(ferme_le, now())
   where fournisseur = p_fournisseur and reference = p_reference;

  return jsonb_build_object('statut', 'annule', 'app_id', v_paye.app_id, 'objet', v_paye.objet, 'derniere', v_derniere);
end $$;

revoke all on function public.annuler_paiement_mobile_money(text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.annuler_paiement_mobile_money(text, text, text, numeric, text) to service_role;

notify pgrst, 'reload schema';

commit;
