/**
 * PUBLIER DEMANDE L'ABONNEMENT — la garde de la route (2026-11-20).
 *
 * ① non exempté, appli non abonnée → 402, la phrase porte le prix RÉGLÉ et
 *    comment payer, et RIEN n'est écrit ;
 * ② prix vide → la phrase sans montant (jamais « 0 FCFA ») ;
 * ③ compteur illisible → 503, rien n'est écrit ;
 * ④ abonné et payé → la garde laisse passer (la route va jusqu'au contrôle
 *    du nom, l'étape suivante) ; idem pour republier une appli déjà publiée ;
 * ⑤ compte exempté → la garde ne lit même pas le compteur.
 *
 * « Laisser passer » se prouve par l'étape SUIVANTE : un nom invalide rend
 * 400 « nom pas utilisable ». Si la garde bloquait, on aurait 402.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({
  email: 'client@exemple.com',
  ligne: null as null | Record<string, unknown>,
  compteur: null as unknown,
  prix: 12000 as number | null,
  lectures: 0,
  journal: { filtres: {}, projections: {}, ecritures: {} } as import('@/lib/testing/postgrest').JournalPostgrest,
}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: etat.email }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({ [TABLE_GENERATIONS]: { reponse: () => ({ data: etat.ligne, error: null }) } }, etat.journal) } }
})
vi.mock('@/lib/apps/quota', () => ({
  lireCompteur: async () => { etat.lectures += 1; return etat.compteur },
  lirePrixMensuelXaf: async () => etat.prix,
}))
import { POST } from '../route'

const appel = (sous = '') =>
  POST(new Request(`https://www.deribfy.com/api/generateur/publier?id=app-1${sous === '' ? '' : `&sous=${sous}`}`, { method: 'POST' }))
const ecrit = () => Object.values(etat.journal.ecritures).flat()
const ABONNEE = { exempte: false, formule: 'abonnee', restantes: 100, payeJusquAu: '2026-12-31T23:59:59Z', actif: true }

beforeEach(() => {
  etat.email = 'client@exemple.com'
  etat.ligne = { publication_jeton: null, publication_slug: null, document: { schema: {} }, statut: 'livree', demande: 'x', sections_acquises: {} }
  etat.compteur = { exempte: false, formule: 'gratuite', restantes: 10, payeJusquAu: null, actif: false }
  etat.prix = 12000
  etat.lectures = 0
  etat.journal.filtres = {}; etat.journal.projections = {}; etat.journal.ecritures = {}
})

describe('publier demande l’abonnement', () => {
  it('① non exempté, appli gratuite : 402, prix réglé + comment payer, rien n’est écrit', async () => {
    const r = await appel('nom-valide')
    expect(r.status).toBe(402)
    const d = (await r.json()) as { error: string; abonnementRequis: boolean }
    expect(d.abonnementRequis).toBe(true)
    expect(d.error).toBe('Publier demande l’abonnement — 12 000 FCFA par mois. Pour payer : WhatsApp +235 68 36 41 35 (espèces, Airtel Money, Moov Money).')
    expect(ecrit()).toEqual([])
  })

  it('① bis abonnement ÉCHU (abonnée mais plus payée) : 402 aussi', async () => {
    etat.compteur = { ...ABONNEE, restantes: 0, payeJusquAu: '2026-01-01T00:00:00Z', actif: false }
    expect((await appel('nom-valide')).status).toBe(402)
    expect(ecrit()).toEqual([])
  })

  it('② le prix vient du RÉGLAGE : un autre prix, une autre phrase ; vide, sans montant', async () => {
    etat.prix = 15000
    expect(((await (await appel()).json()) as { error: string }).error).toContain('15 000 FCFA par mois')
    etat.prix = null
    const e = ((await (await appel()).json()) as { error: string }).error
    expect(e.startsWith('Publier demande l’abonnement. Pour payer')).toBe(true)
    expect(e).not.toMatch(/FCFA par mois|0 FCFA/u)
  })

  it('③ compteur illisible : 503, rien n’est écrit', async () => {
    etat.compteur = null
    expect((await appel('nom-valide')).status).toBe(503)
    expect(ecrit()).toEqual([])
  })

  it('④ abonné et payé : la garde laisse passer (étape suivante : le nom)', async () => {
    etat.compteur = ABONNEE
    const r = await appel('A')
    expect(r.status).toBe(400)
    expect(((await r.json()) as { error: string }).error).toContain('nom n est pas utilisable')
  })

  it('④ bis republier une appli déjà publiée et payée : permis', async () => {
    etat.compteur = ABONNEE
    etat.ligne = { ...(etat.ligne as Record<string, unknown>), publication_jeton: 'jeton-existant', publication_slug: 'atel' }
    expect((await appel('A')).status).toBe(400)
  })

  it('⑤ compte exempté : la garde ne lit pas le compteur et laisse passer', async () => {
    etat.email = 'issayamiyoussouf@gmail.com'
    const r = await appel('A')
    expect(r.status).toBe(400)
    expect(etat.lectures).toBe(0)
  })
})
