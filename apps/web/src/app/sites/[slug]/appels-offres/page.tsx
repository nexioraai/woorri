import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchAvisIndex } from './fetchAvis'
import { getAvisLabels, formatDateHeure, libelleEtat, tronquer } from './labels'
import { partager, etatVisible } from './cycleDeVie'
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

  // L'HEURE EST LUE UNE SEULE FOIS ET PASSÉE PARTOUT. Deux appels à
  // `new Date()` dans le même rendu peuvent tomber de part et d'autre d'une
  // échéance : une ligne dirait « Ouvert » pendant que le tri la classerait
  // close. Un écran qui se contredit lui-même est pire qu'un écran en retard.
  const maintenant = new Date()
  const { enCours, clotures } = partager(avis, maintenant)

  const entetes = [t.colReference, t.colObjet, t.colRemise, t.colEtat]

  // Le tableau défile DANS SON PROPRE CONTENEUR : le corps de la page ne part
  // jamais en défilement horizontal (WCAG 2.2 AA, 1.4.10).
  const section = (lignes: typeof avis, titre: string, id: string, note?: string) => (
    <section key={id} aria-labelledby={id} style={{ marginBottom: 48 }}>
      <h2 id={id} style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
        {titre}
      </h2>
      {note && <p style={{ fontSize: 14, opacity: 0.6, margin: '0 0 16px', lineHeight: 1.5 }}>{note}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <caption style={{ position: 'absolute', left: -9999 }}>
            {titre} — {site.name}
          </caption>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.15)' }}>
              {entetes.map((c) => (
                <th key={c} scope="col" style={{
                  textAlign: rtl ? 'right' : 'left', padding: '12px 14px',
                  fontWeight: 700, whiteSpace: 'nowrap',
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((a) => {
              const limite = formatDateHeure(a.remise_le, site.lang)
              return (
                <tr key={a.reference_slug} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                  <th scope="row" style={{
                    textAlign: rtl ? 'right' : 'left', padding: '14px',
                    fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top',
                  }}>
                    <Link href={`${base}/appels-offres/${encodeURIComponent(a.reference_slug)}`}
                      style={{ color: accent, textDecoration: 'none' }}>
                      {a.reference}
                    </Link>
                  </th>
                  <td style={{ padding: '14px', lineHeight: 1.5 }}>{a.objet}</td>
                  {/* `tabular-nums` : des échéances qui ne s'alignent pas se
                      comparent mal, et comparer des échéances est la raison
                      d'être de cette colonne. */}
                  <td style={{ padding: '14px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {limite ?? <span aria-hidden="true">—</span>}
                  </td>
                  {/* L'ÉTAT AFFICHÉ EST DÉRIVÉ, PAS LU. Un avis `ouvert` dont
                      l'échéance est passée affiche « Clôturé » : afficher
                      « Ouvert » serait inviter à déposer une offre qui sera
                      rejetée. Ce que la base STOCKE, lui, ne bouge pas. */}
                  <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                    {libelleEtat(etatVisible(a, maintenant), site.lang)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )

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
          // LA SECTION VIDE INFORME, ELLE NE DÉCORE PAS. Loi du lot A2 ③ :
          // les comptes ne mentent pas quand ils sont à zéro.
          //
          // ET ELLE N'INVENTE AUCUN CANAL. Un avis porte sa propre
          // `canal_officiel_url` ; à zéro avis il n'y a aucune URL à
          // afficher, et le site ne déclare nulle part de canal officiel --
          // mesure du 2026-11-06 sur les 40 champs non vides de la CPA. La
          // règle du propriétaire tranche : « on ne met rien sur ce site que
          // la CPA n'ait pas dit ». On renvoie au contact que l'acheteur a
          // RÉELLEMENT donné, et à rien d'autre.
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
          // UNE SECTION VIDE NE S'AFFICHE PAS. Un titre « Avis clôturés »
          // au-dessus d'un tableau sans ligne annoncerait une rubrique que
          // l'acheteur ne tient pas -- la famille même qu'on corrige ici.
          <>
            {enCours.length > 0 && section(enCours, t.sectionEnCours, 'avis-en-cours')}
            {clotures.length > 0 && section(clotures, t.sectionClotures, 'avis-clotures', t.noteClotures)}
          </>
        )}
      </main>
    </>
  )
}
