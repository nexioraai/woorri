import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/seo/metadata'
import { chapitreParSlug, adresses, slug } from '@/lib/documentation/corpus'
import { PageChapitre } from '../_composants/Vues'

export const dynamic = 'force-static'
// Les douze adresses sont connues : tout autre chemin est une erreur, pas une
// page à fabriquer à la demande. Sans cela, `/documentation/n-importe-quoi`
// ferait lire un fichier au serveur en production.
export const dynamicParams = false

export function generateStaticParams() {
  return adresses('fr').map((chapitre) => ({ chapitre }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapitre: string }>
}): Promise<Metadata> {
  const { chapitre: adresse } = await params
  const c = chapitreParSlug('fr', adresse)
  if (!c) return {}
  // Le titre et la description viennent du chapitre lui-même — de son `#` et de
  // sa citation de tête. Aucune liste parallèle à tenir à jour : le texte publié
  // et ce que lit le moteur ne peuvent pas diverger.
  const jumeau = slug(c.id, 'en')
  return {
    ...pageMetadata({
      titre: `${c.titre} — Documentation Deribfy`,
      description: c.resume,
      chemin: `/documentation/${c.slug}`,
    }),
    alternates: {
      canonical: `https://www.deribfy.com/documentation/${c.slug}`,
      languages: {
        fr: `/documentation/${c.slug}`,
        ...(jumeau ? { en: `/documentation/en/${jumeau}` } : {}),
      },
    },
  }
}

export default async function Page({ params }: { params: Promise<{ chapitre: string }> }) {
  const { chapitre: adresse } = await params
  const c = chapitreParSlug('fr', adresse)
  if (!c) notFound()
  return <PageChapitre langue="fr" chapitre={c} />
}
