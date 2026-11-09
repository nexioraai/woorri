-- ============================================================================
-- LOT 10 (suite) — UN COMPTE NE NAÎT JAMAIS ACTIF
--
-- MESURÉ : la table acceptait `insert ... etat = 'actif'`. L'état par défaut
-- était bien `en_attente`, mais rien n'empêchait de passer outre.
--
-- « LA ROUTE S'EN CHARGERA » EST UNE RÈGLE, PAS UNE IMPOSSIBILITÉ. Elle
-- tient tant que personne n'écrit une seconde route, un script de reprise,
-- ou une correction en urgence par l'éditeur SQL. Sur une centrale d'achats
-- publique, un compte fournisseur actif sans examen donne accès aux dossiers
-- de consultation avant tout le monde.
--
-- Le déclencheur force `en_attente` à la CRÉATION et laisse l'activation
-- libre ensuite : activer est un geste délibéré, créer ne l'est pas.
-- ============================================================================

create or replace function public.site_comptes_naissent_en_attente()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- On FORCE plutôt qu'on refuse : un appelant qui demande « actif » à la
  -- création n'a pas besoin d'une erreur, il a besoin que ça n'arrive pas.
  new.etat := 'en_attente';
  return new;
end;
$$;

revoke all on function public.site_comptes_naissent_en_attente() from public, anon, authenticated;

drop trigger if exists site_comptes_naissance on public.site_comptes;
create trigger site_comptes_naissance
  before insert on public.site_comptes
  for each row execute function public.site_comptes_naissent_en_attente();

comment on trigger site_comptes_naissance on public.site_comptes is
  'LOT 10 — un compte naît TOUJOURS en attente. Activer est un geste délibéré ; créer ne l''est pas.';

notify pgrst, 'reload schema';
