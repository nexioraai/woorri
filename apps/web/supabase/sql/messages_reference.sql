-- ============================================================================
-- LOT 8 — UNE DEMANDE PORTE UNE RÉFÉRENCE, UN ÉTAT, ET SON SITE
--
-- CE LOT N'ÉCRIT PAS UNE DEUXIÈME TABLE. `messages` existe déjà, la route
-- `/api/contact` l'alimente, et `anon` ne peut pas la lire (mesuré : 42501).
-- Il lui manque trois choses, mesurées le 8 novembre 2026 :
--   ① aucune RÉFÉRENCE — le fournisseur n'a rien à citer, la Centrale rien
--     à chercher ;
--   ② aucun ÉTAT — personne ne sait ce qui a été traité ;
--   ③ l'insertion n'est ni relue ni vérifiée côté route (corrigé à part).
--
-- LA RÉFÉRENCE NE SE DEVINE PAS. « CPA-2026-00042 » laisse tenter 00041 :
-- le suivi d'une demande deviendrait la lecture de celle d'un concurrent.
-- Six caractères tirés au sort donnent 1,07 milliard de possibilités.
--
-- ET ELLE SE DICTE AU TÉLÉPHONE. L'alphabet exclut O, 0, I, 1 et L : dans un
-- pays où l'on appelle plus qu'on n'écrit, une référence qu'on ne peut pas
-- lire à voix haute ne sert à rien.
--
-- LE PRÉFIXE VIENT DES INITIALES DU SITE, pas d'une colonne de plus :
-- « Centrale Pharmaceutique d'Achats » donne CPA, sans que personne ne le
-- saisisse — et sans qu'une valeur saisie puisse le contredire.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. LES INITIALES DU SITE
-- ---------------------------------------------------------------------------
create or replace function public.initiales_du_site(nom text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(
      upper(substr(
        string_agg(left(m[1], 1), '' order by o),
        1, 4
      )),
      ''
    ),
    'REF'
  )
  -- LES MOTS DE MOINS DE TROIS LETTRES SONT ÉCARTÉS.
  -- Mesuré : « Centrale Pharmaceutique d'Achats » donnait CPDA — l'apostrophe
  -- coupe « d'Achats », et le « d » comptait comme un mot. Les articles et
  -- particules ne sont pas des initiales ; « Agence Nationale » donne bien AN.
  from regexp_matches(coalesce(nom, ''), '([[:alnum:]]{3,})', 'g') with ordinality as t(m, o);
$$;

revoke all on function public.initiales_du_site(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. LA RÉFÉRENCE — tirée au sort, dictable, indevinable
-- ---------------------------------------------------------------------------
create or replace function public.reference_demande(nom_site text)
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select public.initiales_du_site(nom_site)
      || '-' || to_char(now(), 'YYYY')
      || '-' || (
           select string_agg(
             substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                    1 + floor(random() * 31)::int, 1), '')
           from generate_series(1, 6)
         );
$$;

revoke all on function public.reference_demande(text) from public, anon, authenticated;

comment on function public.reference_demande(text) is
  'LOT 8 — référence dictable (ni O, 0, I, 1, L) et indevinable (31^6). Le préfixe vient des initiales du site.';

-- ---------------------------------------------------------------------------
-- 3. LES COLONNES
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists reference text,
  add column if not exists etat      text not null default 'recu',
  add column if not exists maj_le    timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_etat_chk') then
    alter table public.messages
      add constraint messages_etat_chk
      check (etat in ('recu', 'en_cours', 'repondu', 'clos'));
  end if;
  -- UNIQUE, pas seulement indexée : deux demandes de même référence rendraient
  -- le suivi ambigu, et c'est la base qui doit l'empêcher.
  if not exists (select 1 from pg_constraint where conname = 'messages_reference_unique') then
    alter table public.messages
      add constraint messages_reference_unique unique (reference);
  end if;
end $$;

create index if not exists messages_site_etat_idx
  on public.messages (site_slug, etat, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. AUCUN PRIVILÈGE NEUF
--    `anon` ne lit pas `messages` (mesuré : 42501) et ne doit pas commencer.
--    Le suivi d'une demande passera par une route serveur qui exige la
--    référence ET le courriel : connaître l'un sans l'autre ne suffit pas.
-- ---------------------------------------------------------------------------
revoke all on table public.messages from anon, authenticated;
grant  all on table public.messages to   service_role;

notify pgrst, 'reload schema';
