/**
 * POINT 5 (2026-11-18) — « ⚠ 1 point à surveiller » NE MONTRE PLUS NOTRE PROPRE CONTRÔLE.
 *
 * Mesuré : sur cinq applis, le seul « point » était « Application PARTIELLEMENT
 * éprouvée : 24 sur N… » — le plafond de notre juge, pas un défaut de l'appli.
 *
 * ① les deux notes internes sont reconnues, une vraie anomalie ne l'est pas ;
 * ② la route qui ÉCRIT les notes emploie les mêmes préfixes (aucune recopie) ;
 * ③ le tableau de bord filtre pour le commerçant, et montre tout à l'administrateur.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  diagnosticsPourLeCommercant, estNoteInterne, NOTE_EPROUVEE_PARTIELLEMENT, NOTE_JUGE_INDISPONIBLE,
} from '../notes-internes'
import { motifTexte } from './motif-texte'

const RACINE = path.join(__dirname, '../../../..')

describe('point 5 · les notes internes', () => {
  it('① reconnues ; une vraie anomalie reste visible', () => {
    const vraies = [
      `${NOTE_EPROUVEE_PARTIELLEMENT}24 sur 88 (27 %) des controles des 11 ecran(s) atteint(s)`,
      `${NOTE_JUGE_INDISPONIBLE} : cette application n a PAS ete eprouvee (délai)`,
      'L’application ne se monte pas (simulateur) : erreur',
    ]
    expect(vraies.map(estNoteInterne)).toEqual([true, true, false])
    expect(diagnosticsPourLeCommercant(vraies)).toEqual(['L’application ne se monte pas (simulateur) : erreur'])
  })

  it('② la route qui écrit les notes emploie les préfixes partagés', () => {
    const route = readFileSync(path.join(RACINE, 'src/app/api/generateur/direct/route.ts'), 'utf8')
    expect(route).toMatch(motifTexte('NOTE_EPROUVEE_PARTIELLEMENT +'))
    expect(route).toMatch(motifTexte("NOTE_JUGE_INDISPONIBLE + ' : cette application ' +"))
    expect(route).not.toMatch(motifTexte("'Application PARTIELLEMENT éprouvée : '"))
  })

  it('③ le tableau de bord filtre pour le commerçant, pas pour l’administrateur', () => {
    const tableau = readFileSync(path.join(RACINE, 'src/app/dashboard/page.tsx'), 'utf8')
    expect(tableau).toMatch(motifTexte('estAdmin(user?.email) ? (a.diagnostics ?? []) : diagnosticsPourLeCommercant(a.diagnostics ?? [])'))
    expect(tableau).not.toMatch(motifTexte('String((a.diagnostics ?? []).length)'))
  })
})
