import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { metadonneesDuSite, descriptionDuSite } from './themes/metadonneesDuSite'
import { lecteurDuSite, estEnApercu } from '@/lib/lecteurDuSite'
import SurvolVivant from './themes/SurvolVivant'
import Assistant from './themes/Assistant'
import PiedLegal from './themes/PiedLegal'
import { lirePagesLegales } from './themes/pagesLegales'
import { CHEMIN_ASSISTANT, textesDepuisPage, type TextesAssistant } from './themes/textesAssistant'
import { ECRANS_DU_COMPTE } from '@/lib/assistant/liens'
import { sujetsParDefaut } from './themes/sujetsAssistant'
import { lireInstitution } from '@/lib/sites/lireInstitution'
import { lireBlocs } from './pages/blocs'
import { headers } from 'next/headers'
import { resolveSiteBaseUrl } from './themes/shared'
import { lireSite } from './themes/lireSite'

// ============================================================================
// LOT 3c — UN SITE GÉNÉRÉ N'EST PAS LE TABLEAU DE BORD.
//
// LE DÉFAUT, VU À L'ÉCRAN par le propriétaire : /appels-offres servait du
// texte presque noir sur fond presque noir. Illisible.
//
// LA RACINE, MESURÉE. `globals.css` bascule `--background` en `#0a0a0a`
// sous `@media (prefers-color-scheme: dark)`. Un visiteur dont le SYSTÈME
// est en mode sombre recevait donc un site institutionnel en noir — alors
// que l'apparence d'un site généré appartient à SON THÈME, jamais aux
// préférences du visiteur pour la plateforme.
//
// POURQUOI UN LAYOUT ET PAS HUIT CORRECTIFS. Il n'existait AUCUN layout pour
// `sites/[slug]` : chaque page devait peindre son fond elle-même, et deux
// sur huit le faisaient. J'avais corrigé `[...rest]` mardi et l'archive
// aujourd'hui — page par page, donc jamais. Ici la règle est posée UNE fois,
// à la racine du segment, et toute page future en hérite sans rien écrire.
//
// CE QUE CE LAYOUT NE FAIT PAS : il n'impose aucune apparence. Les thèmes
// peignent leur propre fond par-dessus — `NoirTheme` reste noir, et c'est
// une DÉCISION de thème, pas un accident de réglage système. Ce layout ne
// fournit qu'un sol lisible à ce qui n'en pose pas.
//
// `globals.css` N'EST PAS MODIFIÉ : son segment est engendré depuis
// `packages/design-tokens/tokens.json`, et un cliquet CI rougit s'il diverge
// de sa source. On corrige au bon endroit, pas au plus commode.
// ============================================================================

// ============================================================================
// LOT 15.13 — ET C'EST AUSSI ICI QUE VIT L'ANIMATION AU SURVOL.
//
// MÊME RAISON QUE LE FOND BLANC, à deux mois d'intervalle. Le propriétaire a
// demandé que « chaque bouton anime quand on place le curseur », sur
// l'accueil ET sur chaque sous-page. Retoucher les boutons un par un, c'est
// la correction « page par page, donc jamais » que ce fichier existe pour
// éviter. La règle est posée une fois, à la racine du segment, et tout écran
// à venir en hérite sans rien écrire.
//
// LA COULEUR VIENT DU SITE. Le halo du survol et le liseré du clavier
// prennent sa teinte : un accent en dur donnerait le même bleu à quarante-
// deux sites qui n'ont pas la même identité.
// ============================================================================

