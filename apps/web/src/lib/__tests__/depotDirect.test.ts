// Envoi direct des fichiers lourds (CPA, 2026-11-17 : l'hébergeur coupe
// au-delà de ~4,4 Mo, mesuré sur cinq routes).
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }))
const uploadToSignedUrl = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }))

import { cheminSous, lireEnvoi } from '../fichiers/depotDirect'
import { envoyerFichier, SEUIL_DIRECT } from '../fichiers/envoyerFichier'

describe('cheminSous — un compte ne constate que SES dépôts', () => {
  const P = 'sites/s1/avis/a1/c1/'
  it('accepte un fichier juste sous le préfixe', () => expect(cheminSous(P, `${P}x-offre.pdf`)).toBe(true))
  it('refuse un autre compte, un sous-dossier, une remontée, le vide', () => {
    expect(cheminSous(P, 'sites/s1/avis/a1/c2/x.pdf')).toBe(false)
    expect(cheminSous(P, `${P}d/x.pdf`)).toBe(false)
    expect(cheminSous(P, `${P}..x.pdf`)).toBe(false)
    expect(cheminSous(P, P)).toBe(false)
    expect(cheminSous(P, null)).toBe(false)
  })
})

describe('lireEnvoi — multipart et JSON lus de la même façon', () => {
  it('JSON : direct, sans fichier', async () => {
    const e = await lireEnvoi(new Request('http://x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ etape: 'preparer', nom: 'A', n: 3 }) }))
    expect(e?.direct).toBe(true); expect(e?.fichier).toBeNull(); expect(e?.champ('nom')).toBe('A'); expect(e?.champ('n')).toBeNull()
  })
  it('multipart : le fichier et les champs', async () => {
    const f = new FormData(); f.append('nom', 'B'); f.append('fichier', new File(['abc'], 'o.pdf', { type: 'application/pdf' }))
    const e = await lireEnvoi(new Request('http://x', { method: 'POST', body: f }))
    expect(e?.direct).toBe(false); expect(e?.fichier?.name).toBe('o.pdf'); expect(e?.champ('nom')).toBe('B')
  })
})

describe('envoyerFichier — petit : un envoi ; lourd : autoriser, envoyer au stockage, constater', () => {
  const appels: { corps: unknown; type: string }[] = []
  const auths: (string | undefined)[] = []
  beforeEach(() => {
    appels.length = 0; auths.length = 0; uploadToSignedUrl.mockReset()
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      const json = typeof init.body === 'string'
      appels.push({ corps: json ? JSON.parse(init.body as string) : 'multipart', type: json ? 'json' : 'multipart' })
      auths.push((init.headers as Record<string, string>).Authorization)
      const etape = json ? (JSON.parse(init.body as string) as { etape: string }).etape : ''
      return new Response(JSON.stringify(etape === 'preparer' ? { chemin: 'p/x.pdf', jeton: 't' } : { ok: 1 }), { status: etape === 'preparer' ? 200 : 201 })
    }))
  })
  const fichierDe = (o: number) => { const f = new File(['x'], 'offre.pdf', { type: 'application/pdf' }); Object.defineProperty(f, 'size', { value: o }); return f }

  it('≤ 4 Mo : un seul envoi multipart, comme avant', async () => {
    const r = await envoyerFichier({ url: '/api/x', seau: 'offres', jeton: 'j', fichier: fichierDe(1000), champs: { avis: 'a' } })
    expect(r.ok).toBe(true); expect(appels.map((a) => a.type)).toEqual(['multipart']); expect(uploadToSignedUrl).not.toHaveBeenCalled()
  })
  it('12 Mo : préparer → stockage direct → confirmer, avec les mêmes champs', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: null })
    const r = await envoyerFichier({ url: '/api/x', seau: 'offres', jeton: 'j', fichier: fichierDe(12 * 1048576), champs: { avis: 'a' } })
    expect(r.status).toBe(201)
    expect(appels.map((a) => (a.corps as { etape: string }).etape)).toEqual(['preparer', 'confirmer'])
    expect(appels[1].corps).toMatchObject({ avis: 'a', chemin: 'p/x.pdf', nomFichier: 'offre.pdf' })
    expect(uploadToSignedUrl).toHaveBeenCalledWith('p/x.pdf', 't', expect.anything(), { contentType: 'application/pdf' })
  })

  it('chaque appel porte Authorization (petit comme lourd)', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: null })
    await envoyerFichier({ url: '/api/x', seau: 'offres', jeton: 'j', fichier: fichierDe(1000) })
    await envoyerFichier({ url: '/api/x', seau: 'offres', jeton: 'j', fichier: fichierDe(12 * 1048576) })
    expect(auths).toEqual(['Bearer j', 'Bearer j', 'Bearer j'])
  })
  it('le stockage refuse : on ne confirme rien et on le dit', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: { message: 'mime type not supported' } })
    const r = await envoyerFichier({ url: '/api/x', seau: 'offres', jeton: 'j', fichier: fichierDe(SEUIL_DIRECT + 1) })
    expect(r.ok).toBe(false); expect(r.corps.error).toMatch(/type de fichier/); expect(appels).toHaveLength(1)
  })
  it('au-delà de 25 Mo : refusé sans rien envoyer', async () => {
    const r = await envoyerFichier({ url: '/api/x', seau: 'offres', jeton: 'j', fichier: fichierDe(26 * 1048576) })
    expect(r.ok).toBe(false); expect(appels).toHaveLength(0)
  })
})
