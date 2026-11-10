'use client'

import { useState } from 'react'
import type { EntreeMenu } from '../pages/fetchPage';
import { resolveSiteBaseUrl } from './shared';
import { getAvisLabels } from '../appels-offres/labels'
import DessinDeMenu from './DessinDeMenu'
import { Menu, X, ArrowRight } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { getDict } from './i18n'
import { getModeCapabilities } from './modeCapabilities'

interface MobileNavProps {
  site: {
    slug: string
    name: string
    primary_color?: string
    products?: any[]
    lang?: string
    hidden_sections?: string[]
    mode?: number | null
    /**
     * LOT 15.7 — la capacite declaree, lue ici comme ailleurs.
     *
     * `undefined` si la colonne n est pas en base : donc faux, donc aucune
     * entree. La projection de `shared.tsx` ne peut pas rendre une colonne
     * absente, et ce type ne doit pas pretendre le contraire.
     */
    publishes_tenders?: boolean
    /** LOT 21 — pour savoir si « À propos » / « Services » ont une page. */
    about?: string | null
    mission?: string | null
    vision?: string | null
    sections?: unknown[] | null
  }
  cta: string
  ctaHref: string
  // Optionnel, retro-compatible : Editorial/Vif/Aurora ne le passent pas et
  // conservent donc exactement le panneau clair actuel (aucun diff visuel).
  // 'dark' n'est utilise que par Noir -- ce panneau etait code en dur en
  // blanc (bg-white/95, text-neutral-800...) quel que soit le theme du site,
  // meme categorie de probleme deja rencontree sur CatalogSearch et
  // ContactForm : decouvert a l'audit final en ouvrant reellement le menu
  // mobile sur Cosmopo, panneau entierement blanc sur un site entierement
  // sombre. Le bouton CTA garde `primary_color` du marchand tel quel (deja
  // le comportement etabli ailleurs, ex. PromoBanner) -- seuls le panneau,
  // le fond, les liens et le bouton bascule sont rendus theme-aware.
  variant?: 'light' | 'dark'
}


/** Une entree du menu du telephone. Un parent porte ses enfants. */
export type EntreeTelephone = {
  href: string
  label: string
  /**
   * LOT 15.7 — LA RACINE DE LA RUBRIQUE, pour en deduire le pictogramme.
   *
   * On ne la devine PAS depuis `href` : une ancre (`#contact`) et une page
   * declaree (`https://.../contact`) n ont pas la meme forme, et le jour ou
   * une troisieme forme apparait la deduction se tromperait en silence.
   * L endroit qui CONSTRUIT l entree est le seul qui sache de quoi il parle.
   */
  chemin?: string
  enfants?: { href: string; label: string }[]
}

/**
 * LE MENU DU TELEPHONE EST HIERARCHIQUE, COMME CELUI DU BUREAU.
 *
 * Vu a l'ecran le 2026-11-08 : le hamburger servait TRENTE entrees a plat,
 * les sous-pages decalees par un tiret. J'avais ecrit ici qu'un menu
 * deroulant « se replierait mal au doigt » -- une supposition, et elle etait
 * fausse : trente lignes a faire defiler se replient bien plus mal.
 *
 * Cette fonction est PURE et EXPORTEE parce que le panneau ne se rend que
 * s'il est ouvert : un test qui rend le composant ferme ne mesure rien.
 */
