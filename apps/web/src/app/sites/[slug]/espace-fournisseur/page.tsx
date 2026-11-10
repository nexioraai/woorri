import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { resolveSiteBaseUrl } from '../themes/shared'
import { siteDeLEspace } from '../espace/PageEspace'

// LOT 12.4 — L'ESPACE FOURNISSEUR EST L'ESPACE.
// Une seconde page d'accueil serait une seconde vérité : on redirige.
//
// ── L'ADRESSE SE RÉSOUT, ELLE NE S'ÉCRIT PAS.
//
// Premier jet : `redirect('/sites/<slug>/espace-client')` en dur. Mesuré en
// ligne le 2026-11-10 : sur le sous-domaine, le proxy re-préfixe ce chemin
// et la redirection tombait en 404. `resolveSiteBaseUrl` existe pour ça, et
// MobileNav le disait déjà en commentaire.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await siteDeLEspace(slug)
  if (!s) notFound()
  redirect(`${resolveSiteBaseUrl(s, (await headers()).get('host'))}/espace-client`)
}
