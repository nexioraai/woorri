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
import { lectureAEnregistrer, noteDeLecture, RESULTATS_LECTURE } from '../lecture-brief'
import { motifTexte } from './motif-texte'

const lire = (chemin: string) => readFileSync(join(__dirname, '..', '..', '..', chemin), 'utf8')

describe('le résultat de la lecture du brief est enregistré', () => {
  it('① une valeur douteuse ne devient jamais un statut', () => {
    expect(lectureAEnregistrer(undefined, 0)).toEqual({ resultat: 'non_transmise', entreeCoupee: null, tablesLues: null, tablesRecues: 0, source: 'absente', tentatives: null })
    expect(lectureAEnregistrer({ resultat: 'parfait' }, 2).resultat).toBe('non_transmise')
    expect(lectureAEnregistrer('reussie', 2).resultat).toBe('non_transmise')
    expect(lectureAEnregistrer({ resultat: 'json_casse', entreeCoupee: true, tables: 0 }, 0))
      .toEqual({ resultat: 'json_casse', entreeCoupee: true, tablesLues: 0, tablesRecues: 0, source: 'client', tentatives: null })
    expect(lectureAEnregistrer({ resultat: 'tronquee', entreeCoupee: false, tables: 0, tentatives: 2 }, 0).tentatives).toBe(2)
    // Le nombre de tables REÇUES est celui que la route a compté, jamais celui qu'on lui dit.
    expect(lectureAEnregistrer({ resultat: 'reussie', entreeCoupee: false, tables: 99 }, 3).tablesRecues).toBe(3)
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: -1 }, 0).tablesLues).toBeNull()
  })

  // 2b (2026-11-13) — jamais silencieux : le mot visible, par résultat.
  it('①bis la lecture qui n’aboutit pas a un mot visible ; celle qui aboutit n’en a pas', () => {
    expect(noteDeLecture(undefined)).toBe('')
    expect(noteDeLecture({ resultat: 'reussie', tentatives: 1 })).toBe('')
    expect(noteDeLecture({ resultat: 'demande_vide' })).toBe('')
    // Ancres en motifTexte (EP-364) : la phrase, pas un regex à la main.
    expect(noteDeLecture({ resultat: 'tronquee', tentatives: 2 })).toMatch(motifTexte('Lecture du cahier incomplète : la réponse a été coupée avant la fin (2 tentatives).'))
    expect(noteDeLecture({ resultat: 'json_casse', tentatives: 2 })).toMatch(motifTexte('Lecture du cahier incomplète : rien d’exploitable n’a pu être lu (2 tentatives).'))
    expect(noteDeLecture({ resultat: 'illisible' })).toMatch(motifTexte('Lecture du cahier incomplète'))
    expect(noteDeLecture({ resultat: 'erreur' })).toMatch(motifTexte('Lecture du cahier impossible'))
    for (const r of ['tronquee', 'json_casse', 'illisible', 'erreur']) expect(noteDeLecture({ resultat: r })).toMatch(motifTexte('sans les tables déduites'))
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
    // Quatre sorties depuis 2b (demande vide · échec après la reprise · succès · erreur) ;
    // c'était cinq avant, les branches illisible et JSON cassé étant fusionnées.
    expect(reponses.length).toBeGreaterThanOrEqual(4)
    for (const r of reponses) expect(r, `réponse sans statut : ${r.slice(0, 80)}`).toContain('lecture')
  })

  it('③ la route de génération l’écrit en succès ET en échec', () => {
    const src = lire('app/api/generateur/direct/route.ts')
    expect(src).toMatch(motifTexte('sections_acquises: { lectureBrief, deploiement },'))
    expect(src).toMatch(motifTexte('      configuration,\n      lectureBrief,\n      deploiement,\n      tours: resultat.tours,'))
  })

  it('④ le client le transmet par argument, jamais par l’état', () => {
    const src = lire('components/onboarding/ConversationApplication.tsx')
    expect(src).toMatch(motifTexte('lectureBrief: opts.lecture,'))
    expect(src.match(/lecture: lu\.lecture,/gu)?.length).toBe(3)
  })
})
