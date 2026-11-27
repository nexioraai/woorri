/**
 * LE PROPRIÉTAIRE, VÉRIFIÉ (lot 4c) : un jeton d'aperçu ne suffit pas, il doit
 * être celui du propriétaire du site ; la « vue visiteur » ne peut que retirer.
 * Ce que ce fichier NE voit PAS : le vrai service d'authentification (simulé).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = { jeton: null as string | null, utilisateur: null as string | null, vue: undefined as string | undefined }
vi.mock('server-only', () => ({}))
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T>(f: T) => f }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (n: string) => (n === 'deribfy_vue' && etat.vue ? { value: etat.vue } : undefined) }) }))
vi.mock('@/lib/lecteurDuSite', () => ({ jetonDApercu: async () => etat.jeton }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: etat.utilisateur ? { id: etat.utilisateur } : null } }) } } }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return { supabaseAdmin: { from: creerFrom({ sites: { reponse: { data: { owner_id: 'u-proprio' }, error: null } } }, journalVierge()) } }
})
const { estProprietaireDuSite } = await import('@/lib/sites/proprietaireDuSite')

describe('estProprietaireDuSite', () => {
  beforeEach(() => { etat.jeton = null; etat.utilisateur = null; etat.vue = undefined })
  it('sans cookie d’aperçu : visiteur', async () => { expect(await estProprietaireDuSite('s1')).toBe(false) })
  it('le jeton du propriétaire : propriétaire', async () => {
    etat.jeton = 'j'; etat.utilisateur = 'u-proprio'
    expect(await estProprietaireDuSite('s1')).toBe(true)
  })
  it('le jeton valable d’un AUTRE utilisateur : visiteur', async () => {
    etat.jeton = 'j'; etat.utilisateur = 'u-autre'
    expect(await estProprietaireDuSite('s1')).toBe(false)
  })
  it('la vue visiteur : le propriétaire voit comme un visiteur', async () => {
    etat.jeton = 'j'; etat.utilisateur = 'u-proprio'; etat.vue = 'visiteur'
    expect(await estProprietaireDuSite('s1')).toBe(false)
  })
  it('une autre valeur du cookie ne change rien', async () => {
    etat.jeton = 'j'; etat.utilisateur = 'u-proprio'; etat.vue = 'proprietaire'
    expect(await estProprietaireDuSite('s1')).toBe(true)
  })
})
