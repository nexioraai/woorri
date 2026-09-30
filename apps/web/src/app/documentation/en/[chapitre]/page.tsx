import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/seo/metadata'
import { chapitreParSlug, adresses, slug } from '@/lib/documentation/corpus'
import { PageChapitre } from '../../_composants/Vues'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return adresses('en').map((chapitre) => ({ chapitre }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapitre: string }>
}): Promise<Metadata> {
  const { chapitre: adresse } = await params
  const c = chapitreParSlug('en', adresse)
  if (!c) return {}
  const url = `https://www.deribfy.com/documentation/en/${c.slug}`
  const jumeau = slug(c.id, 'fr')
  const titre = `${c.titre} — Deribfy documentation`
  return {
    ...pageMetadata({ titre, description: c.resume, chemin: `/documentation/en/${c.slug}` }),
    alternates: {
      canonical: url,
      languages: {
        en: `/documentation/en/${c.slug}`,
        ...(jumeau ? { fr: `/documentation/${jumeau}` } : {}),
      },
    },
    openGraph: {
      title: titre,
      description: c.resume,
      url,
      siteName: 'Deribfy',
      locale: 'en_US',
      type: 'article',
    },
  }
}

export default async function Page({ params }: { params: Promise<{ chapitre: string }> }) {
  const { chapitre: adresse } = await params
  const c = chapitreParSlug('en', adresse)
  if (!c) notFound()
  return <PageChapitre langue="en" chapitre={c} />
}
