import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { lecteurDuSite } from '@/lib/lecteurDuSite'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { lireBlocs } from '../pages/blocs'
import BlocsDePage from '../pages/BlocsDePage'
import { siteDe, type PropsAcces } from '../acces/PageAcces'
import { motsAcces } from '../acces/libelles'
import EspaceClient from './EspaceClient'
import CadreEspace from '../espace/CadreEspace'
import { motsEspace } from './motsEspace'
import { motsCommandes } from '../espace/motsCommandes'
import { ouvreDesComptes } from '../acces/ouvreDesComptes'

// ============================================================================
// LOT 11 — L'ESPACE D'UNE STRUCTURE OU D'UN FOURNISSEUR.
//
// LE SERVEUR NE LIT AUCUN COMPTE. Il rend le cadre ; l'état vient de
// `/api/sites/[slug]/mon-compte`, appelé avec le jeton du visiteur. Lire le
// compte ici obligerait à deviner l'identité depuis un cookie que ce site
// ne pose pas — et à inventer une deuxième source de vérité sur « qui êtes
// vous ».
//
// `noindex`, comme les trois écrans d'accès.
// ============================================================================

export async function generateMetadata({ params }: PropsAcces): Promise<Metadata> {
  const { slug } = await params
  const s = await siteDe(slug)
  if (!s) return {}
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const m = motsEspace(s.lang)
  return {
    title: `${m.titre} — ${s.name}`,
    alternates: { canonical: `${base}/espace-client` },
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params }: PropsAcces) {
  const supabase = await lecteurDuSite()
  const { slug } = await params
  const s = await siteDe(slug)
  if (!s) notFound()
  // LA CAPACITÉ DÉCIDE DE L'EXISTENCE DE LA PAGE. Un site qui n'ouvre pas de
  // comptes n'a pas un écran d'accès « vide » : il n'en a pas du tout.
  if (!(await ouvreDesComptes(s.id))) notFound()

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'
  const m = motsEspace(s.lang)

  const { data: declaree } = await supabase
    .from('site_pages_public')
    .select('blocs')
    .eq('site_id', s.id)
    .eq('chemin', 'espace-client')
    .maybeSingle()
  const textes = lireBlocs((declaree as { blocs?: unknown } | null)?.blocs)

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* LE TABLEAU DE BORD (CPA, 2026-11-19) — voir CadreEspace. */}
        <CadreEspace slug={s.slug} base={base} accent={accent} lang={s.lang} actif="espace-client"
          titre={m.titre} retour={{ href: base, libelle: motsAcces(s.lang).accueil }}>
          {textes.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
            </div>
          )}
          <EspaceClient slug={s.slug} base={base} primary={accent} mots={m} motsCmd={motsCommandes(s.lang)} />
        </CadreEspace>
      </main>
    </div>
  )
}
