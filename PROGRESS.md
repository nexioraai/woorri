# PROGRESS — SEO + Images marchands

Tenu en continu. Référence : `PLAN.md`.
Dernière mise à jour : 2026-09-23.

## État par groupe

| groupe | périmètre | état |
|---|---|---|
| 1 — identité visuelle `deribfy.com` | A | ✅ fait |
| 2 — metadata et langue | A | ✅ fait |
| 3 — SEO des sites marchands | B | ✅ fait |
| 4 — chaîne d'images (upload/affichage) | B | 🔄 en cours |
| 5 — amélioration « photo pro » | B | ⏳ à faire |
| 6 — vérification et livraison | A+B | ⏳ à faire |

## Journal

### 2026-09-23 — exploration

Mesures relevées avant tout travail (détail dans `PLAN.md`) :

- `favicon.ico` = **25 931 octets**, soit le fichier livré par `create-next-app`.
  Le symptôme « triangle Vercel sur Google » est donc exact et sa cause est
  qu'aucun favicon n'a jamais été posé.
- **22 pages sur 30 n'ont aucune metadata** — `/cookies` et `/privacy` n'étaient
  que la partie visible : sans metadata de route, Next sert celle du layout, donc
  le titre de l'accueil.
- i18n **client uniquement**. Le serveur rend `lang="fr"` avec un titre anglais.
  C'est exactement ce que Google indexe : le mélange de langues n'est pas un
  réglage à corriger, c'est l'absence de rendu serveur multilingue.
- **Aucun logo Deribfy** au dépôt, et **aucune colonne `logo`** pour les
  marchands.

### Groupe 1 ✅ — identité visuelle (A)

- `favicon.ico` : **25 931 o (Vercel) → 2 486 o**, trois tailles réelles
  (16/32/48), produites par `scripts/generer-icones.mjs` (`sharp`, open source).
- `icon.png` 512 · `apple-icon.png` 180 · `public/icons/` 48·96·192·512 ·
  `og-deribfy.png` 1200×630 · `manifest.webmanifest`.
- **5 restes de l'échafaudage supprimés** de `public/` (`next.svg`, `vercel.svg`,
  `file.svg`, `window.svg`, `globe.svg`) — aucun n'était référencé.
- Cliquet `src/app/__tests__/icones.test.ts` : le favicon `create-next-app` ne
  peut plus revenir (empreinte de taille + validité ICO + présence des icônes).

### Groupe 2 ✅ — metadata et langue (A)

- Socle `src/lib/seo/metadata.ts` : registre unique des pages publiques,
  `canonical`, Open Graph, Twitter, `robots`.
- **15 `layout.tsx` de segment créés.** Les 21 pages sans metadata étaient
  **toutes des composants client** — `export const metadata` y est impossible.
  C'est la cause exacte pour laquelle `/privacy`, `/cookies` et `/terms`
  servaient le titre de l'accueil.
- Pages privées (`/dashboard`, `/admin`, `/edit`, `/domaine`, `/parametres`,
  `/preview`, `/login`, `/reset-password`, `/onboarding-chat`, `/welcome`,
  `/cancel-order`) : **`noindex, nofollow`**.
- `/blog` et `/blog/[slug]` : metadata **dérivée de l'article réel**.
- Cliquet `src/lib/seo/__tests__/seo.test.ts` : aucun titre ni description
  partagés, canonical partout, et **aucune route orpheline**.

#### Deux défauts trouvés dans mon propre travail, avant livraison

1. **Mon cliquet ne mordait pas.** La remontée des layouts trouvait le layout
   RACINE, qui a une metadata — donc l'assertion ne pouvait jamais échouer.
   Or hériter de la racine **est** le défaut. Corrigé : la remontée s'arrête
   strictement au-dessus de la racine. Vérifié en retirant `cookies/layout.tsx`.
