import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { fetchMenu } from '../pages/fetchPage'
import { compterArticlesPublies } from '../blog/fetchPosts'

// ============================================================================
// LOT 9 — LE PLAN DU SITE, ENGENDRÉ.
//
// « ENGENDRÉ » EST LE MOT DU PLAN, ET C'EST TOUT LE LOT. Une liste
// d'adresses recopiée à la main dit la vérité le jour où on l'écrit, puis
// ment à chaque page ajoutée — exactement le défaut du menu trouvé le
// 7 novembre, où une page créée n'apparaissait nulle part.
//
// IL NE MONTRE QUE CE QUI EST PUBLIÉ. Les pages viennent de
// `site_pages_public`, qui joint `sites_public` : une page en brouillon
// n'a aucun chemin par lequel entrer ici. Sinon le plan deviendrait la
// fuite que `fetchPage`, la fiche produit et le suivi referment tous.
//
// LES ROUTES DU MOTEUR SONT DÉCLARÉES, PAS DEVINÉES. `/appels-offres`
// n'existe que si le site DIT qu'il publie des marchés ; `/catalogue` que
// s'il a au moins un produit publié. Annoncer une adresse vide, c'est
// promettre un contenu qu'on ne livre pas.
// ============================================================================

type Props = { params: Promise<{ slug: string }> }

type SitePlan = {
  id: string; slug: string; name: string
  primary_color: string | null; lang: string | null; custom_domain: string | null
  publishes_tenders?: boolean | null
}

async function site(slug: string): Promise<SitePlan | null> {
  const { data } = await supabase
    .from('sites_public')
    .select('id,slug,name,primary_color,lang,custom_domain,publishes_tenders')
    .eq('slug', slug)
    .maybeSingle()
  return (data as SitePlan) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const s = await site(slug)
  if (!s) return {}
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  return {
    title: `Plan du site — ${s.name}`,
    description: `Toutes les pages publiées de ${s.name}, en une seule page.`,
    alternates: { canonical: `${base}/plan-du-site` },
  }
}

export default async function PlanDuSitePage({ params }: Props) {
  const { slug } = await params
  const s = await site(slug)
  if (!s) notFound()

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'

  // ── LES PAGES DÉCLARÉES, hiérarchie comprise. Même lecture que le menu :
  //    deux sources pour la même chose finiraient par diverger.
  const menu = await fetchMenu(s.id)
  const racines = menu.filter((p) => !p.parent)
  const enfantsDe = (chemin: string) => menu.filter((p) => p.parent === chemin)

  // ── LES ROUTES DU MOTEUR, ET SEULEMENT SI ELLES ONT QUELQUE CHOSE.
  const { count: nbProduits } = await supabase
    .from('catalogue_produits_public')
    .select('reference', { count: 'exact', head: true })
    .eq('site_id', s.id)

  // LA VUE DU BLOG N'EST LUE QUE PAR SON MODULE. Deux lecteurs finiraient
  // par appliquer deux regles de propriete differentes.
  const nbArticles = await compterArticlesPublies(s.id)

  const moteur: { chemin: string; libelle: string }[] = [
    ...(s.publishes_tenders === true ? [{ chemin: 'appels-offres', libelle: 'Appels d’offres' }] : []),
    ...((nbProduits ?? 0) > 0 ? [{ chemin: 'catalogue', libelle: 'Catalogue' }] : []),
    ...(nbArticles > 0 ? [{ chemin: 'blog', libelle: 'Actualités' }] : []),
    { chemin: 'demandes/suivi', libelle: 'Suivre une demande' },
  ]

  const lien = (chemin: string, libelle: string, petit = false) => (
    <li key={chemin} style={{ marginBottom: petit ? 4 : 8 }}>
      <Link href={`${base}/${chemin}`} style={{
        color: petit ? '#111111' : accent,
        fontSize: petit ? 15 : 16,
        fontWeight: petit ? 400 : 600,
      }}>{libelle}</Link>
      <span style={{ marginInlineStart: 8, fontSize: 12.5, color: '#8a8a8f', fontFamily: 'ui-monospace, monospace' }}>
        /{chemin}
      </span>
    </li>
  )

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          <Link href={base} style={{ color: accent }}>← Accueil</Link>
        </p>

        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>
          Plan du site
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.75, margin: '0 0 30px', maxWidth: '60ch' }}>
          Toutes les pages publiées de {s.name}. Cette liste est construite à partir des pages
          elles-mêmes : elle ne peut pas annoncer une page qui n’existe pas, ni en oublier une.
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {lien('', 'Accueil')}

          {racines.map((p) => {
            const kids = enfantsDe(p.chemin)
            return (
              <li key={p.chemin} style={{ marginBottom: 14 }}>
                <Link href={`${base}/${p.chemin}`} style={{ color: accent, fontSize: 16, fontWeight: 600 }}>
                  {p.titre}
                </Link>
                <span style={{ marginInlineStart: 8, fontSize: 12.5, color: '#8a8a8f', fontFamily: 'ui-monospace, monospace' }}>
                  /{p.chemin}
                </span>
                {kids.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: '6px 0 0 18px', margin: 0, borderInlineStart: '2px solid #e3e3e3' }}>
                    {kids.map((k) => lien(k.chemin, k.titre, true))}
                  </ul>
                )}
              </li>
            )
          })}

          {moteur.map((m) => lien(m.chemin, m.libelle))}
        </ul>

        <p style={{ fontSize: 13.5, color: '#8a8a8f', marginTop: 30, lineHeight: 1.6 }}>
          {racines.length + menu.filter((p) => p.parent).length + moteur.length + 1} adresses publiées.
          Les pages en préparation n’y figurent pas.
        </p>
      </main>
    </div>
  )
}
