-- LE CYCLE DE VIE STRIPE D'UNE APPLICATION, APRÈS L'ACHAT (2026-11-22).
--
-- Décision du propriétaire : un REMBOURSEMENT TOTAL de la dernière facture, ou
-- une CONTESTATION bancaire, dépublie l'appli immédiatement ; l'abonnement
-- Stripe est annulé (par le code, côté webhook) ; une ligne est écrite dans
-- l'historique ; une alerte part dans /admin.
--
-- Ce fichier ajoute :
--   annuler_paiement_stripe(p_facture, p_motif, p_montant)
--     · retrouve la ligne PAYÉE de cette facture (fournisseur stripe,
--       référence = la facture) ; absente → « paiement_inconnu » (l'avis est
--       arrivé AVANT celui du paiement : le webhook rend 500, Stripe renvoie) ;
--     · écrit UNE ligne `objet = annulation` qui renvoie à elle (colonne
--       `annule`), référence « annulation:<facture> » : un remboursement ET une
--       contestation de la même facture, ou le même avis reçu deux fois, ne
--       font jamais deux annulations (« deja_annule ») ;
--     · si cette facture est la DERNIÈRE payée (elle porte la fin de période
--       en cours) : la fin de période est ramenée à MAINTENANT — les
--       modifications s'arrêtent et « Publier » est refusé (402) — et l'appli
--       est DÉPUBLIÉE (`publication_jeton` vidé : son adresse répond 404, son
--       nom lui reste) ;
--     · une facture plus ancienne : la ligne seulement, rien ne se coupe.
--   stripe_avis_traites
--     · l'identifiant de chaque avis Stripe traité AVEC SUCCÈS : le même avis
--       reçu deux fois n'a pas deux effets (alertes comprises).
--
-- Rien n'est effacé ni réécrit dans le registre (ajout seul). Idempotent.
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, après
-- quota_lot_xaf.sql. Vérification : stripe_cycle_de_vie_verification.sql.
-- Annulation : stripe_cycle_de_vie_annulation.sql.

begin;

create table if not exists public.stripe_avis_traites (
  evenement  text primary key check (evenement ~ '^evt_[A-Za-z0-9]+$'),
  type       text not null,
  traite_le  timestamptz not null default now()
);
alter table public.stripe_avis_traites enable row level security;
revoke all on public.stripe_avis_traites from anon, authenticated, public;
grant select, insert on public.stripe_avis_traites to service_role;

create or replace function public.annuler_paiement_stripe(p_facture text, p_motif text, p_montant numeric)
returns jsonb language plpgsql set search_path = public as $$
declare
  v_paye public.app_paiements%rowtype;
  v_compteur public.app_compteurs%rowtype;
  v_existante public.app_paiements%rowtype;
  v_reference text := 'annulation:' || p_facture;
  v_derniere boolean;
begin
  if p_motif not in ('remboursement', 'litige') then
    raise exception 'ANNULATION_MOTIF: % (remboursement ou litige)', p_motif;
  end if;
  if p_montant is null or p_montant < 0 then
    raise exception 'ANNULATION_MONTANT: %', p_montant;
  end if;

  select * into v_paye from public.app_paiements
   where fournisseur = 'stripe' and reference = p_facture and objet = 'abonnement';
  if not found then
    return jsonb_build_object('statut', 'paiement_inconnu');
  end if;

  -- LE VERROU de l'appli d'abord : deux avis simultanés se suivent ici.
  select * into v_compteur from public.app_compteurs where app_id = v_paye.app_id for update;

  select * into v_existante from public.app_paiements where fournisseur = 'stripe' and reference = v_reference;
  if found then
    return jsonb_build_object('statut', 'deja_annule', 'app_id', v_paye.app_id,
      'derniere', v_existante.saisi_par like '%:derniere');
  end if;

  v_derniere := v_compteur.paye_jusqu_au is not null and v_paye.jusqu_au is not null
                and v_paye.jusqu_au >= v_compteur.paye_jusqu_au;

  insert into public.app_paiements (owner_id, app_id, source, fournisseur, reference, objet, montant, devise, jusqu_au, saisi_par, annule)
  values (v_paye.owner_id, v_paye.app_id, 'automatique', 'stripe', v_reference, 'annulation', p_montant, v_paye.devise, now(),
          'stripe:' || p_motif || case when v_derniere then ':derniere' else ':ancienne' end, v_paye.id);

  if v_derniere then
    update public.app_compteurs set paye_jusqu_au = now() where app_id = v_paye.app_id;
    update public.app_generations set publication_jeton = null where id = v_paye.app_id;
  end if;

  return jsonb_build_object('statut', 'annule', 'app_id', v_paye.app_id, 'derniere', v_derniere);
end $$;

revoke all on function public.annuler_paiement_stripe(text, text, numeric) from public, anon, authenticated;
grant execute on function public.annuler_paiement_stripe(text, text, numeric) to service_role;

notify pgrst, 'reload schema';

commit;
