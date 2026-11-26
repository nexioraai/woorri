// LE CADRE D'UN SITE INSTITUTIONNEL (lot 4b) : en-tête (enseigne + grand menu)
// et pied de page, partagés par l'ACCUEIL et les PAGES INTÉRIEURES — un vrai
// site, pas une page isolée. Seulement pour le thème `institution`.
import type { ReactNode } from 'react'
import EnseigneDuSite from '../EnseigneDuSite'
import GrandMenu from './GrandMenu'
import type { RubriqueInstitution } from './types'
import type { LienLegal } from '../typesLegaux'

export default function CadreInstitution({ nom, logo, slug, base, couleur, rubriques, contact, liensLegaux = [], children }: {
  nom: string
  logo: string | null | undefined
  slug: string
  base: string
  couleur: string
  rubriques: RubriqueInstitution[]
  contact: string
  liensLegaux?: LienLegal[]
  children: ReactNode
}) {
  return (
    <div className="institution min-h-screen bg-white text-neutral-900" data-theme-institution="">
      <style>{`@keyframes panneau{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.institution h1,.institution h2{font-weight:900;letter-spacing:-0.035em}`}</style>
      <header className="sticky top-0 z-[70] bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center gap-4">
          <EnseigneDuSite nom={nom} logo={logo} slug={slug} href={base || '/'} hauteur={52} className="text-xl font-black tracking-tight" />
          <div className="ml-auto flex items-stretch h-full">
            <GrandMenu rubriques={rubriques} base={base} contact={contact} couleur={couleur} />
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-24 text-white" style={{ backgroundColor: '#0d1117' }}>
        <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-2xl font-black tracking-tight">{nom}</p>
            <div className="mt-4 h-1.5 w-24 rounded-full" style={{ backgroundColor: couleur }} />
          </div>
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rubriques.map((r) => <li key={r.chemin}><a href={`${base}/${r.chemin}`} className="font-semibold opacity-85 hover:opacity-100">{r.titre}</a></li>)}
          </ul>
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li><a href={contact} className="font-semibold opacity-85 hover:opacity-100">Contact</a></li>
            {liensLegaux.map((l) => <li key={l.href}><a href={l.href} className="opacity-70 hover:opacity-100">{l.titre}</a></li>)}
          </ul>
        </div>
      </footer>
    </div>
  )
}
