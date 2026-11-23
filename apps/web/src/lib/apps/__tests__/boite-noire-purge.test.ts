/**
 * LA BOÎTE NOIRE : CONSERVATION ET PURGE (2026-11-23). Séparé de
 * boite-noire.test.ts : celui-ci lit une source (la tâche quotidienne).
 */
import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { BoiteNoire } from '../boite-noire'

describe('la conservation : 90 jours, puis la purge quotidienne', () => {
  it('chaque boîte porte sa date limite, et la tâche quotidienne appelle la purge de la base', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const lignes: Record<string, unknown>[] = []
    const b = new BoiteNoire({ nature: 'generation', compte: null })
    await b.enregistrer({ from: () => ({ insert: async (l) => { lignes.push(l); return { error: null } } }) }, { generationId: null, issue: 'livree', analyse: null })
    const jours = (Date.parse(String(lignes[0]?.garder_jusqu_au)) - Date.now()) / 86_400_000
    expect(Math.round(jours)).toBe(90)
    const cron = readFileSync(join(__dirname, '..', '..', '..', 'app', 'api', 'cron', 'purge-supprimees', 'route.ts'), 'utf8')
    expect(cron).toContain("supabaseAdmin.rpc('purger_boite_noire')")
  })
})
