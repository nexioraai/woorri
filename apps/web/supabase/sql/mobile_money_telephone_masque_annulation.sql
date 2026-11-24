-- ANNULATION de mobile_money_telephone_masque.sql : rend la contrainte d'avant
-- (plus lâche — elle accepte un numéro en clair ; à n'utiliser qu'en dernier recours).
begin;
alter table public.mm_demandes drop constraint if exists mm_demandes_telephone_masque_check;
alter table public.mm_demandes add constraint mm_demandes_telephone_masque_check
  check (telephone_masque ~ '^[0-9•]{6,15}$');
commit;
