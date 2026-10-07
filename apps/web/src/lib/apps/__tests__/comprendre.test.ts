// ============================================================
// CLIQUET — UNE DEPENSE NE SE PRESUME PAS.
//
// Le depot a deja cette regle, et elle est ecrite dans `dry-run-p0.mjs` :
// « le GO budgetaire de Youssouf ne se presume pas » (EP-018). Ce script
// REFUSE de partir sans un jeton explicite dans l'environnement.
//
// La meme garde vaut ici. Et elle vaut DOUBLE dans un produit : un appel
// payant declenche par un visiteur qui tape une phrase se multiplie par le
// nombre de visiteurs, sans que personne ne l'ait decide.
//
// Ces tests tiennent la garde — et surtout, qu'elle ne se DEGRADE PAS en
// silence vers autre chose. Un produit qui, faute de jeton, repond quand meme
// avec une lecture pauvre ferait croire que l'IA a lu.
// ============================================================
import { describe, expect, it, afterEach } from 'vitest'
import { comprendre, depenseAutorisee, direCeQuOnACompris, JETON_DEPENSE } from '../comprendre'

const initial = process.env[JETON_DEPENSE]
afterEach(() => {
  if (initial === undefined) delete process.env[JETON_DEPENSE]
  else process.env[JETON_DEPENSE] = initial
})

describe('CLIQUET — la garde de depense', () => {
  it('sans jeton, la depense est refusee', () => {
    delete process.env[JETON_DEPENSE]
    expect(depenseAutorisee()).toBe(false)
  })

  it('un jeton vide ne vaut pas un jeton', () => {
    process.env[JETON_DEPENSE] = ''
    expect(depenseAutorisee()).toBe(false)
  })

  it('AUCUN APPEL N EST FAIT sans le jeton, et le refus se NOMME', async () => {
    delete process.env[JETON_DEPENSE]
    const r = await comprendre('je veux une application de tontine')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.refusDeDepense).toBe(true)
    // Le message doit nommer la variable : celui qui le lit doit savoir quoi
    // faire, pas seulement que ca n a pas marche.
    expect(r.raison).toContain(JETON_DEPENSE)
  })

  it('une demande vide est refusee AVANT tout appel', async () => {
    process.env[JETON_DEPENSE] = 'oui'
    const r = await comprendre('   ')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.raison).toMatch(/vide/u)
    // Et ce refus-la n est PAS un refus de depense : les deux ne se confondent
    // pas, sinon on croirait qu il suffit d autoriser la depense.
    expect(r.refusDeDepense).toBeUndefined()
  })
})

describe('CLIQUET — ce qu on montre a l utilisateur', () => {
  it('des phrases, jamais un objet JSON', () => {
    const lignes = direCeQuOnACompris({
      acteurs: [{ nom: 'membre' }, { nom: 'president' }],
      concepts: [{ nom: 'cotisation' }, { nom: 'tour' }],
      parcours: [{ acteur: 'membre', besoin: 'cotiser chaque mois' }],
    })
    expect(lignes.join(' ')).toContain('membre')
    expect(lignes.join(' ')).toContain('cotisation')
    expect(lignes.join(' ')).toContain('cotiser chaque mois')
    for (const l of lignes) expect(l).not.toMatch(/[{}[\]"]/u)
  })

  it('un modele vide ne produit pas de ligne mensongere', () => {
    expect(direCeQuOnACompris({})).toEqual([])
  })
})
