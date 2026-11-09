-- ============================================================================
-- LOT 11 — UNE DEMANDE ET UNE RÉCLAMATION NE SE RESSEMBLENT PAS.
--
-- ── CE QUI MANQUAIT.
--
-- `messages` portait `subject`, un texte libre. Rien ne permettait de dire
-- « ceci est une réclamation » : la page `/mes-reclamations` promise au plan
-- n'aurait eu aucun moyen de filtrer, et aurait affiché TOUT en appelant ça
-- des réclamations.
--
-- ── VOCABULAIRE FERMÉ, comme partout dans ce dossier.
--
-- La base refuse tout autre mot (23514). Laisser le texte libre aurait
-- produit « reclamation », « Réclamation », « RECLAM » et « plainte » dans
-- la même colonne, et un filtre qui en rate les trois quarts.
--
-- ── `default 'demande'` : LES 37 LIGNES EXISTANTES RESTENT VALIDES.
--
-- On ne devine pas leur nature après coup. Elles sont des demandes, ce
-- qu'elles étaient quand elles ont été écrites ; si l'une était en fait une
-- réclamation, c'est à la Centrale de la requalifier, pas à une migration.
--
-- ── LA MESURE « AVANT » NE PEUT PAS LIRE LA COLONNE.
--
-- Premier jet : `count(*) filter (where type is not null)` — refusé en
-- 42703, « column type does not exist », et l'instruction entière est
-- tombée avant l'ALTER. Une mesure d'avant qui suppose l'après ne mesure
-- rien : elle interroge le CATALOGUE, pas la donnée.
-- ============================================================================

-- AVANT — le catalogue, qui lui existe toujours.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'messages'
       and column_name = 'type')        as colonne_deja_la,
  (select count(*) from public.messages) as lignes;

alter table public.messages
  add column if not exists type text not null default 'demande';

-- La contrainte est posée SÉPARÉMENT : `add column ... constraint` échoue si
-- la colonne existe déjà, et ce fichier doit pouvoir se rejouer.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_type_chk'
  ) then
    alter table public.messages
      add constraint messages_type_chk check (type in ('demande', 'reclamation'));
  end if;
end $$;

comment on column public.messages.type is
  'Demande ordinaire ou RECLAMATION. Vocabulaire FERME : la base refuse tout '
  'autre mot (23514). `default demande` pour que les lignes existantes restent '
  'valides sans qu''on invente leur nature apres coup.';

notify pgrst, 'reload schema';

-- APRÈS — la preuve, dans la même exécution.
select type, count(*) from public.messages group by type order by type;
