-- ============================================================================
-- CORRECTIF — UN SIGLE DONNÉ VAUT MIEUX QU'UN SIGLE DEVINÉ
--
-- MESURÉ À L'ADRESSE PUBLIQUE le 8 novembre 2026 : la référence sortait
-- « CPAC-2026-KKVMJS ». Le nom réel du site est
-- « Centrale Pharmaceutique d'Achats (CPA) » — et mes initiales comptaient
-- le sigle entre parenthèses comme un quatrième mot : C, P, A, puis C.
--
-- LA LEÇON EST PLUS LARGE QUE LE BOGUE. L'organisation DONNE son sigle ;
-- le deviner était inutile. Quand « (CPA) » figure au nom, c'est exactement
-- ce que l'établissement veut qu'on écrive — personne n'a à le reconstruire.
--
-- ORDRE DE PRIORITÉ :
--   ① un sigle entre parenthèses, s'il y en a un → on l'emploie tel quel ;
--   ② sinon, les initiales des mots d'au moins trois lettres ;
--   ③ sinon « REF ».
--
-- Et le sigle lu est RETIRÉ du texte avant de calculer les initiales, pour
-- qu'un nom sans parenthèses ne change pas de comportement.
-- ============================================================================

create or replace function public.initiales_du_site(nom text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  with brut as (
    select coalesce(nom, '') as n
  ),
  -- ① LE SIGLE DONNÉ : 2 à 6 lettres majuscules entre parenthèses.
  --    Les minuscules sont exclues : « (ancienne CPA) » n'est pas un sigle.
  sigle as (
    select (regexp_match(n, '\(([A-ZÀ-Ý]{2,6})\)'))[1] as s from brut
  ),
  -- ② LES INITIALES, calculées sur le nom PRIVÉ de ses parenthèses.
  initiales as (
    select upper(substr(string_agg(left(m[1], 1), '' order by o), 1, 4)) as i
    from brut,
         regexp_matches(regexp_replace(n, '\([^)]*\)', '', 'g'),
                        '([[:alnum:]]{3,})', 'g') with ordinality as t(m, o)
  )
  select coalesce(
    (select s from sigle),
    nullif((select i from initiales), ''),
    'REF'
  );
$$;

revoke all on function public.initiales_du_site(text) from public, anon, authenticated;

comment on function public.initiales_du_site(text) is
  'Le sigle DONNÉ entre parenthèses prime sur les initiales devinées. Mesuré : « Centrale Pharmaceutique d''Achats (CPA) » donnait CPAC.';