/**
 * LOT 18 — l'identité du SITE par défaut, pour TOUTES ses pages : carte de
 * partage, icônes, manifeste. Sans elle, une page qui ne les pose pas hérite
 * de celles de Deribfy (gabarit racine). Voir `metadonneesDuSite`.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const site = await lireSite(slug)
  if (!site) return {}
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  return {
    // LE FILET : une page qui ne pose pas son titre, sa description ou sa
    // canonique héritait de ceux de DERIBFY (gabarit racine) — mesuré le
    // 2026-11-10 sur trois sous-pages. Par défaut : le nom et la description
    // DU SITE, et AUCUNE canonique plutôt qu'une canonique vers deribfy.com.
    title: site.name,
    description: descriptionDuSite(site),
    alternates: { canonical: null },
    ...metadonneesDuSite(site, base, slug),
    // 2026-11-15 — un site lu en APERÇU (non publié, cookie du propriétaire)
    // n'est jamais indexable, même si l'adresse fuit.
    ...((await estEnApercu(slug)) ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function SiteLayout({
  children, params,
}: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const supabase = await lecteurDuSite()
  const { slug } = await params
  const { data } = await supabase
    .from('sites_public').select('id,primary_color,name,lang').eq('slug', slug).maybeSingle()
  // `#111111` quand le site n'en déclare pas : le survol reste visible, il
  // n'emprunte simplement aucune couleur qui ne serait pas la sienne.
  const primary = (data as { primary_color?: string | null } | null)?.primary_color || '#111111'
  const nomDuSite = (data as { name?: string | null } | null)?.name || ''

  // ── LOT 16 — LA BULLE N'EXISTE QUE SI LE SITE L'A ALLUMÉE.
  // L'interrupteur se lit côté serveur (la vue publique ne le porte pas) ;
  // import tardif, pour que la seule présence du lecteur ne fasse pas tomber
  // ce qui importe ce gabarit quand la clé manque.
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: reglage } = await supabaseAdmin
    .from('sites').select('assistant_actif,slug,custom_domain,publishes_tenders,ouvre_des_comptes').eq('slug', slug).maybeSingle()
  const r = reglage as { assistant_actif?: boolean; slug: string; custom_domain: string | null; publishes_tenders?: boolean; ouvre_des_comptes?: boolean } | null
  const assistant = r?.assistant_actif === true
  // LOT 4c — LE BANDEAU « MAQUETTE DE DÉMONSTRATION ». Lu À PART : tant que la
  // colonne n'existe pas (SQL non passé), cette lecture échoue seule et ne
  // touche ni l'assistant ni l'adresse du site — l'erreur vaut « pas de bandeau ».
  const { data: maq } = await supabaseAdmin.from('sites').select('maquette_demo').eq('slug', slug).maybeSingle()
  const maquette = (maq as { maquette_demo?: boolean | null } | null)?.maquette_demo === true
  const base = r ? resolveSiteBaseUrl(r as never, (await headers()).get('host')) : ''

  // LOT 17 — les pages légales déclarées (bandeau des pages sans pied de thème).
  const site = data as { id?: string; lang?: string | null } | null
  const liensLegaux = site?.id ? await lirePagesLegales(site.id, base, site.lang) : []

  // LOT 17 — les textes de la bulle, depuis la page NON PUBLIÉE de l'éditeur.
  let textesAssistant: TextesAssistant = {}
  if (assistant && r) {
    const [{ data: pageA }, { data: publiees }] = await Promise.all([
      supabaseAdmin.from('site_pages').select('titre,chapeau,blocs')
        .eq('site_id', (site?.id ?? '')).eq('chemin', CHEMIN_ASSISTANT).maybeSingle(),
      supabase.from('site_pages_public').select('chemin,titre').eq('site_id', (site?.id ?? '')),
    ])
    const connus = new Map<string, string>([
      ...Object.entries(ECRANS_DU_COMPTE),
      ['/#contact', 'Contact'],
      ...((publiees as { chemin: string; titre: string }[] | null) ?? []).map((p) => [`/${p.chemin}`, p.titre] as [string, string]),
    ])
    const pa = pageA as { titre?: string | null; chapeau?: string | null; blocs?: unknown } | null
    textesAssistant = textesDepuisPage(pa ? { titre: pa.titre, chapeau: pa.chapeau, blocs: lireBlocs(pa.blocs) } : null, connus)
    // SANS BOUTONS ÉCRITS PAR LE SITE : les sujets tirés de CE site (2026-11-26).
    if (textesAssistant.sujets === undefined) {
      textesAssistant = { ...textesAssistant, sujets: sujetsParDefaut({
        inst: await lireInstitution(site?.id ?? '', site?.lang),
        appelsOffres: r.publishes_tenders === true,
        comptes: r.ouvre_des_comptes === true,
        connus,
      }) }
    }
  }

  return (
    <div
      data-surface="site-genere"
      // `vivant` : la classe que lit `SurvolVivant`. Elle enveloppe TOUT ce
      // que ce segment rend — accueil, pages déclarées, espace, appels
      // d'offres — donc aucune page ne peut l'oublier.
      className="vivant"
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#111111',
        // `colorScheme: 'light'` dit au navigateur de rendre ses propres
        // contrôles (champs, barres de défilement, listes déroulantes) en
        // clair. Sans lui, un champ de formulaire reste sombre sur fond
        // blanc : le fond est corrigé, la saisie reste illisible.
        colorScheme: 'light',
        // Le bandeau fixe de la maquette ne recouvre jamais le bas de page.
        paddingBottom: maquette ? 44 : undefined,
      }}
    >
      <SurvolVivant primary={primary} />
      {children}
      {(await estEnApercu(slug)) && <ReperApercu hausse={maquette} />}
      {maquette && <BandeauMaquette />}
      <PiedLegal liens={liensLegaux} />
      {assistant && <Assistant slug={slug} base={base} primary={primary} nom={nomDuSite} textes={textesAssistant} />}
    </div>
  )
}


/**
 * 2026-11-15 — LE REPÈRE D'APERÇU. Le site est montré avec le jeton de son
 * propriétaire : un visiteur ne le voit pas. En bas À GAUCHE : en haut, l'en-tête
 * fixe des thèmes le recouvrait (l'ancien bandeau de /preview était invisible) ;
 * à droite se trouve le bouton WhatsApp.
 */
