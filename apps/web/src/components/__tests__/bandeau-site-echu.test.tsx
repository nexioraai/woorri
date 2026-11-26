/**
 * LE BANDEAU D'UN SITE ÉCHU ET LE REFUS DE LA BASE (2026-11-26).
 *
 * ① le bandeau dit la phrase du propriétaire, avec « Renouveler » qui ramène
 *   au tableau de bord sur CE site ;
 * ② le refus du déclencheur (n° 10) arrive au propriétaire avec la même
 *   phrase, jamais le texte technique ; un autre refus reste tel quel ;
 * ③ le rappel du tableau de bord, une fois échu, dit la même phrase.
 * Ce que ce fichier ne voit pas : le rendu à l'œil (captures).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { creerFrom, journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

let journal: JournalPostgrest = journalVierge()
let refus: unknown = null
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => creerFrom({ sites: { reponse: () => ({ data: null, error: refus }) } }, journal)(t) },
}))

const { VueBandeauSiteEchu, bandeauVisible } = await import('@/components/sites/BandeauSiteEchu')
const { updateOwnedSite } = await import('@/lib/supabase-owned-site')
const { phraseRappel } = await import('@/components/dashboard/rappelSite')
const { PHRASE_SITE_ECHU } = await import('@/lib/sites/site-echu')

beforeEach(() => { journal = journalVierge(); refus = null })

describe('un site échu, côté propriétaire', () => {
  it('① le bandeau : la phrase, et « Renouveler » vers le tableau de bord de CE site', () => {
    const html = renderToStaticMarkup(<VueBandeauSiteEchu slug="ma-vitrine" />)
    expect(html).toContain(PHRASE_SITE_ECHU)
    expect(html).toMatch(/href="\/dashboard\?renouveler=ma-vitrine"[^>]*>Renouveler</u)
    expect(html).toContain('role="status"')
  })

  it('① le bandeau ne paraît que pour un site échu', () => {
    expect(bandeauVisible({ rappel: 'echu' })).toBe(true)
    expect(bandeauVisible({ rappel: 'bientot' })).toBe(false)
    expect(bandeauVisible({ rappel: null })).toBe(false)
    expect(bandeauVisible(null)).toBe(false)
  })

  it('① la lecture du composant passe par cette règle (cliquet de source : il voit l’appel, pas son exécution)', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/sites/BandeauSiteEchu.tsx'), 'utf8')
    const effet = src.slice(src.indexOf('useEffect('), src.indexOf('}, [slug])'))
    expect(effet).toMatch(motifTexte('if (vivant && bandeauVisible(e)) setEchu(true)'))
  })

  it('② le refus de la base devient la phrase du propriétaire', async () => {
    refus = { message: 'SITE_ECHU: l\'abonnement de ce site est arrivé à échéance — renouvelez-le…', code: 'P0001' }
    const r = await updateOwnedSite('ma-vitrine', 'moi@exemple.td', { name: 'X' }) as { error: { message: string; code: string } }
    expect(r.error.message).toBe(PHRASE_SITE_ECHU)
    expect(r.error.code).toBe('P0001')
  })

  it('② un autre refus reste tel quel', async () => {
    refus = { message: 'permission denied for table sites', code: '42501' }
    const r = await updateOwnedSite('ma-vitrine', 'moi@exemple.td', { name: 'X' }) as { error: { message: string } }
    expect(r.error.message).toBe('permission denied for table sites')
  })

  it('③ le rappel du tableau de bord, échu : la même phrase', () => {
    expect(phraseRappel({ payeJusquAu: '2026-12-10T12:00:00Z', rappel: 'echu' })).toBe(PHRASE_SITE_ECHU)
  })
})
