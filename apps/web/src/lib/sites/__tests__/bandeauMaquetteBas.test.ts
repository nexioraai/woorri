/**
 * LOT 4c — LE BANDEAU « MAQUETTE DE DÉMONSTRATION » NE SE FAIT RECOUVRIR PAR
 * RIEN, ET NE RECOUVRE RIEN (bureau et téléphone).
 *
 * Il est fixé en bas (44 px) et déclare `--deribfy-bas: 44px`. TOUT élément
 * fixé en bas d'une page de site ajoute cette réserve à sa position ; sans
 * bandeau, la variable n'existe pas et rien ne bouge (CPA et boutiques au pixel près).
 * Ce que ce fichier NE voit PAS : le rendu à l'œil — les captures le montrent.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
const SITES = join(process.cwd(), 'src', 'app', 'sites', '[slug]')
const tous = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f)
  if (f === '__tests__') return []
  return statSync(p).isDirectory() ? tous(p) : /\.tsx?$/u.test(f) ? [p] : []
})

const RESERVES: [string, string][] = [
  ['src/app/sites/[slug]/themes/Assistant.tsx', "bottom: 'calc(16px + var(--deribfy-bas, 0px))'"],
  ['src/app/sites/[slug]/themes/RevenirEnHaut.tsx', 'bottom: calc(18px + var(--deribfy-bas, 0px));'],
  ['src/app/sites/[slug]/catalogue/BarreBon.tsx', 'bottom: calc(18px + var(--deribfy-bas, 0px));'],
  ['src/app/sites/[slug]/themes/EditorialTheme.tsx', 'fixed bottom-[calc(1.5rem_+_var(--deribfy-bas,0px))] right-6'],
  ['src/app/sites/[slug]/themes/NoirTheme.tsx', 'fixed bottom-[calc(1.5rem_+_var(--deribfy-bas,0px))] right-6'],
  ['src/app/sites/[slug]/themes/VifTheme.tsx', 'fixed bottom-[calc(1.5rem_+_var(--deribfy-bas,0px))] right-6'],
  ['src/components/CookieConsent.tsx', "bottom: 'calc(1rem + var(--deribfy-bas, 0px))'"],
]

describe('la réserve du bandeau', () => {
  it('le bandeau déclare sa hauteur, et la page garde de la place sous son contenu', () => {
    const g = lire('src/app/sites/[slug]/layout.tsx')
    expect(g).toMatch(motifTexte("<style>{':root{--deribfy-bas:44px}'}</style>"))
    expect(g).toMatch(motifTexte('paddingBottom: maquette ? 44 : undefined'))
    expect(g).toMatch(motifTexte('height: 44,'))
  })
  for (const [f, ancre] of RESERVES) {
    it(`${f.split('/').pop()} remonte au-dessus du bandeau`, () => { expect(lire(f)).toMatch(motifTexte(ancre)) })
  }
  it('AUCUN élément fixé en bas d’une page de site n’oublie la réserve (balayage)', () => {
    const fautifs = tous(SITES).flatMap((p) => {
      const s = readFileSync(p, 'utf8')
      // Une BULLE ou une BARRE flottante (décollée du bord : bottom ≥ 1). Les panneaux
      // collés au bord (`bottom: 0`, menu plein écran) ne sont pas des flottants.
      const lignes = s.split('\n').filter((l) => (/\bfixed\b/u.test(l) && /\bbottom-[1-9]/u.test(l)) || (/position:\s*'?fixed/u.test(l) && /\bbottom:\s*'?[1-9]/u.test(l)))
      return lignes.map((l) => `${p.slice(SITES.length)} : ${l.trim().slice(0, 120)}`)
    })
    expect(fautifs).toEqual([])
  })
})
