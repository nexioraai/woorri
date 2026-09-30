import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { Sommaire } from '../_composants/Vues'

export const dynamic = 'force-static'

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
