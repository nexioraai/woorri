import { ogDePage } from '../themes/metadonneesDuSite'
import { pageWeb } from '../themes/filDAriane'
import JsonLdScript from '../themes/JsonLdScript'
import { fetchSite } from '../themes/shared'
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
import { supabase } from '@/lib/supabase'
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
  const complet = await fetchSite(slug)
  return {
    title,
    description,
    alternates: { canonical: `${base}/catalogue` },
    // LOT 18 — SA carte de partage, jamais celle de Deribfy.
    ...(complet ? ogDePage(complet, `${base}/catalogue`, title, description) : {}),
  }
}

export default async function CataloguePage({ params, searchParams }: Props) {
  const { slug } = await params
  const s = await fetchSiteCatalogue(slug)
  if (!s) notFound()

  const sp = (await searchParams) ?? {}
  const tous = await fetchCatalogue(s.id)
  const familles = famillesPresentes(tous)
  const familleActive = lireFamille(sp.famille, familles.map((f) => f.nom))
  const terme = typeof sp.q === 'string' ? sp.q : ''
  const produits = chercher(parFamille(tous, familleActive), terme)

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'

  const { data: declaree } = await supabase
    .from('site_pages_public').select('blocs')
    .eq('site_id', s.id).eq('chemin', 'catalogue').maybeSingle()
  const textes = lireBlocs((declaree as { blocs?: unknown } | null)?.blocs)
  // LOT 18 — les sous-pages déclarées sous `catalogue` (« Passer une commande »…).
  const enfants = await fetchEnfants(s.id, 'catalogue')

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <JsonLdScript data={pageWeb(s.name, base, s.lang, 'Catalogue', `${base}/catalogue`, [{ nom: 'Catalogue', url: `${base}/catalogue` }])} />
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          <Link href={base} style={{ color: accent }}>← Accueil</Link>
        </p>

        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>Catalogue</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.75, margin: '0 0 24px', maxWidth: '62ch' }}>
          Les produits mis à disposition des structures sanitaires agréées.
        </p>

        {textes.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
          </div>
        )}

        {tous.length === 0 ? (
          // UNE SECTION VIDE INFORME, ELLE NE DÉCORE PAS.
          <p style={{ padding: '18px 20px', borderRadius: 12, background: '#f7f7f8', fontSize: 16, color: '#5b5b5b' }}>
            Le catalogue n’est pas encore publié. Il paraîtra sur cette page dès que la Centrale l’aura mis en ligne.
          </p>
        ) : (
          <>
            {/* LA RECHERCHE EST UN FORMULAIRE GET : elle marche sans script,
                et son résultat a une adresse qui se partage. */}
            <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 18px' }}>
              {familleActive && <input type="hidden" name="famille" value={familleActive} />}
              <input
                name="q" defaultValue={terme} placeholder="Chercher une dénomination, une référence…"
                aria-label="Chercher dans le catalogue"
                style={{ flex: '1 1 260px', padding: '11px 13px', borderRadius: 10, border: '1px solid #d8d8dc', fontSize: 16 }}
              />
              <button type="submit" style={{
                padding: '11px 20px', borderRadius: 999, border: 'none',
                background: accent, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>Chercher</button>
            </form>

            {familles.length > 0 && (
              <nav aria-label="Familles" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 22px' }}>
                {[{ nom: 'Toutes', nombre: tous.length }, ...familles].map((f) => {
                  const cle = f.nom === 'Toutes' ? null : f.nom
                  const actif = cle === familleActive
                  const q = new URLSearchParams()
                  if (cle) q.set('famille', cle)
                  if (terme) q.set('q', terme)
                  return (
                    <a key={f.nom} href={q.toString() ? `?${q}` : '?'}
                      aria-current={actif ? 'page' : undefined}
                      style={{
                        padding: '7px 14px', borderRadius: 999, fontSize: 14,
                        border: `1px solid ${actif ? accent : 'rgba(127,127,127,0.35)'}`,
                        background: actif ? accent : 'transparent',
                        color: actif ? '#fff' : 'inherit', textDecoration: 'none',
                        fontWeight: actif ? 600 : 400,
                      }}>
                      {f.nom} <span style={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{f.nombre}</span>
                    </a>
                  )
                })}
              </nav>
            )}

            <p style={{ fontSize: 14, color: '#5b5b5b', margin: '0 0 14px', fontVariantNumeric: 'tabular-nums' }}>
              {produits.length} référence{produits.length > 1 ? 's' : ''}
              {terme ? ` pour « ${terme} »` : ''}
            </p>

            {produits.length === 0 ? (
              <p style={{ padding: '16px 18px', borderRadius: 12, background: '#f7f7f8', color: '#5b5b5b' }}>
                Aucune référence ne correspond.
              </p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e3e3e3', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  <thead>
                    <tr>
                      {['Référence', 'Dénomination', 'Forme', 'Conditionnement'].map((c) => (
                        <th key={c} scope="col" style={{
                          textAlign: 'left', padding: '12px 14px', background: '#f7f7f8',
                          fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1px solid #e3e3e3',
                        }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produits.map((p) => (
                      <tr key={p.reference}>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', whiteSpace: 'nowrap' }}>
                          <Link href={`${base}/catalogue/${encodeURIComponent(p.reference)}`}
                            style={{ color: accent, fontWeight: 600, fontFamily: 'ui-monospace, monospace', fontSize: 13.5 }}>
                            {p.reference}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', lineHeight: 1.5 }}>
                          {p.denomination}
                          {p.dosage && <span style={{ color: '#5b5b5b' }}> · {p.dosage}</span>}
                          {/* LA CHAÎNE DU FROID EST UNE DONNÉE DE CONSERVATION.
                              Elle dit comment transporter, pas ce que ça coûte. */}
                          {p.chaine_du_froid && (
                            <span style={{
                              marginInlineStart: 8, fontSize: 12, fontWeight: 600, padding: '2px 8px',
                              borderRadius: 999, background: '#e6f0f7', color: '#1d4e6e', whiteSpace: 'nowrap',
                            }}>2–8 °C</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', color: '#5b5b5b' }}>{p.forme ?? '—'}</td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #e3e3e3', color: '#5b5b5b' }}>{p.conditionnement ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <SousPages enfants={enfants} base={base} accent={accent} rtl={s.lang === 'ar'} />
      </main>
    </div>
  )
}
