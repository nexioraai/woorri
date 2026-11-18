-- ANNULATION de app_generation_attempts_retouche.sql.
--
-- Échoue (et n'annule rien) s'il existe déjà des lignes de retouche ou des
-- issues 'refusee' / 'en_attente' : la table est en ajout seul, on ne les
-- efface pas pour revenir en arrière. C'est voulu.
begin;

alter table public.app_generation_attempts
  drop constraint app_generation_attempts_nature_check;
alter table public.app_generation_attempts
  add constraint app_generation_attempts_nature_check
  check (nature in ('generation', 'regeneration'));

alter table public.app_generation_attempts
  drop constraint app_generation_attempts_issue_check;
alter table public.app_generation_attempts
  add constraint app_generation_attempts_issue_check
  check (issue in ('livree', 'non_convergee', 'interrompue', 'ecriture_echouee'));

commit;
