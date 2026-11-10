-- ============================================================================
-- LOT 14.2 — LA CENTRALE RÉPOND AUX DEMANDES ET RÉCLAMATIONS.
--
-- `messages.etat` existe (recu · en_cours · repondu · clos), mais RIEN ne
-- l'écrit et RIEN ne porte la réponse : « répondu » ne disait pas CE QUI
-- avait été répondu, et le demandeur ne pouvait pas le lire.
--
-- L'INVARIANT : une réponse et sa date vont ensemble, comme pour les offres
-- et le retrait d'un document. Une date sans texte décrit un échange que
-- personne ne peut raconter.
-- ============================================================================

select (select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'messages'
            and column_name = 'reponse') as colonne_deja_la,
       (select count(*) from public.messages) as messages;

alter table public.messages add column if not exists reponse text;
alter table public.messages add column if not exists repondu_le timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_reponse_chk') then
    alter table public.messages
      add constraint messages_reponse_chk check ((reponse is null) = (repondu_le is null));
  end if;
end $$;

notify pgrst, 'reload schema';

select
  (select bool_or(column_name = 'reponse') from information_schema.columns
     where table_schema = 'public' and table_name = 'messages')    as reponse_posee,
  (select count(*) from public.messages where reponse is not null) as deja_repondus;
