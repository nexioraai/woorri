// LE CADRE D'UN SITE INSTITUTIONNEL (lot 4b, 4c) : en-tête (enseigne, grand
// menu, recherche, contraste) et pied de page, partagés par l'ACCUEIL, les
// PAGES INTÉRIEURES et le CONTACT — un vrai site, pas une page isolée.
// Seulement pour le thème `institution`.
//
// Pied de page (lot 4c) : l'enseigne, les rubriques, Contact, les pages
// légales RÉELLEMENT présentes, les réseaux RÉELLEMENT renseignés (aucune
// icône sans lien), et « Développé par Deribfy ».
import type { ReactNode } from 'react'
import EnseigneDuSite from '../EnseigneDuSite'
import ReseauxSociaux from '../ReseauxSociaux'
import GrandMenu from './GrandMenu'
import OutilsInstitution from './OutilsInstitution'
import type { EntreeRecherche, RubriqueInstitution } from './types'
import type { LienLegal } from '../typesLegaux'

/**
 * L'adresse de l'enseigne : en APERÇU (cookie d'aperçu présent — le propriétaire,
 * ou sa « vue visiteur »), sous le chemin du site, que ce cookie atteint ; sinon
 * la route publique, en cache. Vu sur la capture du 2026-11-26 : en vue
 * visiteur d'un site non publié, la route publique rendait 404 (logo cassé).
 */
export function sourceEnseigne(slug: string, apercu: boolean): string | undefined {
  return apercu ? `/sites/${slug}/enseigne.png` : undefined
}

export const STYLE_INSTITUTION = `@keyframes panneau{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.institution h1,.institution h2{font-weight:900;letter-spacing:-0.035em}
.institution[data-contraste]{background:#fff!important;color:#000!important}
.institution[data-contraste] [style*="background-color"],.institution[data-contraste] footer,.institution[data-contraste] [data-voile]{background:#000!important;color:#fff!important}
.institution[data-contraste] [data-voile]{opacity:.82}
.institution[data-contraste] a{text-decoration:underline!important;text-underline-offset:3px}
.institution[data-contraste] .text-neutral-600,.institution[data-contraste] .text-neutral-700,.institution[data-contraste] .bg-neutral-100{color:#000!important}
.institution[data-contraste] .bg-neutral-100{background:#fff!important;outline:2px solid #000}
.institution[data-contraste] :focus-visible{outline:4px solid #FFD60A!important;outline-offset:2px}`

export default function CadreInstitution({ nom, logo, slug, base, couleur, rubriques, contact, liensLegaux = [], proprietaire = false, apercu = proprietaire, social = null, recherche = [], children }: {
  nom: string
  logo: string | null | undefined
  slug: string
  base: string
  couleur: string
  rubriques: RubriqueInstitution[]
  contact: string
  liensLegaux?: LienLegal[]
  proprietaire?: boolean
  /** Le cookie d'aperçu est là (propriétaire ou sa vue visiteur). Par défaut : le propriétaire. */
  apercu?: boolean
  social?: Record<string, string | undefined> | null
  recherche?: EntreeRecherche[]
  children: ReactNode
}) {
  const source = sourceEnseigne(slug, apercu)
  return (
    <div className="institution min-h-screen bg-white text-neutral-900 flex flex-col" data-theme-institution="">
      <style>{STYLE_INSTITUTION}</style>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:z-[300] focus:m-2 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold">Aller au contenu</a>
      <header className="sticky top-0 z-[70] bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center gap-3">
          <EnseigneDuSite nom={nom} logo={logo} slug={slug} source={source} href={base || '/'} hauteur={52} className="text-xl font-black tracking-tight" />
          <div className="ml-auto flex items-center lg:items-stretch h-full" data-zone-menu="">
            <GrandMenu rubriques={rubriques} base={base} contact={contact} couleur={couleur} />
          </div>
          <div className="flex items-center gap-2">
            <OutilsInstitution index={recherche} base={base} couleur={couleur} />
          </div>
        </div>
      </header>
      <div id="contenu" className="flex-1">{children}</div>
      <footer className="mt-16 text-white" style={{ backgroundColor: '#0d1117' }} data-pied-legal="" data-pied-institution="">
        <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-4">
              {logo && <EnseigneDuSite nom={nom} logo={logo} slug={slug} source={source} href={base || '/'} hauteur={64} />}
              <p className="text-2xl font-black tracking-tight">{nom}</p>
            </div>
            <div className="mt-4 h-1.5 w-24 rounded-full" style={{ backgroundColor: couleur }} />
            <ReseauxSociaux social={social} className="mt-6" />
          </div>
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li><a href={base || '/'} className="font-semibold opacity-85 hover:opacity-100">Accueil</a></li>
            {rubriques.map((r) => <li key={r.chemin}><a href={`${base}/${r.chemin}`} className="font-semibold opacity-85 hover:opacity-100">{r.titre}</a></li>)}
          </ul>
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li><a href={contact} className="font-semibold opacity-85 hover:opacity-100">Contact</a></li>
            {liensLegaux.map((l) => <li key={l.href}><a href={l.href} className="opacity-70 hover:opacity-100">{l.titre}</a></li>)}
          </ul>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-7xl mx-auto px-6 py-5 text-sm opacity-70">
            © {nom} · Développé par <a href="https://www.deribfy.com" className="font-bold underline underline-offset-4" rel="noopener">Deribfy</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
