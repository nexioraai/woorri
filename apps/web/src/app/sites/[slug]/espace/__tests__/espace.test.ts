import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { motsEchanges, LANGUES_ECHANGES } from '../motsEchanges'
import { motsProfil, LANGUES_PROFIL } from '../motsProfil'
import { motsEspace, LANGUES_ESPACE } from '../../espace-client/motsEspace'

// ============================================================
// LOT 11 TRANCHE B — LES PAGES D'ESPACE.
//
// TROIS RÈGLES QUE LE CODE SEUL NE DIT PAS :
//
//   · une page d'espace INDEXÉE invite à y entrer au hasard ;
//   · une page qu'AUCUN LIEN n'atteint n'existe pas — c'est le défaut qui
//     avait laissé « appels d'offres » hors du menu du téléphone pendant
//     deux jours, la page publiée et inatteignable au doigt ;
//   · un écran NON TRADUIT s'affiche en français sur un site anglophone.
// ============================================================

const lire = (...p: string[]) =>
  readFileSync(join(__dirname, '..', ...p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const GABARIT = lire('PageEspace.tsx')
const ESPACE = lire('..', 'espace-client', 'EspaceClient.tsx')
const PAGES = ['mes-demandes', 'mes-reclamations', 'mon-profil', 'mes-documents']

describe('les quatre langues, partout', () => {
  it('🔴 QUATRE langues, dans les trois jeux de mots', () => {
    for (const [nom, l] of [['échanges', LANGUES_ECHANGES], ['profil', LANGUES_PROFIL], ['espace', LANGUES_ESPACE]] as const) {
      expect(l.slice().sort(), nom).toEqual(['ar', 'en', 'es', 'fr'])
    }
  })

  it('🔴 aucun mot ne manque dans aucune langue', () => {
    for (const l of LANGUES_ECHANGES) {
      for (const jeu of [motsEchanges(l).demandes, motsEchanges(l).reclamations]) {
        for (const [k, v] of Object.entries(jeu)) {
          if (k === 'etats') continue
          expect(String(v).length, `échanges.${l}.${k}`).toBeGreaterThan(0)
        }
      }
      for (const [k, v] of Object.entries(motsProfil(l))) {
        if (k === 'roles' || k === 'etats') continue
        expect(String(v).length, `profil.${l}.${k}`).toBeGreaterThan(0)
      }
    }
  })

  it('🔴 les QUATRE états d’une demande sont traduits partout', () => {
    // Un état non traduit sortirait tel quel : « en_cours » affiché à un
    // pharmacien.
    for (const l of LANGUES_ECHANGES) {
      for (const etat of ['recu', 'en_cours', 'repondu', 'clos']) {
        expect(motsEchanges(l).demandes.etats[etat], `${l}.${etat}`).toBeTruthy()
      }
    }
  })

  it('🔴 une langue inconnue retombe sur le français, jamais sur du vide', () => {
    expect(motsProfil('zz').titre).toBe(motsProfil('fr').titre)
    expect(motsEchanges(null).titreDemandes).toBe(motsEchanges('fr').titreDemandes)
  })
})

describe('les pages d’espace passent par UN gabarit', () => {
  it('🔴 les trois pages l’emploient — aucune copie', () => {
    // Trois copies, c'est trois endroits où le `noindex` peut manquer à
    // l'une d'elles, et personne ne le verrait.
    for (const p of PAGES) {
      const src = readFileSync(join(__dirname, '..', '..', p, 'page.tsx'), 'utf-8')
      expect(src, `${p} n'emploie pas le gabarit`).toMatch(/from\s+'\.\.\/espace\/PageEspace'/)
    }
  })

  it('🔴 le gabarit pose `noindex` et vérifie la CAPACITÉ', () => {
    expect(GABARIT).toMatch(/robots:\s*\{\s*index:\s*false/)
    expect(GABARIT).toMatch(/ouvreDesComptes\([^)]*\)\)\)\s*notFound\(\)/)
  })
})

describe('aucune page n’est inatteignable', () => {
  it('🔴 l’espace mène aux TROIS pages', () => {
    // Une page publiée que rien ne lie est une page qui n'existe pas.
    for (const p of PAGES) {
      expect(ESPACE, `rien ne mène à /${p}`).toContain(`/${p}`)
    }
  })

  it('🔴 et leurs libellés existent dans les quatre langues', () => {
    for (const l of LANGUES_ESPACE) {
      const m = motsEspace(l)
      for (const k of ['mesDemandes', 'mesReclamations', 'mesDocuments', 'monProfil'] as const) {
        expect(String(m[k]).length, `${l}.${k}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('la page dit ce qu’elle ne peut pas montrer', () => {
  it('🔴 elle nomme l’adresse sur laquelle la liste est bâtie', () => {
    // `messages.email` est l'adresse SAISIE dans le formulaire. Sans cette
    // phrase, quelqu'un croit sa demande perdue et la refait.
    for (const l of LANGUES_ECHANGES) {
      expect(motsEchanges(l).demandes.autreAdresse, l).toContain('{adresse}')
    }
  })

  it('🔴 une ligne sans référence le DIT, au lieu d’une case vide', () => {
    // Mesuré le 2026-11-09 : les 37 messages existants précèdent le lot 8
    // qui a posé les références.
    for (const l of LANGUES_ECHANGES) {
      expect(motsEchanges(l).demandes.sansReference.length, l).toBeGreaterThan(0)
    }
  })
})
