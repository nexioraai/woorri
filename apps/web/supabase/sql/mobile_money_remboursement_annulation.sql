-- ANNULATION de mobile_money_remboursement.sql. REFUSÉE si un remboursement a
-- déjà été écrit (sa trace serait perdue) : on garde alors la fonction.
begin;
do $$ begin
  if exists (select 1 from public.mm_demandes where etat = 'remboursee') then
    raise exception 'ANNULATION_REFUSEE: un remboursement est déjà inscrit';
  end if;
end $$;
drop function if exists public.annuler_paiement_mobile_money(text, text, text, numeric, text);
alter table public.mm_demandes drop constraint if exists mm_demandes_etat_check;
alter table public.mm_demandes add constraint mm_demandes_etat_check
  check (etat in ('ouverte', 'reussie', 'echouee', 'expiree', 'refusee', 'abandonnee', 'activee_main'));
alter table public.mm_demandes drop column if exists paiement_sortant;
alter table public.mm_demandes drop column if exists rembourse_par;
alter table public.mm_demandes drop column if exists rembourse_le;
notify pgrst, 'reload schema';
commit;