2. **Mes tests n'étaient pas collectés.** `vitest.config.ts` a une liste blanche
   explicite de chemins ; `src/lib/seo/**` n'y figurait pas. Un test que le
   lanceur ignore ne garde rien. Chemin ajouté.

#### Ce que les cliquets DU DÉPÔT ont attrapé chez moi

J'avais monté `Organization` + `WebSite` dans le **layout racine**. Trois gardes
d'architecture m'ont arrêté, et le dépôt avait déjà tranché le 2026-08-26 :

> « Le layout racine enveloppe AUSSI les sites clients (le proxy y réécrit
> chaque domaine personnalisé) : l'y placer attribuerait chaque site client à
> Deribfy. »

Concrètement : **chanorfie.com et alloufshop.com auraient été déclarés comme
étant Deribfy** auprès de Google. Montage retiré. J'ai ensuite tenté l'accueil
— techniquement sûr (le proxy réécrit `/` en `/sites/{slug}`, l'accueil n'est
jamais servi à un marchand) — mais un cliquet exige `jsonLdPlateforme` **une
seule fois**, sur `/about`, par décision produit datée. **Je ne passe pas outre
une décision datée** : voir « À arbitrer » plus bas.

Un troisième cliquet (`postgrestProjectionFidelity`) a signalé que ma requête de
metadata et le corps de `/blog/[slug]` utilisaient tous deux la variable `post`,
dont l'une à projection étroite — l'ambiguïté exacte qui a produit DEBT-068.
Renommée en `article`.

### Groupe 3 ✅ — SEO des sites marchands (B)

#### Le favicon : le défaut était mesurable en production

```
chanorfie.com/favicon.ico   -> 200, 25 931 octets
alloufshop.com/favicon.ico  -> 200, 25 931 octets
```

25 931 octets = le favicon de `create-next-app`. **Les deux boutiques livrées
servaient le triangle de Vercel** — c'est la cause exacte de l'icône générique
dans Google. Racine : `proxy.ts` **excluait `favicon.ico` de son filtre**, la
requête n'atteignait jamais le site marchand et tombait sur le fichier de la
plateforme.

**Et le piège d'après** : la plateforme ayant maintenant son logo, la même
faille aurait fait servir le « D » de Deribfy aux boutiques clientes. Un
marchand marqué à l'enseigne de son fournisseur est un défaut *plus grave* que
l'absence d'icône — et il serait passé pour une amélioration.

Livré : `src/lib/images/favicon.ts` (monogramme dérivé de `name` +
`primary_color`, `sharp`), route `/api/internal/site-icon/[slug]`, réécriture de
`/favicon.ico` par le proxy, et balises `<link rel="icon">` dans la metadata.
Les deux chemins sont fermés — celui des navigateurs et celui des moteurs.

Détails qui comptent à 16 pixels : diacritiques dépliés (`Ébène` → `E`),
symboles écartés (`★Shop` → `S`), et **encre calculée par luminance WCAG** —
sans quoi une boutique jaune obtenait une lettre blanche sur fond clair, soit
un carré muet.

#### La langue : même classe de défaut que sur la plateforme

`HtmlLang` est un composant **client** qui corrige `lang` dans un `useEffect` —
donc après hydratation, donc jamais pour un moteur. **Mesuré sur la base de
production : 3 des 5 sites publiés sont en anglais** (`techflow-electronics`,
`cosmopo`, et `yiaglobalcommodities.com` qui porte un vrai domaine) et tous
s'annonçaient en français.

Corrigé à la racine : `proxy.ts` résout la langue **dans la même requête que le
slug** (coût nul sur les domaines personnalisés) et la pose en en-tête ; le
layout racine écrit `lang` **et** `dir` dans le HTML servi. Cliquet posé et
éprouvé dans les deux sens.

#### Ce qui existait déjà et que je n'ai pas refait

- **Sitemap par site** : `/api/internal/site-sitemap/[slug]`, réécrit par le
  proxy. Déjà en place.
