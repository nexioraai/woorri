-- ============================================================================
-- LOT 13.1 — LA PORTÉE D'UN AVIS, ET LES OFFRES QU'IL REÇOIT.
--
-- ── CE QUE LE PROPRIÉTAIRE A DÉCRIT, 2026-11-09.
--
-- « si c appel offre nationnal, les tchadiens proposer leur et via site cpa
-- en upload et cpa recoit, si c internationnal c etraners postule, si c pour
-- tout le monde alors tout le monde postule […] les fournisseurs proposent
-- leur prix upload leur pdf, un champ d leur nom, contact, puis postuler et
-- cpa recoit, cpa analyse et choisis un ou 2 ou selon son choix, et repond. »
--
-- ── CE QUI EXISTAIT DÉJÀ, ET QU'ON NE REFAIT PAS.
--
-- `appels_offres` porte déjà l'objet, la description, la méthode, les
-- critères d'élimination ET de notation, les modalités de soumission,
-- l'allotissement, la date limite, l'ouverture des plis, la caution. « Ce
-- que la Centrale veut vraiment » est donc déjà écrivable — il manquait la
-- PORTÉE, et l'endroit où les offres arrivent.
--
-- ── LA PORTÉE EST UN VOCABULAIRE FERMÉ, ET `tous` EST LE DÉFAUT.
--
-- Les avis déjà publiés n'ont jamais déclaré de portée : les ranger d'office
-- en « national » ou en « international » inventerait une restriction que
-- personne n'a décidée. `tous` est le seul défaut qui ne restreint rien.
--
-- ── LA PORTÉE INFORME, ELLE NE FILTRE PAS.
--
-- Rien en base n'empêche un étranger de déposer sur un avis national : la
-- Centrale écarte à l'examen, comme elle le ferait d'un dossier papier
-- irrecevable. Fermer techniquement exigerait de prouver la nationalité
-- d'un déposant — ce qu'aucune colonne ne sait faire honnêtement.
--
-- ── CE QUE CE FICHIER NE FAIT **PAS**, ET C'EST UNE DÉCISION DU PROPRIÉTAIRE.
--
-- Il n'empêche PAS de lire une offre avant l'ouverture des plis. J'avais
-- proposé de le rendre impossible en base ; arbitrage du 2026-11-09 : « cpa
-- ne mettra pas avant heure, si ça arrive c'est leur responsabilité, pas la
-- nôtre. » La décision est enregistrée, et sa conséquence aussi : le secret
-- des plis repose sur la discipline de la Centrale, pas sur une
-- impossibilité. Voir PLAN §13.
--
-- Ce qui EST fermé, en revanche : les offres ne sont lisibles QUE par le
-- propriétaire du site. Aucun fournisseur ne voit l'offre d'un autre — c'est
-- l'exigence de confidentialité du propriétaire, appliquée ici aussi.
--
-- ── ET POSTULER EXIGE UN COMPTE ACTIF.
--
-- Arbitrage du propriétaire, 2026-11-09 : « postuler doit exiger création
-- d'un compte auprès de cpa, car cpa doit savoir c'est qui. » Donc pas de
-- dépôt anonyme : `compte_id` est NOT NULL, et la route exige un compte
-- ACTIF — s'inscrire ne suffit pas, il faut avoir été admis.
-- ============================================================================

-- AVANT — l'état réel, pour pouvoir comparer après.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'appels_offres'
       and column_name = 'portee')                            as portee_deja_la,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'offres') as table_deja_la,
  (select count(*) from public.appels_offres)                 as avis;

-- ---------------------------------------------------------------------------
-- 1. LA PORTÉE
-- ---------------------------------------------------------------------------
alter table public.appels_offres
  add column if not exists portee text not null default 'tous';

-- La contrainte est posée SÉPARÉMENT : `add column ... constraint` échoue si
-- la colonne existe déjà, et ce fichier doit pouvoir se rejouer.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appels_offres_portee_chk') then
    alter table public.appels_offres
      add constraint appels_offres_portee_chk
      check (portee in ('national', 'international', 'tous'));
  end if;
end $$;

comment on column public.appels_offres.portee is
  'Qui peut repondre : national (Tchad), international (hors Tchad), tous. '
  'INFORME, ne filtre pas : la Centrale ecarte a l''examen, comme un dossier '
  'papier irrecevable. Fermer techniquement exigerait de prouver la '
  'nationalite d''un deposant, ce qu''aucune colonne ne sait faire. '
  '`tous` par defaut : les avis deja publies n''ont jamais declare de portee, '
  'et leur en inventer une serait une restriction que personne n''a decidee.';

