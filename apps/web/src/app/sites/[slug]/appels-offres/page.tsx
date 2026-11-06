import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchAvisIndex } from './fetchAvis'
import { getAvisLabels, formatDateHeure, libelleEtat, tronquer } from './labels'
import { resolveSiteBaseUrl } from '../themes/shared'
import { ogLocaleFor } from '@/lib/i18n/supportedLanguages'
import HtmlLang from '../themes/HtmlLang'
import JsonLdScript from '../themes/JsonLdScript'

// ============================================================
// A2 (c) -- LISTE PUBLIQUE DES AVIS DE MARCHE.
//
// AUCUN `export const revalidate`, ET C'EST LA MEME DECISION QUE LE BLOG.
// Cette page appelle `headers()` pour resoudre le domaine reellement servi :
// la declarer revalidable ouvrirait un cache PARTAGE entre locataires. Sur un
// portail de marches, un cache inter-locataire servirait l'avis d'un acheteur
// sur le domaine d'un autre.
//
// SEGMENT STATIQUE, DONC PRIORITAIRE SUR LE CATCH-ALL `[...rest]` dans
// l'ordre de routage de Next.js. Rien a ajouter au proxy :
// `cpa-tchad.deribfy.app/appels-offres` est deja reecrit en
// `/sites/{slug}/appels-offres`.
//
// LIENS ABSOLUS, RESOLUS PAR `resolveSiteBaseUrl`. Un chemin plateforme en
// dur serait re-prefixe par le proxy sur un sous-domaine et tomberait en 404.
// ============================================================

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const donnees = await fetchAvisIndex(slug)
  if (!donnees) return { title: 'Appels d’offres introuvables' }

  const { site } = donnees
  const t = getAvisLabels(site.lang)
  const title = `${t.titre} — ${site.name}`
  const description = tronquer(site.slogan ?? site.about)
  const url = `${resolveSiteBaseUrl(site, (await headers()).get('host'))}/appels-offres`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: site.name,
      type: 'website', locale: ogLocaleFor(site.lang),
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function AppelsOffresPage({ params }: Props) {
  const { slug } = await params
  const donnees = await fetchAvisIndex(slug)
  if (!donnees) notFound()

  const { site, avis } = donnees
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const t = getAvisLabels(site.lang)
  const accent = site.primary_color || '#111111'
  const lang = (site.lang || 'fr').slice(0, 2)
  const rtl = lang === 'ar'

  // JSON-LD. `CollectionPage` + `ItemList`, ET NON un type invente.
  // schema.org ne modelise PAS l'avis de marche : lui attribuer `Product` ou
  // `Offer` dirait aux moteurs qu'un marche public est un article en vente.
  // Un portail d'Etat ne se declare pas en boutique faute de vocabulaire.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${t.titre} — ${site.name}`,
    url: `${base}/appels-offres`,
    inLanguage: site.lang || undefined,
    isPartOf: { '@type': 'WebSite', name: site.name, url: base },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: avis.length,
      itemListElement: avis.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: a.objet,
        url: `${base}/appels-offres/${encodeURIComponent(a.reference_slug)}`,
      })),
    },
  }

  const contact = site.contact ?? {}

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <HtmlLang lang={site.lang} />
      <main
        dir={rtl ? 'rtl' : 'ltr'}
        style={{ maxWidth: 1040, margin: '0 auto', padding: '64px 24px' }}
      >
        <Link href={base} style={{ fontSize: 14, color: accent, textDecoration: 'none' }}>
          {t.accueil}
        </Link>

        <h1 style={{ fontSize: 40, fontWeight: 800, margin: '24px 0 8px', letterSpacing: '-0.02em' }}>
          {t.titre}
        </h1>
        <p style={{ fontSize: 15, opacity: 0.6, margin: '0 0 48px' }}>
          {t.sousTitre} — {site.name}
        </p>

        {avis.length === 0 ? (
          // ============================================================
          // LA SECTION VIDE INFORME, ELLE NE DECORE PAS. Loi du lot A2 ③ :
          // les comptes ne mentent pas quand ils sont a zero.
          //
          // ET ELLE N'INVENTE AUCUN CANAL. Un avis porte sa propre
          // `canal_officiel_url` ; a zero avis, il n'y a aucune URL a
          // afficher, et le site ne declare nulle part de canal officiel --
          // mesure du 2026-11-06 sur les 40 champs non vides de la CPA. La
          // regle du proprietaire tranche : « on ne met rien sur ce site que
          // la CPA n'ait pas dit ». On renvoie donc au contact que l'acheteur
          // a REELLEMENT donne, et a rien d'autre.
          // ============================================================
          <section
            aria-labelledby="avis-vide"
            style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 14, padding: '32px 28px' }}
          >
            <h2 id="avis-vide" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>
              {t.vide}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.75, margin: 0 }}>
              {t.videSuite}
            </p>
            {(contact.email || contact.phone) && (
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: '16px 0 0' }}>
                {contact.email && (
                  <a href={`mailto:${contact.email}`} style={{ color: accent }}>{contact.email}</a>
                )}
                {contact.email && contact.phone && <span style={{ opacity: 0.4 }}> · </span>}
                {contact.phone && (
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`} style={{ color: accent }}>
                    {contact.phone}
                  </a>
                )}
              </p>
            )}
          </section>
        ) : (
          // Le tableau defile DANS SON PROPRE CONTENEUR : le corps de la page
          // ne part jamais en defilement horizontal (WCAG 2.2 AA, 1.4.10).
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <caption style={{ textAlign: rtl ? 'right' : 'left', paddingBottom: 12, opacity: 0.6, fontSize: 14 }}>
                {t.sousTitre} — {site.name}
              </caption>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.15)' }}>
                  {[t.colReference, t.colObjet, t.colRemise, t.colEtat].map((c) => (
                    <th
                      key={c}
                      scope="col"
                      style={{
                        textAlign: rtl ? 'right' : 'left', padding: '12px 14px',
                        fontWeight: 700, whiteSpace: 'nowrap',
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {avis.map((a) => {
                  const limite = formatDateHeure(a.remise_le, site.lang)
                  return (
                    <tr key={a.reference_slug} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                      <th
                        scope="row"
                        style={{
                          textAlign: rtl ? 'right' : 'left', padding: '14px',
                          fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top',
                        }}
                      >
                        <Link
                          href={`${base}/appels-offres/${encodeURIComponent(a.reference_slug)}`}
                          style={{ color: accent, textDecoration: 'none' }}
                        >
                          {a.reference}
                        </Link>
                      </th>
                      <td style={{ padding: '14px', lineHeight: 1.5 }}>{a.objet}</td>
                      {/* `font-variant-numeric: tabular-nums` : des echeances
                          qui ne s'alignent pas se comparent mal, et comparer
                          des echeances est la raison d'etre de cette colonne. */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {limite ?? <span aria-hidden="true">—</span>}
                        {!limite && <span style={{ position: 'absolute', left: -9999 }}>{t.colRemise}</span>}
                      </td>
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        {libelleEtat(a.etat, site.lang)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
