-- ANNULATION de quota_modifications.sql.
--
-- À n'employer QUE si l'étape ① doit être retirée AVANT que le code des
-- étapes suivantes ne lise ces tables. Une fois des paiements réels
-- enregistrés, n'annule rien : le registre est une trace, il ne s'efface pas.
-- Le refus est donc écrit ici : si app_paiements contient autre chose que
-- les lignes « offert » de l'installation, l'annulation s'arrête.
begin;

do $$
begin
  if to_regclass('public.app_paiements') is not null
     and exists (select 1 from public.app_paiements where fournisseur <> 'offert') then
    raise exception 'ANNULATION_REFUSEE: des paiements réels sont enregistrés — le registre ne s''efface pas';
  end if;
end $$;

drop function if exists public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text);
drop function if exists public.liberer_modification(uuid, uuid);
drop function if exists public.reserver_modification(uuid, uuid);
drop function if exists public.regler_quota(text, text, text);
drop function if exists public.quota_reglage_entier(text);
drop table if exists public.app_compteurs;
drop table if exists public.app_paiements;
drop table if exists public.quota_reglages_historique;
drop table if exists public.quota_reglages;
drop function if exists public.quota_ajout_seul();

commit;
