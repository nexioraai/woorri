// ÉTAPE 1 · LA CONSIGNE, GÉNÉRÉE DEPUIS LE CATALOGUE.
//
//   ① chaque composant, prop, jeton, icône, action, événement, source du
//      catalogue apparaît dans la consigne ;
//   ② rien dans la consigne (entre accents graves) n'est absent du catalogue ;
//   ③ la consigne ne nomme aucun attribut du web, même en prose ;
//   ④ elle est bornée (mesurée : 8 177 signes à l'étape 1, 8 728 en V2 — la charge
//      de connexion et quatre règles revenues du jeu aveugle —, 9 553 en V3 — la
//      Fiche et l'appel à l'action de l'état vide ; 3c-2 en faisait
//      4 633 — le prix d'entrée se paie une fois par écran) ;
//   ⑤ elle est la seule consigne du contrat : aucun texte de consigne écrit à
//      la main ne vit dans le dossier du contrat.
// Rouge-puis-vert : la ligne des icônes retirée du générateur → ① rouge ;
// un identifiant inventé ajouté au générateur → ② rouge.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { identifiantsDuCatalogue } from '../catalogue'
import { genererConsigne, identifiantsDeLaConsigne } from '../consigne'

const consigne = genererConsigne()

describe('étape 1 · la consigne générée', () => {
  it('① tout le catalogue est dans la consigne', () => {
    const dans = identifiantsDeLaConsigne(consigne)
    expect([...identifiantsDuCatalogue()].filter((x) => !dans.has(x))).toEqual([])
  })

  it('② rien dans la consigne n’est absent du catalogue', () => {
    const catalogue = identifiantsDuCatalogue()
    expect([...identifiantsDeLaConsigne(consigne)].filter((x) => !catalogue.has(x))).toEqual([])
  })

  it('③ aucun attribut du web, même en prose', () => {
    for (const mot of ['className', 'style', 'onClick', 'onSubmit', 'href', '<form', 'aria-', 'left', 'right', 'var(--', 'px', '$t']) {
      expect(consigne.includes(mot), `la consigne contient « ${mot} »`).toBe(false)
    }
  })

  it('④ bornée', () => {
    expect(consigne.length).toBeLessThan(9900)
  })

  it('⑤ aucune consigne écrite à la main dans le dossier du contrat', () => {
    const dossier = join(__dirname, '..')
    const sources = readdirSync(dossier).filter((f) => f.endsWith('.ts'))
    for (const f of sources) {
      const s = readFileSync(join(dossier, f), 'utf8')
      expect(/Tu (rends|écris|dois)/u.test(s) && f !== 'consigne.ts', `${f} contient une consigne écrite à la main`).toBe(false)
    }
  })
})
