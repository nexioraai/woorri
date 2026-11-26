-- ANNULATION de sites_designation.sql : la colonne disparaît. À n'exécuter QU'APRÈS
-- avoir retiré le code du lot 2 (sinon la CPA dirait « l’établissement »).
begin;
alter table public.sites drop constraint if exists sites_designation_chk;
alter table public.sites drop column if exists designation;
commit;