function ReperApercu({ hausse = false }: { hausse?: boolean }) {
  return (
    <div
      role="status"
      data-apercu-non-publie=""
      style={{
        position: 'fixed', left: 16, bottom: hausse ? 60 : 16, zIndex: 2147483000, maxWidth: 'calc(100vw - 112px)',
        background: '#FA5D1E', color: '#ffffff', borderRadius: 999, padding: '8px 14px',
        font: '600 13px/1.3 system-ui, sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.25)',
      }}
    >
      Aperçu — ce site n’est pas encore publié
    </div>
  )
}

/**
 * LOT 4c — « MAQUETTE DE DÉMONSTRATION — NON OFFICIELLE ». Un réglage du site,
 * réservé au propriétaire (« Éditer »), allumé à la génération d'une
 * institution. Fixe en BAS, sur toute la largeur, sur TOUTES les pages : il ne
 * se ferme pas d'un clic — seul le propriétaire le retire, dans ses réglages.
 *
 * Il RÉSERVE sa hauteur : `--deribfy-bas` (44 px) remonte tout ce qui est fixé
 * en bas — bulle de l'assistant, « revenir en haut », barre du bon, boutons
 * WhatsApp, bannière des cookies. Sans bandeau, la variable n'existe pas et
 * chacun garde sa place d'avant, au pixel près.
 */
function BandeauMaquette() {
  return (
    <div
      role="note"
      data-bandeau-maquette=""
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2147482999, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
        background: 'repeating-linear-gradient(135deg, #111 0 14px, #1f1f1f 14px 28px)', color: '#FFD60A',
        borderTop: '3px solid #FFD60A', font: '800 14px/1.2 system-ui, sans-serif', letterSpacing: '0.02em', textAlign: 'center',
      }}
    >
      <style>{':root{--deribfy-bas:44px}'}</style>
      Maquette de démonstration — non officielle
    </div>
  )
}
