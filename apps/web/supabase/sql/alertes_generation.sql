-- ALERTES DE GÉNÉRATION — la ligne d'abord, la poussée ensuite.
--
-- ── POURQUOI UNE TABLE, ALORS QU'UNE NOTIFICATION SUFFIRAIT.
--
-- Décision du propriétaire, 2026-11-03 : « l'alerte ÉCRIT D'ABORD UNE
-- LIGNE, puis pousse la notification. La ligne est la trace, la poussée est
-- le signal. Si Telegram est injoignable — et au Tchad l'accès aux réseaux
-- sociaux a déjà été restreint par le passé — rien n'est perdu, et une
-- alerte non remise se voit. »
--
-- D'où `remise` : une alerte écrite mais jamais remise est une ligne à
-- `false`, pas un silence.
--
-- ── ET « RÉUSSI MAIS JAMAIS RÉCUPÉRÉ » EST UN MOTIF À PART ENTIÈRE.
--
-- Mesuré le 2026-11-03 : la boutique `la-boutika-…` a été écrite à 15:18:45
-- et facturée à 15:18:46 pendant que l'écran montrait « Load failed ». Une
-- alerte qui ne guette que les ÉCHECS aurait été muette sur le cas qui a
-- fait découvrir la panne.
--
-- S'applique autant de fois qu'on veut : rien n'y est détruit.

create table if not exists alertes_generation (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- QUOI : « boutique » ou « oeuvre », et son identifiant s'il existe.
  -- Il peut ne pas exister : une génération qui meurt avant d'écrire n'a
  -- pas d'identifiant, et c'est justement un cas à alerter.
  sujet text not null,
  sujet_id text,
  owner_email text,

  -- OÙ ÇA S'EST ARRÊTÉ, et pourquoi. `etape` est le mot de l'étape telle
  -- que le code la nomme, pas une phrase : on veut pouvoir compter.
  motif text not null,
  etape text not null,
  detail text,

  -- CE QUE ÇA A COÛTÉ. Une génération qui échoue APRÈS avoir payé n'est pas
  -- la même chose qu'une qui échoue avant, et l'alerte doit le dire.
  cout_usd numeric,

  -- LA REMISE, ET SON ÉCHEC. `false` avec un motif vaut mieux qu'un silence.
  canal text,
  remise boolean not null default false,
  remise_erreur text,
  remise_at timestamptz
);

create index if not exists alertes_generation_date on alertes_generation (created_at desc);
-- Les non remises se lisent d'un coup d'œil : c'est la question qu'on pose
-- à cette table quand on doute du canal.
create index if not exists alertes_generation_non_remises
  on alertes_generation (created_at desc) where remise = false;

-- ── FERMÉE À TOUT LE MONDE SAUF AU SERVEUR.
--
-- Privilèges par défaut d'un projet Supabase : toute table créée après eux
-- est lisible par `anon`. Une table d'alertes porte des courriels de
-- clients et des motifs d'échec — elle n'a rien à faire dans un navigateur.
revoke all on alertes_generation from anon, public;
alter table alertes_generation enable row level security;
alter table alertes_generation force row level security;
-- Aucune politique : sans politique permissive, la RLS refuse. Seule la
-- clé de service, qui contourne la RLS, écrit et lit ici.
