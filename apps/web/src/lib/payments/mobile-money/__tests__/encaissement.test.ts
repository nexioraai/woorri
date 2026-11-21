/**
 * PAYER PAR MOBILE MONEY — ce qui ne dépend pas du prestataire (2026-11-21).
 * Seul un avis réussi, de TEST, au montant demandé, rattaché, écrit au registre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const etat = vi.hoisted(() => ({ rpc: [] as unknown[], reponse: { data: { statut: 'enregistre' }, error: null } as { data: unknown; error: unknown }, prix: 12000 as number | null }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { rpc: async (n: string, p: unknown) => { etat.rpc.push([n, p]); return etat.reponse } } }))
vi.mock('@/lib/apps/quota', () => ({ lirePrixMensuelXaf: async () => etat.prix }))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async () => false }))
import { cleIdempotence, ouvrirEncaissement, telephoneTchad, traiterAvis } from '../encaissement'
import type { AvisVerifie, Encaissement, FournisseurMobileMoney } from '../types'

const ENC: Encaissement = { id: 'c1', etat: 'reussi', montant: 12000, devise: 'XAF', test: true, action: null, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantAttendu: 12000 }, echec: null }
const avis = (e: Partial<Encaissement> = {}, type: AvisVerifie['type'] = 'encaissement_reussi'): AvisVerifie => ({ id: 'evt', type, encaissement: { ...ENC, ...e } })

beforeEach(() => { etat.rpc = []; etat.reponse = { data: { statut: 'enregistre' }, error: null }; etat.prix = 12000 })

describe('numéro tchadien', () => {
  it('formats acceptés, et les numéros de test de la doc', () => {
    expect(telephoneTchad('66 00 00 00')).toBe('23566000000')
    expect(telephoneTchad('+235 66-00-00-00')).toBe('23566000000')
    expect(telephoneTchad('0023566000000')).toBe('23566000000')
    expect(telephoneTchad('23500000001')).toBe('23500000001')
    expect(telephoneTchad('237670000000')).toBeNull()
    expect(telephoneTchad('6600000')).toBeNull()
  })
  it('idempotence : même appli, numéro, opérateur et fenêtre de 10 min → même clé', () => {
    expect(cleIdempotence('a', '2356', 'AIRTEL', 1_000_000)).toBe(cleIdempotence('a', '2356', 'AIRTEL', 1_000_000 + 60_000))
    expect(cleIdempotence('a', '2356', 'AIRTEL', 0)).not.toBe(cleIdempotence('a', '2356', 'MOOV', 0))
  })
})

describe('ouvrir un encaissement', () => {
  const faux = (): FournisseurMobileMoney & { demandes: unknown[] } => {
    const demandes: unknown[] = []
    return { nom: 'monerails', demandes, operateurs: async () => [], lire: async () => ENC, autoriser: async () => ENC, verifierAvis: () => null,
      encaisser: async (d) => { demandes.push(d); return { ...ENC, etat: 'en_attente' } } }
  }
  it('le montant vient du RÉGLAGE, le pays est TD, la devise XAF', async () => {
    const f = faux()
    etat.prix = 15000
    await ouvrirEncaissement({ app: 'a1', proprietaire: 'u1', operateur: 'MOOV', telephone: '66000000', nomClient: 'Awa' }, f)
    expect(f.demandes[0]).toMatchObject({ montant: 15000, devise: 'XAF', pays: 'TD', operateur: 'MOOV', telephone: '23566000000', rattachement: { montantAttendu: 15000 } })
  })
  it('prix vide : refus 409, rien n’est envoyé au prestataire', async () => {
    const f = faux()
    etat.prix = null
    await expect(ouvrirEncaissement({ app: 'a1', proprietaire: 'u1', operateur: 'MOOV', telephone: '66000000', nomClient: 'Awa' }, f)).rejects.toMatchObject({ status: 409 })
    expect(f.demandes).toEqual([])
  })
  it('numéro ou nom invalide : 400, rien n’est envoyé', async () => {
    const f = faux()
    await expect(ouvrirEncaissement({ app: 'a1', proprietaire: 'u1', operateur: 'MOOV', telephone: '12', nomClient: 'Awa' }, f)).rejects.toMatchObject({ status: 400 })
    await expect(ouvrirEncaissement({ app: 'a1', proprietaire: 'u1', operateur: 'MOOV', telephone: '66000000', nomClient: 'A' }, f)).rejects.toMatchObject({ status: 400 })
    expect(f.demandes).toEqual([])
  })
})

describe('traiter un avis vérifié', () => {
  it('réussi, test, au montant demandé → enregistrer_paiement (monerails, référence = id du prestataire)', async () => {
    expect(await traiterAvis(avis(), 'monerails')).toEqual({ issue: 'enregistre', app: 'a1' })
    expect(etat.rpc).toEqual([['enregistrer_paiement', {
      p_source: 'automatique', p_fournisseur: 'monerails', p_reference: 'c1', p_app: 'a1', p_owner: 'u1', p_objet: 'abonnement',
      p_montant: 12000, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: 'monerails',
    }]])
  })
  it('le même avis rejoué : « déjà enregistré », rien de plus', async () => {
    etat.reponse = { data: { statut: 'deja_enregistre' }, error: null }
    expect(await traiterAvis(avis(), 'monerails')).toEqual({ issue: 'deja_enregistre', app: 'a1' })
  })
  it('MODE TEST : un avis réel n’écrit rien', async () => {
    expect((await traiterAvis(avis({ test: false }), 'monerails')).issue).toBe('ignore')
    expect(etat.rpc).toEqual([])
  })
  it('montant ou devise différents de la demande : refusé, rien n’est écrit', async () => {
    expect((await traiterAvis(avis({ montant: 100 }), 'monerails')).issue).toBe('refuse')
    expect((await traiterAvis(avis({ devise: 'XOF' }), 'monerails')).issue).toBe('refuse')
    expect(etat.rpc).toEqual([])
  })
  it('échec, état non final, sans rattachement : ignoré, rien n’est écrit', async () => {
    expect((await traiterAvis(avis({}, 'encaissement_echoue'), 'monerails')).issue).toBe('ignore')
    expect((await traiterAvis(avis({ etat: 'en_attente' }), 'monerails')).issue).toBe('ignore')
    expect((await traiterAvis(avis({ rattachement: null }), 'monerails')).issue).toBe('ignore')
    expect(etat.rpc).toEqual([])
  })
  it('erreur de la base : l’issue le dit (le webhook rendra 500, le prestataire réessaiera)', async () => {
    etat.reponse = { data: null, error: { message: 'PAIEMENT_APPLI_ETRANGERE' } }
    expect(await traiterAvis(avis(), 'monerails')).toEqual({ issue: 'erreur', raison: 'PAIEMENT_APPLI_ETRANGERE' })
  })
})