- `robots.txt` par site, metadata de page produit, JSON-LD `Product` (nom, prix,
  devise, image, disponibilité) et `LocalBusiness` (téléphone, adresse, géo).

#### Ajouté

- **WhatsApp déclaré en `ContactPoint`.** Il était invisible pour les moteurs :
  `sameAs` ne retient que les valeurs commençant par `http`, et le WhatsApp est
  stocké comme un **numéro**. Or c'est le premier moyen de joindre une boutique
  au Tchad. Émis en `https://wa.me/<chiffres>`, forme canonique suivie par Google.

#### Coût assumé, mesuré

Lire un en-tête rend le layout racine dynamique : **13 → 2 routes statiques**.
Cinq des pages perdues ne font aucune entrée-sortie (assembler du JSX à la
demande). La seule qui interrogeait la base, `/blog`, a reçu un
`unstable_cache` d'une heure — elle retrouve exactement ce que `revalidate` lui
donnait. Alternative propre (deux layouts racine par groupes de routes) écartée :
**82 fichiers à déplacer** et des chemins littéraux affirmés par plusieurs
cliquets d'architecture — hors périmètre.

## Choix pris à la place du propriétaire

*(consignés ici au fur et à mesure, pour arbitrage a posteriori)*

1. **Favicon Deribfy = monogramme de marque.** Aucun logo n'existe au dépôt.
   Je génère un « D » à l'accent `#FA5D1E` sur fond `#0A050E` (palette officielle
   de `CLAUDE.md`). Remplaçable sans toucher au code : déposer le vrai logo dans
   `apps/web/assets/logo-deribfy.png` (ou `.svg`) et relancer
   `node scripts/generer-icones.mjs` — toutes les icônes en sont dérivées.
2. **Langue servie = FRANÇAIS.** L'état trouvé était incohérent d'une façon qui
   ne se voyait pas : `<html lang="fr">` avec un titre **anglais**, parce que le
   sélecteur de langue est **côté navigateur** et n'atteint jamais un moteur.
   Google indexait donc du français annoncé et de l'anglais servi. J'ai tranché
   pour le français : marché visé tchadien, `/about` déjà en français, `lang`
   déjà à `fr`. Le sélecteur reste pour le visiteur.
   **Conséquence à connaître** : il n'y a pas de version anglaise SERVIE, donc
   **pas de `hreflang`** — en poser un désignerait des pages qui n'existent pas.
   Servir réellement plusieurs langues demanderait un routage `/fr` `/en`, qui
   est un chantier à part entière.
3. **Favicon marchand = monogramme.** La table `sites` n'a **aucune colonne
   `logo`** — seulement `name` et `primary_color`. Le monogramme est la seule
   chose vraie qu'on puisse dessiner à partir de ce que le marchand a fourni.
   Accepter un logo marchand demanderait une colonne, un upload et une
   migration : c'est un lot à part, pas un détail de ce chantier.
4. **Redirection `www` : rien changé, c'était déjà correct.** Mesuré en
   production : `http://deribfy.com` → 308 → `https://deribfy.com` → 308 →
   `https://www.deribfy.com` (200). La forme canonique est donc `www`, et toutes
   les `canonical` posées pointent dessus. (308 et non 301 : Google les traite
   identiquement pour la canonicalisation.)

## À arbitrer (décision propriétaire)

- **JSON-LD `Organization` sur l'accueil.** Aujourd'hui il n'est monté que sur
  `/about` (décision du 2026-08-26, motif : le layout racine sert aussi les
  sites marchands). Le motif **ne s'applique pas à l'accueil** : `proxy.ts`
  réécrit `/` en `/sites/{slug}`, donc un marchand ne voit jamais l'accueil.
  Or Google attend l'entité de marque sur la page d'accueil — c'est l'un des
  signaux des sitelinks que tu demandes. **Je n'ai rien changé**, la décision
  est datée et elle t'appartient.

## Reste manuel (propriétaire)

*(rempli en fin de chantier)*
