import type { Metadata } from 'next'

// ============================================================
// SOCLE SEO DE `deribfy.com` — UNE SEULE SOURCE POUR TITRE, DESCRIPTION,
// CANONICAL, OPEN GRAPH ET TWITTER.
//
// LE DÉFAUT QU'IL FERME, mesuré le 2026-09-23 : sur 25 routes, **21 pages
// n'avaient aucune metadata**. Next se rabat alors sur celle du layout racine —
// donc `/privacy`, `/cookies` et `/terms` servaient à Google le TITRE ET LA
// DESCRIPTION DE L'ACCUEIL. Trois pages distinctes, une seule identité : c'est
// le cas d'école du contenu dupliqué, et il coûte le positionnement des trois.
//
// POURQUOI UN SOCLE ET PAS 21 COPIES : parce que la duplication était déjà la
// maladie. Vingt et un blocs écrits à la main dériveraient — l'un oublierait la
// canonical, l'autre l'image Open Graph. Ici, oublier est impossible : le
// chemin suffit, tout le reste en découle.
//
// TOUTES LES PAGES CLIENT passent par un `layout.tsx` de segment : `metadata`
// ne s'exporte pas depuis un composant `'use client'`, et 21 des 25 pages en
// sont. C'est précisément pourquoi elles n'en avaient aucune.
// ============================================================

/** Forme canonique du site. UNE seule — voir `redirection www` plus bas. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.deribfy.com'

export const SITE_NOM = 'Deribfy'

/** Image Open Graph par défaut, produite par `scripts/generer-icones.mjs`. */
export const OG_DEFAUT = `${SITE_URL}/og-deribfy.png`

export type EntreeSeo = {
  /** Titre PROPRE à la page. Jamais celui d'une autre. */
  titre: string
  /** Description PROPRE à la page, 70–160 caractères utiles. */
  description: string
  /** Chemin depuis la racine, avec le `/` initial. `'/'` pour l'accueil. */
  chemin: string
  /** Image sociale ; l'image de marque par défaut sinon. */
  image?: string
  /**
   * Page tenue HORS de l'index. Vrai pour tout ce qui est derrière une
   * connexion : ces pages n'ont rien à apporter à un visiteur venu de Google,
   * et leur indexation dilue le site.
   */
  noindex?: boolean
}

/**
 * Construit la metadata complète d'une page.
 *
 * `title` est laissé BRUT, sans suffixe automatique : un gabarit
 * « … | Deribfy » mange la place utile dans un résultat Google (≈ 60
 * caractères) et pousse le mot qui compte hors de l'affichage. Chaque titre
 * porte donc déjà sa marque, quand elle sert.
 */
export function pageMetadata(entree: EntreeSeo): Metadata {
  const url = entree.chemin === '/' ? SITE_URL : `${SITE_URL}${entree.chemin}`
  const image = entree.image ?? OG_DEFAUT

  return {
    title: entree.titre,
    description: entree.description,
    // La canonical désigne la SEULE adresse qui fait foi. Sans elle, la version
    // sans `www`, celle avec, et toute variante à paramètres sont trois pages
    // aux yeux du moteur — qui se concurrencent entre elles.
    alternates: { canonical: url },
    robots: entree.noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      title: entree.titre,
      description: entree.description,
      url,
      siteName: SITE_NOM,
      locale: 'fr_FR',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NOM }],
    },
    twitter: {
      card: 'summary_large_image',
      title: entree.titre,
      description: entree.description,
      images: [image],
    },
  }
}

/**
 * LE REGISTRE DES PAGES PUBLIQUES — source unique, et la seule chose que le
 * cliquet `seo.test.ts` a besoin de lire pour prouver qu'aucune page n'emprunte
 * le titre d'une autre.
 *
 * Il vit ici plutôt que dispersé dans 25 fichiers pour une raison précise : une
 * duplication de titre ne se voit JAMAIS fichier par fichier. Elle ne se voit
 * qu'en les regardant tous ensemble.
 */
export const PAGES_PUBLIQUES = {
  '/': {
    titre: 'Deribfy — Créez votre boutique en ligne en 60 secondes',
    description:
      'Décrivez votre activité, obtenez une boutique ou un site professionnel complet en 60 secondes. ' +
      'Paiement mobile, WhatsApp, nom de domaine : tout est prêt, sans compétence technique.',
  },
  '/about': {
    titre: 'À propos de Deribfy — qui nous sommes et pourquoi',
    description:
      'Deribfy rend le commerce en ligne accessible aux marchands qui n’ont ni développeur ni agence. ' +
      'Notre histoire, notre équipe et ce que nous construisons.',
  },
  '/pricing': {
    titre: 'Tarifs Deribfy — un prix clair, sans surprise',
    description:
      'Nos formules, ce qu’elles contiennent et ce qu’elles coûtent. Sans engagement caché, ' +
      'sans commission sur vos ventes.',
  },
  '/blog': {
    titre: 'Blog Deribfy — vendre en ligne, concrètement',
    description:
      'Conseils pratiques pour lancer et faire vivre une boutique en ligne : photos de produits, ' +
      'prix, paiement mobile, référencement et relation client.',
  },
  '/visibilite-ia': {
    titre: 'Visibilité IA — être trouvé par ChatGPT et les moteurs de réponse',
    description:
      'Comment Deribfy rend votre boutique lisible par les assistants IA et les moteurs de réponse, ' +
      'en plus des moteurs de recherche classiques.',
  },
  '/privacy': {
    titre: 'Politique de confidentialité — Deribfy',
    description:
      'Quelles données Deribfy collecte, pourquoi, combien de temps elles sont conservées, ' +
      'et comment exercer vos droits.',
  },
  '/cookies': {
    titre: 'Politique de cookies — Deribfy',
    description:
      'Les cookies utilisés par Deribfy, leur rôle, leur durée de vie et la façon de les refuser ' +
      'ou de revenir sur votre choix.',
  },
  '/terms': {
    titre: 'Conditions générales d’utilisation — Deribfy',
    description:
      'Les règles d’utilisation de Deribfy : ce que le service fournit, vos obligations, ' +
      'la facturation, la résiliation et les responsabilités de chacun.',
  },
} as const satisfies Record<string, { titre: string; description: string }>

/** Metadata d'une page publique, depuis le registre. */
export function metadataPublique(chemin: keyof typeof PAGES_PUBLIQUES): Metadata {
  return pageMetadata({ ...PAGES_PUBLIQUES[chemin], chemin })
}

/**
 * Metadata d'une page PRIVÉE : titre propre, et hors index.
 *
 * Le titre reste soigné même hors index — c'est celui que le marchand lit dans
 * l'onglet de son navigateur pendant qu'il travaille, et plusieurs onglets
 * portant tous « Deribfy » sont indiscernables.
 */
export function metadataPrivee(titre: string, chemin: string): Metadata {
  return pageMetadata({
    titre,
    description: 'Espace privé Deribfy.',
    chemin,
    noindex: true,
  })
}
