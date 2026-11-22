-- LE QUOTA DES MODIFICATIONS ET LE REGISTRE DES PAIEMENTS (étape ①, 2026-11-19).
--
-- Plan : docs/elite-protocol/PLAN_QUOTA_ACTIVATION.md (décisions 1, 3, 8 tranchées).
--
-- ── CE QUE CE FICHIER POSE.
--
--   quota_reglages            les chiffres du modèle, modifiables sans code
--   quota_reglages_historique chaque changement : quoi, avant, après, qui, quand
--   app_paiements             le registre — on n'y efface rien, deux sources
--   app_compteurs             par appli : gratuite ou abonnée, payée jusqu'au,
--                             la période en cours et ce qui y a été utilisé
--
--   regler_quota()            change un réglage (et l'historise)
--   reserver_modification()   UNE instruction : réserve ou refuse, avant tout
--                             appel payant — deux clics simultanés, un seul passe
--   liberer_modification()    une modification refusée ne compte pas
--   enregistrer_paiement()    TOUTES les sources passent par elle : Stripe,
--                             espèces, Airtel, Moov, demain un agrégateur
--
-- ── RÈGLES TENUES PAR LA BASE, PAS PAR LE CODE.
--
--   * la même référence chez le même fournisseur ne s'enregistre qu'une fois
--     (Stripe renvoie ses événements ; une saisie manuelle peut se doubler) ;
--   * un paiement ne vaut que pour l'appli de SON propriétaire ;
--   * un réglage changé s'applique à la PÉRIODE SUIVANTE : la limite est figée
--     dans le compteur au début de chaque période ;
--   * un réglage vide ne vaut pas zéro : un prix FCFA vide refuse un paiement
--     en FCFA, il ne l'accepte pas gratuitement ;
--   * registre et historique : AJOUT SEUL, la base refuse update et delete ;
--   * personne d'autre que la clé de service n'y touche — ni anon, ni
--     authenticated (Supabase leur donne tout sur une table neuve par défaut).
--
-- ── LES APPLIS DÉJÀ PUBLIÉES.
--
-- Décision du propriétaire (2026-11-19) : payées jusqu'au 31 décembre 2026.
-- Une ligne `offert` par appli publiée non supprimée, référence
-- `lancement-<id>` — la même instruction rejouée n'en écrit pas une seconde.
--
-- ── ORDRE : CE FICHIER D'ABORD, LE CODE ENSUITE. Rien ne lit ces tables avant
-- l'étape ②. Idempotent. Annulation : quota_modifications_annulation.sql.
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main.

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

-- ════════════════════════════════════════════════════════════════════════
-- LES RÉGLAGES
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.quota_reglages (
  cle          text primary key check (cle in (
                 'modifications_incluses', 'modifications_gratuites', 'duree_jours',
                 'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf',
                 'numero_airtel', 'numero_moov', 'motif_paiement')),
  valeur       text not null default '',
  modifie_le   timestamptz not null default now(),
  modifie_par  text not null default 'installation'
);

create table if not exists public.quota_reglages_historique (
  id     bigint generated always as identity primary key,
  cle    text not null,
  avant  text,
  apres  text not null,
  par    text not null,
  le     timestamptz not null default now()
);

-- Les valeurs de départ (plan, décision 8). Vides : le prix FCFA, les numéros,
-- le motif — décision de marché du propriétaire, cette semaine.
insert into public.quota_reglages (cle, valeur) values
  ('modifications_incluses', '50'),
  ('modifications_gratuites', '3'),
  ('duree_jours', '30'),
  ('lot_taille', '50'),
  ('lot_prix_usd', '5'),
  ('prix_mensuel_xaf', ''),
  ('numero_airtel', ''),
  ('numero_moov', ''),
  ('motif_paiement', '')
on conflict (cle) do nothing;

-- Lire un réglage entier ; vide ou absent → erreur nommée, jamais zéro.
create or replace function public.quota_reglage_entier(p_cle text)
returns integer language plpgsql stable set search_path = public as $$
declare v text;
begin
  select valeur into v from public.quota_reglages where cle = p_cle;
  if v is null or v = '' or v !~ '^[0-9]+$' then
    raise exception 'QUOTA_REGLAGE_ABSENT: % n''est pas réglé', p_cle;
  end if;
  return v::integer;
end $$;

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
  if p_cle in ('modifications_gratuites', 'prix_mensuel_xaf') and p_valeur <> '' and p_valeur !~ '^[0-9]+$' then
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

-- ════════════════════════════════════════════════════════════════════════
-- LE REGISTRE DES PAIEMENTS — deux sources dès le départ
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.app_paiements (
  id           uuid primary key default gen_random_uuid(),
  cree_le      timestamptz not null default now(),
  owner_id     uuid not null,
  app_id       uuid not null references public.app_generations (id) on update restrict on delete restrict,
  source       text not null check (source in ('automatique', 'manuelle')),
  fournisseur  text not null check (fournisseur in ('stripe', 'especes', 'airtel', 'moov', 'offert', 'cinetpay', 'bizao', 'monerails')),
  reference    text not null check (btrim(reference) <> ''),
  objet        text not null check (objet in ('abonnement', 'lot', 'annulation')),
  montant      numeric(12,2) not null check (montant >= 0),
  devise       text not null check (devise in ('USD', 'XAF')),
  jusqu_au     timestamptz,
  saisi_par    text not null,
  annule       uuid references public.app_paiements (id),
  constraint app_paiements_reference_unique unique (fournisseur, reference)
);

create index if not exists app_paiements_par_app on public.app_paiements (app_id, cree_le desc);

-- ════════════════════════════════════════════════════════════════════════
-- LES COMPTEURS — un par appli
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.app_compteurs (
  app_id          uuid primary key references public.app_generations (id) on update restrict on delete restrict,
  owner_id        uuid not null,
  statut          text not null check (statut in ('gratuite', 'abonnee')),
  -- Abonnée : jusqu'à quand c'est payé. Gratuite : null.
  paye_jusqu_au   timestamptz,
  -- La période en cours : la limite y est FIGÉE à son début.
  periode_debut   timestamptz not null default now(),
  limite          integer not null check (limite >= 0),
  supplement      integer not null default 0 check (supplement >= 0),
  utilisees       integer not null default 0 check (utilisees >= 0),
  constraint app_compteurs_abonnee_payee check (statut = 'gratuite' or paye_jusqu_au is not null)
);

-- ── LA RÉSERVATION : une instruction, avant tout appel payant.
--
-- Rend le nombre de modifications RESTANTES après celle-ci, ou NULL si refus
-- (plafond atteint, ou abonnement échu : au jour 1, les modifications
-- s'arrêtent — l'appli, elle, reste en ligne). La ligne d'une appli encore
-- jamais comptée naît « gratuite », avec le réglage du moment.
create or replace function public.reserver_modification(p_app uuid, p_owner uuid)
returns integer language plpgsql set search_path = public as $$
declare v_restantes integer;
begin
  if not exists (select 1 from public.app_generations where id = p_app and owner_id = p_owner) then
    raise exception 'QUOTA_APPLI_ETRANGERE: cette appli n''appartient pas à ce compte';
  end if;
  insert into public.app_compteurs (app_id, owner_id, statut, limite)
  values (p_app, p_owner, 'gratuite', public.quota_reglage_entier('modifications_gratuites'))
  on conflict (app_id) do nothing;

  update public.app_compteurs
     set utilisees = utilisees + 1
   where app_id = p_app
     and owner_id = p_owner
     and utilisees < limite + supplement
     and (statut = 'gratuite' or paye_jusqu_au > now())
  returning limite + supplement - utilisees into v_restantes;
  return v_restantes;
end $$;

-- ── UNE MODIFICATION REFUSÉE NE COMPTE PAS.
create or replace function public.liberer_modification(p_app uuid, p_owner uuid)
returns void language plpgsql set search_path = public as $$
begin
  update public.app_compteurs
     set utilisees = greatest(utilisees - 1, 0)
   where app_id = p_app and owner_id = p_owner;
end $$;

-- ── TOUTES LES SOURCES PASSENT PAR ICI.
--
-- Rend { "statut": "enregistre" | "deja_enregistre", "jusqu_au": …, "app_id": … }.
-- Abonnement : payé jusqu'à `p_jusqu_au` (Stripe donne la fin de SA période),
-- sinon jusqu'à max(maintenant, fin actuelle) + durée réglée — payer en avance
-- ne fait perdre aucun jour. La période repart : compteur à zéro, limite figée
-- au réglage du moment. Lot : s'ajoute à la période en cours d'une appli payée.
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

  -- Un paiement en FCFA suppose un prix réglé : vide, on refuse.
  if p_devise = 'XAF' and p_fournisseur <> 'offert' then
    perform public.quota_reglage_entier('prix_mensuel_xaf');
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

-- ════════════════════════════════════════════════════════════════════════
-- AJOUT SEUL : registre et historique
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.quota_ajout_seul()
returns trigger language plpgsql as $$
begin
  raise exception 'AJOUT_SEUL: % ne se modifie ni ne s''efface — une annulation est une ligne de plus', tg_table_name;
end $$;

drop trigger if exists app_paiements_ajout_seul on public.app_paiements;
create trigger app_paiements_ajout_seul before update or delete on public.app_paiements
  for each row execute function public.quota_ajout_seul();

drop trigger if exists quota_reglages_historique_ajout_seul on public.quota_reglages_historique;
create trigger quota_reglages_historique_ajout_seul before update or delete on public.quota_reglages_historique
  for each row execute function public.quota_ajout_seul();

-- ════════════════════════════════════════════════════════════════════════
-- PERSONNE D'AUTRE QUE LA CLÉ DE SERVICE
-- ════════════════════════════════════════════════════════════════════════

alter table public.quota_reglages enable row level security;
alter table public.quota_reglages_historique enable row level security;
alter table public.app_paiements enable row level security;
alter table public.app_compteurs enable row level security;

revoke all on public.quota_reglages, public.quota_reglages_historique,
              public.app_paiements, public.app_compteurs from anon, authenticated, public;

revoke all on function public.quota_ajout_seul() from public, anon, authenticated;
revoke all on function public.quota_reglage_entier(text) from public, anon, authenticated;
revoke all on function public.regler_quota(text, text, text) from public, anon, authenticated;
revoke all on function public.reserver_modification(uuid, uuid) from public, anon, authenticated;
revoke all on function public.liberer_modification(uuid, uuid) from public, anon, authenticated;
revoke all on function public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text) from public, anon, authenticated;

grant select, insert, update on public.quota_reglages, public.app_compteurs to service_role;
grant select, insert on public.quota_reglages_historique, public.app_paiements to service_role;
grant execute on function public.quota_reglage_entier(text), public.regler_quota(text, text, text),
  public.reserver_modification(uuid, uuid), public.liberer_modification(uuid, uuid),
  public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text) to service_role;

-- ════════════════════════════════════════════════════════════════════════
-- LES APPLIS DÉJÀ PUBLIÉES : payées jusqu'au 31 décembre 2026
-- ════════════════════════════════════════════════════════════════════════

do $$
declare a record;
begin
  for a in
    select id, owner_id from public.app_generations
     where publication_jeton is not null and statut <> 'supprimee' and owner_id is not null
  loop
    perform public.enregistrer_paiement('manuelle', 'offert', 'lancement-' || a.id::text, a.id, a.owner_id,
      'abonnement', 0, 'USD', timestamptz '2026-12-31 23:59:59+00', 'installation');
  end loop;
end $$;

commit;
