import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lireAvecJeton, oublierLectures } from '../lectureEspace'

// UNE LECTURE, PARTAGÉE (CPA, 2026-11-19) : la barre latérale et le tableau
// de bord demandent les mêmes commandes ; une seule requête doit partir, et
// elle doit porter le jeton.
describe('lireAvecJeton', () => {
  beforeEach(() => { oublierLectures(); vi.restoreAllMocks() })

  it('deux lectures identiques → UNE requête, avec le jeton', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ commandes: [1, 2] }), { status: 200 }))
    const [a, b] = await Promise.all([lireAvecJeton('/api/sites/cpa/mes-commandes', 'J'), lireAvecJeton('/api/sites/cpa/mes-commandes', 'J')])
    expect(f).toHaveBeenCalledTimes(1)
    expect((f.mock.calls[0][1] as RequestInit).headers).toEqual({ Authorization: 'Bearer J' })
    expect(a.d).toEqual({ commandes: [1, 2] }); expect(b).toBe(a)
  })

  it('un autre jeton ou une autre adresse → une autre requête ; une panne ne lève pas', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('réseau'))
    const r = await lireAvecJeton('/api/sites/cpa/mon-compte', 'J')
    await lireAvecJeton('/api/sites/cpa/mon-compte', 'K')
    expect(r).toEqual({ ok: false, status: 0, d: null })
    expect(f).toHaveBeenCalledTimes(2)
  })
})
