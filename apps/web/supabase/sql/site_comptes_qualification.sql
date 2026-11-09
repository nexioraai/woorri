-- ============================================================================
-- LOT 12.3 — LE VERDICT DE LA CENTRALE SUR UN FOURNISSEUR.
--
-- ── CE QUE LE PROPRIÉTAIRE A DIT, 2026-11-09.
--
-- « je pense que les fournisseurs ne devraient pas vu par d'autres
-- fournisseurs, si c prequalifié ou qualifié ou rejeté. »
--
-- Deux choses dans cette phrase. Le VOCABULAIRE — préqualifié, qualifié,
-- rejeté — et la CONFIDENTIALITÉ, qui est la vraie exigence.
--
-- ── LA CONFIDENTIALITÉ N'EST PAS AJOUTÉE ICI : ELLE EXISTE DÉJÀ.
--
-- Vérifié avant d'écrire une ligne : `site_comptes` ne rend AUCUN privilège
-- à `anon` ni à `authenticated`, aucune vue publique n'existe, et chaque
-- route filtre sur `user_id`. Un fournisseur ne peut pas lire la ligne d'un
-- autre — ce n'était pas à réparer.
--
-- Ce fichier ajoute donc un verdict À UNE SURFACE DÉJÀ FERMÉE. Si l'ordre
-- avait été inverse — ouvrir d'abord, fermer ensuite — la fenêtre aurait
-- existé, et une fenêtre qui a existé a peut-être servi.
--
-- ── `non_examinee` PAR DÉFAUT, ET C'EST UNE DÉCISION.
--
-- Sans cet état, un fournisseur inscrit du jour afficherait « rejeté » —
-- un mensonge — ou « qualifié », pire encore. Le quatrième mot n'est pas
-- une commodité technique : c'est le seul qui soit vrai au départ.
--
-- ── LA DATE ACCOMPAGNE LE VERDICT.
--
-- « Qualifié » sans date ne dit pas si c'était avant ou après le dernier
-- document déposé. Elle est posée par la route qui prononce, jamais par
-- défaut : une date de qualification sur un compte non examiné raconterait
-- un examen qui n'a pas eu lieu.
-- ============================================================================

-- AVANT — l'état réel, pour pouvoir comparer après.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'site_comptes'
       and column_name = 'qualification')   as colonne_deja_la,
  (select count(*) from public.site_comptes) as comptes;

alter table public.site_comptes
  add column if not exists qualification text not null default 'non_examinee';

-- La contrainte est posée SÉPARÉMENT : `add column ... constraint` échoue si
-- la colonne existe déjà, et ce fichier doit pouvoir se rejouer.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_comptes_qualification_chk') then
    alter table public.site_comptes
      add constraint site_comptes_qualification_chk
      check (qualification in ('non_examinee', 'prequalifie', 'qualifie', 'rejete'));
  end if;
end $$;

alter table public.site_comptes
  add column if not exists qualification_le timestamptz;

comment on column public.site_comptes.qualification is
  'Verdict de la Centrale sur un fournisseur. Vocabulaire FERME. JAMAIS '
  'public : la table ne rend aucun privilege a anon ni authenticated, et '
  'aucune vue publique n''existe. Un fournisseur ne lit QUE sa propre ligne. '
  '`non_examinee` par defaut : sans cet etat, un inscrit du jour afficherait '
  '«rejete», ce qui serait un mensonge.';

comment on column public.site_comptes.qualification_le is
  'Quand le verdict a ete prononce. Posee par la route qui prononce, jamais '
  'par defaut : une date sur un compte non examine raconterait un examen qui '
  'n''a pas eu lieu.';

notify pgrst, 'reload schema';

-- APRÈS — la preuve. Sur une table VIDE ce `group by` ne rend aucune ligne :
-- c'est pour cela que la vraie preuve a été faite par COMPORTEMENT
-- (`scripts/.verif` du 2026-11-09 : insertion témoin, valeur inventée
-- refusée en 23514, « prequalifie » acceptee, temoin retire).
select qualification, count(*) from public.site_comptes group by qualification;
