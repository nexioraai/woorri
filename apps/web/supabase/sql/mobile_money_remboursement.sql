-- REMBOURSER UN PAIEMENT MOBILE MONEY — le registre et la coupure (2026-11-23).
--
-- Décision du propriétaire : l'ARGENT, il le renvoie LUI-MÊME depuis le tableau
-- de bord MoneRails (un paiement sortant). Deribfy n'envoie rien : il ÉCRIT
-- seulement, sur le modèle exact de annuler_paiement_stripe :
--
--   annuler_paiement_mobile_money(p_fournisseur, p_reference, p_payout, p_montant, p_par)
--     · retrouve la ligne PAYÉE (fournisseur + référence de l'encaissement) ;
--       absente → « paiement_inconnu », rien n'est écrit ;
--     · écrit UNE ligne `objet = annulation` qui pointe elle (colonne `annule`),
--       référence « annulation:<encaissement> » — deux clics, deux onglets :
--       jamais deux annulations (« deja_annule ») ; la RÉFÉRENCE DU PAIEMENT
--       SORTANT et qui l'a saisie sont dans `saisi_par` ;
--     · si c'était le DERNIER paiement (il porte la fin de période en cours) :
--       échéance = MAINTENANT, et l'appli est DÉPUBLIÉE (`publication_jeton`
--       vidé) ; un paiement plus ancien : la ligne seulement.
--   mm_demandes : l'état « remboursee », la référence du paiement sortant,
--     qui et quand — lisibles dans /admin/mobile-money.
--
-- Rien n'est effacé ni réécrit dans le registre (ajout seul). Idempotent.
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- mobile_money_telephone_masque.sql. Vérification :
-- mobile_money_remboursement_verification.sql. Annulation :
-- mobile_money_remboursement_annulation.sql.

begin;

alter table public.mm_demandes add column if not exists paiement_sortant text;
alter table public.mm_demandes add column if not exists rembourse_par text;
alter table public.mm_demandes add column if not exists rembourse_le timestamptz;
alter table public.mm_demandes drop constraint if exists mm_demandes_etat_check;
alter table public.mm_demandes add constraint mm_demandes_etat_check
  check (etat in ('ouverte', 'reussie', 'echouee', 'expiree', 'refusee', 'abandonnee', 'activee_main', 'remboursee'));

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
   where fournisseur = p_fournisseur and reference = p_reference and objet = 'abonnement';
  if not found then
    return jsonb_build_object('statut', 'paiement_inconnu');
  end if;
  if p_montant > v_paye.montant then
    raise exception 'REMBOURSEMENT_MONTANT: % au-delà du paiement (%)', p_montant, v_paye.montant;
  end if;

  -- LE VERROU de l'appli d'abord : deux remboursements simultanés se suivent ici.
  select * into v_compteur from public.app_compteurs where app_id = v_paye.app_id for update;

  select * into v_existante from public.app_paiements where fournisseur = p_fournisseur and reference = v_reference;
  if found then
    return jsonb_build_object('statut', 'deja_annule', 'app_id', v_paye.app_id,
      'derniere', v_existante.saisi_par like '%:derniere');
  end if;

  v_derniere := v_compteur.paye_jusqu_au is not null and v_paye.jusqu_au is not null
                and v_paye.jusqu_au >= v_compteur.paye_jusqu_au;

  insert into public.app_paiements (owner_id, app_id, source, fournisseur, reference, objet, montant, devise, jusqu_au, saisi_par, annule)
  values (v_paye.owner_id, v_paye.app_id, 'manuelle', p_fournisseur, v_reference, 'annulation', p_montant, v_paye.devise, now(),
          'remboursement:' || p_par || ':sortant:' || p_payout || case when v_derniere then ':derniere' else ':ancienne' end, v_paye.id);

  if v_derniere then
    update public.app_compteurs set paye_jusqu_au = now() where app_id = v_paye.app_id;
    update public.app_generations set publication_jeton = null where id = v_paye.app_id;
  end if;

  update public.mm_demandes
     set etat = 'remboursee', paiement_sortant = p_payout, rembourse_par = p_par, rembourse_le = now(),
         ferme_le = coalesce(ferme_le, now())
   where fournisseur = p_fournisseur and reference = p_reference;

  return jsonb_build_object('statut', 'annule', 'app_id', v_paye.app_id, 'derniere', v_derniere);
end $$;

revoke all on function public.annuler_paiement_mobile_money(text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.annuler_paiement_mobile_money(text, text, text, numeric, text) to service_role;

notify pgrst, 'reload schema';

commit;
