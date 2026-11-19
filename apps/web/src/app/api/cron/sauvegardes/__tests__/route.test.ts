/**
 * LE DÉCLENCHEUR DES SAUVEGARDES (2026-11-19) — ce que Vercel appelle à 03:17 UTC.
 *
 * ① sans le secret des tâches planifiées : 401, rien n'est lancé ;
 * ② sans jeton GitHub : 503, l'échec est inscrit (le chien de garde le verra) ;
 * ③ les DEUX passages sont demandés, sur `main`, contrôle faussé à « non » ;
 * ④ un refus de GitHub est un échec inscrit avec son code — le jeton n'apparaît
 *   jamais dans ce qui est écrit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const startCronRunMock = vi.fn()
const finishCronRunMock = vi.fn()
vi.mock('@/lib/cron-tracker', () => ({
  startCronRun: (...a: unknown[]) => startCronRunMock(...a),
  finishCronRun: (...a: unknown[]) => finishCronRunMock(...a),
}))

const fetchMock = vi.fn()
const appel = (auth = 'Bearer secret-cron') =>
  new Request('https://www.deribfy.com/api/cron/sauvegardes', { headers: { authorization: auth } })

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }))
  startCronRunMock.mockReset().mockResolvedValue('run-1')
  finishCronRunMock.mockReset().mockResolvedValue(undefined)
  process.env.CRON_SECRET = 'secret-cron'
  process.env.GITHUB_SAUVEGARDES_TOKEN = 'github_pat_test_ne_sort_jamais'
})

describe('GET /api/cron/sauvegardes', () => {
  it('① sans le secret : 401, aucun lancement', async () => {
    const { GET } = await import('../route')
    expect((await GET(appel('Bearer faux'))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(startCronRunMock).not.toHaveBeenCalled()
  })

  it('② sans jeton : 503, échec inscrit', async () => {
    delete process.env.GITHUB_SAUVEGARDES_TOKEN
    const { GET } = await import('../route')
    expect((await GET(appel())).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(finishCronRunMock).toHaveBeenCalledWith('run-1', expect.objectContaining({ status: 'error' }))
  })

  it('③ les deux passages sont demandés, sur main, contrôle faussé à non', async () => {
    const { GET } = await import('../route')
    const res = await GET(appel())
    expect(res.status).toBe(200)
    expect(startCronRunMock).toHaveBeenCalledWith('sauvegardes')
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls).toEqual([
      'https://api.github.com/repos/nexioraai/deribfy-sauvegardes/actions/workflows/sauvegarde-nexiora.yml/dispatches',
      'https://api.github.com/repos/nexioraai/deribfy-sauvegardes/actions/workflows/sauvegarde-oeuvres.yml/dispatches',
    ])
    for (const c of fetchMock.mock.calls) {
      expect(JSON.parse((c[1] as RequestInit).body as string)).toEqual({ ref: 'main', inputs: { controle_negatif: 'non' } })
    }
    expect(finishCronRunMock).toHaveBeenCalledWith('run-1', expect.objectContaining({ itemsProcessed: 2, status: 'success' }))
  })

  it('④ un refus de GitHub : 502, inscrit avec son code, sans le jeton', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response('{}', { status: 403 }))
    const { GET } = await import('../route')
    const res = await GET(appel())
    expect(res.status).toBe(502)
    const inscrit = finishCronRunMock.mock.calls[0][1] as { status: string; errorMessage: string; itemsProcessed: number }
    expect(inscrit).toMatchObject({ status: 'error', itemsProcessed: 1 })
    expect(inscrit.errorMessage).toContain('sauvegarde-oeuvres.yml → 403')
    expect(JSON.stringify(finishCronRunMock.mock.calls)).not.toContain('github_pat_test')
    expect(JSON.stringify(await res.json())).not.toContain('github_pat_test')
  })
})
