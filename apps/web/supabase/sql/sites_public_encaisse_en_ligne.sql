-- ============================================================
-- M2-233 — `sites_public` EXPOSE UN FAIT, JAMAIS L'IDENTIFIANT.
--
-- À exécuter manuellement dans l'éditeur SQL Supabase (même convention que
-- les autres fichiers de ce dossier).
--
-- ── LE PROBLÈME, ET IL A COÛTÉ UNE PANNE.
--
-- L'affichage de WhatsApp / appel / Mobile Money reposait sur la DEVISE du
-- produit, saisie en TEXTE LIBRE. Le même marchand a écrit `XAF`, puis `CFA`,
-- puis `F` — et ses boutons ont disparu trois fois. Élargir le test de chaîne
-- à chaque orthographe n'est pas un système : c'est du colmatage, et c'est le
-- marchand qui découvre la panne sur sa boutique en ligne.
--
-- Le fait qui décide VRAIMENT existe déjà : `sites.payment_account_id`.
-- `api/shop/checkout` s'en sert pour refuser une commande (« Paiements non
-- configurés pour ce site »). Une boutique sans compte d'encaissement NE PEUT
-- PAS être payée en ligne : le contact direct n'y est pas une option
-- régionale, c'est LE parcours d'achat.
--
-- ── POURQUOI UNE COLONNE DÉRIVÉE, ET SURTOUT PAS LA COLONNE ELLE-MÊME.
--
-- `payment_account_id` est délibérément ABSENTE de cette vue : c'est une
-- donnée sensible (identifiant de compte d'encaissement du marchand), et
-- l'audit Mode 3/POD BRAND l'a explicitement retirée.
--
-- J'AI DÉJÀ PAYÉ POUR L'AVOIR OUBLIÉ : avoir ajouté cette colonne à la
-- projection publique a fait échouer la requête (PostgREST 42703) et servir
-- l'accueil de la plateforme à la place de TOUTES les boutiques sur domaine
-- personnalisé. La vue n'expose donc QUE le booléen dérivé — « cette boutique
-- encaisse-t-elle en ligne ? » —, jamais l'identifiant qui le fonde.
--
-- ── CE QUE CETTE MIGRATION NE CHANGE PAS.
--
-- Les 45 colonnes existantes sont reprises À L'IDENTIQUE ET DANS LEUR ORDRE
-- (`CREATE OR REPLACE VIEW` l'exige, et n'autorise l'ajout qu'EN FIN de
-- liste). La liste ci-dessous a été relevée sur la vue RÉELLE, pas sur le
-- fichier `sites_public_view.sql` — qui était en retard d'une colonne
-- (`updated_at`) : l'avoir recopié aurait SUPPRIMÉ cette colonne.
--
-- `security_invoker = false` est REPRIS : c'est lui qui permet à la vue de
-- servir les sites publiés sans exposer la table de base. L'omettre
-- reviendrait à casser la lecture publique.
--
-- ============================================================

-- ============================================================
-- 1/3 — la vue, augmentée d'UN booléen dérivé
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
  -- LE FAIT, ET RIEN QUE LE FAIT. `payment_account_id` ne sort pas d'ici.
  (payment_account_id IS NOT NULL) AS encaisse_en_ligne
FROM public.sites
WHERE published = true AND archived_at IS NULL;

-- ============================================================
-- 2/3 — REVOKE PUIS GRANT. OBLIGATOIRE, MÊME EN « REPLACE ».
--
-- DEBT-073 : Supabase pose `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES`,
-- et `ON TABLES` couvre AUSSI les vues — une vue naît avec
-- INSERT/UPDATE/DELETE pour `anon` et `authenticated`. Un `GRANT SELECT`
-- n'annule rien, il AJOUTE : il faut RÉVOQUER d'abord.
--
-- J'AVAIS OMIS CE BLOC, en raisonnant que `CREATE OR REPLACE` préserve les
-- droits existants — ce qui est vrai ICI, et FAUX sur un environnement NEUF
-- (staging, reprovisioning), que le fichier d'origine prévoit explicitement.
-- Là, ce fichier CRÉE la vue, et les privilèges par défaut s'appliquent. Un
-- cliquet du dépôt (`sqlViewPrivileges.test.ts`) a refusé le fichier sans ce
-- bloc, et il avait raison.
--
-- Rejouer ces deux lignes sur une base déjà correcte est SANS EFFET : c'est
-- exactement ce qu'on veut d'une migration — idempotente, et sûre partout.
-- ============================================================
REVOKE ALL ON public.sites_public FROM anon, authenticated;
GRANT SELECT ON public.sites_public TO anon, authenticated;

-- ============================================================
-- 3/3 — CONTRÔLES. À lire, pas à survoler.
-- ============================================================

-- (a) Le fait est là, et il dit la vérité.
--     Attendu au 2026-09-24 : chanorfie / alloufshop / yiaglobalcommodities
--     -> false ; techflow / cosmopo (Stripe) -> true.
SELECT slug, custom_domain, encaisse_en_ligne
FROM public.sites_public
ORDER BY encaisse_en_ligne, slug;

-- (b) L'IDENTIFIANT N'EST PAS SORTI. Cette requête DOIT échouer avec
--     « column sites_public.payment_account_id does not exist ».
--     Si elle réussit, la migration a exposé une donnée sensible :
--     ANNULEZ-LA immédiatement en rejouant `sites_public_view.sql`.
-- SELECT payment_account_id FROM public.sites_public LIMIT 1;

-- (c) `anon` a SELECT, et RIEN d'autre. Aucune ligne INSERT/UPDATE/DELETE ne doit sortir.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'sites_public'
ORDER BY grantee, privilege_type;
