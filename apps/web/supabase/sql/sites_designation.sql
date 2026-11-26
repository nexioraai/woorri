-- LE NOM DE L'INSTITUTION DANS LES TEXTES (lot 2 « textes neutres », 2026-11-26).
--
-- Les textes des espaces disaient « la Centrale » en dur. Ils lisent
-- maintenant `sites.designation` : la façon dont le site se nomme dans ses
-- phrases, AVEC son article, dans la langue du site (« la Centrale »,
-- « le Ministère de la Santé », « l’Agence… »). Vide : un nom générique
-- (« l’établissement »). La CPA reçoit « la Centrale » : ses textes ne
-- changent pas d'un caractère.
--
-- Aucun droit d'écriture pour le navigateur (pas de GRANT UPDATE) : la
-- colonne est posée par le serveur, et l'éditeur ne la renvoie pas
-- (SITE_FORBIDDEN_CLIENT_FIELDS).
--
-- ORDRE OBLIGATOIRE : à appliquer AVANT le déploiement du code du lot 2.
-- Sans la colonne, le code lit « rien » et la CPA dirait « l’établissement ».
-- Idempotent. Vérification : sites_designation_verification.sql.
-- Annulation : sites_designation_annulation.sql.

begin;

alter table public.sites add column if not exists designation text;
alter table public.sites drop constraint if exists sites_designation_chk;
alter table public.sites add constraint sites_designation_chk
  check (designation is null or length(btrim(designation)) between 2 and 120);

update public.sites set designation = 'la Centrale'
 where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814' and designation is null;

commit;
