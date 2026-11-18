-- app_generation_attempts — LES RETOUCHES Y ENTRENT (point 2, 2026-11-18).
--
-- Aucune retouche n'était tracée, ni réussie ni refusée : les six essais de
-- pharma.deribfy.app n'existaient que dans Vercel et l'export DeepSeek
-- (RAPPORT_RETOUCHE_PHARMA.md). La route écrit désormais une ligne par
-- retouche qui a appelé le modèle.
--
-- Ce fichier ÉLARGIT deux listes fermées, rien d'autre :
--   nature : + 'retouche'
--   issue  : + 'refusee' (juges, coupure, hors périmètre, données)
--            + 'en_attente' (mise de côté, attend l'accord du propriétaire)
-- Aucune ligne existante n'est touchée ; le déclencheur d'ajout seul reste.
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, AVANT le déploiement
-- du code qui écrit ces valeurs. Annulation : app_generation_attempts_retouche_annulation.sql
begin;

alter table public.app_generation_attempts
  drop constraint app_generation_attempts_nature_check;
alter table public.app_generation_attempts
  add constraint app_generation_attempts_nature_check
  check (nature in ('generation', 'regeneration', 'retouche'));

alter table public.app_generation_attempts
  drop constraint app_generation_attempts_issue_check;
alter table public.app_generation_attempts
  add constraint app_generation_attempts_issue_check
  check (issue in ('livree', 'non_convergee', 'interrompue', 'ecriture_echouee', 'refusee', 'en_attente'));

commit;
