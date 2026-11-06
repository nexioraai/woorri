import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchAvis, type AvisDetail } from '../fetchAvis'
import { getAvisLabels, echeanceAffichee, formatDateHeure, formatValeur, libelleEtat, tronquer } from '../labels'
import { etatVisible, estPrevisionnel } from '../cycleDeVie'
import { resolveSiteBaseUrl } from '../../themes/shared'
import { ogLocaleFor } from '@/lib/i18n/supportedLanguages'
import HtmlLang from '../../themes/HtmlLang'
import JsonLdScript from '../../themes/JsonLdScript'

// ============================================================
// A2 (c) -- UN AVIS DE MARCHE, LES DIX-NEUF RUBRIQUES.
//
// L'ADRESSE PORTE LA REFERENCE : `/appels-offres/004-aono-cename-2025/`.
// Loi du lot A2 ①. Un avis de marche se cite dans un courrier, un recours,
// un proces-verbal : son adresse doit etre LISIBLE et STABLE, pas un
// identifiant technique. `reference_slug` est borne en base depuis le
// 2026-11-06 (`^[a-z0-9]+(-[a-z0-9]+)*$`, 120 caracteres) -- une adresse ne
// se borne pas dans l'application seule.
//
// UNE RUBRIQUE VIDE N'EST PAS AFFICHEE, ET CE N'EST PAS UNE ECONOMIE.
// Afficher « Caution de soumission : — » laisserait croire qu'aucune caution
// n'est exigee. « Non mentionnee » et « aucune » sont deux faits differents
// sur un avis de marche, et les confondre engage le soumissionnaire. Les
// rubriques renseignees s'affichent ; une ligne finale dit explicitement que
// les autres ne l'ont pas ete. Une absence et un refus ne se ressemblent pas.
// ============================================================

