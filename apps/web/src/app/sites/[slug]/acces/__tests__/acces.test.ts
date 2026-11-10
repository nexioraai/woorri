import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { motsAcces, LANGUES_ACCES } from '../libelles'
import { motsEspace, LANGUES_ESPACE } from '../../espace-client/motsEspace'

// ============================================================
// LOT 11 — LES ÉCRANS D'ACCÈS.
//
// TROIS CHOSES QUE LE CODE SEUL NE DIT PAS, et qui se paieraient cher :
//
//   · un écran d'entrée INDEXÉ invite à y essayer des adresses ;
//   · un refus qui DISTINGUE « adresse inconnue » de « mot de passe faux »
//     devient un testeur d'adresses : on y saurait qui travaille avec la
//     Centrale, une adresse à la fois ;
//   · un écran NON TRADUIT s'affiche en français sur un site anglophone —
//     et c'est le premier écran qu'une personne voit avant d'entrer.
// ============================================================

const lire = (...p: string[]) =>
  readFileSync(join(__dirname, '..', ...p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const GABARIT = lire('PageAcces.tsx')
const FORMULAIRE = lire('FormulaireAcces.tsx')
const ESPACE_PAGE = lire('..', 'espace-client', 'page.tsx')
const ESPACE = lire('..', 'espace-client', 'EspaceClient.tsx')
const CAPACITE = lire('ouvreDesComptes.ts')

describe('les quatre langues, partout', () => {
  it('🔴 QUATRE langues servies, pas trois', () => {
    expect(LANGUES_ACCES.sort()).toEqual(['ar', 'en', 'es', 'fr'])
    expect(LANGUES_ESPACE.sort()).toEqual(['ar', 'en', 'es', 'fr'])
  })

  it('🔴 aucun mot d’accès ne manque, dans aucune langue', () => {
    // Deux champs sont vides À DESSEIN : l'écran « mot de passe oublié »
    // ne demande pas de mot de passe. Tout le reste doit être écrit.
    for (const l of LANGUES_ACCES) {
      const m = motsAcces(l)
      for (const ecran of ['connexion', 'inscription', 'oubli'] as const) {
        const b = m[ecran]
        expect(b.titre.length, `${l}.${ecran}.titre`).toBeGreaterThan(0)
        expect(b.phrase.length, `${l}.${ecran}.phrase`).toBeGreaterThan(0)
        for (const [k, v] of Object.entries(b.libelles)) {
          if (ecran === 'oubli' && (k === 'motDePasse' || k === 'minimum')) continue
          expect(String(v).length, `${l}.${ecran}.${k}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('🔴 aucun mot de l’espace ne manque, dans aucune langue', () => {
    for (const l of LANGUES_ESPACE) {
      for (const [k, v] of Object.entries(motsEspace(l))) {
        expect(String(v).length, `${l}.${k}`).toBeGreaterThan(0)
      }
    }
  })

  it('🔴 une langue inconnue retombe sur le français, jamais sur du vide', () => {
    expect(motsAcces('zz').connexion.titre).toBe(motsAcces('fr').connexion.titre)
    expect(motsEspace(null).titre).toBe(motsEspace('fr').titre)
  })
})

describe('le refus n’apprend rien', () => {
  it('🔴 connexion et inscription refusent avec le MÊME mot', () => {
    // Distinguer apprendrait qu'une adresse est déjà enregistrée.
    for (const l of LANGUES_ACCES) {
      const m = motsAcces(l)
      expect(m.connexion.libelles.refus, l).toBe(m.inscription.libelles.refus)
    }
  })

  it('🔴 « mot de passe oublié » répond AU CONDITIONNEL', () => {
    // Le message doit valoir pour une adresse connue comme pour une adresse
    // inventée. S'il affirmait l'envoi, il confirmerait l'existence.
    expect(motsAcces('fr').oubli.libelles.succes).toMatch(/\bSi\b/)
    expect(motsAcces('en').oubli.libelles.succes).toMatch(/\bIf\b/)
  })

  it('🔴 et le code NE REGARDE PAS la réponse de la réinitialisation', () => {
    // Un `if (error)` ici distinguerait les deux cas quoi qu'en dise le
    // libellé — c'est le code qui ferait l'oracle, pas la traduction.
    expect(FORMULAIRE).toMatch(/await\s+supabase\.auth\.resetPasswordForEmail\(/)
    expect(FORMULAIRE).not.toMatch(/=\s*await\s+supabase\.auth\.resetPasswordForEmail/)
  })
})

describe('les écrans n’existent que si le site ouvre des comptes', () => {
  it('🔴 le gabarit d’accès ET l’espace lisent la capacité', () => {
    for (const [nom, src] of [['PageAcces', GABARIT], ['espace-client', ESPACE_PAGE]] as const) {
      expect(src, `${nom} n'interroge pas la capacité`).toMatch(/await\s+ouvreDesComptes\(/)
      expect(src, `${nom} ne rend pas 404`).toMatch(/ouvreDesComptes\([^)]*\)\)\)\s*notFound\(\)/)
    }
  })

  it('🔴 la capacité se lit en ÉGALITÉ STRICTE', () => {
    // `!!undefined` vaut faux par chance ; `=== true` le dit par décision.
    // Une projection oubliée ne doit pas ouvrir les 42 sites.
    expect(CAPACITE).toMatch(/ouvre_des_comptes\s*===\s*true/)
  })
})

describe('une page d’entrée ne s’indexe pas', () => {
  it('🔴 `noindex` sur le gabarit des trois accès ET sur l’espace', () => {
    for (const [nom, src] of [['PageAcces', GABARIT], ['espace-client', ESPACE_PAGE]] as const) {
      expect(src, `${nom} est indexable`).toMatch(/robots:\s*\{\s*index:\s*false/)
    }
  })

  it('🔴 les trois adresses passent par le MÊME gabarit', () => {
    // Trois copies, c'est trois endroits où le `noindex` peut manquer à
    // l'une d'elles — et personne ne le verrait.
    for (const d of ['connexion', 'inscription', 'mot-de-passe-oublie']) {
      const src = readFileSync(join(__dirname, '..', '..', d, 'page.tsx'), 'utf-8')
      expect(src, `${d} n'utilise pas le gabarit`).toMatch(/from\s+'\.\.\/acces\/PageAcces'/)
    }
  })
})

describe('l’inscription passe par UNE route, et l’écran ne décide de rien', () => {
  // LOT 17 — décision du propriétaire, 2026-11-10 : l'inscription crée le
  // compte directement, sans courriel ni examen. L'ancien cliquet (« le
  // formulaire ne touche à AUCUNE route de compte ») gardait la règle
  // inverse ; il est remplacé, pas supprimé : le formulaire n'a toujours
  // pas le droit d'écrire un compte LUI-MÊME.
  it('🔴 le formulaire appelle la route d’inscription, et aucune autre route de compte', () => {
    expect(FORMULAIRE).toMatch(/\/api\/sites\/\$\{[^}]+\}\/inscription/)
    expect(FORMULAIRE).not.toMatch(/mon-compte|site_comptes|\/comptes\b/)
  })

  it('🔴 plus d’inscription par courriel de confirmation', () => {
    expect(FORMULAIRE).not.toMatch(/auth\.signUp\(/)
  })

  it('🔴 le formulaire n’envoie jamais d’état de compte', () => {
    const i = FORMULAIRE.indexOf('/inscription`')
    expect(FORMULAIRE.slice(i, i + 400)).not.toMatch(/\betat\b/)
  })

  it('🔴 l’espace ne décide JAMAIS qu’un compte est actif', () => {
    // Un écran qui déduirait « actif » d'un indice local ouvrirait une
    // porte sur un mur : les routes, elles, refuseraient.
    expect(ESPACE).toMatch(/compte\.etat\s*!==\s*'actif'/)
    expect(ESPACE).not.toMatch(/setCompte\(\s*\{[^}]*etat:\s*'actif'/)
  })

  it('🔴 après une demande, l’espace RELIT la réponse de la route', () => {
    // Afficher ce qu'on vient d'envoyer montrerait l'état DEMANDÉ, pas
    // celui qui a été écrit — et c'est le déclencheur de base qui décide.
    const d = ESPACE.indexOf('async function demander')
    expect(d).toBeGreaterThan(-1)
    expect(ESPACE.slice(d)).toMatch(/const\s+d\s*=\s*await\s+r\.json\(\)[\s\S]{0,120}setCompte\(d\.compte/)
  })
})