export function construireMenuTelephone({
  pages, base, hidden, hasShop, t, avisTitre = null, aPropos = true, services = true,
}: {
  /** LOT 21 — les pages « À propos » / « Services » n'existent que si le site a ce contenu. */
  aPropos?: boolean
  services?: boolean
  pages: EntreeMenu[]
  base: string
  hidden: (nom: string) => boolean
  hasShop: boolean
  t: { nav: { about: string; services: string; shop: string; gallery: string; reviews: string; contact: string } }
  /**
   * LOT 15.7 — LE TITRE DES APPELS D OFFRES, ou `null` si le site n en publie pas.
   *
   * MESURE LE 2026-11-09 : la barre du bureau portait « Appels d offres », le
   * rideau du telephone ne la portait PAS. La page existait, elle etait
   * simplement inatteignable au doigt. Le propietaire l avait dit des le
   * 2026-11-08 : « ce que je vois sur ordi est different de telephone ».
   *
   * Le theme passe le titre quand `publishes_tenders` est vrai, et rien
   * sinon : la REGLE d ouverture reste a un seul endroit, `LienAppelsOffres`.
   */
  avisTitre?: string | null
}): EntreeTelephone[] {
  // Meme regle que la barre du bureau : quand le site DECLARE ses pages, les
  // ancres d'une page unique quittent le menu. Un site sans page declaree ne
  // change pas -- c'est ce qui protege les 41 autres.
  const ancres = pages.length === 0
  const racines = pages.filter((p) => !p.parent)

  return [
    // LOT 21 — de vraies pages, plus des ancres.
    ...(ancres && aPropos && !hidden('About') ? [{ href: `${base}/a-propos`, label: t.nav.about }] : []),
    ...(ancres && services && !hidden('Services') ? [{ href: `${base}/services`, label: t.nav.services }] : []),
    ...(ancres && hasShop && !hidden('Shop') ? [{ href: '#shop', label: t.nav.shop }] : []),
    ...(ancres && !hidden('Gallery') ? [{ href: '#gallery', label: t.nav.gallery }] : []),
    ...(ancres && !hidden('Reviews') ? [{ href: '#testimonials', label: t.nav.reviews }] : []),
    ...racines.map((p): EntreeTelephone => {
      const kids = pages.filter((k) => k.parent === p.chemin)
      return {
        href: `${base}/${p.chemin}`,
        label: p.titre,
        chemin: p.chemin,
        // La page d'entree reste atteignable DEPUIS son propre sous-menu :
        // replier un parent ne doit pas le rendre inaccessible.
        ...(kids.length > 0
          ? { enfants: [
              { href: `${base}/${p.chemin}`, label: p.titre },
              ...kids.map((k) => ({ href: `${base}/${k.chemin}`, label: k.titre })),
            ] }
          : {}),
      }
    }),
    ...(avisTitre ? [{ href: `${base}/appels-offres`, label: avisTitre, chemin: 'appels-offres' }] : []),
    // LOT 18 — la vraie page `/contact`, pas l'ancre de l'accueil.
    ...(!hidden('Contact') ? [{ href: `${base}/contact`, label: t.nav.contact, chemin: 'contact' }] : []),
  ]
}

