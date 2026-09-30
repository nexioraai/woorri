import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { Sommaire } from './_composants/Vues'

// La documentation est un texte fixe, lu sur le disque à la CONSTRUCTION : rien
// ici ne dépend d'une requête. Les pages sont donc figées au build, et aucune
// lecture de fichier n'a lieu en production.
export const dynamic = 'force-static'

const TITRE = 'Documentation Deribfy — créer un site ou une boutique par IA'
const DESCRIPTION =
  'Ce que Deribfy fait, comment il le fait, et ce qu’il ne fait pas. Douze chapitres : ' +
  'fonctionnement, génération et édition, boutique, dropshipping, marketing, SEO, domaines, limites, FAQ.'

export const metadata: Metadata = {
  ...pageMetadata({ titre: TITRE, description: DESCRIPTION, chemin: '/documentation' }),
  alternates: {
    canonical: 'https://www.deribfy.com/documentation',
    languages: { fr: '/documentation', en: '/documentation/en' },
  },
}

export default function Page() {
  return <Sommaire langue="fr" />
}