-- ---------------------------------------------------------------------------
-- 2. LES OFFRES REÇUES
-- ---------------------------------------------------------------------------
create table if not exists public.offres (
  id uuid primary key default gen_random_uuid(),

  site_id uuid not null references public.sites(id)         on delete cascade,
  avis_id uuid not null references public.appels_offres(id) on delete cascade,

  -- ── LE COMPTE EST OBLIGATOIRE, ET C'EST UN ARBITRAGE DU PROPRIETAIRE.
  --
  -- 2026-11-09 : « postuler doit exiger creation d un compte aupres de cpa,
  -- car cpa doit savoir c qui. » J'avais propose l'inverse — un depot libre
  -- avec nom et contact — en lisant « un champ de leur nom, contact ». La
  -- correction est juste : une offre anonyme sur un marche public ne se
  -- rattache a personne, et la Centrale ne peut ni verifier un agrement, ni
  -- repondre a quelqu'un qu'elle ne connait pas.
  --
  -- `on delete restrict`, ET C'EST VOLONTAIRE. Un compte qui a depose une
  -- offre NE PEUT PLUS ETRE SUPPRIME. Dans un marche public on n'efface pas
  -- un soumissionnaire : la trace de qui a repondu fait partie de la
  -- procedure. La route de suppression des comptes rendra donc une erreur
  -- explicite — c'est la bonne reponse, pas un defaut.
  --
  -- ET AUCUNE COPIE DE L'ORGANISATION ICI. Elle se lit par jointure, et elle
  -- est STABLE : le titulaire ne peut la modifier qu'avant examen, apres
  -- quoi elle est figee (lot 11). Un instantane n'ajouterait qu'une seconde
  -- verite a tenir d'accord avec la premiere.
  compte_id uuid not null references public.site_comptes(id) on delete restrict,

  -- LE NOM ET LE CONTACT DE CETTE OFFRE-LA. Le compte dit QUI soumet ;
  -- ces deux champs disent a QUI s'adresser pour CE dossier — ce n'est pas
  -- forcement la meme personne, et c'est exactement ce que le proprietaire
  -- a decrit : « un champ de leur nom, contact ».
  nom text not null
    constraint offres_nom_chk check (length(btrim(nom)) between 2 and 200),
  contact text not null
    constraint offres_contact_chk check (length(btrim(contact)) between 3 and 200),

  -- LE PRIX EST FACULTATIF. Certains marches se repondent par un dossier
  -- complet dont le prix est une piece parmi d'autres ; l'exiger ici
  -- empecherait de deposer une offre par ailleurs recevable.
  prix numeric
    constraint offres_prix_chk check (prix is null or prix >= 0),
  devise text
    constraint offres_devise_chk check (devise is null or length(btrim(devise)) between 3 and 8),

  -- LA PIECE DEPOSEE. Une seule par offre : le proprietaire a dit « leur
  -- pdf ». Plusieurs pieces se decideront si le besoin apparait, avec leurs
  -- propres regles de retrait.
  chemin text not null
    constraint offres_chemin_unique unique,
  nom_fichier text not null,
  octets bigint not null constraint offres_octets_chk check (octets > 0),
  type_mime text not null,

  -- CE QUE LA CENTRALE EN FAIT. `recue` a l'arrivee : elle n'a rien decide.
  etat text not null default 'recue'
    constraint offres_etat_chk check (etat in ('recue', 'retenue', 'non_retenue')),

  -- SA REPONSE. « cpa analyse et choisis un ou 2 ou selon son choix, et
  -- repond. »
  reponse text,
  repondu_le timestamptz,

  depose_le timestamptz not null default now(),

  -- L'INVARIANT DE LA REPONSE. Une reponse sans date, ou une date sans
  -- reponse, decrit un echange que personne ne peut raconter. Meme forme que
  -- l'attribution d'un marche et le retrait d'un document.
  constraint offres_reponse_chk check ((reponse is null) = (repondu_le is null))
);

create index if not exists offres_avis_idx on public.offres (avis_id, depose_le desc);
create index if not exists offres_site_idx on public.offres (site_id, depose_le desc);

-- ---------------------------------------------------------------------------
-- AUCUN PRIVILEGE A PERSONNE.
--
-- Pas meme en lecture a `authenticated`. Une offre contient un PRIX : la
-- rendre lisible a toute session donnerait les prix des concurrents a
-- quiconque sait s'inscrire. Tout passe par une route serveur qui verifie
-- que l'appelant possede le site.
-- ---------------------------------------------------------------------------
alter table public.offres enable row level security;
revoke all on table public.offres from anon, authenticated;
grant  all on table public.offres to   service_role;

-- LE SEAU DES OFFRES EST PRIVE, comme celui des documents de compte.
-- `site-fichiers` est public et sert les dossiers de consultation ; y ranger
-- une offre en ferait une fuite a URL devinable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offres', 'offres', false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'application/zip'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "offres lecture" on storage.objects;
drop policy if exists "offres depot"   on storage.objects;

notify pgrst, 'reload schema';

-- APRES — la preuve, dans la meme execution.
select
  (select bool_or(column_name = 'portee') from information_schema.columns
     where table_schema = 'public' and table_name = 'appels_offres')      as portee_posee,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'offres')             as colonnes_offres,
  (select public from storage.buckets where id = 'offres')                as seau_public,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'offres%')                                     as politiques_sur_le_seau,
  (select count(*) from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'offres'
       and grantee in ('anon', 'authenticated'))                          as privileges_publics;
