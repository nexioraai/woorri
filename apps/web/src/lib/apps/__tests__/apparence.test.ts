/**
 * SURCHARGE DE THÈME (2026-11-18) — la couleur du propriétaire, sans réécrire le code.
 *
 * ① une couleur foncée passe ; une claire est refusée, AVEC sa raison (texte
 *   blanc des boutons, WCAG AA 4,5:1) — y compris le vert de la palette
 *   actuelle (#1f8a5b, 4,33 : mesuré) ;
 * ② rien d'autre que `couleur`, rien d'autre que `#rrggbb` — une injection
 *   dans la balise `<style>` est impossible ;
 * ③ la page assemblée porte la règle, plus spécifique que les styles de la
 *   bibliothèque, et la couleur de thème du téléphone ; sans apparence, rien ;
 * ④ `APPARENCE.json` est retiré des fichiers livrés, lu et validé ;
 * ⑤ les exemples que la consigne de retouche enseigne passent TOUS.
 */
import { describe, expect, it } from 'vitest'
import {
  apparenceDuDocument, contrasteAvecBlanc, cssApparence, FICHIER_APPARENCE,
  lireApparenceEnRoute, validerApparence,
} from '../apparence'
import { pageAutonome } from '../boucle-directe'
import { CONSIGNE_RETOUCHE } from '../retouche'
import { motifTexte } from './motif-texte'

describe('surcharge de thème', () => {
  it('① foncée passe ; claire refusée avec sa raison', () => {
    expect(validerApparence({ couleur: '#2F7D4F' })).toEqual({ ok: true, apparence: { couleur: '#2f7d4f' } })
    expect(contrasteAvecBlanc('#1f8a5b')).toBeLessThan(4.5)
    const clair = validerApparence({ couleur: '#1f8a5b' })
    expect(clair.ok).toBe(false)
    if (!clair.ok) expect(clair.motif).toMatch(motifTexte('texte blanc des boutons deviendrait illisible'))
  })

  it('② une couleur, et seulement une couleur', () => {
    expect(validerApparence({ couleur: 'vert' }).ok).toBe(false)
    expect(validerApparence({ couleur: '#2f7d4f', fond: 'nuit' }).ok).toBe(false)
    expect(validerApparence({ couleur: '#2f7d4f;}</style><script>alert(1)</script>' }).ok).toBe(false)
    expect(cssApparence({ couleur: 'red}</style><script>' } as never)).toBe('')
    expect(apparenceDuDocument({ apparence: { couleur: 'nimporte' } })).toBeNull()
    expect(apparenceDuDocument({ fichiers: {} })).toBeNull()
  })

  it('③ la page porte la règle et la couleur du téléphone ; sans apparence, rien', () => {
    const avec = pageAutonome('export {}', 'Pharma', undefined, 'servie', null, { couleur: '#2f7d4f' })
    expect(avec).toMatch(motifTexte('<style>html:root:root:root{--primary:#2f7d4f;--ring:#2f7d4f;--sidebar-primary:#2f7d4f;--chart-1:#2f7d4f}</style>'))
    expect(avec).toMatch(motifTexte('<meta name="theme-color" content="#2f7d4f" />'))
    const sans = pageAutonome('export {}', 'Pharma', undefined, 'servie')
    expect(sans).not.toMatch(/html:root:root:root/u)
    expect(sans).toMatch(motifTexte('<meta name="theme-color" content="#2a5bd7" />'))
  })

  it('④ APPARENCE.json retiré, lu, validé', () => {
    const f = new Map([['index.tsx', 'x'], [FICHIER_APPARENCE, '{"couleur":"#2f7d4f"}']])
    const l = lireApparenceEnRoute(f)
    expect(l.apparence).toEqual({ couleur: '#2f7d4f' })
    expect([...l.fichiers.keys()]).toEqual(['index.tsx'])
    expect(lireApparenceEnRoute(new Map([[FICHIER_APPARENCE, '{pas du json']])).refus).toMatch(motifTexte('illisible'))
    expect(lireApparenceEnRoute(new Map([['a.ts', 'x']])).apparence).toBeNull()
  })

  it('⑤ chaque exemple enseigné par la consigne passe la validation', () => {
    const exemples = [...CONSIGNE_RETOUCHE.matchAll(/#[0-9a-f]{6}/giu)].map((m) => m[0])
    expect(exemples.length).toBeGreaterThanOrEqual(6)
    for (const c of exemples) expect(validerApparence({ couleur: c }).ok, c).toBe(true)
  })
})
