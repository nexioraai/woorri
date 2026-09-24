-- ============================================================
-- M2-240 — LE MARCHAND MET SON PROPRE LOGO.
--
-- À exécuter manuellement dans l'éditeur SQL Supabase (même convention que
-- les autres fichiers de ce dossier).
--
-- ── CE QUI MANQUAIT, ET DEPUIS QUAND.
--
-- Le travail d'icônes avait posé un MONOGRAMME automatique : une lettre sur
-- la couleur de la boutique. C'est un bon repli, et ce n'est qu'un repli. Le
-- fichier `src/lib/images/favicon.ts` l'écrivait noir sur blanc : « la table
-- `sites` ne porte pas de colonne `logo` ». Le marchand n'avait donc AUCUN
-- moyen de mettre le sien — demandé deux fois, jamais livré.
--
-- Mesuré au 2026-09-24 : les trois domaines servent bien trois icônes
-- distinctes (monogrammes C / A / Y), donc le repli fonctionne. Mais un
-- monogramme n'est pas une marque : dans une page de résultats Google, c'est
-- la seule image que le commerçant possède, et elle ne lui ressemble pas.
--
-- ── POURQUOI UNE COLONNE, ET PAS UN CHAMP DANS UN JSON EXISTANT.
--
-- `hero_image` existe déjà et ne convient pas : c'est la photo de bandeau,
-- large et pleine, qu'on rogne sans dommage. Un logo est carré, souvent
-- transparent, et ne se rogne JAMAIS. Les confondre donnerait un favicon
-- découpé dans un coin de photo.
--
-- ── L'ORDRE DES COLONNES N'EST PAS UN DÉTAIL.
--
-- `CREATE OR REPLACE VIEW` exige les colonnes existantes À L'IDENTIQUE et
-- DANS LEUR ORDRE, et n'autorise l'ajout qu'EN FIN de liste. La liste
-- ci-dessous a été RELEVÉE SUR LA VUE RÉELLE (46 colonnes, `encaisse_en_ligne`
-- en dernier), pas recopiée d'un fichier : un fichier de ce dossier était
-- déjà en retard d'une colonne, et l'avoir recopié l'aurait SUPPRIMÉE.
-- `logo_url` s'ajoute donc APRÈS `encaisse_en_ligne`.
--
-- `security_invoker = false` est REPRIS : c'est lui qui permet à la vue de
-- servir les sites publiés sans exposer la table de base.
-- ============================================================

-- ============================================================
-- 1/5 — la colonne
-- ============================================================
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.sites.logo_url IS
  'Logo déposé par le marchand. Sert de favicon et d''en-tête de vitrine. '
  'NULL = repli sur le monogramme automatique (initiale + couleur du site).';

-- ============================================================
-- 2/5 — la vue publique, augmentée du logo
--
-- Le logo est PUBLIC par nature : il s'affiche sur la vitrine et dans les
-- résultats de recherche. Aucune question de confidentialité ici — à la
-- différence de `payment_account_id`, qui reste hors de cette vue.
-- ============================================================
CREATE OR REPLACE VIEW public.sites_public
WITH (security_invoker = false) AS
SELECT
  id, slug, name, slogan, type, mode, custom_domain, primary_color,
  hero_title, hero_subtitle, about, services, testimonials, gallery,
  products, contact, menu, team, hours, social_links, address, pages,
  cta, theme, hero_image, lang, faq, whyus, mission, vision, geo_lat,
  geo_lng, area_served, price_range, hidden_sections, section_label,
  sections, created_at, dropship_type, pod_designs, product_families,
  cj_margin_percent, cj_round_mode, shipping_flat, updated_at,
  (payment_account_id IS NOT NULL) AS encaisse_en_ligne,
  -- NOUVEAU, ET EN DERNIER : l'ordre des colonnes précédentes est intouché.
  logo_url
FROM public.sites
WHERE published = true AND archived_at IS NULL;

-- ============================================================
-- 3/5 — REVOKE PUIS GRANT. OBLIGATOIRE, MÊME EN « REPLACE ».
--
-- DEBT-073 : Supabase pose `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES`,
-- et `ON TABLES` couvre AUSSI les vues — une vue naît avec
-- INSERT/UPDATE/DELETE pour `anon` et `authenticated`. Un `GRANT SELECT`
-- n'annule rien, il AJOUTE : il faut RÉVOQUER d'abord.
--
-- Rejouer ces deux lignes sur une base déjà correcte est SANS EFFET : c'est
-- exactement ce qu'on veut d'une migration — idempotente, et sûre partout.
-- ============================================================
REVOKE ALL ON public.sites_public FROM anon, authenticated;
GRANT SELECT ON public.sites_public TO anon, authenticated;

-- ============================================================
-- 4/5 — LE DROIT D'ÉCRIRE LA COLONNE. SANS CE BLOC, RIEN NE S'ENREGISTRE.
--
-- `lot_g_final_field_level_authorization.sql` a remplacé le GRANT UPDATE
-- global sur `sites` par un GRANT COLONNE PAR COLONNE (41 colonnes de
-- contenu et de marque). Une colonne ajoutée après coup n'y est PAS : le
-- marchand déposerait son logo, cliquerait « enregistrer », et l'écriture
-- n'affecterait aucune ligne — sans message d'erreur visible.
--
-- C'est exactement la classe de défaut qui a déjà coûté une panne ici : du
-- code qui suppose une colonne là où la base ne l'a pas. On l'ouvre donc
-- explicitement, et le logo appartient bien à la catégorie « marque » que ce
-- GRANT couvre déjà (`primary_color`, `hero_image`, `name`).
-- ============================================================
GRANT UPDATE (logo_url) ON TABLE public.sites TO authenticated;

-- ============================================================
-- 5/5 — CONTRÔLES. À lire, pas à survoler.
-- ============================================================

-- (a) La colonne sort, et elle est vide partout tant qu'aucun logo n'est
--     déposé. C'est normal : le monogramme prend le relais.
SELECT slug, custom_domain, logo_url IS NOT NULL AS a_un_logo
FROM public.sites_public
ORDER BY a_un_logo DESC, slug;

-- (b) RIEN N'A ÉTÉ PERDU. Doit renvoyer 47.
--     Si le nombre est inférieur, une colonne a disparu de la vue :
--     N'ALLEZ PAS PLUS LOIN, les vitrines tomberaient.
SELECT count(*) AS colonnes_de_la_vue
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sites_public';

-- (c) L'IDENTIFIANT D'ENCAISSEMENT N'EST TOUJOURS PAS SORTI. Cette requête
--     DOIT échouer avec « column sites_public.payment_account_id does not exist ».
-- SELECT payment_account_id FROM public.sites_public LIMIT 1;

-- (d) LE MARCHAND PEUT ÉCRIRE SON LOGO. Doit renvoyer 42 lignes, dont
--     `logo_url`. Si `logo_url` manque, le dépôt paraîtra fonctionner et
--     RIEN ne sera conservé.
SELECT count(*) AS colonnes_ecrivables,
       bool_or(column_name = 'logo_url') AS logo_url_ecrivable
FROM information_schema.column_privileges
WHERE table_name = 'sites' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';

-- (e) `anon` a SELECT, et RIEN d'autre.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'sites_public'
ORDER BY grantee, privilege_type;
