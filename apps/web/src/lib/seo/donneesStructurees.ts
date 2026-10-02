// ============================================================
// CE QUE LES MOTEURS DOIVENT COMPRENDRE DE DERIBFY LUI-MÊME.
//
// ── LE DÉFAUT QU'IL FERME, constaté le 2026-10-02 dans les résultats Google.
//
// La recherche « Deribfy » rendait la MÊME page d'accueil trois ou quatre fois
// de suite, au lieu des liens de section qu'affichent les concurrents
// (« Tarifs », « À propos », « Connexion »). Google ne voyait pas une
// plateforme avec des sections : il voyait une page, répétée.
//
// Les boutiques des marchands, elles, émettaient déjà leur JSON-LD depuis
// `sites/[slug]/themes/JsonLdScript.tsx`. Deribfy n'en émettait AUCUN sur ses
// propres pages — le cordonnier mal chaussé.
//
// ── CE QUE ÇA NE FAIT PAS, ET IL FAUT LE DIRE.
//
// Les liens de section (« sitelinks ») ne se COMMANDENT pas : Google les
// choisit seul, et aucun balisage ne les garantit. `SiteNavigationElement`
// n'est pas une case à cocher qui les déclenche. Ce qui est vrai : sans
// structure déclarée, un moteur n'a rien à comprendre ; avec elle, il a de
// quoi. On met donc les chances du bon côté sans promettre le résultat.
//
// Ce qui est, lui, DIRECTEMENT utile et immédiat : l'entité `Organization`
// relie le nom, le logo et le site — c'est ce qui nourrit la fiche de marque,
// et ce que les moteurs de réponse (ChatGPT, Perplexity) lisent pour savoir
// QUI est Deribfy.
// ============================================================

import { headers } from 'next/headers'
import { SITE_URL, SITE_NOM, PAGES_PUBLIQUES } from './metadata'
import { EN_TETE_LANGUE } from './langueServie'

// ── UNE SECTION DÉCLARÉE DOIT ÊTRE UNE PAGE INDEXABLE.
//
// CORRIGÉ LE JOUR MÊME : la première version listait `/login`, qui sert
// `noindex, nofollow`. Déclarer à un moteur « voici une section du site »
// tout en lui interdisant de l'indexer est un signal qui se contredit —
// vérifié en production sur les cinq pages.
//
// `/documentation` la remplace : indexable, substantielle (douze chapitres),
// et c'est ce qu'un visiteur venu de Google cherche réellement.
/** Les sections que Deribfy met en avant, dans l'ordre où elles comptent. */
const SECTIONS = ['/pricing', '/about', '/documentation', '/blog', '/visibilite-ia'] as const

/** Le libellé court d'une section — celui qu'un humain lirait dans un menu. */
const LIBELLES: Record<string, string> = {
  '/pricing': 'Tarifs',
  '/about': 'À propos',
  '/documentation': 'Documentation',
  '/blog': 'Blog',
  '/visibilite-ia': 'Visibilité IA',
}

/** La documentation n'est pas dans le registre des pages publiques : elle a
 *  son propre socle (chapitres). Sa description est donc portée ici. */
const DESCRIPTION_DOCUMENTATION =
  'Ce que Deribfy fait, comment il le fait, et ce qu’il ne fait pas — douze chapitres, du fonctionnement à la mise en ligne.'

/**
 * L'entité Deribfy : qui c'est, où c'est, à quoi ça ressemble.
 *
 * `@id` est stable et absolu : c'est l'identifiant que les autres blocs
 * référencent, et qu'un moteur recoupe d'une page à l'autre.
 */
export function organisation() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organisation`,
    name: SITE_NOM,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon.png`,
      width: 512,
      height: 512,
    },
    description: PAGES_PUBLIQUES['/'].description,
  }
}

/**
 * Le site, rattaché à son organisation.
 *
 * Pas de `potentialAction` : Deribfy n'expose pas de recherche publique, et
 * déclarer une action qui n'existe pas est un mensonge qu'un moteur vérifie.
 */
export function siteWeb() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#site`,
    url: SITE_URL,
    name: SITE_NOM,
    inLanguage: 'fr',
    publisher: { '@id': `${SITE_URL}/#organisation` },
  }
}

/**
 * Les sections du site, nommées et adressées.
 *
 * Chaque entrée porte le titre COMPLET de sa page — celui du socle SEO, donc
 * jamais une seconde version qui dériverait de l'autre.
 */
export function navigation() {
  return SECTIONS.map((chemin) => ({
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: LIBELLES[chemin],
    description:
      chemin === '/documentation'
        ? DESCRIPTION_DOCUMENTATION
        : PAGES_PUBLIQUES[chemin as keyof typeof PAGES_PUBLIQUES].description,
    url: `${SITE_URL}${chemin}`,
  }))
}

/** Tout ce que la plateforme déclare, en un seul tableau. */
export function donneesPlateforme() {
  return [organisation(), siteWeb(), ...navigation()]
}

// ── CE BLOC N'A RIEN À FAIRE SUR LA BOUTIQUE D'UN MARCHAND.
//
// Le layout racine enveloppe AUSSI les pages `/sites/[slug]` et les domaines
// personnels. Y émettre l'identité Deribfy marquerait chaque boutique à
// l'enseigne de son fournisseur — le défaut exact que `favicon` décrit, et
// qui dirait à Google que la boutique du marchand EST Deribfy.
//
// Le discriminant existe déjà : `proxy.ts` pose `x-deribfy-lang` UNIQUEMENT
// quand la requête sert un site marchand. Sa présence suffit, et on n'a pas
// besoin de lui faire confiance au-delà de « présent ou non ».
//
// FAIL-SAFE INVERSE DE `langueServie` : au moindre doute on N'ÉMET PAS.
// Taire un balisage ne coûte qu'un signal ; l'émettre à tort salit l'identité
// d'un client.
export async function estPagePlateforme(): Promise<boolean> {
  try {
    return (await headers()).get(EN_TETE_LANGUE) === null
  } catch {
    // Rendu hors requête (génération statique, tests) : la plateforme.
    return true
  }
}
