/**
 * L'APERCU v0-STYLE — compile depuis un acquis BOUCHONNE, zero appel IA.
 * La promesse de la route apercu-live : un acquis schema-valide se compile
 * localement en HTML substantiel ; un acquis casse rend pret=false, jamais
 * une erreur a l'ecran.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectAirSchema, migrateAirDocument } from '@deribfy/air-schema'
import { construireApercu } from '../apercu'

const RACINE = join(process.cwd(), '..', '..')
const ACQUIS = migrateAirDocument(
  JSON.parse(
    readFileSync(join(RACINE, 'packages/golden-corpus/corpus-v3/bus-intercites.air.json'), 'utf8'),
  ) as Record<string, unknown>,
)

describe('apercu-live — la compilation locale', () => {
  it("un acquis valide se compile en HTML substantiel — l'oeuvre est montrable en cours de route", async () => {
    const lu = projectAirSchema.safeParse(ACQUIS)
    expect(lu.success).toBe(true)
    if (!lu.success) return
    const a = await construireApercu(lu.data)
    expect(a.html.length).toBeGreaterThan(10_000)
    expect(a.html).toContain('<')
  })

  it('un acquis casse (plein tour) → pret:false par le schema, jamais une erreur', () => {
    const casse = JSON.parse(JSON.stringify(ACQUIS)) as { screens: { title: unknown }[] }
    casse.screens[0].title = 12345
    expect(projectAirSchema.safeParse(casse).success).toBe(false)
  })
})
