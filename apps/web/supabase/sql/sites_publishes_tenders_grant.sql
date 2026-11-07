-- ============================================================
-- `publishes_tenders` -- LE DROIT D'ECRITURE MANQUANT. CORRECTIF URGENT.
--
-- ------------------------------------------------------------
-- LE DEFAUT, MESURE LE 2026-11-07.
-- ------------------------------------------------------------
-- La case de /edit paraissait COCHEE a l'ecran, et la base rendait
-- « 43 sites, 0 declarant ».
--
-- CAUSE : `lot_g_final_field_level_authorization.sql` accorde a
-- `authenticated` un `GRANT UPDATE (…)` COLONNE PAR COLONNE sur `sites` --
-- 41 colonnes nommees. `publishes_tenders` est nee le 2026-11-06, APRES ce
-- GRANT. Elle n'y est donc pas, et ne pouvait pas y etre.
--
-- ------------------------------------------------------------
-- POURQUOI C'EST PIRE QU'UNE COLONNE QUI NE S'ENREGISTRE PAS.
-- ------------------------------------------------------------
-- PostgreSQL refuse l'INSTRUCTION ENTIERE, pas la seule colonne. L'editeur
-- envoie l'objet site COMPLET (`updates = {...site}`), donc des que la case
-- est cochee, TOUTE sauvegarde de ce site echoue -- y compris les
-- modifications de texte, d'images ou d'horaires faites dans la meme seance.
--
-- Et l'echec est SILENCIEUX : la branche d'erreur de l'editeur ne fait qu'un
-- `console.error`, puis remet le statut a « idle ». La case, elle, garde son
-- etat LOCAL : elle reste cochee. L'ecran affirme donc un etat que la base
-- n'a pas, a l'endroit exact ou quelqu'un croit decider.
--
-- ------------------------------------------------------------
-- LA REGLE QUI EN SORT -- GEN-D042 ETENDUE.
-- ------------------------------------------------------------
-- Poser une colonne ecrivible par le client, c'est QUATRE gestes :
--   ① `ALTER TABLE`              -- echoue bruyamment si on l'oublie
--   ② le TYPE TypeScript         -- echoue bruyamment
--   ③ la PROJECTION du `select`  -- SILENCIEUX : rend `undefined`
--   ④ le `GRANT UPDATE` colonne  -- SILENCIEUX cote ecran, et il casse
--                                   TOUTES les ecritures de la table
-- Les deux derniers ne se voient pas. Ils se verifient.
--
-- REJOUABLE SANS DANGER : un GRANT est idempotent, il n'ecrit aucune donnee.
-- Il n'ajoute QU'UNE colonne a un droit deja existant -- aucune des 18
-- colonnes protegees par le LOT G n'est touchee.
-- ============================================================

-- ------------------------------------------------------------
-- 0/2 -- CONSTAT AVANT. ATTENDU : 41, et `publishes_tenders` ABSENTE.
-- ------------------------------------------------------------
select count(*) as colonnes_ecrivables,
       bool_or(column_name = 'publishes_tenders') as publishes_tenders_deja_la
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'sites'
  and grantee = 'authenticated' and privilege_type = 'UPDATE';

-- ------------------------------------------------------------
-- 1/2 -- LE DROIT
-- ------------------------------------------------------------
grant update (publishes_tenders) on table public.sites to authenticated;

-- ------------------------------------------------------------
-- 2/2 -- CONSTAT APRES. ATTENDU : 42, et `publishes_tenders_deja_la` = true.
-- ------------------------------------------------------------
select count(*) as colonnes_ecrivables,
       bool_or(column_name = 'publishes_tenders') as publishes_tenders_deja_la
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'sites'
  and grantee = 'authenticated' and privilege_type = 'UPDATE';
