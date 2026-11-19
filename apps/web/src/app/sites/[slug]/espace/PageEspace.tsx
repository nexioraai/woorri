import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { lecteurDuSite } from '@/lib/lecteurDuSite'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { lireBlocs } from '../pages/blocs'
import BlocsDePage from '../pages/BlocsDePage'
import { ouvreDesComptes } from '../acces/ouvreDesComptes'
import { motsEspace } from '../espace-client/motsEspace'
import CadreEspace from './CadreEspace'

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
  const supabase = await lecteurDuSite()
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
  const supabase = await lecteurDuSite()
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
      <main>
        {/* LE TABLEAU DE BORD (CPA, 2026-11-19) : barre latérale, identité, puis
            la page. Sans compte actif, la page se rend sans cadre, comme avant. */}
        <CadreEspace slug={s.slug} base={base} accent={accent} lang={s.lang} actif={chemin} nomSite={s.name}
          titre={titre(s.lang)} phrase={phrase?.(s.lang)}
          retour={{ href: `${base}/espace-client`, libelle: '← ' + motsEspace(s.lang).titre }}>
          {textes.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
            </div>
          )}
          {rendu({ slug: s.slug, base, accent, lang: s.lang })}
        </CadreEspace>
      </main>
    </div>
  )
}
