-- LES DEMANDES DE PAIEMENT MOBILE MONEY — le verrou ET le journal (2026-11-23).
--
-- ① LE VERROU. Deux demandes VRAIMENT simultanées, avec deux numéros
--    différents, passaient : la garde lisait la liste du prestataire, et deux
--    lectures concurrentes la voyaient vide toutes les deux. MoneRails n'annule
--    rien : deux validations = deux débits. Un index UNIQUE partiel — une seule
--    ligne ouverte (`ferme_le is null`) par appli — fait refuser la seconde par
--    la BASE, quelle que soit la concurrence.
--
--    Une demande restée ouverte plus de 10 minutes ne bloque plus : elle libère
--    le verrou (`ferme_le`), mais garde son état « ouverte » — le rattrapage la
--    relira chez le prestataire, car un encaissement peut encore aboutir.
--
-- ② LE JOURNAL, lisible dans /admin : la demande (montant, prix, frais,
--    opérateur, numéro MASQUÉ), l'avis reçu, la décision et sa raison, et une
--    éventuelle activation à la main par le fondateur.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- paiements_frais.sql. Vérification : mobile_money_demandes_verification.sql.
-- Annulation : mobile_money_demandes_annulation.sql.

begin;

create table if not exists public.mm_demandes (
  id            uuid primary key default gen_random_uuid(),
  cree_le       timestamptz not null default now(),
  fournisseur   text not null check (fournisseur in ('monerails')),
  app_id        uuid not null,
  owner_id      uuid not null,
  operateur     text not null check (btrim(operateur) <> ''),
  -- Jamais le numéro entier : les deux derniers chiffres suffisent à l'admin.
  telephone_masque text not null check (telephone_masque ~ '^[0-9•]{6,15}$'),
  montant       integer not null check (montant > 0),
  prix          integer not null check (prix > 0),
  frais         integer not null check (frais >= 0 and frais < montant),
  reference     text,
  test          boolean,
  etat          text not null default 'ouverte'
                check (etat in ('ouverte', 'reussie', 'echouee', 'expiree', 'refusee', 'abandonnee', 'activee_main')),
  ferme_le      timestamptz,
  avis_recu_le  timestamptz,
  decision      text,
  raison        text,
  active_par    text,
  active_le     timestamptz
);

-- ① LE VERROU : une seule demande ouverte par appli.
create unique index if not exists mm_demandes_une_ouverte on public.mm_demandes (app_id) where ferme_le is null;
-- Une référence du prestataire ne désigne qu'une demande.
create unique index if not exists mm_demandes_reference on public.mm_demandes (fournisseur, reference) where reference is not null;
create index if not exists mm_demandes_a_rattraper on public.mm_demandes (cree_le) where etat = 'ouverte' and reference is not null;

alter table public.mm_demandes enable row level security;
revoke all on public.mm_demandes from public, anon, authenticated;
grant select, insert, update on public.mm_demandes to service_role;

-- OUVRIR UNE DEMANDE, ou dire qu'une autre est ouverte — en UNE instruction.
-- La demande ancienne (plus de p_attente_s secondes) libère d'abord le verrou.
create or replace function public.mm_ouvrir_demande(
  p_fournisseur text, p_app uuid, p_owner uuid, p_operateur text, p_telephone_masque text,
  p_montant integer, p_prix integer, p_frais integer, p_attente_s integer)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_autre record;
begin
  update public.mm_demandes
     set ferme_le = now(),
         raison = coalesce(raison, 'verrou libéré : plus de ' || p_attente_s || ' s sans issue')
   where app_id = p_app and ferme_le is null and cree_le < now() - make_interval(secs => p_attente_s);
  begin
    insert into public.mm_demandes (fournisseur, app_id, owner_id, operateur, telephone_masque, montant, prix, frais)
    values (p_fournisseur, p_app, p_owner, p_operateur, p_telephone_masque, p_montant, p_prix, p_frais)
    returning id into v_id;
  exception when unique_violation then
    select id, cree_le into v_autre from public.mm_demandes where app_id = p_app and ferme_le is null;
    return jsonb_build_object('statut', 'deja_ouverte', 'id', v_autre.id, 'cree_le', v_autre.cree_le);
  end;
  return jsonb_build_object('statut', 'ouverte', 'id', v_id);
end $$;

revoke all on function public.mm_ouvrir_demande(text, uuid, uuid, text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.mm_ouvrir_demande(text, uuid, uuid, text, text, integer, integer, integer, integer) to service_role;

notify pgrst, 'reload schema';

commit;
