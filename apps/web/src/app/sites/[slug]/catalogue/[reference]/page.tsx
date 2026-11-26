import { ogDePage } from '../../themes/metadonneesDuSite'
import { lireInstitution } from '@/lib/sites/lireInstitution'
import { lireSite } from '../../themes/lireSite'
import { generateMetadata as metadonneesPageDeclaree } from '../../[...rest]/page'
import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveSiteBaseUrl } from '../../themes/shared'
import HtmlLang from '../../themes/HtmlLang'
import { fetchSiteCatalogue, fetchFicheProduit, fetchCatalogue, variantesDe, memeFamille } from '../fetchCatalogue'
import { lireDisponibilite, commandable } from '../disponibilite'
import PastilleDispo from '../PastilleDispo'
import BoiteCommande from './BoiteCommande'
import BarreBon from '../BarreBon'
import VisuelProduit from '../VisuelProduit'
import { Snowflake, ChevronRight, ShieldCheck } from 'lucide-react'
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
  const complet = await lireSite(slug)
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
  const inst = await lireInstitution(s.id, s.lang)
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

  // ── LA FICHE COMPLÈTE (CPA, 2026-11-19) — sur le modèle des catalogues de
  // référence (MSF Unicat, liste OMS) : fil d'Ariane, dénomination + dosage +
  // forme, référence à copier, visuel « indicatif », disponibilité en mots,
  // chaîne du froid mise en avant, caractéristiques, autres présentations,
  // encadré de commande qui reste visible, impression sur une page A4.
  const dispo = lireDisponibilite(p.disponibilite)
  const tous = await fetchCatalogue(s.id)
  const variantes = variantesDe(tous, p)
  const voisins = memeFamille(tous, p)
  const unite = (p.conditionnement ?? '').toLowerCase().match(/^(bo[iî]te|flacon|carton|ampoule|sachet|plaquette|tube|poche|kit|unit[ée])s?/)?.[1] ?? 'unités'
  const uniteVue = /s$|é$/.test(unite) ? unite : `${unite}s`
  const majLe = (() => { try { return p.maj_le ? new Date(p.maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null } catch { return null } })()

  const lignes: [string, string | null][] = [
    ['Dénomination', p.denomination],
    ['Dosage', p.dosage],
    ['Forme', p.forme],
    ['Conditionnement', p.conditionnement],
    ['Famille', p.famille],
    ['Conservation', p.chaine_du_froid ? 'Entre 2 et 8 °C, chaîne du froid' : 'Température ambiante, à l’abri de la lumière et de l’humidité'],
    ['Référence', p.reference],
  ]

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <style>{`
        .fiche { max-width: 1180px; margin: 0 auto; padding: 36px 20px 80px }
        .fiche .ariane { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 14px; color: #6b7280; margin-bottom: 22px }
        .fiche .ariane a { color: ${accent}; text-decoration: none } .fiche .ariane a:hover { text-decoration: underline }
        .fiche .grille { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 32px; align-items: start }
        .fiche .haut { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 28px; align-items: start }
        .fiche h1 { font-size: clamp(26px, 3.4vw, 38px); line-height: 1.12; letter-spacing: -0.02em; margin: 6px 0 8px; font-weight: 800 }
        .fiche .sur { font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: ${accent} }
        .fiche .ref { display: inline-flex; gap: 8px; align-items: center; font-family: ui-monospace, monospace; font-size: 14px; color: #374151;
          background: #f3f4f6; padding: 4px 10px; border-radius: 8px }
        .fiche .froid { display: flex; gap: 14px; align-items: center; margin-top: 18px; padding: 14px 16px; border-radius: 16px;
          background: linear-gradient(120deg, #e0f2fe, #f0f9ff); border: 1px solid #bae6fd; color: #075985 }
        .fiche .froid strong { display: block; font-size: 15px } .fiche .froid span { font-size: 13.5px }
        .fiche .bloc { margin-top: 28px; padding: 22px 24px; border: 1px solid #e8eaee; border-radius: 20px; background: #fff }
        .fiche .bloc h2 { margin: 0 0 14px; font-size: 18px; font-weight: 800 }
        .fiche dl { display: grid; grid-template-columns: minmax(140px, 200px) 1fr; margin: 0 }
        .fiche dt, .fiche dd { padding: 11px 0; border-bottom: 1px solid #f1f2f5; margin: 0; font-size: 15px }
        .fiche dt { color: #6b7280 } .fiche dd { color: #111827; font-weight: 500 }
        .fiche dl > :nth-last-child(-n+2) { border-bottom: none }
        .fiche .puces { display: flex; gap: 8px; flex-wrap: wrap }
        .fiche .puce { padding: 9px 14px; border-radius: 12px; border: 1px solid #e5e7eb; text-decoration: none; color: #111827; font-size: 14px; font-weight: 600;
          transition: border-color .18s ease, transform .18s ease } .fiche .puce:hover { border-color: ${accent}; transform: translateY(-2px) }
        .fiche .cartes { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px }
        .fiche .carte { display: block; padding: 14px; border-radius: 16px; border: 1px solid #e8eaee; text-decoration: none; color: inherit; background: #fff;
          transition: transform .2s ease, box-shadow .2s ease } .fiche .carte:hover { transform: translateY(-3px); box-shadow: 0 18px 30px -24px rgba(0,0,0,.45) }
        .fiche .note { margin-top: 14px; font-size: 13px; color: #6b7280 }
        @media (max-width: 1000px) { .fiche .grille { grid-template-columns: 1fr } }
        @media (max-width: 640px) { .fiche .haut { grid-template-columns: 1fr } .fiche dl { grid-template-columns: 1fr } .fiche dt { padding-bottom: 0; border: none } }
        @media print {
          .fiche { padding: 0 } .fiche .grille { grid-template-columns: 1fr } .fiche .ariane, .fiche .autres { display: none }
          header, footer, [data-cookie-consent-panel], [data-installer-deribfy] { display: none !important }
        }
        @media (prefers-reduced-motion: reduce) { .fiche .puce, .fiche .carte { transition: none } }
      `}</style>
      <main className="fiche">
        <nav className="ariane" aria-label="Fil d’Ariane">
          <Link href={base}>Accueil</Link><ChevronRight size={14} aria-hidden />
          <Link href={`${base}/catalogue`}>Catalogue</Link>
          {p.famille && (<><ChevronRight size={14} aria-hidden /><Link href={`${base}/catalogue?famille=${encodeURIComponent(p.famille)}`}>{p.famille}</Link></>)}
          <ChevronRight size={14} aria-hidden /><span aria-current="page">{p.denomination}</span>
        </nav>

        <div className="grille">
          <div>
            <div className="haut">
              <VisuelProduit photo={p.photo} forme={p.forme} denomination={p.denomination} accent={accent} grand />
              <div>
                {p.famille && <span className="sur">{p.famille}</span>}
                <h1>{p.denomination}{p.dosage ? ` ${p.dosage}` : ''}</h1>
                <p style={{ margin: '0 0 14px', fontSize: 16.5, color: '#4b5563' }}>{[p.forme, p.conditionnement].filter(Boolean).join(' · ')}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <PastilleDispo d={dispo} grande />
                  <span className="ref">Réf. {p.reference}</span>
                </div>
                {p.chaine_du_froid && (
                  <div className="froid">
                    <Snowflake size={28} aria-hidden />
                    <div><strong>Chaîne du froid · 2 à 8 °C</strong><span>Transport en portoir isotherme, contrôle de la température à la réception.</span></div>
                  </div>
                )}
              </div>
            </div>

            {(p.description || p.note) && (
              <section className="bloc">
                <h2>Description</h2>
                {p.description && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#1f2937', whiteSpace: 'pre-wrap' }}>{p.description}</p>}
                {p.note && <p style={{ margin: p.description ? '12px 0 0' : 0, padding: '12px 14px', borderRadius: 12, background: '#f8f9fb', fontSize: 14.5, lineHeight: 1.6, color: '#4b5563', whiteSpace: 'pre-wrap' }}>{p.note}</p>}
              </section>
            )}

            <section className="bloc">
              <h2>Caractéristiques</h2>
              <dl>
                {lignes.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              <p className="note"><ShieldCheck size={14} aria-hidden style={{ verticalAlign: '-2px' }} /> Produit contrôlé par {inst.la} avant sa mise à disposition.{majLe ? ` Fiche mise à jour le ${majLe}.` : ''}</p>
            </section>

            {variantes.length > 0 && (
              <section className="bloc autres">
                <h2>Autres présentations</h2>
                <div className="puces">
                  {variantes.map((v) => (
                    <a key={v.reference} className="puce" href={`${base}/catalogue/${encodeURIComponent(v.reference)}`}>{[v.dosage, v.forme].filter(Boolean).join(' · ') || v.reference}</a>
                  ))}
                </div>
              </section>
            )}

            {voisins.length > 0 && (
              <section className="bloc autres">
                <h2>Dans la même famille</h2>
                <div className="cartes">
                  {voisins.map((v) => (
                    <a key={v.reference} className="carte" href={`${base}/catalogue/${encodeURIComponent(v.reference)}`}>
                      <strong style={{ display: 'block', fontSize: 15 }}>{v.denomination}</strong>
                      <span style={{ display: 'block', fontSize: 13.5, color: '#6b7280', margin: '3px 0 10px' }}>{[v.dosage, v.forme].filter(Boolean).join(' · ')}</span>
                      <PastilleDispo d={lireDisponibilite(v.disponibilite)} />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside aria-label="Commander">
            <BoiteCommande slug={s.slug} base={base} denomination={[p.denomination, p.dosage].filter(Boolean).join(' ')} reference={p.reference}
              unite={uniteVue} accent={accent} commandable={commandable(dispo)}
              indisponible={`Ce produit est momentanément indisponible. Écrivez ${inst.a} depuis votre espace pour connaître la date de retour.`} />
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginTop: 14 }}>
              Pas encore de compte ? <Link href={`${base}/devenir-client`} style={{ color: accent, fontWeight: 600 }}>Devenir client</Link>
            </p>
          </aside>
        </div>
      </main>
      <BarreBon slug={s.slug} base={base} accent={accent} />
    </div>
  )
}
