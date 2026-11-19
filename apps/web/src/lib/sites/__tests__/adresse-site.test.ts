/**
 * L'ADRESSE D'UN SITE, DONNÉE À LA PUBLICATION (2026-11-19).
 *
 * MESURÉ : six sites « En ligne » sans adresse deribfy.app — la fonction
 * attendait un clic que personne ne faisait. Ce fichier tient :
 * ① un site qui a déjà une adresse la garde (aucun appel à Vercel) ;
 * ② sinon, un nom LISIBLE tiré du titre : goura-doula, pas goura-doula-1794663944227 ;
 * ③ nom pris par une application (même supprimée — EP-308) → goura-doula-2 ;
 * ④ Vercel refuse → échec RENDU, aucun mapping écrit ;
 * ⑤ la base en panne → échec rendu, jamais une exception (la publication passe).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { creerFrom, journalVierge, type Filtre } from '@/lib/testing/postgrest'

type Ligne = Record<string, unknown>
let tables: Record<string, Ligne[]> = {}
let panne = false
let journal = journalVierge()

/** Le double FIDÈLE : il honore la projection et applique les filtres eq / neq. */
const filtrer = (table: string) => (f: Filtre[]) => {
  if (panne) throw new Error('base injoignable')
  const l = (tables[table] ?? []).filter((r) => f.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'neq' ? r[c] !== v : true)))
  return { data: l[0] ?? null, error: null }
}
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (t: string) => creerFrom({ [t]: { reponse: filtrer(t) } }, journal)(t) },
}))
const ecritures = () => Object.entries(journal.ecritures).flatMap(([table, l]) => l.map((e) => ({ table, ligne: (e as { charge: Ligne }).charge })))

const fetchMock = vi.fn()
import { assurerAdresseSite } from '../adresse-site'

beforeEach(() => {
  tables = { sites_sous_domaines: [], app_generations: [], sites: [] }
  panne = false
  journal = journalVierge()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }))
  process.env.CLOUDFLARE_API_TOKEN = 'cf'
  process.env.VERCEL_API_TOKEN = 'vc'
  process.env.VERCEL_PROJECT_ID = 'prj'
})

const SLUG = 'goura-doula-1794663944227'
const hoteDemande = () => JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).name as string

describe('assurerAdresseSite', () => {
  it('① une adresse existante est gardée, sans appel à Vercel', async () => {
    tables.sites_sous_domaines = [{ nom: 'goura', site_slug: SLUG, cree_le: '2026-11-01' }]
    const a = await assurerAdresseSite(SLUG, 'Goura Doula')
    expect(a).toMatchObject({ ok: true, lien: 'https://goura.deribfy.app' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('② un nom lisible tiré du titre, attaché chez Vercel puis enregistré', async () => {
    const a = await assurerAdresseSite(SLUG, 'Goura Doula')
    expect(a).toMatchObject({ ok: true, nom: 'goura-doula', lien: 'https://goura-doula.deribfy.app' })
    expect(hoteDemande()).toBe('goura-doula.deribfy.app')
    expect(ecritures()).toEqual([{ table: 'sites_sous_domaines', ligne: { nom: 'goura-doula', site_slug: SLUG } }])
  })

  it('③ nom pris par une application, même supprimée → goura-doula-2', async () => {
    tables.app_generations = [{ id: 'x', publication_slug: 'goura-doula', statut: 'supprimee' }]
    const a = await assurerAdresseSite(SLUG, 'Goura Doula')
    expect(a).toMatchObject({ ok: true, nom: 'goura-doula-2' })
    expect(hoteDemande()).toBe('goura-doula-2.deribfy.app')
  })

  it('④ Vercel refuse → échec rendu, aucun mapping', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":{"message":"quota"}}', { status: 403 }))
    const a = await assurerAdresseSite(SLUG, 'Goura Doula')
    expect(a.ok).toBe(false)
    expect(ecritures()).toEqual([])
  })

  it('⑤ la base en panne → échec rendu, jamais une exception', async () => {
    panne = true
    await expect(assurerAdresseSite(SLUG, 'Goura Doula')).resolves.toMatchObject({ ok: false })
  })
})
