-- ============================================================================
-- LOT 17 — L'INSCRIPTION DIRECTE.
--
-- Décision du propriétaire, 2026-11-10 : « la création de compte ne devrait
-- pas être compliquée, ça ne devrait pas être confirmé par la CPA. Quand un
-- utilisateur crée un compte, ça doit juste être visible sur le tableau de
-- bord de la CPA : combien de comptes, qui sont ces gens, leur nom, email. »
--
-- Elle remplace l'arbitrage du lot 10 (« un compte naît TOUJOURS en
-- attente ») : un compte naît ACTIF. La Centrale garde la main APRÈS coup —
-- elle peut toujours SUSPENDRE un compte depuis son tableau de bord.
--
-- Ce fichier :
--   1. ajoute le NOM et le TÉLÉPHONE de la personne ;
--   2. retire le déclencheur qui forçait « en attente » ;
--   3. fait naître les comptes ACTIFS ;
--   4. active les comptes qui attendaient encore.
-- ============================================================================

-- AVANT
select
  (select count(*) from public.site_comptes)                          as comptes,
  (select count(*) from public.site_comptes where etat = 'en_attente') as en_attente_avant;

-- 1. NOM ET TÉLÉPHONE
alter table public.site_comptes add column if not exists nom text;
alter table public.site_comptes add column if not exists telephone text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_comptes_nom_chk') then
    alter table public.site_comptes add constraint site_comptes_nom_chk
      check (nom is null or length(btrim(nom)) between 2 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_comptes_telephone_chk') then
    alter table public.site_comptes add constraint site_comptes_telephone_chk
      check (telephone is null or length(btrim(telephone)) between 6 and 30);
  end if;
end $$;

-- 2. LE DÉCLENCHEUR « EN ATTENTE » DISPARAÎT
drop trigger  if exists site_comptes_naissance on public.site_comptes;
drop function if exists public.site_comptes_naissent_en_attente();

-- 3. UN COMPTE NAÎT ACTIF
alter table public.site_comptes alter column etat set default 'actif';

-- 4. CEUX QUI ATTENDAIENT SONT ACTIVÉS
update public.site_comptes set etat = 'actif', maj_le = now() where etat = 'en_attente';

notify pgrst, 'reload schema';

-- APRÈS — attendu : nom_et_telephone = 2, declencheur = 0, defaut = 'actif'::text, en_attente_apres = 0
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'site_comptes'
       and column_name in ('nom', 'telephone'))                             as nom_et_telephone,
  (select count(*) from pg_trigger where tgname = 'site_comptes_naissance') as declencheur,
  (select column_default from information_schema.columns
     where table_schema = 'public' and table_name = 'site_comptes'
       and column_name = 'etat')                                            as defaut,
  (select count(*) from public.site_comptes where etat = 'en_attente')      as en_attente_apres;
