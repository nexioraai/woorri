import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchAvisIndex } from '../fetchAvis'
import { getAvisLabels, echeanceAffichee, libelleEtat, tronquer } from '../labels'
import { partager, etatVisible } from '../cycleDeVie'
import { partagerArchive, anneesArchivees, parAnnee, lireAnnee } from '../archiver'
import { resolveSiteBaseUrl } from '../../themes/shared'
import { ogLocaleFor } from '@/lib/i18n/supportedLanguages'
import HtmlLang from '../../themes/HtmlLang'

// ============================================================
// LOT 5d — L'ARCHIVE DES CONSULTATIONS CLOSES.
//
// RIEN NE DISPARAIT. Cette page est une AUTRE ADRESSE, pas une suppression :
// un marche public attribue reste consultable, c'est la raison d'etre du
// portail. La page principale ne garde que l'annee courante pour que ce a
// quoi un fournisseur peut encore repondre ne se noie pas sous ce qui est
// fini.
//
// ELLE N'EXISTE PAS A VIDE. Zero avis archive -> 404. Servir une archive
// vide, c'est promettre un contenu qu'on ne livre pas -- et l'index ne
// pointe vers elle que lorsqu'elle a quelque chose, avec son compte.
//
// `noindex` N'EST PAS POSE : une archive de marches publics a vocation a
// etre trouvee par un moteur. C'est meme souvent la seule trace publique
// d'une attribution ancienne.
// ============================================================

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const donnees = await fetchAvisIndex(slug)
  if (!donnees) return {}
  const { site } = donnees
  const t = getAvisLabels(site.lang)
  const title = `${t.titreArchive} — ${site.name}`
  // LE CANONICAL EST RESOLU DEPUIS LE SITE ET L'HOTE, jamais depuis une
  // variable d'environnement : un site genere a son propre domaine, et
  // NEXT_PUBLIC_SITE_URL pointerait TOUS les sites vers la plateforme.
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  return {
    title,
    description: t.sousTitreArchive,
    alternates: { canonical: `${base}/appels-offres/archive` },
    openGraph: { title, description: t.sousTitreArchive, type: 'website', locale: ogLocaleFor(site.lang) },
  }
}

export default async function ArchiveAppelsOffresPage({ params, searchParams }: Props) {
  const { slug } = await params
  const donnees = await fetchAvisIndex(slug)
  if (!donnees) notFound()

  const { site, avis } = donnees

  // L'HEURE EST LUE UNE SEULE FOIS ET PASSEE PARTOUT. Deux lectures dans le
  // meme rendu peuvent tomber de part et d'autre d'un 1er janvier.
  const maintenant = new Date()
  const { clotures } = partager(avis, maintenant)
  const { archives } = partagerArchive(clotures, maintenant)

  // 404 A VIDE : une archive sans avis n'est pas une page, c'est une promesse.
  if (archives.length === 0) notFound()

  const annees = anneesArchivees(archives)
  const anneeActive = lireAnnee((await searchParams)?.annee, annees)
  const lignes = parAnnee(archives, anneeActive)

  const t = getAvisLabels(site.lang)
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const rtl = site.lang === 'ar'
  const accent = site.primary_color || '#1e4d8c'

  return (
    <div lang={site.lang ?? 'fr'} dir={rtl ? 'rtl' : 'ltr'}
      style={{ minHeight: '100vh', background: '#ffffff', color: '#111111' }}>
      <HtmlLang lang={site.lang ?? 'fr'} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          <Link href={`${base}/appels-offres`} style={{ color: accent }}>← {t.titre}</Link>
        </p>

        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>
          {t.titreArchive}
        </h1>
        <p style={{ fontSize: 15, opacity: 0.65, margin: '0 0 32px' }}>
          {t.sousTitreArchive} — {site.name}
        </p>

        {/* LE FILTRE PAR ANNEE. Des LIENS : l'adresse porte l'annee, donc elle
            se partage et fonctionne sans JavaScript. Les comptes ne mentent
            pas -- chaque annee affiche combien elle contient. */}
        <nav aria-label={t.titreArchive} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 28px' }}>
          {[null, ...annees].map((an) => {
            const actif = an === anneeActive
            const n = parAnnee(archives, an).length
            return (
              <a key={an ?? 'toutes'} href={an === null ? '?' : `?annee=${an}`}
                aria-current={actif ? 'page' : undefined}
                style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 14,
                  border: `1px solid ${actif ? accent : 'rgba(127,127,127,0.35)'}`,
                  background: actif ? accent : 'transparent',
                  color: actif ? '#fff' : 'inherit',
                  textDecoration: 'none', fontWeight: actif ? 600 : 400,
                }}>
                {an === null ? t.toutesAnnees : an}{' '}
                <span style={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
              </a>
            )
          })}
        </nav>

        <div style={{ overflowX: 'auto', border: '1px solid #e3e3e3', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr>
                {[t.colReference, t.colObjet, t.colRemise, t.colEtat].map((c) => (
                  <th key={c} scope="col" style={{
                    textAlign: rtl ? 'right' : 'left', padding: '12px 14px',
                    background: '#f7f7f8', fontWeight: 700, whiteSpace: 'nowrap',
                    borderBottom: '1px solid #e3e3e3',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((a) => {
                const ev = etatVisible(a, maintenant)
                return (
                  <tr key={a.reference_slug}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', whiteSpace: 'nowrap' }}>
                      <Link href={`${base}/appels-offres/${a.reference_slug}`} style={{ color: accent, fontWeight: 600 }}>
                        {a.reference}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', lineHeight: 1.5 }}>
                      {tronquer(a.objet)}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {echeanceAffichee(a.remise_le, ev, site.lang)?.texte ?? t.nonRenseigne}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', whiteSpace: 'nowrap' }}>
                      {libelleEtat(ev, site.lang)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 13, opacity: 0.6, margin: '14px 0 0' }}>{t.noteClotures}</p>
      </main>
    </div>
  )
}
