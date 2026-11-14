-- M13 · LA LECTURE GARDÉE (2026-11-14) — même cahier, même application.
-- A executer manuellement dans l'editeur SQL Supabase (aucun outillage de
-- migration automatise dans ce depot — meme convention que generation_failures.sql).
--
-- La premiere lecture REUSSIE d'un cahier est gardee ici, entiere, sous
-- l'empreinte du texte (et de la facon de le lire : consigne, modele,
-- temperature), pour CE compte. Les lectures suivantes du meme texte la
-- reutilisent : aucun appel, aucun cout, et la reponse le dit (lectureGardee).
-- Alimentee par src/lib/apps/lecture-gardee.ts, appelee depuis
-- src/app/api/generateur/lire-brief/route.ts. TANT QUE CETTE TABLE N'EXISTE PAS,
-- la route lit comme avant : rien ne casse.
--
-- RLS activee SANS policy : anon / authenticated n'ont aucun acces ; seul le
-- service role (supabaseAdmin) lit et ecrit. Un cahier est une donnee du client :
-- il ne sort jamais vers un autre compte (cle = owner_id + empreinte).

create table if not exists app_lectures (
  owner_id   uuid        not null,
  empreinte  text        not null check (empreinte ~ '^[0-9a-f]{64}$'),
  reponse    jsonb       not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, empreinte)
);

alter table app_lectures enable row level security;
revoke all on table app_lectures from anon, authenticated;
-- Aucune policy creee volontairement : seul le service role (bypass RLS) y accede.
