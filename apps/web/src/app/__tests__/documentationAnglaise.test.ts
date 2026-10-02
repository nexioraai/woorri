// ============================================================
// CLIQUET — LA DOCUMENTATION ANGLAISE S'ANNONCE EN ANGLAIS.
//
// LE DÉFAUT MESURÉ EN PRODUCTION, le 2026-10-02 : les treize URL de
// `/documentation/en` servaient `<html lang="fr">`. Contenu anglais, document
// annoncé français.
//
// IL A FALLU DEUX PIÈCES, ET C'EST TOUT L'INTÉRÊT DE CE TEST :
//
//   1. `proxy.ts` pose `x-deribfy-lang: en` sur ce segment ;
//   2. ces pages doivent être RENDUES À LA REQUÊTE.
//
// La première seule ne suffisait pas — et c'est l'erreur que j'ai commise :
// les pages portaient `force-static`, donc leur HTML (attribut `lang`
// compris) était écrit AU BUILD, avant qu'aucun en-tête n'existe. Le proxy
// posait bien son en-tête ; personne ne le lisait jamais. Un correctif vert
// en test et sans effet en production.
//
// Retirer l'une OU l'autre pièce casse la correction sans rien faire échouer
// ailleurs. D'où ce cliquet sur les deux.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DOC = join(process.cwd(), 'src', 'app', 'documentation')
const PROXY = readFileSync(join(process.cwd(), 'src', 'proxy.ts'), 'utf8')

const lire = (...p: string[]) => readFileSync(join(DOC, ...p), 'utf8')

describe('pièce 1 — le proxy impose la langue anglaise', () => {
  it('le segment anglais est reconnu', () => {
    expect(PROXY).toContain('DOCUMENTATION_ANGLAISE')
    expect(PROXY).toMatch(/\/\^\\\/documentation\\\/en/)
  })

  it('il impose « en » sans marquer la page comme boutique', () => {
    // Le troisième argument `false` est ce qui préserve le balisage
    // d'identité de Deribfy sur ces pages.
    expect(PROXY).toContain("avecLangue(req, 'en', false)")
  })
})

describe('pièce 2 — les pages anglaises sont rendues à la requête', () => {
  it.each([['page.tsx'], ['[chapitre]/page.tsx']])(
    'en/%s ne peut pas être prégénérée — sinon le `lang` est figé au build',
    (fichier) => {
      const s = lire('en', fichier)
      expect(s).toContain("export const dynamic = 'force-dynamic'")
      expect(s).not.toContain("'force-static'")
    },
  )
})

describe('la version française n’est pas touchée', () => {
  it('le français reste prégénéré — sa langue est juste sans aucun en-tête', () => {
    expect(lire('page.tsx')).not.toContain("'force-dynamic'")
  })

  it('les deux versions restent reliées entre elles', () => {
    for (const s of [lire('page.tsx'), lire('en', 'page.tsx')]) {
      expect(s).toContain('languages:')
      expect(s).toContain("'/documentation'")
      expect(s).toContain("'/documentation/en'")
    }
  })
})
