import { ogDePage } from '../themes/metadonneesDuSite'
import { lireInstitution } from '@/lib/sites/lireInstitution'
import { pageWeb } from '../themes/filDAriane'
import JsonLdScript from '../themes/JsonLdScript'
import { lireSite } from '../themes/lireSite'
import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { lireBlocs } from '../pages/blocs'
import BlocsDePage from '../pages/BlocsDePage'
import SousPages from '../pages/SousPages'
import { fetchEnfants } from '../pages/fetchPage'
import { lecteurDuSite } from '@/lib/lecteurDuSite'
import { lireDisponibilite, commandable } from './disponibilite'
import PastilleDispo from './PastilleDispo'
import VisuelProduit, { familleForme, type FamilleForme } from './VisuelProduit'
import BarreBon, { AjouterAuBon } from './BarreBon'
import { uniteDe } from './bon'
import { LayoutGrid, List, Snowflake, SlidersHorizontal } from 'lucide-react'
import {
  fetchSiteCatalogue, fetchCatalogue, famillesPresentes, parFamille, lireFamille, chercher,
} from './fetchCatalogue'

// ============================================================================
// LOT 6 — LE CATALOGUE PUBLIC.
//
// NI PRIX NI STOCK, ET CE N'EST PAS UN OUBLI. La table n'a aucune colonne de
// prix : mesuré, PostgREST rend PGRST204 si l'on tente d'en écrire une. Sur
// un marché d'État un prix public ENGAGE, et un stock affiché faux déclenche
// des commandes impossibles.
//
// LA RECHERCHE ET LE FILTRE SONT DES LIENS, pas du JavaScript. L'adresse
// porte la famille, donc elle se partage et se met en favori. La recherche
// est un formulaire GET : elle marche sans script.
//
// 2026-11-20 — REFONTE D'APRÈS LES CATALOGUES DE RÉFÉRENCE. UniCat (MSF) :
// filtres sur le côté, grille de cartes où chaque article est DESSINÉ selon
// sa forme, bascule grille/liste, tri. UNICEF Supply : pictogrammes de
// conservation (chaîne du froid). KEMSA (Kenya) : un bon de PLUSIEURS lignes
// rempli depuis le catalogue puis envoyé d'un coup. Seul le bon demande du
// JavaScript ; sans lui, tout le reste (recherche, filtres, tri, vue) marche.
//
// LES TEXTES VIENNENT D'UNE PAGE DÉCLARÉE au chemin `catalogue`, comme pour
// les appels d'offres — même éditeur, aucun écran neuf.
// ============================================================================

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const s = await fetchSiteCatalogue(slug)
  if (!s) return {}
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const title = `Catalogue — ${s.name}`
  const description = `Les produits mis à disposition des structures sanitaires par ${s.name}.`
  const complet = await lireSite(slug)
  return {
    title,
    description,
    alternates: { canonical: `${base}/catalogue` },
    // LOT 18 — SA carte de partage, jamais celle de Deribfy.
    ...(complet ? ogDePage(complet, `${base}/catalogue`, title, description) : {}),
  }
}

const FORMES: { cle: FamilleForme; nom: string }[] = [
  { cle: 'comprime', nom: 'Comprimés et gélules' },
  { cle: 'injectable', nom: 'Injectables et vaccins' },
  { cle: 'buvable', nom: 'Buvables et poudres' },
  { cle: 'materiel', nom: 'Matériel et consommables' },
]
const TRIS = [['', 'Ordre du catalogue'], ['nom', 'Nom (A → Z)'], ['famille', 'Famille'], ['dispo', 'Disponibilité']] as const
// L'ordre du tri « Disponibilité » : un RANG, jamais une quantité.
const ORDRE_DISPO: string[] = ['en_stock', 'stock_limite', 'sur_commande', 'rupture']

