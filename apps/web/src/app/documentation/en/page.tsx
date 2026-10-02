import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { Sommaire } from '../_composants/Vues'

// ── CES PAGES SONT RENDUES À LA REQUÊTE, PAS AU BUILD.
//
// ÉTAT TROUVÉ : `force-static`. MESURÉ LE 2026-10-02 : `proxy.ts` pose bien
// `x-deribfy-lang: en` sur ce segment, et la production servait pourtant
// `<html lang="fr">`. La raison tient en une ligne : une page prégénérée a
// son HTML — attribut `lang` compris — écrit AVANT qu'une requête existe,
// donc avant qu'un en-tête puisse être lu. Un proxy ne réécrit pas un fichier
// déjà produit.
//
// CE QUE ÇA COÛTE, ET C'EST DIT : ces pages passent de « servies telles
// quelles » à « assemblées à la demande ». Elles ne font AUCUNE entrée-sortie
// — leur contenu vient d'un fichier local — donc le rendu revient à assembler
// du JSX. Même arbitrage que celui déjà consigné dans `langueServie.ts`.
//
// LA VERSION FRANÇAISE, ELLE, RESTE PRÉGÉNÉRÉE : le français est la langue
// par défaut de la plateforme, son `lang` est donc juste sans aucun en-tête.
// On ne paie que là où il faut.
export const dynamic = 'force-dynamic'

const TITRE = 'Deribfy documentation — build a site or store with AI'
const DESCRIPTION =
  'What Deribfy does, how it does it, and what it does not do. Twelve chapters: how it works, ' +
  'generation and editing, online store, dropshipping, marketing, SEO, domains, limits, FAQ.'
const URL = 'https://www.deribfy.com/documentation/en'

export const metadata: Metadata = {
  ...pageMetadata({ titre: TITRE, description: DESCRIPTION, chemin: '/documentation/en' }),
  alternates: {
    canonical: URL,
    languages: { fr: '/documentation', en: '/documentation/en' },
  },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'Deribfy',
    // Le segment est anglophone : l'annoncer évite qu'un partage hérite du
    // `fr_FR` appliqué par défaut au reste du site.
    locale: 'en_US',
    type: 'website',
  },
}

export default function Page() {
  return <Sommaire langue="en" />
}
