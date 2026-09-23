# PLAN — SEO (Partie 1) et IMAGES MARCHANDS (Partie 2)

**Périmètres.** **(A)** = `deribfy.com`, la plateforme. **(B)** = les sites et
boutiques générés pour les marchands (templates + pipeline + sites déjà en
ligne : `chanorfie.com`, `alloufshop.com`).

**Contrainte absolue tenue partout : aucun fournisseur de modèle IA.**
Tout le traitement d'image repose sur `sharp` / libvips (licences Apache-2.0 et
LGPL) et, pour la suppression de fond, sur un modèle **U²-Net** exécuté en local
via `onnxruntime`. Aucun appel réseau vers Anthropic, OpenAI ou DeepSeek n'est
ajouté. Le SDK `@anthropic-ai/sdk` déjà présent au dépôt sert à la génération de
contenu (hors périmètre de ce chantier) et n'est touché par aucune tâche ici.

---

## ÉTAT MESURÉ AVANT TRAVAUX (2026-09-23)

| fait | mesure |
|---|---|
| `src/app/favicon.ico` | 25 931 octets — **octet pour octet le fichier de `create-next-app`** |
| `icon.png` · `apple-icon.png` · `manifest` | **absents** |
| pages sans `metadata` | **22 sur 30** (dont `/`, `/privacy`, `/cookies`, `/terms`) |
| i18n | **client seulement** (`localStorage` + `navigator.language`) — le serveur rend TOUJOURS `lang="fr"` avec un titre **anglais** |
| JSON-LD (A) | seulement sur `/about` — **pas** `Organization` + `WebSite` à la racine |
| sitemap par site marchand | **absent** (`robots.txt` existe, pas le sitemap) |
| favicon marchand | **absent** — d'où le globe gris de Google |
| logo Deribfy au dépôt | **aucun fichier** |
| colonne `logo` marchand | **n'existe pas** — seulement `primary_color`, `name` |
| upload image marchand | `ProductManager.tsx` → Supabase Storage **brut** : aucune limite de taille, aucune conversion, aucune correction EXIF, aucune variante |
| affichage produit | `object-cover` dans **9 fichiers de thème** — les photos sont **rognées** |
| `sharp` | **déjà présent** dans le monorepo (transitif Next) |

---

## GROUPE 1 — IDENTITÉ VISUELLE DE `deribfy.com` (A)

1. **Générateur d'icônes open source** — `scripts/generer-icones.mjs`, basé sur
   `sharp`. Produit `favicon.ico`, `icon.png` (48/96/192/512), `apple-icon.png`
   (180). Fichiers touchés : `apps/web/scripts/generer-icones.mjs` (neuf).
2. **Remplacer le favicon Vercel** — supprimer `src/app/favicon.ico` (défaut
   `create-next-app`), poser les icônes générées dans `src/app/`.
   ⚠️ **Choix pris à la place du propriétaire** : aucun logo Deribfy n'existe au
   dépôt. Je génère un **monogramme de marque** (« D », accent `#FA5D1E` sur
   `#0A050E`, palette CLAUDE.md). Remplaçable en déposant un vrai fichier et en
   relançant le script. Consigné dans `PROGRESS.md`.
3. **Manifest** — `src/app/manifest.ts` (route Next), nom, couleurs, icônes.
4. **Cliquet** — test qui échoue si le favicon par défaut de `create-next-app`
   revient (empreinte de taille + absence des icônes). Fichier :
   `src/app/__tests__/icones.test.ts`.

## GROUPE 2 — METADATA ET LANGUE DE `deribfy.com` (A)

5. **Socle partagé** — `src/lib/seo/metadata.ts` : `SITE_URL`, `construireMetadata()`
   (title, description, canonical, OG, Twitter, robots), image OG par défaut.
6. **Une metadata par route** — les **22 pages** auditées. Pages privées
   (`/dashboard`, `/edit`, `/admin`, `/login`, `/reset-password`, `/preview`) en
   `noindex`. Pages légales (`/privacy`, `/cookies`, `/terms`) : titre et
   description **propres**, `noindex` assumé et justifié.
7. **Langue cohérente** — la racine sert aujourd'hui `lang="fr"` + titre anglais.
   Décision : **français principal** (le marché visé est le Tchad ; `/about` est
   déjà en français). Le serveur rend `lang="fr"`, les metadata passent en
   français. Le sélecteur client reste, mais il ne pilote plus ce que Google voit.
   Consigné comme choix dans `PROGRESS.md`.
8. **JSON-LD `Organization` + `WebSite`** — posé dans `layout.tsx`.
9. **Canonical + `www`** — vérifier la redirection 301 et l'alignement des
   `canonical` sur une seule forme. Fichier : `next.config.ts` / `src/proxy.ts`.
10. **Navigation interne** — menu et pied de page vers les pages clés
    (sitelinks). Fichiers : composants de navigation existants.
11. **Cliquet** — test : aucune route publique ne partage titre + description
    avec une autre ; toute page publique a une `canonical`.

