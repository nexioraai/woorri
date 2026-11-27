-- « MAQUETTE DE DÉMONSTRATION — NON OFFICIELLE » (lot 4c, 2026-11-26).
--
-- Un réglage du site, réservé au propriétaire : quand il est vrai, un bandeau
-- fixe « Maquette de démonstration — non officielle » paraît en bas de TOUTES
-- les pages du site. Une institution générée naît avec (le semeur le pose) ;
-- le propriétaire le retire dans « Éditer » une fois le site validé.
--
-- Défaut FAUX : aucun site existant ne change. Le propriétaire peut écrire la
-- colonne (GRANT UPDATE à authenticated) ; la RLS de `sites` limite déjà
-- l'écriture à SES sites. La vue publique ne la porte pas : le serveur la lit.
--
-- Ordre : indifférent. Sans la colonne, le code n'affiche aucun bandeau et
-- l'éditeur ne montre pas la case. Idempotent.
-- Vérification : sites_maquette_demo_verification.sql.
-- Annulation : sites_maquette_demo_annulation.sql.

begin;
alter table public.sites add column if not exists maquette_demo boolean not null default false;
comment on column public.sites.maquette_demo is
  'Bandeau « Maquette de démonstration — non officielle » sur toutes les pages. '
  'Posé à la génération d''une institution ; retiré par le propriétaire.';
grant update (maquette_demo) on table public.sites to authenticated;
commit;