export default async function CataloguePage({ params, searchParams }: Props) {
  const supabase = await lecteurDuSite()
  const { slug } = await params
  const s = await fetchSiteCatalogue(slug)
  const inst = s ? await lireInstitution(s.id, s.lang) : null
  if (!s) notFound()

  const sp = (await searchParams) ?? {}
  const tous = await fetchCatalogue(s.id)
  const familles = famillesPresentes(tous)
  const familleActive = lireFamille(sp.famille, familles.map((f) => f.nom))
  const terme = typeof sp.q === 'string' ? sp.q : ''
  // CPA, 2026-11-19 — chaîne du froid, et « commandable maintenant » (tout
  // sauf « momentanément indisponible »). 2026-11-20 — la forme, le tri, la vue.
  const froid = sp.froid === '1'
  const dispoSeul = sp.dispo === '1'
  const formeActive = FORMES.find((f) => f.cle === sp.forme)?.cle ?? null
  const tri = TRIS.find(([c]) => c && c === sp.tri)?.[0] ?? ''
  const vueListe = sp.vue === 'liste'

  const avantForme = chercher(parFamille(tous, familleActive), terme)
    .filter((p) => !froid || p.chaine_du_froid)
    .filter((p) => !dispoSeul || commandable(lireDisponibilite(p.disponibilite)))
  const produits = avantForme.filter((p) => !formeActive || familleForme(p.forme) === formeActive)
  if (tri === 'nom') produits.sort((a, b) => a.denomination.localeCompare(b.denomination, 'fr'))
  if (tri === 'famille') produits.sort((a, b) => (a.famille ?? '').localeCompare(b.famille ?? '', 'fr'))
  if (tri === 'dispo') produits.sort((a, b) => ORDRE_DISPO.indexOf(lireDisponibilite(a.disponibilite)) - ORDRE_DISPO.indexOf(lireDisponibilite(b.disponibilite)))

  // UNE SEULE FABRIQUE D'ADRESSE : chaque lien garde tous les autres choix.
  type Etat = { famille: string | null; q: string; froid: boolean; dispo: boolean; forme: string | null; tri: string; liste: boolean }
  const courant: Etat = { famille: familleActive, q: terme, froid, dispo: dispoSeul, forme: formeActive, tri, liste: vueListe }
  const adresse = (change: Partial<Etat>) => {
    const e = { ...courant, ...change }
    const q = new URLSearchParams()
    if (e.famille) q.set('famille', e.famille)
    if (e.q) q.set('q', e.q)
    if (e.forme) q.set('forme', e.forme)
    if (e.dispo) q.set('dispo', '1')
    if (e.froid) q.set('froid', '1')
    if (e.tri) q.set('tri', e.tri)
    if (e.liste) q.set('vue', 'liste')
    return q
  }
  const lien = (change: Partial<Etat>) => { const q = adresse(change); return q.toString() ? `?${q}` : '?' }
  const nbFiltres = [familleActive, formeActive, froid, dispoSeul].filter(Boolean).length

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'

  const { data: declaree } = await supabase
    .from('site_pages_public').select('blocs')
    .eq('site_id', s.id).eq('chemin', 'catalogue').maybeSingle()
  const textes = lireBlocs((declaree as { blocs?: unknown } | null)?.blocs)
  // LOT 18 — les sous-pages déclarées sous `catalogue` (« Passer une commande »…).
  const enfants = await fetchEnfants(s.id, 'catalogue')

  const ficheDe = (reference: string) => `${base}/catalogue/${encodeURIComponent(reference)}`
  const ligneBon = (p: (typeof produits)[number]) => ({
    reference: p.reference, designation: [p.denomination, p.dosage].filter(Boolean).join(' '), quantite: 1, unite: uniteDe(p.conditionnement),
  })

  const filtres = (
    <>
      <div className="grp">
        <p className="titreGrp">Familles</p>
        {[{ nom: 'Toutes', nombre: tous.length }, ...familles].map((f) => {
          const cle = f.nom === 'Toutes' ? null : f.nom
          const actif = cle === familleActive
          const q = adresse({ famille: cle })
          return (
            <a key={f.nom} className="opt" href={q.toString() ? `?${q}` : '?'} aria-current={actif ? 'page' : undefined}>
              <span>{f.nom}</span><span className="nb">{f.nombre}</span>
            </a>
          )
        })}
      </div>
      <div className="grp">
        <p className="titreGrp">Forme</p>
        {FORMES.map((f) => {
          const nombre = avantForme.filter((p) => familleForme(p.forme) === f.cle).length
          if (nombre === 0 && formeActive !== f.cle) return null
          const actif = formeActive === f.cle
          return (
            <a key={f.cle} className="opt" href={lien({ forme: actif ? null : f.cle })} aria-current={actif ? 'true' : undefined}>
              <span className="case" aria-hidden>{actif ? '✓' : ''}</span><span>{f.nom}</span><span className="nb">{nombre}</span>
            </a>
          )
        })}
      </div>
      <div className="grp">
        <p className="titreGrp">Disponibilité et conservation</p>
        <a className="opt" href={lien({ dispo: !dispoSeul })} aria-current={dispoSeul ? 'true' : undefined}>
          <span className="case" aria-hidden>{dispoSeul ? '✓' : ''}</span><span>Commandables maintenant</span>
        </a>
        <a className="opt" href={lien({ froid: !froid })} aria-current={froid ? 'true' : undefined}>
          <span className="case" aria-hidden>{froid ? '✓' : ''}</span><span>Chaîne du froid (2–8 °C)</span>
        </a>
      </div>
      {nbFiltres > 0 && <a className="effacer" href={lien({ famille: null, forme: null, froid: false, dispo: false })}>Effacer les filtres</a>}
    </>
  )

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <JsonLdScript data={pageWeb(s.name, base, s.lang, 'Catalogue', `${base}/catalogue`, [{ nom: 'Catalogue', url: `${base}/catalogue` }])} />
      <style>{`
        .cat { --a: ${accent} }
        .cat .bandeau { background: linear-gradient(135deg, color-mix(in srgb, var(--a) 92%, #000), color-mix(in srgb, var(--a) 70%, #0b1220)); color: #fff; border-radius: 24px; padding: 34px 32px 30px; position: relative; overflow: hidden }
        .cat .bandeau::after { content: ''; position: absolute; inset: auto -80px -120px auto; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.16), transparent 70%) }
        .cat .bandeau h1 { font-size: clamp(28px, 5vw, 40px); font-weight: 800; margin: 6px 0 8px; letter-spacing: -.01em }
        .cat .bandeau p { margin: 0; opacity: .85; font-size: 16px; max-width: 62ch; line-height: 1.55 }
        .cat .chiffres { display: flex; gap: 26px; flex-wrap: wrap; margin: 20px 0 22px; font-size: 14px }
        .cat .chiffres b { display: block; font-size: 24px; font-variant-numeric: tabular-nums }
        .cat .recherche { display: flex; gap: 8px; background: #fff; border-radius: 16px; padding: 6px; position: relative; z-index: 1; box-shadow: 0 18px 40px -20px rgba(0,0,0,.5) }
        .cat .recherche input { flex: 1; min-width: 0; border: none; outline: none; font: inherit; font-size: 16.5px; padding: 12px 14px; color: #111; background: transparent }
        .cat .recherche button { border: none; border-radius: 12px; padding: 0 22px; background: var(--a); color: #fff; font: inherit; font-weight: 700; font-size: 15px; cursor: pointer }
        .cat .corps { display: grid; grid-template-columns: 250px 1fr; gap: 30px; margin-top: 28px; align-items: start }
        .cat .corps > * { min-width: 0 }
        .cat aside { position: sticky; top: 20px }
        .cat .grp { padding: 0 0 18px; margin: 0 0 18px; border-bottom: 1px solid #eceef2 }
        .cat .titreGrp { margin: 0 0 8px; font-size: 12px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: #6b7280 }
        .cat .opt { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin: 0 -10px; border-radius: 10px; color: #1f2937; text-decoration: none; font-size: 14.5px; transition: background .15s }
        .cat .opt:hover { background: #f3f4f6 }
        .cat .opt[aria-current] { background: color-mix(in srgb, var(--a) 10%, #fff); color: var(--a); font-weight: 700 }
        .cat .opt .nb { margin-inline-start: auto; font-size: 12.5px; color: #9ca3af; font-variant-numeric: tabular-nums }
        .cat .case { width: 18px; height: 18px; flex: none; border: 1.6px solid #c4c8d0; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: #fff }
        .cat .opt[aria-current] .case { background: var(--a); border-color: var(--a) }
        .cat .effacer { font-size: 14px; color: var(--a); font-weight: 600 }
        .cat details.filtresMobile { display: none }
        .cat .barreOutils { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0 0 16px }
        .cat .barreOutils .compte { font-size: 14.5px; color: #4b5563; margin-inline-end: auto; font-variant-numeric: tabular-nums }
        .cat .tris { display: flex; gap: 4px; flex-wrap: wrap; font-size: 13.5px }
        .cat .tris a { padding: 6px 11px; border-radius: 999px; color: #4b5563; text-decoration: none }
        .cat .tris a[aria-current] { background: #111827; color: #fff; font-weight: 600 }
        .cat .vues { display: inline-flex; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden }
        .cat .vues a { width: 38px; height: 34px; display: inline-flex; align-items: center; justify-content: center; color: #6b7280 }
        .cat .vues a[aria-current] { background: #111827; color: #fff }
        .cat .grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 18px; list-style: none; padding: 0; margin: 0 }
        .cat .carte { position: relative; display: flex; flex-direction: column; background: #fff; border: 1px solid #e8eaee; border-radius: 20px; padding: 10px; transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease, border-color .25s }
        .cat .carte:hover { transform: translateY(-4px); box-shadow: 0 26px 46px -28px rgba(17,24,39,.45); border-color: color-mix(in srgb, var(--a) 30%, #e8eaee) }
        .cat .carte:hover .illu { transform: scale(1.06) rotate(-2deg) }
        .cat .illu { transition: transform .35s cubic-bezier(.34,1.56,.64,1) }
        .cat .carte .haut { position: absolute; top: 18px; left: 18px; right: 18px; display: flex; justify-content: space-between; gap: 6px; pointer-events: none }
        .cat .ref { font-family: ui-monospace, monospace; font-size: 11.5px; background: rgba(255,255,255,.9); border: 1px solid #e5e7eb; padding: 2px 8px; border-radius: 8px; color: #374151 }
        .cat .froid { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; background: #e0f2fe; color: #075985; padding: 3px 8px; border-radius: 8px }
        .cat .carte .txt { padding: 12px 6px 4px; flex: 1; display: flex; flex-direction: column; gap: 6px }
        .cat .famille { font-size: 11.5px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--a) }
        .cat .nom { font-size: 16.5px; font-weight: 800; line-height: 1.3; color: #111827; text-decoration: none }
        .cat .nom::before { content: ''; position: absolute; inset: 0; border-radius: 20px }
        .cat .nom:focus-visible { outline: none }
        .cat .carte:has(.nom:focus-visible) { outline: 3px solid var(--a); outline-offset: 2px }
        .cat .detail { font-size: 13.5px; color: #6b7280; line-height: 1.45 }
        .cat .pied { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 6px 4px; margin-top: auto; flex-wrap: wrap }
        .cat .ajBon { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid var(--a); color: var(--a); background: #fff; border-radius: 11px; padding: 7px 12px; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background .15s, color .15s, transform .15s }
        .cat .ajBon:hover { background: var(--a); color: #fff }
        .cat .ajBon:active { transform: scale(.96) }
        .cat .ajBon.dedans { background: var(--a); color: #fff }
        .cat .ajBon.off { border-color: #e5e7eb; color: #9ca3af; cursor: default; background: #f9fafb }
        .cat .tableau { border: 1px solid #e8eaee; border-radius: 16px; overflow: hidden; background: #fff }
        .cat .tableau .rang { position: relative; display: grid; grid-template-columns: 56px minmax(0, 2.2fr) minmax(0, 1.4fr) auto auto; align-items: center; gap: 16px; padding: 10px 16px; border-bottom: 1px solid #eef0f3 }
        .cat .tableau .rang:last-child { border-bottom: none }
        .cat .tableau .rang:hover { background: #fafbfc }
        .cat .tableau .nom { font-size: 15px }
        .cat .tableau .nom::before { border-radius: 0 }
        .cat .apropos { margin-top: 56px; padding-top: 32px; border-top: 1px solid #eceef2 }
        @media (max-width: 900px) {
          .cat .corps { grid-template-columns: 1fr; gap: 14px }
          .cat aside { display: none }
          .cat details.filtresMobile { display: block; border: 1px solid #e5e7eb; border-radius: 14px; padding: 4px 16px; background: #fff }
          .cat details.filtresMobile summary { cursor: pointer; padding: 10px 0; font-weight: 700; display: flex; align-items: center; gap: 8px }
          .cat .tableau .rang { grid-template-columns: 48px 1fr; row-gap: 6px }
          .cat .tableau .rang > :nth-child(3) { display: none }
          .cat .tableau .rang > :nth-child(4), .cat .tableau .rang > :nth-child(5) { grid-column: 2 }
          .cat .bandeau { padding: 26px 18px 20px; border-radius: 20px }
        }
        @media (max-width: 520px) { .cat .grille { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px } .cat .tris { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; white-space: nowrap } .cat .carte { padding: 7px } .cat .pied { padding: 8px 2px 2px } .cat .nom { font-size: 14.5px } .cat .carte .haut .ref { display: none } .cat .ajBon { width: 100%; justify-content: center } }
        @media (prefers-reduced-motion: reduce) { .cat .carte, .cat .illu { transition: none } .cat .carte:hover { transform: none } .cat .carte:hover .illu { transform: none } }
      `}</style>
      <main className="cat" style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 20px 120px' }}>
        <p style={{ fontSize: 14, margin: '0 0 16px' }}>
          <Link href={base} style={{ color: accent }}>← Accueil</Link>
        </p>

        {tous.length === 0 ? (
          <>
            <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>Catalogue</h1>
            {/* UNE SECTION VIDE INFORME, ELLE NE DÉCORE PAS. */}
            <p style={{ padding: '18px 20px', borderRadius: 12, background: '#f7f7f8', fontSize: 16, color: '#5b5b5b' }}>
              Le catalogue n’est pas encore publié. Il paraîtra sur cette page dès que {inst?.la ?? 'l’établissement'} l’aura mis en ligne.
            </p>
          </>
        ) : (
          <>
            <header className="bandeau">
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.75 }}>{s.name}</p>
              <h1>Catalogue</h1>
              <p>Les produits mis à disposition des structures sanitaires agréées. Ajoutez-les à votre bon de commande, puis envoyez-le depuis votre espace client.</p>
              <div className="chiffres">
                <span><b>{tous.length}</b>références</span>
                <span><b>{familles.length}</b>familles</span>
                <span><b>{tous.filter((p) => commandable(lireDisponibilite(p.disponibilite))).length}</b>commandables</span>
                {tous.some((p) => p.chaine_du_froid) && <span><b>{tous.filter((p) => p.chaine_du_froid).length}</b>chaîne du froid</span>}
              </div>
              {/* LA RECHERCHE EST UN FORMULAIRE GET : elle marche sans script,
                  et son résultat a une adresse qui se partage. */}
              <form method="get" className="recherche" role="search">
                {familleActive && <input type="hidden" name="famille" value={familleActive} />}
                {formeActive && <input type="hidden" name="forme" value={formeActive} />}
                {froid && <input type="hidden" name="froid" value="1" />}
                {dispoSeul && <input type="hidden" name="dispo" value="1" />}
                {tri && <input type="hidden" name="tri" value={tri} />}
                {vueListe && <input type="hidden" name="vue" value="liste" />}
                <input name="q" defaultValue={terme} placeholder="Dénomination, molécule, référence… (les fautes sont tolérées)" aria-label="Chercher dans le catalogue" />
                <button type="submit">Chercher</button>
              </form>
            </header>

            <div className="corps">
              <aside aria-label="Filtres">{filtres}</aside>
              <div>
                <details className="filtresMobile">
                  <summary><SlidersHorizontal size={17} aria-hidden /> Filtres{nbFiltres > 0 ? ` (${nbFiltres})` : ''}</summary>
                  <div style={{ paddingTop: 8 }}>{filtres}</div>
                </details>

                <div className="barreOutils">
                  <p className="compte" style={{ margin: 0 }}>
                    <b>{produits.length}</b> référence{produits.length > 1 ? 's' : ''}{terme ? ` pour « ${terme} »` : ''}
                  </p>
                  <nav className="tris" aria-label="Trier">
                    {TRIS.map(([cle, nom]) => <a key={cle || 'ordre'} href={lien({ tri: cle })} aria-current={tri === cle ? 'true' : undefined}>{nom}</a>)}
                  </nav>
                  <nav className="vues" aria-label="Affichage">
                    <a href={lien({ liste: false })} aria-current={!vueListe ? 'true' : undefined} aria-label="Cartes" title="Cartes"><LayoutGrid size={17} aria-hidden /></a>
                    <a href={lien({ liste: true })} aria-current={vueListe ? 'true' : undefined} aria-label="Liste" title="Liste"><List size={17} aria-hidden /></a>
                  </nav>
                </div>

                {produits.length === 0 ? (
                  <p style={{ padding: '22px 20px', borderRadius: 14, background: '#f7f7f8', color: '#5b5b5b' }}>
                    Aucune référence ne correspond. {nbFiltres > 0 && <a href={lien({ famille: null, forme: null, froid: false, dispo: false })} style={{ color: accent, fontWeight: 600 }}>Effacer les filtres</a>}
                  </p>
                ) : vueListe ? (
                  <div className="tableau">
                    {produits.map((p) => {
                      const d = lireDisponibilite(p.disponibilite)
                      return (
                        <div className="rang" key={p.reference}>
                          <VisuelProduit photo={p.photo} forme={p.forme} denomination={p.denomination} accent={accent} />
                          <div style={{ minWidth: 0 }}>
                            <a className="nom" href={ficheDe(p.reference)}>{p.denomination}</a>
                            {p.dosage && <span style={{ color: '#6b7280' }}> · {p.dosage}</span>}
                            {p.chaine_du_froid && <span className="froid" style={{ marginInlineStart: 8 }}><Snowflake size={12} aria-hidden /> 2–8 °C</span>}
                            <span style={{ display: 'block', fontSize: 12.5, color: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}>{p.reference}</span>
                          </div>
                          <div className="detail">{[p.forme, p.conditionnement].filter(Boolean).join(' · ')}</div>
                          <PastilleDispo d={d} />
                          <AjouterAuBon slug={s.slug} ligne={ligneBon(p)} accent={accent} actif={commandable(d)} />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <ul className="grille">
                    {produits.map((p) => {
                      const d = lireDisponibilite(p.disponibilite)
                      return (
                        <li className="carte" key={p.reference}>
                          <VisuelProduit photo={p.photo} forme={p.forme} denomination={p.denomination} accent={accent} carte />
                          <div className="haut">
                            <span className="ref">{p.reference}</span>
                            {/* LA CHAÎNE DU FROID EST UNE DONNÉE DE CONSERVATION.
                                Elle dit comment transporter, pas ce que ça coûte. */}
                            {p.chaine_du_froid && <span className="froid"><Snowflake size={12} aria-hidden /> 2–8 °C</span>}
                          </div>
                          <div className="txt">
                            {p.famille && <span className="famille">{p.famille}</span>}
                            <a className="nom" href={ficheDe(p.reference)}>{p.denomination}{p.dosage ? ` ${p.dosage}` : ''}</a>
                            <span className="detail">{[p.forme, p.conditionnement].filter(Boolean).join(' · ')}</span>
                          </div>
                          <div className="pied">
                            <PastilleDispo d={d} />
                            <AjouterAuBon slug={s.slug} ligne={ligneBon(p)} accent={accent} actif={commandable(d)} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {textes.length > 0 && (
          <section className="apropos" aria-label="À propos du catalogue">
            <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
          </section>
        )}
        <SousPages enfants={enfants} base={base} accent={accent} rtl={s.lang === 'ar'} />
      </main>
      <BarreBon slug={s.slug} base={base} accent={accent} />
    </div>
  )
}