type Props = { params: Promise<{ slug: string; reference: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, reference } = await params
  const donnees = await fetchAvis(slug, reference)
  // Pas de `robots: noindex` ici : la page rend 404 par `notFound()`, et une
  // 404 est deja le signal correct. Annoncer `noindex` sur une page servie en
  // 200 serait le defaut GEN-D033 a l'envers.
  if (!donnees) return { title: 'Avis introuvable' }

  const { site, avis } = donnees
  const t = getAvisLabels(site.lang)
  const title = `${avis.reference} — ${t.titre} — ${site.name}`
  const description = tronquer(avis.objet)
  const url = `${resolveSiteBaseUrl(site, (await headers()).get('host'))}/appels-offres/${encodeURIComponent(avis.reference_slug)}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: site.name,
      type: 'article', locale: ogLocaleFor(site.lang),
    },
    twitter: { card: 'summary', title, description },
  }
}

/** L'ordre des dix-neuf rubriques a l'ecran. L'identite d'abord, le calendrier
 *  ensuite, les conditions, puis les pieces. Un soumissionnaire lit dans cet
 *  ordre : « est-ce pour moi », « quand », « a quelles conditions », « ou
 *  trouver le dossier ». */
const ORDRE: (keyof AvisDetail)[] = [
  'reference', 'objet', 'etat', 'description',
  'methode', 'methode_detail', 'valeur',
  'remise_le', 'questions_avant', 'ouverture_plis',
  'criteres_elim', 'criteres_notes', 'soumission', 'allotissement',
  'local_prix_dossier', 'local_caution', 'local_validite_jours',
  'document_url', 'canal_officiel_url',
]

export default async function AvisPage({ params }: Props) {
  const { slug, reference } = await params
  const donnees = await fetchAvis(slug, reference)
  if (!donnees) notFound()

  const { site, avis } = donnees
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const t = getAvisLabels(site.lang)
  const accent = site.primary_color || '#111111'
  const lang = (site.lang || 'fr').slice(0, 2)
  const rtl = lang === 'ar'

  /** Rend une rubrique, ou `null` si l'acheteur ne l'a pas renseignee. */
  // UNE SEULE LECTURE DE L'HEURE, COMME SUR LA LISTE. Si le détail lisait
  // l'horloge à un autre instant que la liste, les deux surfaces pourraient
  // annoncer deux états pour le même avis -- et c'est l'écran qu'on
  // accuserait, pas la cause.
  const maintenant = new Date()
  const ev = etatVisible(avis, maintenant)

  // UN AVIS EN PRÉPARATION N'OPPOSE AUCUNE ÉCHÉANCE. Toutes ses dates sont
  // PRÉVISIONNELLES — pas seulement celle de remise. Un lecteur qui descend
  // jusqu'à « Ouverture des plis » sans avoir vu le bandeau doit quand même
  // comprendre que rien n'est ferme : chaque ligne porte donc sa marque.
  const prevu = estPrevisionnel(ev)

  /** Le libellé d'une rubrique — corrigé quand il mentirait.
   *
   *  « Date et heure limite de remise » est FAUX sur un avis non ouvert : ce
   *  n'est pas une limite, c'est une prévision. Le libellé change, il ne se
   *  contente pas d'un suffixe. */
  const libelleRubrique = (cle: string) =>
    prevu && cle === 'remise_le' ? t.rRemisePrevue : (t.r[cle] ?? cle)

  function valeurDe(cle: keyof AvisDetail): React.ReactNode | null {
    switch (cle) {
      case 'etat':
        // DÉRIVÉ, PAS LU -- même règle que la liste (lot A2 b). La base garde
        // `ouvert` ; l'écran dit « Clôturé » dès l'échéance passée.
        return libelleEtat(ev, site.lang)
      case 'valeur':
        return formatValeur(avis.valeur, avis.devise, site.lang)
      case 'remise_le':
      case 'questions_avant':
      case 'ouverture_plis': {
        // MÊME FONCTION QUE LA LISTE. Deux surfaces qui décideraient
        // séparément de ce que « prévisionnelle » veut dire finiraient par
        // diverger, et c'est la plus consultée qui aurait tort.
        const d = echeanceAffichee(avis[cle] as string | null, ev, site.lang)
        if (d === null) return null
        return d.marque ? (
          <>
            {d.texte}
            <span style={{ opacity: 0.7 }}> {d.marque}</span>
          </>
        ) : d.texte
      }
      case 'local_validite_jours':
        return avis.local_validite_jours === null ? null : String(avis.local_validite_jours)
      case 'document_url':
      case 'canal_officiel_url': {
        const u = avis[cle] as string | null
        if (!u) return null
        // `rel="noopener"` : une page ouverte par `target=_blank` garde sinon
        // une poignee sur celle-ci via `window.opener`.
        return (
          <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: accent }}>
            {u}
          </a>
        )
      }
      default: {
        const v = avis[cle]
        return typeof v === 'string' && v.trim() ? v : null
      }
    }
  }

  const rendues = ORDRE.map((c) => [c, valeurDe(c)] as const).filter(([, v]) => v !== null)
  const manquantes = ORDRE.length - rendues.length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${avis.reference} — ${avis.objet}`,
    url: `${base}/appels-offres/${encodeURIComponent(avis.reference_slug)}`,
    inLanguage: site.lang || undefined,
    datePublished: avis.cree_le || undefined,
    isPartOf: { '@type': 'WebSite', name: site.name, url: base },
    publisher: { '@type': 'GovernmentOrganization', name: site.name, url: base },
  }

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <HtmlLang lang={site.lang} />
      <main
        dir={rtl ? 'rtl' : 'ltr'}
        style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px' }}
      >
        <Link
          href={`${base}/appels-offres`}
          style={{ fontSize: 14, color: accent, textDecoration: 'none' }}
        >
          {t.retour}
        </Link>

        <p style={{ fontSize: 14, opacity: 0.6, margin: '24px 0 6px', fontVariantNumeric: 'tabular-nums' }}>
          {avis.reference}
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {avis.objet}
        </h1>
        <p style={{ fontSize: 15, opacity: 0.6, margin: '0 0 40px' }}>
          {site.name}
          {avis.cree_le && (
            <> · {t.publieLe} {formatDateHeure(avis.cree_le, site.lang)}</>
          )}
        </p>

        {/* CONDITION ① DU PROPRIÉTAIRE, 2026-11-06, NON NÉGOCIABLE.
            « Sans cette phrase, B fait perdre son temps à un fournisseur, et
            c'est un tort qu'un portail d'État ne peut pas causer. »
            Le bandeau précède les rubriques : on ne lit pas un avis avant de
            savoir s'il est ouvert. */}
        {prevu && (
          <p
            role="note"
            style={{
              margin: '0 0 32px', padding: '16px 18px', borderRadius: 12,
              border: `1px solid ${accent}`, fontSize: 15, lineHeight: 1.6, fontWeight: 600,
            }}
          >
            {t.pasEncoreRecevable}
          </p>
        )}

        <dl style={{ margin: 0, display: 'grid', gap: 0 }}>
          {rendues.map(([cle, valeur]) => (
            <div
              key={String(cle)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(180px, 34%) 1fr',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <dt style={{ fontWeight: 600, opacity: 0.7 }}>{libelleRubrique(String(cle))}</dt>
              <dd style={{ margin: 0, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{valeur}</dd>
            </div>
          ))}
        </dl>

        {manquantes > 0 && (
          <p style={{ fontSize: 14, opacity: 0.55, margin: '24px 0 0', lineHeight: 1.6 }}>
            {t.nonRenseigne}
          </p>
        )}
      </main>
    </>
  )
}