export default function MobileNav({ site, cta, ctaHref, variant = 'light', pagesDeclarees = [], host = null, seuil = 'md' }: MobileNavProps & {
  pagesDeclarees?: EntreeMenu[];
  host?: string | null;
  /**
   * LOT 15.7 — A PARTIR DE QUELLE LARGEUR LA BARRE DU BUREAU PREND LE RELAIS.
   *
   * Sept entrees declarees ne tiennent pas dans 768 px. Le theme recule donc
   * sa barre a `xl` — et le rideau doit reculer AVEC, sinon il reste une
   * bande entre 768 et 1280 px ou le site n a plus aucun menu du tout.
   */
  seuil?: 'md' | 'xl';
}) {
  // L'adresse de base, résolue comme partout ailleurs : un chemin plateforme
  // en dur serait re-préfixé par le proxy sur un sous-domaine et tomberait
  // en 404.
  const baseDeclaree = resolveSiteBaseUrl(site, host);
  const [isOpen, setIsOpen] = useState(false)
  const isDark = variant === 'dark'
  const primary = site.primary_color || '#111111'
  const t = getDict(site.lang)
  // Source de verite inchangee depuis la Phase 1 -- ne touche jamais a ce
  // calcul en modernisant l'apparence du menu. Voir modeCapabilities.ts.
  const { hasShop } = getModeCapabilities(site)
  const hidden = (name: string) => (site.hidden_sections || []).includes(name)
  const closeMenu = () => setIsOpen(false)
  const reduceMotion = useReducedMotion()

  // ── LE MENU DU TÉLÉPHONE EST HIÉRARCHIQUE, COMME CELUI DU BUREAU.
  //
  // Mesuré à l'écran le 2026-11-08 par le propriétaire : le hamburger servait
  // TRENTE entrées à plat, les sous-pages décalées par un tiret. J'avais écrit
  // ici qu'« un menu déroulant dans un panneau déjà déroulant se replie mal au
  // doigt » — c'était une supposition, et elle était fausse : trente lignes à
  // faire défiler se replient bien plus mal.
  //
  // Même règle que la barre du bureau : quand le site DÉCLARE ses pages, les
  // ancres d'une page unique quittent le menu. Les sections restent sur
  // l'accueil. Un site sans page déclarée ne change pas.
  const navLinks = construireMenuTelephone({
    aPropos: !!(site.about || site.mission || site.vision),
    services: (site.sections ?? []).length > 0,
    // `!== true` et non `!x` : meme lecture que `LienAppelsOffres`, parce que
    // c est la MEME regle. Deux lectures differentes de la meme colonne, c est
    // deux comportements qui divergeront un jour.
    avisTitre: site.publishes_tenders === true ? getAvisLabels(site.lang).titre : null,
    pages: pagesDeclarees ?? [],
    base: baseDeclaree,
    hidden,
    hasShop,
    t,
  })

  return (
    <div className={seuil === 'xl' ? 'xl:hidden' : 'md:hidden'}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-5 right-5 z-[60] flex items-center justify-center w-11 h-11 rounded-full backdrop-blur-md border shadow-sm transition-transform active:scale-95 ${isDark ? 'bg-black/50 border-white/15' : 'bg-white/80 border-black/10'}`}
        aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className={`w-5 h-5 ${isDark ? 'text-white' : 'text-neutral-900'}`} /> : <Menu className={`w-5 h-5 ${isDark ? 'text-white' : 'text-neutral-900'}`} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
              onClick={closeMenu}
            />
            <motion.div
              key="panel"
              className={`fixed top-0 right-0 bottom-0 z-50 w-[82vw] max-w-sm backdrop-blur-xl shadow-2xl flex flex-col ${isDark ? 'bg-[#0A0806]/95' : 'bg-white/95'}`}
              initial={{ x: reduceMotion ? 0 : '100%', opacity: reduceMotion ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduceMotion ? 0 : '100%', opacity: reduceMotion ? 0 : 1 }}
              transition={{ type: reduceMotion ? 'tween' : 'spring', stiffness: 320, damping: 34, duration: reduceMotion ? 0.15 : undefined }}
            >
              <nav className="flex-1 overflow-y-auto pt-24 px-2 pb-6">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : 0.05 + i * 0.04, duration: 0.25 }}
                  >
                    {link.enfants ? (
                      // `<details>` natif : il se replie sans JavaScript, et
                      // la zone de toucher fait toute la largeur.
                      <details className="group">
                        <summary className={`flex items-center justify-between px-5 py-4 rounded-2xl text-base font-medium cursor-pointer list-none transition-colors ${isDark ? 'text-white/90 hover:bg-white/10' : 'text-neutral-800 hover:bg-neutral-100'}`}>
                          <span className="inline-flex items-center gap-3">
                            <DessinDeMenu chemin={link.chemin ?? ''} couleur={isDark ? null : primary} taille={19} />
                            {link.label}
                          </span>
                          <span aria-hidden className="ml-3 text-sm opacity-60 transition-transform group-open:rotate-180">▾</span>
                        </summary>
                        <div className="pl-4">
                          {link.enfants.map((e) => (
                            <a
                              key={e.href}
                              href={e.href}
                              onClick={closeMenu}
                              className={`block px-5 py-3 rounded-2xl text-[15px] transition-colors ${isDark ? 'text-white/75 hover:bg-white/10' : 'text-neutral-600 hover:bg-neutral-100'}`}
                            >
                              {e.label}
                            </a>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <a
                        href={link.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-base font-medium transition-colors ${isDark ? 'text-white/90 hover:bg-white/10' : 'text-neutral-800 hover:bg-neutral-100'}`}
                      >
                        <DessinDeMenu chemin={link.chemin ?? ''} couleur={isDark ? null : primary} taille={19} />
                        {link.label}
                      </a>
                    )}
                  </motion.div>
                ))}
              </nav>
              <div className="p-5 pt-0">
                <a
                  href={ctaHref}
                  onClick={closeMenu}
                  className="inline-flex items-center gap-2 w-full justify-center px-4 py-3.5 rounded-full text-white text-sm font-semibold shadow-lg transition-transform active:scale-95"
                  style={{ backgroundColor: primary }}
                >
                  {cta}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
