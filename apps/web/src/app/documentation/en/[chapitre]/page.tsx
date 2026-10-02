import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/seo/metadata'
import { chapitreParSlug, adresses, slug } from '@/lib/documentation/corpus'
import { PageChapitre } from '../../_composants/Vues'

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
