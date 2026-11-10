import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { lireBlocs } from '../pages/blocs'
import BlocsDePage from '../pages/BlocsDePage'
import FormulaireAcces, { type EcranAcces } from './FormulaireAcces'
import { motsAcces } from './libelles'
import { ouvreDesComptes } from './ouvreDesComptes'

// ============================================================================
// LOT 11 — LE GABARIT DES TROIS ÉCRANS D'ACCÈS.
//
// ── TROIS ADRESSES, UN SEUL GABARIT.
//
// `/connexion`, `/inscription` et `/mot-de-passe-oublie` ont la même forme :
// un titre, une phrase, un formulaire, deux liens. Les écrire trois fois,
// c'est trois endroits où le `noindex` peut manquer à l'un d'eux.
//
// ── `noindex` SUR LES TROIS, SANS EXCEPTION.
//
// Une page d'entrée n'apporte aucun contenu public et, indexée, invite à y
// essayer des adresses. Même règle que `/demandes/suivi`.
//
// ── LEURS TEXTES SONT ÉDITABLES SANS ÉCRAN NEUF.
//
// Comme partout : une page déclarée au même chemin ajoute ses blocs
// au-dessus du formulaire. La Centrale remplace nos mots par les siens
// depuis `/edit`, sans que personne écrive une ligne.
// ============================================================================

export type PropsAcces = { params: Promise<{ slug: string }> }

type SitePublic = {
  id: string; slug: string; name: string
  primary_color: string | null; lang: string | null; custom_domain: string | null
}

export async function siteDe(slug: string): Promise<SitePublic | null> {
  const { data } = await supabase
    .from('sites_public')
    .select('id,slug,name,primary_color,lang,custom_domain')
    .eq('slug', slug)
    .maybeSingle()
  return (data as SitePublic | null) ?? null
}

/** Le chemin d'une adresse d'accès, tel qu'il est déclaré en base. */
export const CHEMIN: Record<EcranAcces, string> = {
  connexion: 'connexion',
  inscription: 'inscription',
  oubli: 'mot-de-passe-oublie',
}

export async function metadonneesAcces(ecran: EcranAcces, { params }: PropsAcces): Promise<Metadata> {
  const { slug } = await params
  const s = await siteDe(slug)
  if (!s) return {}
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const m = motsAcces(s.lang)[ecran === 'oubli' ? 'oubli' : ecran]
  return {
    title: `${m.titre} — ${s.name}`,
    description: m.phrase,
    alternates: { canonical: `${base}/${CHEMIN[ecran]}` },
    // UNE PAGE D'ENTRÉE NE S'INDEXE PAS.
    robots: { index: false, follow: false },
  }
}

export default async function PageAcces({ ecran, params }: { ecran: EcranAcces } & PropsAcces) {
  const { slug } = await params
  const s = await siteDe(slug)
  if (!s) notFound()
  // LA CAPACITÉ DÉCIDE DE L'EXISTENCE DE LA PAGE. Un site qui n'ouvre pas de
  // comptes n'a pas un écran d'accès « vide » : il n'en a pas du tout.
  if (!(await ouvreDesComptes(s.id))) notFound()

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'
  const mots = motsAcces(s.lang)
  const m = mots[ecran]

  const { data: declaree } = await supabase
    .from('site_pages_public')
    .select('titre,chapeau,blocs')
    .eq('site_id', s.id)
    .eq('chemin', CHEMIN[ecran])
    .maybeSingle()
  const decl = declaree as { titre?: string | null; chapeau?: string | null; blocs?: unknown } | null
  const textes = lireBlocs(decl?.blocs)
  // LOT 17 — « tout ce qui est visible doit être éditable » (propriétaire,
  // 2026-11-10). Le titre et la phrase d'introduction viennent de la page
  // déclarée au même chemin quand elle les porte ; sinon, les mots par défaut.
  const titreVu = decl?.titre?.trim() || m.titre
  const phraseVue = decl?.chapeau?.trim() || m.phrase

  // APRÈS LA CONNEXION, L'ESPACE — jamais l'accueil. Renvoyer à l'accueil
  // obligerait la personne à retrouver elle-même où elle allait.
  const destination = ecran === 'connexion'
    ? `${base}/espace-client`
    : ecran === 'inscription' ? `${base}/espace-client` : `${base}/connexion`

  const lien: React.CSSProperties = { color: accent, fontWeight: 600 }

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          <Link href={base} style={{ color: accent }}>{mots.accueil}</Link>
        </p>

        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>
          {titreVu}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.78, margin: '0 0 28px', maxWidth: '58ch' }}>
          {phraseVue}
        </p>

        {textes.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
          </div>
        )}

        <FormulaireAcces ecran={ecran} destination={destination} libelles={m.libelles} primary={accent}
          slug={slug} champs={ecran === 'inscription' ? mots.inscription.champs : undefined} />

        <p style={{ fontSize: 14.5, lineHeight: 1.7, marginTop: 26, opacity: 0.85 }}>
          {ecran === 'connexion' && (<>
            {mots.connexion.pasDeCompte}{' '}
            <Link href={`${base}/inscription`} style={lien}>{mots.connexion.creer}</Link>
            {' · '}
            <Link href={`${base}/mot-de-passe-oublie`} style={lien}>{mots.connexion.oublie}</Link>
          </>)}
          {ecran === 'inscription' && (<>
            {mots.inscription.dejaInscrit}{' '}
            <Link href={`${base}/connexion`} style={lien}>{mots.inscription.seConnecter}</Link>
          </>)}
          {ecran === 'oubli' && (
            <Link href={`${base}/connexion`} style={lien}>{mots.oubli.retour}</Link>
          )}
        </p>
      </main>
    </div>
  )
}