## GROUPE 3 — SEO DES SITES MARCHANDS (B)

12. **Favicon marchand automatique** — route `src/app/sites/[slug]/icon/route.tsx` :
    monogramme (initiale du nom + `primary_color`), rendu par `sharp`, mis en
    cache. Branché dans `generateMetadata` (`icons`). Plus jamais de globe.
13. **`sitemap.xml` par site** — `src/app/sites/[slug]/sitemap.xml/route.ts`
    (accueil, catégories, produits, blog, contact, pages légales).
14. **Metadata par page marchande** — auditer `produits/[id]`, `blog`, `[...rest]`
    et les pages de catégorie ; titres et descriptions tirés du **contenu réel**.
15. **JSON-LD complété** — `LocalBusiness` avec ville / téléphone / WhatsApp
    quand fournis ; `Product` vérifié (nom, prix, devise, image, disponibilité).
16. **`lang` et `hreflang`** — `lang` du `<html>` selon la langue du marchand.
17. **Migration des sites existants** — script `scripts/migrer-seo-sites.mjs` :
    recense les sites publiés, vérifie favicon / sitemap / canonical / JSON-LD,
    **rapporte** ; ne modifie que ce qui est dérivé (pas de contenu réécrit).

## GROUPE 4 — CHAÎNE D'IMAGES : UPLOAD ET AFFICHAGE (B)

18. **Module de traitement** — `src/lib/images/traitement.ts` (`sharp`) :
    orientation EXIF corrigée, métadonnées (GPS) supprimées, variantes
    400/800/1200/1600 en **AVIF + WebP + JPG**, placeholder flou.
19. **Route d'upload** — `src/app/api/images/upload/route.ts` : JPG/PNG/WebP/HEIC,
    plafond 15 Mo, garde de propriété, écriture Supabase Storage.
20. **Compression côté client + HEIC** — avant envoi, via `canvas` (navigateur,
    zéro dépendance) ; HEIC converti côté client.
21. **Conseil au marchand** — consigne « ≥ 1200 px, carré ou 4:5, bien éclairé » ;
    **avertissement sans blocage** si trop petite ou floue (variance du laplacien,
    calculée localement).
22. **Ne jamais rogner** — remplacer `object-cover` par `object-contain` dans un
    conteneur à ratio fixe, **fond neutre selon le thème**, pour l'image produit
    et les vignettes. **9 fichiers de thème** concernés.
23. **`srcset` / `sizes` / `lazy` / placeholder** — composant
    `src/app/sites/[slug]/themes/ImageProduit.tsx`, utilisé partout.
24. **Zoom plein écran** sur la fiche produit.

## GROUPE 5 — AMÉLIORATION AUTOMATIQUE « PHOTO PRO » (B)

25. **Corrections `sharp`** — `src/lib/images/ameliorer.ts` : exposition,
    contraste, balance des blancs, netteté légère, débruitage. **CPU, sans GPU.**
26. **Recadrage intelligent** — stratégie `attention` de libvips + marges
    uniformes. Aucun modèle requis.
27. **File d'attente** — table `image_jobs`, statut `en_attente` / `en_cours` /
    `fini` / `echoue`. Le marchand voit l'original, puis la version améliorée.
28. **Suppression de fond** — worker séparé, **U²-Net via `onnxruntime-node`**,
    auto-hébergé. Interface posée et branchée ; le déploiement du worker est une
    **décision d'hébergement** — coût mesuré et recommandation dans `PROGRESS.md`.
29. **Original toujours conservé** — trois variantes offertes : `original`,
    `amelioree`, `amelioree_sans_fond`. Choix par produit + réglage par défaut
    dans les paramètres du marchand.
30. **Comparateur avant/après** dans `Edit`.

## GROUPE 6 — VÉRIFICATION ET LIVRAISON

31. `npx tsc --noEmit` + `npx vitest run` + `npx next build` **après chaque
    groupe**. Aucun groupe n'est déclaré fini sans ces trois-là.
32. `PROGRESS.md` tenu en continu : fait / en cours / bloqué, et **pourquoi**.
33. Récapitulatif final : ce qui reste **manuel** (Search Console, réindexation,
    déploiement du worker), et **tous** les choix pris à la place du propriétaire.

---

## CE QUE CE PLAN NE PROMET PAS

- **L'agrandissement (upscale)** n'est pas tenu pour acquis : Real-ESRGAN est
  open source mais lourd (GPU souhaitable). Il est **évalué** au groupe 5 et
  livré **seulement** si le coût serveur mesuré est acceptable. Sinon : mesure,
  recommandation, et rien de plus — une capacité non démontrée n'est jamais
  réputée acquise.
- **La suppression de fond ne tournera pas sur Vercel** : modèle ~176 Mo,
  incompatible avec les limites du serverless. Elle exige un worker séparé. Le
  code est livré et testé ; **le déployer est une décision du propriétaire.**
- **Aucune régénération payante de contenu** n'est engagée par ce plan.
