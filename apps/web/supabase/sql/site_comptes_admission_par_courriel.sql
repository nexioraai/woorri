-- ============================================================================
-- LOT 11 — FERMER LA DETTE §10 : `user_id` NE VIENT PLUS DU CLIENT.
--
-- CE QUE LA DETTE DISAIT, inscrite le 9 novembre avant de passer au lot 11 :
-- « La route /api/sites/[slug]/comptes accepte un `user_id` du propriétaire
-- sans vérifier que cette personne existe dans auth.users. Ce qui la ferme :
-- au lot 11, l'admission se fera par l'adresse électronique, et `user_id`
-- sera résolu côté serveur — jamais reçu du client. »
--
-- C'est ce que fait cette fonction, et rien d'autre.
--
-- ── POURQUOI UNE FONCTION, ET PAS UNE LECTURE DEPUIS LE CODE.
--
-- `auth.users` n'est pas exposée par PostgREST, et c'est très bien ainsi.
-- Parcourir la liste des comptes par l'API d'administration pour en trouver
-- un ramènerait TOUTE la table pour lire une ligne — et le jour où elle
-- compte dix mille entrées, l'admission deviendrait lente puis fausse
-- (pagination oubliée).
--
-- ── ELLE NE REND QU'UN IDENTIFIANT, JAMAIS UNE LIGNE.
--
-- Pas le nom, pas la date d'inscription, pas les métadonnées. Celui qui
-- appelle veut rattacher un compte de site à une personne : il n'a besoin
-- que de son identifiant. Tout le reste serait une fuite consentie.
--
-- ── ET ELLE N'EST ACCESSIBLE QU'AU SERVICE.
--
-- `revoke from public` AVANT tout `grant` : une fonction `security definer`
-- laissée exécutable par `anon` est un oracle d'existence — on y testerait
-- des adresses une par une pour savoir qui est inscrit.
-- ============================================================================

create or replace function public.identifiant_par_courriel(courriel text)
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  -- `lower(btrim(...))` des DEUX côtés : Supabase enregistre l'adresse en
  -- minuscules, mais une saisie du propriétaire arrive comme il l'a tapée.
  select u.id
  from auth.users u
  where lower(btrim(u.email)) = lower(btrim(courriel))
  limit 1
$$;

revoke all on function public.identifiant_par_courriel(text) from public, anon, authenticated;
grant  execute on function public.identifiant_par_courriel(text) to service_role;

notify pgrst, 'reload schema';
