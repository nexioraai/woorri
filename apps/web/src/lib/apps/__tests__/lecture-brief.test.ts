// 2026-11-12 — M6 : le résultat de la lecture du brief était INCONNU 34 fois sur 34.
//
// Ce fichier verrouille :
//   ① la revalidation de ce que le navigateur transmet (une valeur douteuse
//      devient `non_transmise`, jamais un statut) ;
//   ② la route `lire-brief` nomme son résultat dans TOUTES ses branches ;
//   ③ la route de génération l'écrit en SUCCÈS et en ÉCHEC ;
//   ④ le client le transmet PAR ARGUMENT, jamais par l'état React.
// Ce que ces cliquets NE VOIENT PAS : qu'une vraie génération écrive la ligne.
// Celle-là se prouve par une génération (rapport, étape 1).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lectureAEnregistrer, RESULTATS_LECTURE } from '../lecture-brief'
import { motifTexte } from './motif-texte'

const lire = (chemin: string) => readFileSync(join(__dirname, '..', '..', '..', chemin), 'utf8')

describe('le résultat de la lecture du brief est enregistré', () => {
  it('① une valeur douteuse ne devient jamais un statut', () => {
    expect(lectureAEnregistrer(undefined, 0)).toEqual({ resultat: 'non_transmise', entreeCoupee: null, tablesLues: null, tablesRecues: 0, source: 'absente' })
    expect(lectureAEnregistrer({ resultat: 'parfait' }, 2).resultat).toBe('non_transmise')
    expect(lectureAEnregistrer('reussie', 2).resultat).toBe('non_transmise')
    expect(lectureAEnregistrer({ resultat: 'json_casse', entreeCoupee: true, tables: 0 }, 0))
      .toEqual({ resultat: 'json_casse', entreeCoupee: true, tablesLues: 0, tablesRecues: 0, source: 'client' })
    // Le nombre de tables REÇUES est celui que la route a compté, jamais celui qu'on lui dit.
    expect(lectureAEnregistrer({ resultat: 'reussie', entreeCoupee: false, tables: 99 }, 3).tablesRecues).toBe(3)
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: -1 }, 0).tablesLues).toBeNull()
  })

  it('② lire-brief nomme son résultat dans toutes ses branches', () => {
    const src = lire('app/api/generateur/lire-brief/route.ts')
    for (const r of RESULTATS_LECTURE) expect(src, `résultat jamais rendu : ${r}`).toContain(`'${r}'`)
    // Plus aucune réponse sans `lecture` : chaque `NextResponse.json({` de la route la porte.
    // Lecture à parenthèses ÉQUILIBRÉES : une expression non gourmande s'arrêtait
    // sur `{ nomProduit })` au milieu de la réponse de succès (faux positif mesuré).
    const reponses = [...src.matchAll(/NextResponse\.json\(/gu)].map((m) => {
      let prof = 0
      for (let i = m.index + m[0].length - 1; i < src.length; i++) {
        if (src[i] === '(') prof++
        else if (src[i] === ')' && --prof === 0) return src.slice(m.index, i + 1)
      }
      return src.slice(m.index)
    })
    expect(reponses.length).toBeGreaterThan(4)
    for (const r of reponses) expect(r, `réponse sans statut : ${r.slice(0, 80)}`).toContain('lecture')
  })

  it('③ la route de génération l’écrit en succès ET en échec', () => {
    const src = lire('app/api/generateur/direct/route.ts')
    expect(src).toMatch(motifTexte('sections_acquises: { lectureBrief },'))
    expect(src).toMatch(motifTexte('      configuration,\n      lectureBrief,\n      tours: resultat.tours,'))
  })

  it('④ le client le transmet par argument, jamais par l’état', () => {
    const src = lire('components/onboarding/ConversationApplication.tsx')
    expect(src).toMatch(motifTexte('lectureBrief: opts.lecture,'))
    expect(src.match(/lecture: lu\.lecture,/gu)?.length).toBe(3)
  })
})
