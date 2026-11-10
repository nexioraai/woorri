import { ogDePage } from '../../themes/metadonneesDuSite'
import { fetchSite } from '../../themes/shared'
import { generateMetadata as metadonneesPageDeclaree } from '../../[...rest]/page'
import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveSiteBaseUrl } from '../../themes/shared'
import HtmlLang from '../../themes/HtmlLang'
import { fetchSiteCatalogue, fetchFicheProduit } from '../fetchCatalogue'
import PageDeclaree from '../../[...rest]/page'
import { fetchPage } from '../../pages/fetchPage'

// ============================================================================
// LOT 6 — LA FICHE D'UN PRODUIT.
//
// UN PRODUIT NON PUBLIÉ REND 404, PAS UNE PAGE VIDE. Et sans distinguer
// « cette référence n'existe pas » de « elle existe mais n'est pas encore
// publiée » : sinon la référence d'un produit en préparation fuiterait par
// son code de retour. C'est la règle de `fetchPage`, appliquée ici.
//
// AUCUN PRIX, AUCUN STOCK, AUCUN BOUTON D'ACHAT. La table n'en porte pas :
// il n'y a rien à masquer, donc rien à oublier de masquer.
//
// LE JSON-LD NE DÉCLARE PAS UN `Product`. schema.org rattacherait une
// `Offer` et un prix à ce qui n'en a pas : un portail d'État ne se déclare
// pas en boutique faute de vocabulaire. On n'émet donc rien plutôt que de
// mentir aux moteurs.
// ============================================================================

type Props = { params: Promise<{ slug: string; reference: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, reference } = await params
  const s = await fetchSiteCatalogue(slug)
  if (!s) return {}
  const p = await fetchFicheProduit(s.id, decodeURIComponent(reference))
  // PAS UN PRODUIT : c'est peut-etre une SOUS-PAGE declaree. LOT 18 --
  // mesuré le 2026-11-10 : rendre `{}` ici laissait `/catalogue/commander`
  // et `/catalogue/categories` porter le titre ET la canonique de
  // deribfy.com, car le rendu delegue a la page declaree mais PAS ses
  // metadonnees. On delegue donc aussi les metadonnees.
  if (!p) return metadonneesPageDeclaree({ params: Promise.resolve({ slug, rest: ['catalogue', decodeURIComponent(reference)] }) })
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const title = `${p.denomination} — ${s.name}`
  const description = [p.denomination, p.dosage, p.forme, p.conditionnement].filter(Boolean).join(' · ')
  const url = `${base}/catalogue/${encodeURIComponent(p.reference)}`
  const complet = await fetchSite(slug)
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(complet ? ogDePage(complet, url, title, description) : {}),
  }
}

export default async function FicheProduitPage({ params }: Props) {
  const { slug, reference } = await params
  const s = await fetchSiteCatalogue(slug)
  if (!s) notFound()

  const ref = decodeURIComponent(reference)
  const p = await fetchFicheProduit(s.id, ref)

  // ── CE SEGMENT CAPTURE AUSSI LES SOUS-PAGES DECLAREES.
  //
  // `/catalogue/categories` et `/catalogue/commander` sont des PAGES de la
  // CPA, pas des references. Un segment dynamique passe avant le catch-all,
  // donc elles arrivaient ici et rendaient 404 -- mesure le 2026-11-08,
  // deux pages publiees tombees par le lot 6.
  //
  // On delegue au rendu de la page declaree, qu'on REEMPLOIE au lieu de le
  // recopier : deux rendus de la meme page divergeraient.
  if (!p) {
    const declaree = await fetchPage(s.id, `catalogue/${ref}`)
    if (declaree) {
      return PageDeclaree({ params: Promise.resolve({ slug, rest: ['catalogue', ref] }) })
    }
    // REFUS UNIQUE : ni produit, ni page — meme 404 qu'une reference
    // inexistante, pour ne pas reveler un brouillon par son code.
    notFound()
  }

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'

  const lignes: [string, string | null][] = [
    ['Référence', p.reference],
    ['Dénomination', p.denomination],
    ['Famille', p.famille],
    ['Forme', p.forme],
    ['Dosage', p.dosage],
    ['Conditionnement', p.conditionnement],
    ['Conservation', p.chaine_du_froid ? 'Chaîne du froid — 2 à 8 °C' : null],
  ]

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          <Link href={`${base}/catalogue`} style={{ color: accent }}>← Catalogue</Link>
        </p>

        <h1 style={{ fontSize: 'clamp(24px, 5.5vw, 32px)', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.25 }}>
          {p.denomination}
        </h1>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, color: '#5b5b5b', margin: '0 0 26px' }}>
          {p.reference}
        </p>

        <dl style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px',
          margin: 0, border: '1px solid #e3e3e3', borderRadius: 12, padding: '18px 20px',
        }}>
          {lignes.filter(([, v]) => v !== null && v !== '').map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt style={{ fontSize: 14, color: '#5b5b5b', whiteSpace: 'nowrap' }}>{k}</dt>
              <dd style={{ margin: 0, fontSize: 16, color: '#111111', lineHeight: 1.5 }}>{v}</dd>
            </div>
          ))}
        </dl>

        {p.note && (
          <p style={{
            marginTop: 18, padding: '14px 16px', borderRadius: 12,
            background: '#f7f7f8', fontSize: 16, lineHeight: 1.65, whiteSpace: 'pre-wrap',
          }}>{p.note}</p>
        )}

        {/* AUCUN PRIX, AUCUN BOUTON D'ACHAT. La commande passe par le
            circuit de la Centrale, pas par cette page. */}
        <p style={{ marginTop: 22, fontSize: 15, color: '#5b5b5b', lineHeight: 1.6 }}>
          Les commandes sont réservées aux structures agréées et se font par bon de commande.{' '}
          <Link href={`${base}/catalogue/commander`} style={{ color: accent, fontWeight: 600 }}>
            Voir la marche à suivre
          </Link>
        </p>
      </main>
    </div>
  )
}
