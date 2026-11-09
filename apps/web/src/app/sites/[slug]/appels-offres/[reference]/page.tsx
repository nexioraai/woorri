import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchAvis, type AvisDetail } from '../fetchAvis'
import PageDeclaree from '../../[...rest]/page'
import { fetchPage } from '../../pages/fetchPage'
import { fetchSiteCatalogue as fetchSitePourPage } from '../../catalogue/fetchCatalogue'
import { getAvisLabels, echeanceAffichee, formatDateHeure, formatValeur, libelleEtat, tronquer } from '../labels'
import { etatVisible, estPrevisionnel } from '../cycleDeVie'
import { resolveSiteBaseUrl } from '../../themes/shared'
import { ogLocaleFor } from '@/lib/i18n/supportedLanguages'
import HtmlLang from '../../themes/HtmlLang'
import JsonLdScript from '../../themes/JsonLdScript'
import Postuler from '../Postuler'
import { motsPostuler } from '../motsPostuler'
import { ouvreDesComptes } from '../../acces/ouvreDesComptes'

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
  // LOT 5c — LE RESULTAT, EN DERNIER.
  // Il ne parait que si l'avis est attribue : la base interdit ces trois
  // valeurs sur tout autre etat, donc elles sont `null` et la rubrique
  // s'efface d'elle-meme. Aucune condition a ecrire ici -- l'invariant
  // est en base, pas dans le rendu.
  'attributaire', 'montant_attribue', 'attribue_le',
]

export default async function AvisPage({ params }: Props) {
  const { slug, reference } = await params
  const donnees = await fetchAvis(slug, reference)
  // ── CE SEGMENT CAPTURE AUSSI LES SOUS-PAGES DECLAREES.
  //
  // Meme defaut que `/catalogue/<reference>` (GEN-D052) :
  // `/appels-offres/calendrier` et `/appels-offres/comment-repondre` sont
  // des PAGES de la CPA, pas des references d'avis. Un segment dynamique
  // passe avant le catch-all, donc elles rendaient 404 -- mesure le
  // 2026-11-08, deux pages publiees de plus.
  //
  // On delegue au rendu de la page declaree, qu'on REEMPLOIE.
  if (!donnees) {
    const site = await fetchSitePourPage(slug)
    const declaree = site ? await fetchPage(site.id, `appels-offres/${reference}`) : null
    if (declaree) {
      return PageDeclaree({ params: Promise.resolve({ slug, rest: ['appels-offres', reference] }) })
    }
    // REFUS UNIQUE : ni avis, ni page -- meme 404, pour ne pas reveler
    // un brouillon par son code de retour.
    notFound()
  }

  const { site, avis } = donnees
  // LA CAPACITÉ SE LIT CÔTÉ SERVEUR : un site qui n'ouvre pas de comptes
  // n'a pas de dépôt d'offre, et la route le refuserait de toute façon.
  const comptesOuverts = await ouvreDesComptes(site.id)
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
      case 'montant_attribue': {
        // Le montant est rendu AVEC la devise de l'avis, comme `valeur`.
        // Un nombre sans unite sur un marche public n'informe personne.
        const m = avis.montant_attribue
        if (m === null || m === undefined) return null
        const d = avis.devise ? ` ${avis.devise}` : ''
        return `${new Intl.NumberFormat(site.lang === 'ar' ? 'ar' : site.lang || 'fr').format(m)}${d}`
      }
      case 'attribue_le': {
        // Une date d'attribution n'est PAS une echeance : elle est passee et
        // ferme. On ne passe donc pas par `echeanceAffichee`, qui parle de
        // « previsionnelle » et n'aurait aucun sens ici.
        if (!avis.attribue_le) return null
        const d = new Date(avis.attribue_le)
        if (Number.isNaN(d.getTime())) return null
        return new Intl.DateTimeFormat(site.lang === 'ar' ? 'ar' : site.lang || 'fr',
          { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d)
      }
      case 'local_validite_jours':
        return avis.local_validite_jours === null ? null : String(avis.local_validite_jours)
      case 'document_url': {
        // LOT 5b — LE DOSSIER, PAS UN LIEN.
        // `document_url` portait UNE adresse pour UN document. Un dossier de
        // consultation, c'est le reglement, le cahier des charges, le
        // bordereau de prix et les annexes. On affiche les pieces si l'avis
        // en porte, et l'ancienne adresse SEULEMENT si elle ne fait pas
        // doublon -- retirer `document_url` aurait casse les avis qui ne
        // portent qu'elle.
        const u = avis.document_url
        const pieces = avis.pieces ?? []
        const deja = new Set(pieces.map((x) => x.url))
        const tout = [...pieces, ...(u && !deja.has(u) ? [{ nom: 'Dossier de consultation', url: u }] : [])]
        if (tout.length === 0) return null
        return (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tout.map((pj) => (
              <li key={pj.url} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <a href={pj.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600 }}>
                  {pj.nom}
                </a>
                <span style={{ fontSize: 13, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
                  {[('format' in pj ? pj.format : null), ('poids' in pj ? pj.poids : null)].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )
      }
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

        {/* ── LOT 13.1 — DÉPOSER UNE OFFRE.
            Le formulaire vient APRÈS les conditions : on ne répond pas à un
            marché qu'on n'a pas lu. L'ouverture est calculée ICI, côté
            serveur — l'écran ne redécide rien, il affiche. */}
        {comptesOuverts && (
          <Postuler
            slug={site.slug}
            base={base}
            avisId={avis.id}
            // `publie` N'EST PAS TESTÉ ICI, et ce n'est pas un oubli : la VUE
            // `appels_offres_public` filtre déjà dessus. Un avis rendu par
            // `fetchAvis` est publié par construction — le revérifier créerait
            // une seconde vérité, et c'est celle qu'on ne regarde pas qui
            // finit par diverger.
            //
            // ── ET L'HEURE N'EST PAS LUE ICI NON PLUS.
            //
            // Premier jet : `Date.now()` dans ce JSX. `react-hooks/purity` l'a
            // refusé, et il visait juste — cette page peut être mise en cache,
            // et « ouvert » serait alors resté affiché après la date limite.
            // L'écran reçoit la DATE ; c'est le navigateur qui la compare,
            // au moment où quelqu'un regarde.
            //
            // La route, elle, refuse déjà après l'échéance : l'écran est une
            // commodité, le verrou est côté serveur.
            etatAvis={avis.etat}
            remiseLe={avis.remise_le}
            primary={accent}
            mots={motsPostuler(site.lang)}
          />
        )}
      </main>
    </>
  )
}
