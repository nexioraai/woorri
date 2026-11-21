/**
 * LA ROUTE DU FORMULAIRE MOBILE MONEY (2026-11-21) : interrupteur d'abord, appli
 * du compte, et jamais de déclaration de paiement.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
const etat = vi.hoisted(() => ({ ouvert: false, ligne: null as null | Record<string, unknown>, appels: [] as string[] }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u1', email: 'client@exemple.com' }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({ [TABLE_GENERATIONS]: { reponse: () => ({ data: etat.ligne, error: null }) } }, journalVierge()) } }
})
vi.mock('@/lib/apps/quota', () => ({ lirePrixMensuelXaf: async () => 12000 }))
const ENC = { id: 'col_1', etat: 'en_attente', montant: 12000, devise: 'XAF', test: true, action: { type: 'approuver', message: 'Entrez votre PIN', ussd: '*211#' }, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantAttendu: 12000 }, echec: null }
vi.mock('@/lib/payments/mobile-money/fournisseur', () => ({
  fournisseurMobileMoney: () => ({
    nom: 'monerails',
    operateurs: async () => { etat.appels.push('operateurs'); return [{ code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] }] },
    encaisser: async () => { etat.appels.push('encaisser'); return ENC },
    lire: async () => { etat.appels.push('lire'); return ENC },
    autoriser: async () => { etat.appels.push('autoriser'); return ENC },
  }),
}))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async (cle: string) => cle === 'mobile_money' && etat.ouvert }))
import { GET, POST } from '../route'

const url = (q = '') => `https://www.deribfy.com/api/generateur/mobile-money?id=a1${q}`
const poster = (corps: unknown, q = '') => POST(new Request(url(q), { method: 'POST', body: JSON.stringify(corps) }))
beforeEach(() => { etat.ouvert = false; etat.ligne = { id: 'a1', statut: 'livree' }; etat.appels = [] })

describe('formulaire mobile money', () => {
  it('ÉTEINT par défaut : 403 sur GET et POST, le prestataire n’est jamais appelé', async () => {
    expect((await GET(new Request(url()))).status).toBe(403)
    expect((await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })).status).toBe(403)
    expect(etat.appels).toEqual([])
  })
  it('allumé : l’appli d’un autre compte → 404 ; non livrée → 409', async () => {
    etat.ouvert = true
    etat.ligne = null
    expect((await GET(new Request(url()))).status).toBe(404)
    etat.ligne = { id: 'a1', statut: 'refusee' }
    expect((await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })).status).toBe(409)
    expect(etat.appels).toEqual([])
  })
  it('allumé : GET rend le montant du réglage et les opérateurs du prestataire', async () => {
    etat.ouvert = true
    expect(await (await GET(new Request(url()))).json()).toEqual({ montant: 12000, devise: 'XAF', operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] }] })
  })
  it('allumé : POST ouvre l’encaissement et rend une vue SANS le rattachement interne', async () => {
    etat.ouvert = true
    const r = await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })
    expect(r.status).toBe(201)
    const d = (await r.json()) as Record<string, unknown>
    expect(d).toEqual({ encaissement: 'col_1', etat: 'en_attente', montant: 12000, devise: 'XAF', test: true, action: { type: 'approuver', message: 'Entrez votre PIN', ussd: '*211#' }, echec: null })
    expect(d.rattachement).toBeUndefined()
  })
  it('suivre l’encaissement d’une AUTRE appli : 404', async () => {
    etat.ouvert = true
    expect((await GET(new Request(url('&encaissement=col_1').replace('id=a1', 'id=a2')))).status).toBe(404)
  })
  it('code à usage unique mal formé : 400, rien n’est envoyé', async () => {
    etat.ouvert = true
    expect((await poster({ code: '12' }, '&encaissement=col_1')).status).toBe(400)
    expect(etat.appels).not.toContain('autoriser')
  })
})
