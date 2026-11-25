/**
 * LE LOT DE MODIFICATIONS PAR MOBILE MONEY (2026-11-24) : prix unique tiré de
 * `lot_prix_xaf` par la formule de l'abonnement (3 000 net → 3 500 FCFA), à
 * l'ouverture comme au contrôle de l'avis ; l'objet `lot` voyage jusqu'au registre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/payments/mobile-money/demandes', () => ({
  masquer: (t: string) => t.slice(0, 3) + '••••••' + t.slice(-2),
  registreDemandes: { ouvrir: async () => ({ issue: 'ouverte', id: 'd1' }), noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined, aRattraper: async () => [], lire: async () => null, marquerActivee: async () => undefined },
}))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
vi.mock('server-only', () => ({}))
const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', frais_retrait_pct: '4', arrondi_frais_xaf: '100', lot_prix_xaf: '3000',
} as const
const etat = vi.hoisted(() => ({ rpc: [] as unknown[], reglages: {} as Record<string, string> | null }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { rpc: async (n: string, p: unknown) => { etat.rpc.push([n, p]); return { data: { statut: 'enregistre' }, error: null } } } }))
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => etat.reglages }))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async () => false }))
import { lireLotXaf, ouvrirEncaissement, traiterAvis } from '../encaissement'
import { prixMobileMoney, tarifDepuisReglages } from '../frais'
import { activerALaMain } from '../activation-main'
import { versEncaissement } from '../monerails'
import type { AvisVerifie, Encaissement, FournisseurMobileMoney } from '../types'

beforeEach(() => { etat.rpc = []; etat.reglages = { ...REGLAGES } })

const ENC: Encaissement = { id: 'c-lot', etat: 'reussi', montant: 3500, devise: 'XAF', operateur: 'AIRTEL', test: false, action: null, rattachement: { app: 'a1', site: null, proprietaire: 'u1', objet: 'lot', montantInscrit: 3500 }, echec: null }
const avis = (e: Partial<Encaissement> = {}): AvisVerifie => ({ id: 'evt', type: 'encaissement_reussi', encaissement: { ...ENC, ...e } })
const faux = (): FournisseurMobileMoney & { demandes: Record<string, unknown>[] } => {
  const demandes: Record<string, unknown>[] = []
  return { nom: 'monerails', demandes, operateurs: async () => [], lire: async () => ENC, autoriser: async () => ENC, verifierAvis: () => null,
    encaissementsDe: async () => [], encaisser: async (d) => { demandes.push(d as unknown as Record<string, unknown>); return { ...ENC, etat: 'en_attente' } } }
}

describe('le calcul (montré au propriétaire)', () => {
  it('3 000 net ÷ 0,96 × 1,035 ÷ 0,93 = 3 477,82 → centaine supérieure : 3 500 FCFA ; Airtel comme Moov', () => {
    const t = tarifDepuisReglages(REGLAGES)
    expect(t.ok).toBe(true)
    if (!t.ok) return
    const p = prixMobileMoney(t.tarif, 3000)
    expect(p).toEqual({ prix: 3000, frais: 500, total: 3500 })
    expect(3000 / 0.96 * 1.035 / 0.93).toBeCloseTo(3477.82, 2)
    expect(prixMobileMoney(t.tarif, 3000).total - 100, '100 de moins ne couvrirait pas').toBeLessThan(3477.82)
  })
  it('lot_prix_xaf lu tel quel ; vide, nul, décimal ou illisible → null (rien n’est proposé)', async () => {
    expect(await lireLotXaf()).toBe(3000)
    for (const v of ['', '0', '-5', '2500.5', 'abc']) {
      etat.reglages = { ...REGLAGES, lot_prix_xaf: v }
      expect(await lireLotXaf(), v).toBeNull()
    }
    etat.reglages = null
    expect(await lireLotXaf()).toBeNull()
  })
})

describe('ouvrir un encaissement de LOT', () => {
  const demande = { app: 'a1', proprietaire: 'u1', operateur: 'MOOV', telephone: '66000000', nomClient: 'Awa', objet: 'lot' as const }
  it('3 500 FCFA, ventilé 3 000 + 500, objet « lot » dans le rattachement et la description', async () => {
    const f = faux()
    await ouvrirEncaissement(demande, f)
    expect(f.demandes[0]).toMatchObject({ montant: 3500, ventilation: { prix: 3000, frais: 500 }, description: 'Deribfy — lot de modifications', rattachement: { objet: 'lot', montantInscrit: 3500 } })
  })
  it('sans objet : un mois d’abonnement, comme avant (14 000)', async () => {
    const f = faux()
    await ouvrirEncaissement({ ...demande, objet: undefined }, f)
    expect(f.demandes[0]).toMatchObject({ montant: 14000, rattachement: { objet: 'abonnement' }, description: 'Deribfy — abonnement d’un mois' })
  })
  it('prix du lot non réglé : 409 lot_non_regle, rien n’est envoyé', async () => {
    etat.reglages = { ...REGLAGES, lot_prix_xaf: '' }
    const f = faux()
    await expect(ouvrirEncaissement(demande, f)).rejects.toMatchObject({ status: 409, code: 'lot_non_regle' })
    expect(f.demandes).toEqual([])
  })
})

describe('l’avis d’un LOT', () => {
  const REEL = { reelPermis: async () => true }
  it('3 500 reçus → enregistrer_paiement(objet = lot, frais 500), issue « enregistre » avec l’objet', async () => {
    expect(await traiterAvis(avis(), 'monerails', REEL)).toEqual({ issue: 'enregistre', app: 'a1', proprietaire: 'u1', objet: 'lot' })
    expect(etat.rpc).toEqual([['enregistrer_paiement', expect.objectContaining({ p_objet: 'lot', p_montant: 3500, p_frais: 500, p_reference: 'c-lot' })]])
  })
  it('3 400 reçus : refusé (attendu 3 500), rien n’est écrit', async () => {
    const r = await traiterAvis(avis({ montant: 3400 }), 'monerails', REEL)
    expect(r).toMatchObject({ issue: 'refuse' })
    expect((r as { raison: string }).raison).toContain('attendu 3500')
    expect(etat.rpc).toEqual([])
  })
  it('un abonnement à 3 500 : refusé — un lot payé ne passe pas pour un mois', async () => {
    expect(await traiterAvis(avis({ rattachement: { ...ENC.rattachement!, objet: 'abonnement' } }), 'monerails', REEL)).toMatchObject({ issue: 'refuse' })
  })
  it('prix du lot illisible à l’avis : « erreur » (le prestataire redonne l’avis), rien n’est écrit', async () => {
    etat.reglages = { ...REGLAGES, lot_prix_xaf: '' }
    expect(await traiterAvis(avis(), 'monerails', REEL)).toMatchObject({ issue: 'erreur' })
    expect(etat.rpc).toEqual([])
  })
})

describe('activation à la main : l’objet relu chez le prestataire', () => {
  it('un paiement de lot refusé puis activé reste un LOT', async () => {
    const ecrit: Record<string, unknown>[] = []
    const r = await activerALaMain('d1', 'Youssouf', {
      registre: { lire: async () => ({ id: 'd1', etat: 'refusee', test: false, reference: 'c-lot', fournisseur: 'monerails', app_id: 'a1', owner_id: 'u1', prix: 3000 }), marquerActivee: async () => undefined } as never,
      fournisseur: faux(),
      enregistrer: async (p) => { ecrit.push(p); return { data: { statut: 'enregistre' }, error: null } },
    })
    expect(r).toEqual({ ok: true, statut: 'enregistre' })
    expect(ecrit[0]).toMatchObject({ p_objet: 'lot', p_montant: 3500, p_frais: 500 })
  })
})


describe('l’objet lu dans un avis MoneRails', () => {
  const col = (objet: string) => ({ id: 'c', object: 'collection', status: 'succeeded', amount: 3500, currency: 'XAF', operator: 'AIRTEL', livemode: true,
    metadata: { deribfy_app: 'a1', deribfy_proprietaire: 'u1', deribfy_objet: objet, deribfy_montant: '3500' } })
  it('« lot » et « abonnement » sont des paiements Deribfy ; tout autre mot ne l’est pas', () => {
    expect(versEncaissement(col('lot')).rattachement).toMatchObject({ objet: 'lot', app: 'a1' })
    expect(versEncaissement(col('abonnement')).rattachement).toMatchObject({ objet: 'abonnement' })
    expect(versEncaissement(col('cadeau')).rattachement).toBeNull()
  })
})
