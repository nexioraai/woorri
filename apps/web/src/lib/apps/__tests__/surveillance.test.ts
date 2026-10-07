// ============================================================
// CLIQUET — LA SURVEILLANCE VOIT CE QU'ON LUI DEMANDE DE VOIR.
//
// Le proprietaire a demande d etre prevenu « avant, pendant, ou apres la
// generation », et « si un truc tourne en rond ». Ces tests tiennent les
// quatre cas, parce qu une surveillance qu on ne met pas a l epreuve est un
// voyant peint sur le tableau de bord.
//
// Les bornes viennent de MESURES : apercu 943 ko en 196 ms, compilation de 60
// fichiers en moins d une seconde, P0 en quelques secondes. Une borne large
// n attrape rien ; une borne serree crie pour rien.
// ============================================================
import { describe, expect, it } from 'vitest'
import { Veille } from '../surveillance'

describe('CLIQUET — ce que la veille attrape', () => {
  it('une generation normale est SAINE — pas de bruit pour rien', async () => {
    const v = new Veille('une appli de tontine')
    await v.temps('emission', () => 'ok')
    await v.temps('compilation', () => 'ok')
    const r = v.conclure()
    expect(r.saine).toBe(true)
    expect(r.anomalies).toEqual([])
    expect(r.traces).toHaveLength(2)
  })

  it('UN ECHEC EST CONSIGNE — et il REMONTE quand meme', async () => {
    // Une surveillance qui avale les pannes transforme un echec franc en
    // resultat douteux. L erreur doit continuer son chemin.
    const v = new Veille('x')
    await expect(
      v.temps('compilation', () => { throw new Error('binaire introuvable') }),
    ).rejects.toThrow('binaire introuvable')
    const r = v.conclure()
    expect(r.saine).toBe(false)
    expect(r.anomalies[0]?.code).toBe('echec')
    expect(r.anomalies[0]?.message).toContain('binaire introuvable')
  })

  it('UNE SORTIE TROP MAIGRE n est pas un succes', () => {
    // L apercu fait 943 ko. Trois kilo-octets qui « reussissent » sont un
    // echec deguise — exactement le genre de chose qu on ne voit pas.
    const v = new Veille('x')
    v.mesurerSortie('apercu', 3_000)
    const r = v.conclure()
    expect(r.saine).toBe(false)
    expect(r.anomalies[0]?.code).toBe('sortie_maigre')
  })

  it('une sortie normale ne declenche rien', () => {
    const v = new Veille('x')
    v.mesurerSortie('apercu', 943_000)
    expect(v.conclure().saine).toBe(true)
  })

  it('LE MEME ECHEC TROIS FOIS EST NOMME « en rond »', async () => {
    // C est la demande exacte du proprietaire. Trois tirages P0 refuses au
    // meme endroit, il avait fallu lire un journal pour s en apercevoir.
    const v = new Veille('x')
    for (let i = 0; i < 3; i += 1) {
      await v.temps('comprehension', () => { throw new Error('P2 refuse') }).catch(() => undefined)
    }
    const r = v.conclure()
    expect(r.anomalies.some((a) => a.code === 'en_rond')).toBe(true)
    expect(r.anomalies.find((a) => a.code === 'en_rond')?.message).toMatch(/tourne en rond/u)
  })

  it('deux echecs DIFFERENTS ne sont pas une boucle', async () => {
    const v = new Veille('x')
    await v.temps('comprehension', () => { throw new Error('clé absente') }).catch(() => undefined)
    await v.temps('compilation', () => { throw new Error('autre chose') }).catch(() => undefined)
    const r = v.conclure()
    expect(r.anomalies.some((a) => a.code === 'en_rond')).toBe(false)
    expect(r.anomalies).toHaveLength(2)
  })

  it('le rapport porte le parcours COMPLET, pas seulement l echec', async () => {
    // Pour reproduire sans rien chercher : ce qui a marche compte autant que
    // ce qui a casse.
    const v = new Veille('une appli de tontine')
    await v.temps('emission', () => 'ok')
    await v.temps('compilation', () => { throw new Error('boum') }).catch(() => undefined)
    const r = v.conclure()
    expect(r.demande).toBe('une appli de tontine')
    expect(r.traces.map((t) => t.phase)).toEqual(['emission', 'compilation'])
    expect(r.traces[0]?.ok).toBe(true)
    expect(r.traces[1]?.ok).toBe(false)
    expect(r.msTotal).toBeGreaterThanOrEqual(0)
  })
})
