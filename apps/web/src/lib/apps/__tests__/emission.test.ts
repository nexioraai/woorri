// ============================================================
// CLIQUET — D UNE PHRASE A UN DOCUMENT, SANS RIEN INVENTER.
//
// Le danger d un generateur qui lit une phrase n est pas de se tromper : c est
// de DEVINER. Un utilisateur qui ecrit « une appli de tontine » et recoit des
// ecrans de paiement, de relances et de notation croira que sa phrase les
// contenait. Il ne les a jamais demandes.
//
// Ces tests tiennent donc les deux bouts : ce qui est LU, et ce qui n est
// SURTOUT pas ajoute.
// ============================================================
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { compileWeb } from '@deribfy/compiler'
import { lireLaPhrase, emettreSansIa } from '../emission'

describe('CLIQUET — ce que la phrase donne', () => {
  it('une amorce polie ne devient pas le nom de l application', () => {
    // « Je veux une application de tontine » ne s appelle pas « Je veux une ».
    expect(lireLaPhrase('Je veux une application de tontine').nom).toMatch(/^Tontine/u)
    expect(lireLaPhrase('crée une appli de gestion de stock').nom).toMatch(/^Gestion/u)
  })

  it('un nombre dans la phrase est ENTENDU, quel que soit le mot qui suit', () => {
    expect(lireLaPhrase('un catalogue de 40 produits').elements).toBe(40)
    expect(lireLaPhrase('une appli pour mes 12 membres').elements).toBe(12)
    // LE CAS QUE LA SONDE A TROUVE EN PRODUCTION, a sa premiere execution :
    // « ouvriers » n etait pas dans la liste fermee des noms, et la phrase
    // retombait sur 8. Une liste de noms communs sera toujours incomplete.
    expect(lireLaPhrase('un suivi de chantier avec 12 ouvriers et leurs taches').elements).toBe(12)
    expect(lireLaPhrase('une appli pour 30 patients').elements).toBe(30)
    expect(lireLaPhrase('gerer 7 vehicules').elements).toBe(7)
  })

  it('une ANNEE n est pas une quantite, et elle se reconnait a sa PLAGE', () => {
    // Borner la longueur ferait PERDRE « 9999 produits » au lieu de le
    // ramener a la limite. Ignorer un nombre enonce est pire que le borner :
    // l utilisateur l a ecrit, et il ne le reverra pas.
    expect(lireLaPhrase('une appli de tontine pour 2026 membres').elements).toBe(8)
    expect(lireLaPhrase('un catalogue de 9999 produits').elements).toBe(200)
  })

  it('un nombre absurde est borne, pas recopie', () => {
    expect(lireLaPhrase('un catalogue de 9999 produits').elements).toBe(200)
  })

  it('sans nombre, une valeur par defaut honnete', () => {
    expect(lireLaPhrase('une appli de tontine').elements).toBe(8)
  })
})

describe('CLIQUET — le document sortant', () => {
  it('il est valide au schema STRICT', () => {
    const r = emettreSansIa('Je veux une application de tontine pour mon quartier')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(projectAirSchema.safeParse(r.document).success).toBe(true)
  })

  it('ET IL COMPILE', () => {
    const r = emettreSansIa('un catalogue de 20 produits')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const projet = compileWeb(r.document)
    expect(projet.files.size).toBeGreaterThan(40)
  })

  it('IL DIT CE QU IL A COMPRIS — l utilisateur ne decouvre pas apres coup', () => {
    const r = emettreSansIa('une appli de tontine')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.compris.length).toBeGreaterThanOrEqual(3)
    expect(r.compris.join(' ')).toMatch(/Tontine/u)
    // Et il dit AUSSI ce qu il n a pas fait.
    expect(r.compris.join(' ')).toMatch(/ne devine pas/u)
  })

  it('IL N INVENTE AUCUNE STRUCTURE — une seule entite, deux ecrans', () => {
    // C est la garde qui compte. Le jour ou quelqu un fera « deviner » des
    // ecrans de paiement a partir du mot « tontine », ce test tombera.
    const r = emettreSansIa('une appli de tontine avec paiements et relances')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Une seule entite, deux ecrans : exactement ce qu on sait faire sans
    // modele. La PHRASE de l utilisateur est bien conservee — c est la sienne,
    // et la garder n est pas inventer ; ce qu on verifie, c est qu aucune
    // STRUCTURE n a ete tiree des mots « paiements » et « relances ».
    expect(r.document.entities).toHaveLength(1)
    expect(r.document.screens).toHaveLength(2)
    const champs = r.document.entities[0]?.fields ?? []
    expect(champs.map((f) => f.name).sort()).toEqual(['description', 'nom', 'photo', 'prix'])
  })

  it('des phrases hostiles ne cassent rien', () => {
    for (const p of ['', '   ', '2048', 'é', 'a'.repeat(500), 'Tontine.SY']) {
      const r = emettreSansIa(p)
      expect(r.ok, p).toBe(true)
    }
  })
})
