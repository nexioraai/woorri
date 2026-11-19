import type { Metadata } from 'next'
import { retourValable } from './retour'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { lecteurDuSite } from '@/lib/lecteurDuSite'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { lireBlocs } from '../pages/blocs'
import BlocsDePage from '../pages/BlocsDePage'
import FormulaireAcces, { type EcranAcces } from './FormulaireAcces'
import { motsAcces } from './libelles'
import { CHEMIN_INTITULES, lireIntitules } from './intitulesFormulaire'
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

export type PropsAcces = { params: Promise<{ slug: string }>; searchParams?: Promise<{ retour?: string; pour?: string }> }

type SitePublic = {
  id: string; slug: string; name: string
  primary_color: string | null; lang: string | null; custom_domain: string | null
}

export async function siteDe(slug: string): Promise<SitePublic | null> {
  const supabase = await lecteurDuSite()
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

export default async function PageAcces({ ecran, params, searchParams }: { ecran: EcranAcces } & PropsAcces) {
  const supabase = await lecteurDuSite()
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
  const titreDeclare = decl?.titre?.trim() || m.titre

  // LES INTITULÉS DU FORMULAIRE — page NON PUBLIÉE, donc lue avec le rôle de
  // service (la vue publique ne la rend pas). Import tardif, comme le gabarit.
  let intitules: ReturnType<typeof lireIntitules> = {}
  if (ecran === 'inscription') {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: page } = await supabaseAdmin.from('site_pages').select('blocs')
      .eq('site_id', s.id).eq('chemin', CHEMIN_INTITULES).maybeSingle()
    intitules = lireIntitules(lireBlocs((page as { blocs?: unknown } | null)?.blocs))
  }
  const libellesVus = {
    ...m.libelles,
    ...(intitules.courriel ? { courriel: intitules.courriel } : {}),
    ...(intitules.motDePasse ? { motDePasse: intitules.motDePasse } : {}),
    ...(intitules.bouton ? { envoyer: intitules.bouton } : {}),
  }
  const champsVus = ecran === 'inscription' ? {
    ...mots.inscription.champs,
    ...(intitules.nom ? { nom: intitules.nom } : {}),
    ...(intitules.organisation ? { organisation: intitules.organisation } : {}),
    ...(intitules.role ? { role: intitules.role } : {}),
    ...(intitules.fournisseur ? { fournisseur: intitules.fournisseur } : {}),
    ...(intitules.structure ? { structure: intitules.structure } : {}),
    ...(intitules.telephone ? { telephone: intitules.telephone } : {}),
  } : undefined
  const phraseVue = decl?.chapeau?.trim() || m.phrase

  // APRÈS LA CONNEXION, L'ESPACE — jamais l'accueil. Renvoyer à l'accueil
  // obligerait la personne à retrouver elle-même où elle allait.
  const q = await searchParams
  const retour = retourValable(q?.retour)
  // CPA, 2026-11-19 — l'inscription est CLIENT par défaut (on y arrive par le
  // menu « Espace client ») ; `?pour=fournisseur` ouvre celle du fournisseur.
  const pour: 'client' | 'fournisseur' = q?.pour === 'fournisseur' ? 'fournisseur' : 'client'
  const suite = retour ? `?retour=${encodeURIComponent(retour)}` : ''
  // CPA, 2026-11-19 — la PORTE DES AGENTS : le même formulaire de connexion,
  // présenté au personnel de la Centrale (`?pour=agent`). Le rôle n'est pas
  // choisi ici : c'est le compte qui le porte.
  const agent = ecran === 'connexion' && q?.pour === 'agent'
  const titreVu = agent ? mots.connexion.agentTitre
    : ecran === 'inscription' && pour === 'fournisseur'
      ? (s.lang?.startsWith('en') ? 'Create a supplier account' : 'Créer un compte fournisseur')
      : titreDeclare
  const destination = ecran === 'connexion' || ecran === 'inscription'
    ? `${base}${retour ?? '/espace-client'}`
    : `${base}/connexion`

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
          {agent ? mots.connexion.agentPhrase : phraseVue}
        </p>

        {textes.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
          </div>
        )}

        <FormulaireAcces ecran={ecran} destination={destination} libelles={libellesVus} primary={accent}
          slug={slug} champs={champsVus} voir={mots.voir} pour={pour} lang={s.lang} />

        <p style={{ fontSize: 14.5, lineHeight: 1.7, marginTop: 26, opacity: 0.85 }}>
          {ecran === 'connexion' && !agent && (<>
            {mots.connexion.pasDeCompte}{' '}
            <Link href={`${base}/inscription${suite}`} style={lien}>{mots.connexion.creer}</Link>
            {' · '}
            <Link href={`${base}/mot-de-passe-oublie`} style={lien}>{mots.connexion.oublie}</Link>
            <br />
            <Link href={`${base}/connexion?pour=agent`} style={{ ...lien, fontWeight: 500, opacity: 0.8 }}>{mots.connexion.agentLien}</Link>
          </>)}
          {agent && (<>
            <Link href={`${base}/mot-de-passe-oublie`} style={lien}>{mots.connexion.oublie}</Link>
            <br />
            <Link href={`${base}/connexion`} style={{ ...lien, fontWeight: 500, opacity: 0.8 }}>{mots.connexion.clientLien}</Link>
          </>)}
          {ecran === 'inscription' && (<>
            {mots.inscription.dejaInscrit}{' '}
            <Link href={`${base}/connexion${suite}`} style={lien}>{mots.inscription.seConnecter}</Link>
            <br />
            {pour === 'client'
              ? <Link href={`${base}/inscription?pour=fournisseur${retour ? `&retour=${encodeURIComponent(retour)}` : ''}`} style={lien}>{mots.inscription.champs.basculeFournisseur}</Link>
              : <Link href={`${base}/inscription${suite}`} style={lien}>{mots.inscription.champs.basculeClient}</Link>}
          </>)}
          {ecran === 'oubli' && (
            <Link href={`${base}/connexion`} style={lien}>{mots.oubli.retour}</Link>
          )}
        </p>
      </main>
    </div>
  )
}
