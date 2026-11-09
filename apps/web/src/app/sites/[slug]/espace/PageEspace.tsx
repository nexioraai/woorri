import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { lireBlocs } from '../pages/blocs'
import BlocsDePage from '../pages/BlocsDePage'
import { ouvreDesComptes } from '../acces/ouvreDesComptes'
import { motsEspace } from '../espace-client/motsEspace'

// ============================================================================
// LOT 11 — LE GABARIT DES PAGES D'ESPACE.
//
// ── UNE SEULE FAÇON DE CONSTRUIRE UNE PAGE D'ESPACE.
//
// Quatre adresses (`/espace-client`, `/mes-demandes`, `/mes-reclamations`,
// `/mon-profil`) partagent la même carcasse : site résolu, capacité
// vérifiée, `noindex`, blocs déclarés au-dessus, retour à l'accueil.
// Les écrire quatre fois, c'est quatre endroits où le `noindex` peut manquer
// à l'un d'eux — et personne ne le verrait.
//
// ── LA CAPACITÉ DÉCIDE DE L'EXISTENCE, ICI AUSSI.
//
// Ce sont des routes MOTEUR : sans cette garde, un visiteur d'une boutique
// de fleurs aurait une page « mes demandes ».
//
// ── LE GABARIT NE LIT AUCUN COMPTE.
//
// Il rend le cadre ; ce qu'il contient vient de routes appelées avec le
// jeton du visiteur. Lire le compte ici obligerait à deviner l'identité
// depuis un cookie que ce site ne pose pas.
// ============================================================================

export type PropsEspace = { params: Promise<{ slug: string }> }

type SitePublic = {
  id: string; slug: string; name: string
  primary_color: string | null; lang: string | null; custom_domain: string | null
}

export async function siteDeLEspace(slug: string): Promise<SitePublic | null> {
  const { data } = await supabase
    .from('sites_public')
    .select('id,slug,name,primary_color,lang,custom_domain')
    .eq('slug', slug)
    .maybeSingle()
  return (data as SitePublic | null) ?? null
}

export async function metadonneesEspace(
  chemin: string,
  titre: (lang: string | null) => string,
  { params }: PropsEspace,
): Promise<Metadata> {
  const { slug } = await params
  const s = await siteDeLEspace(slug)
  if (!s) return {}
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  return {
    title: `${titre(s.lang)} — ${s.name}`,
    alternates: { canonical: `${base}/${chemin}` },
    // UNE PAGE D'ESPACE NE S'INDEXE PAS : elle ne montre rien de public, et
    // l'indexer invite à y entrer au hasard.
    robots: { index: false, follow: false },
  }
}

export default async function PageEspace({
  chemin, titre, phrase, params, rendu,
}: {
  chemin: string
  titre: (lang: string | null) => string
  phrase?: (lang: string | null) => string
  rendu: (ctx: { slug: string; base: string; accent: string; lang: string | null }) => React.ReactNode
} & PropsEspace) {
  const { slug } = await params
  const s = await siteDeLEspace(slug)
  if (!s) notFound()
  // Un site qui n'ouvre pas de comptes n'a pas une page d'espace « vide » :
  // il n'en a pas du tout.
  if (!(await ouvreDesComptes(s.id))) notFound()

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'

  const { data: declaree } = await supabase
    .from('site_pages_public')
    .select('blocs')
    .eq('site_id', s.id)
    .eq('chemin', chemin)
    .maybeSingle()
  const textes = lireBlocs((declaree as { blocs?: unknown } | null)?.blocs)

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          {/* LE LIBELLÉ DIT OÙ ON VA. Premier jet : « ← Accueil » pointant
              vers l'espace — un lien qui ment sur sa destination fait
              hésiter avant de cliquer, puis fait cliquer ailleurs. */}
          <Link href={`${base}/espace-client`} style={{ color: accent }}>
            {'← ' + motsEspace(s.lang).titre}
          </Link>
        </p>
        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>
          {titre(s.lang)}
        </h1>
        {phrase && (
          <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.78, margin: '0 0 28px', maxWidth: '60ch' }}>
            {phrase(s.lang)}
          </p>
        )}

        {textes.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
          </div>
        )}

        {rendu({ slug: s.slug, base, accent, lang: s.lang })}
      </main>
    </div>
  )
}
