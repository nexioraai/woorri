/**
 * PAYER PAR MOBILE MONEY — ce qui ne dépend pas du prestataire (2026-11-21).
 * Seul un avis réussi, au moins au montant RECALCULÉ (prix + frais de
 * l'opérateur, lus dans les réglages), rattaché, écrit au registre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
// 2026-11-23 : le verrou et le journal en base ont leur propre test (mobile-money-l1-l2) ; ici, un registre qui ouvre toujours.
vi.mock('@/lib/payments/mobile-money/demandes', () => ({
  masquer: (t: string) => t.slice(0, 3) + '••••••' + t.slice(-2),
  registreDemandes: { ouvrir: async () => ({ issue: 'ouverte', id: 'd1' }), noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined, aRattraper: async () => [], lire: async () => null, marquerActivee: async () => undefined },
}))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
vi.mock('server-only', () => ({}))
const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', arrondi_frais_xaf: '100',
} as const
const etat = vi.hoisted(() => ({ rpc: [] as unknown[], reponse: { data: { statut: 'enregistre' }, error: null } as { data: unknown; error: unknown }, reglages: {} as Record<string, string> | null }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { rpc: async (n: string, p: unknown) => { etat.rpc.push([n, p]); return etat.reponse } } }))
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => etat.reglages }))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async () => false }))
import { ATTENTE_MAX_MS, cleIdempotence, demandeEnCours, MODE_TEST_SEULEMENT, ouvrirEncaissement, phraseDemandeEnCours, telephoneTchad, traiterAvis } from '../encaissement'
import type { AvisVerifie, Encaissement, EncaissementOuvert, FournisseurMobileMoney } from '../types'

const ENC: Encaissement = { id: 'c1', etat: 'reussi', montant: 13400, devise: 'XAF', operateur: 'AIRTEL', test: true, action: null, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 13400 }, echec: null }
const avis = (e: Partial<Encaissement> = {}, type: AvisVerifie['type'] = 'encaissement_reussi'): AvisVerifie => ({ id: 'evt', type, encaissement: { ...ENC, ...e } })

beforeEach(() => { etat.rpc = []; etat.reponse = { data: { statut: 'enregistre' }, error: null }; etat.reglages = { ...REGLAGES } })

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
    expect(cleIdempotence('a', '2356', 'AIRTEL', 13400, 1_000_000)).toBe(cleIdempotence('a', '2356', 'AIRTEL', 13400, 1_000_000 + 60_000))
    expect(cleIdempotence('a', '2356', 'AIRTEL', 13400, 0)).not.toBe(cleIdempotence('a', '2356', 'MOOV', 13400, 0))
  })
})

describe('ouvrir un encaissement', () => {
  const faux = (ouverts: EncaissementOuvert[] | Error = []): FournisseurMobileMoney & { demandes: unknown[]; listees: string[] } => {
    const demandes: unknown[] = []
    const listees: string[] = []
    return { nom: 'monerails', demandes, listees, operateurs: async () => [], lire: async () => ENC, autoriser: async () => ENC, verifierAvis: () => null,
      encaissementsDe: async (app) => { listees.push(app); if (ouverts instanceof Error) throw ouverts; return ouverts },
      encaisser: async (d) => { demandes.push(d); return { ...ENC, etat: 'en_attente' } } }
  }
  const demande = (operateur: string) => ({ app: 'a1', proprietaire: 'u1', operateur, telephone: '66000000', nomClient: 'Awa' })
  it('FRAIS · le montant demandé = prix + frais DE L’OPÉRATEUR : Airtel 13 400, Moov 13 100 (pays TD, devise XAF)', async () => {
    const f = faux()
    await ouvrirEncaissement(demande('AIRTEL'), f)
    await ouvrirEncaissement(demande('MOOV'), f)
    expect(f.demandes[0]).toMatchObject({ montant: 13400, devise: 'XAF', pays: 'TD', operateur: 'AIRTEL', telephone: '23566000000', ventilation: { prix: 12000, frais: 1400 } })
    expect(f.demandes[1]).toMatchObject({ montant: 13100, operateur: 'MOOV', ventilation: { prix: 12000, frais: 1100 } })
  })
  it('FRAIS · lus dans les réglages AU MOMENT de la demande (prix 15 000 → Moov 16 400)', async () => {
    const f = faux()
    etat.reglages = { ...REGLAGES, prix_mensuel_xaf: '15000' }
    await ouvrirEncaissement(demande('MOOV'), f)
    expect(f.demandes[0]).toMatchObject({ montant: 16400, ventilation: { prix: 15000, frais: 1400 } })
  })
  it('FRAIS · un réglage vide ou illisible (ou la table illisible) : 409, rien n’est envoyé — jamais un montant sans frais', async () => {
    const f = faux()
    for (const cle of Object.keys(REGLAGES)) {
      etat.reglages = { ...REGLAGES, [cle]: '' }
      await expect(ouvrirEncaissement(demande('AIRTEL'), f), cle).rejects.toMatchObject({ status: 409, code: 'frais_non_regles' })
    }
    etat.reglages = null
    await expect(ouvrirEncaissement(demande('AIRTEL'), f)).rejects.toMatchObject({ status: 409 })
    expect(f.demandes).toEqual([])
  })
  it('FRAIS · un opérateur sans taux réglé : 400, rien n’est envoyé', async () => {
    const f = faux()
    await expect(ouvrirEncaissement(demande('ORANGE'), f)).rejects.toMatchObject({ status: 400, code: 'operateur_sans_frais' })
    expect(f.demandes).toEqual([])
  })
  it('numéro ou nom invalide : 400, rien n’est envoyé', async () => {
    const f = faux()
    await expect(ouvrirEncaissement({ app: 'a1', proprietaire: 'u1', operateur: 'MOOV', telephone: '12', nomClient: 'Awa' }, f)).rejects.toMatchObject({ status: 400 })
    await expect(ouvrirEncaissement({ app: 'a1', proprietaire: 'u1', operateur: 'MOOV', telephone: '66000000', nomClient: 'A' }, f)).rejects.toMatchObject({ status: 400 })
    expect(f.demandes).toEqual([])
  })
})

describe('DOUBLE PAIEMENT · une seule demande ouverte par appli', () => {
  const MAINTENANT = Date.parse('2026-11-21T12:00:00Z')
  const il_y_a = (ms: number) => MAINTENANT - ms
  const demande = { app: 'a1', proprietaire: 'u1', operateur: 'AIRTEL', telephone: '66000000', nomClient: 'Awa' }
  const faux = (ouverts: EncaissementOuvert[] | Error): FournisseurMobileMoney & { demandes: unknown[]; listees: string[] } => {
    const demandes: unknown[] = []
    const listees: string[] = []
    return { nom: 'monerails', demandes, listees, operateurs: async () => [], lire: async () => ENC, autoriser: async () => ENC, verifierAvis: () => null,
      encaissementsDe: async (app) => { listees.push(app); if (ouverts instanceof Error) throw ouverts; return ouverts },
      encaisser: async (d) => { demandes.push(d); return { ...ENC, etat: 'en_attente' } } }
  }
  it('une demande NON finale de moins de 10 min : 409, rien n’est envoyé, la phrase dit combien attendre', async () => {
    for (const etatOuvert of ['en_attente', 'code_requis', 'en_cours'] as const) {
      const f = faux([{ id: 'c0', etat: etatOuvert, creeLeMs: il_y_a(3 * 60_000) }])
      await expect(ouvrirEncaissement(demande, f, MAINTENANT), etatOuvert).rejects.toMatchObject({ status: 409, code: 'paiement_en_cours', message: phraseDemandeEnCours(7 * 60_000) })
      expect(f.listees).toEqual(['a1'])
      expect(f.demandes).toEqual([])
    }
    expect(phraseDemandeEnCours(7 * 60_000)).toBe('Un paiement est déjà en cours pour cette application : validez-le sur votre téléphone, ou attendez 7 min avant d’en demander un autre.')
  })
  it('la même demande à 9 min 59 s : refusée ; à 10 min pile : permise (la précédente n’est plus attendue)', async () => {
    await expect(ouvrirEncaissement(demande, faux([{ id: 'c0', etat: 'en_attente', creeLeMs: il_y_a(ATTENTE_MAX_MS - 1000) }]), MAINTENANT)).rejects.toMatchObject({ status: 409 })
    const f = faux([{ id: 'c0', etat: 'en_attente', creeLeMs: il_y_a(ATTENTE_MAX_MS) }])
    await ouvrirEncaissement(demande, f, MAINTENANT)
    expect(f.demandes).toHaveLength(1)
  })
  it('une demande récente mais FINALE (réussie, échouée, expirée) ne bloque pas', async () => {
    const f = faux([{ id: 'c1', etat: 'reussi', creeLeMs: il_y_a(60_000) }, { id: 'c2', etat: 'echoue', creeLeMs: il_y_a(60_000) }, { id: 'c3', etat: 'expire', creeLeMs: il_y_a(60_000) }])
    await ouvrirEncaissement(demande, f, MAINTENANT)
    expect(f.demandes).toHaveLength(1)
  })
  it('n’importe laquelle de la liste compte, pas seulement la plus récente', async () => {
    const f = faux([{ id: 'c1', etat: 'echoue', creeLeMs: il_y_a(30_000) }, { id: 'c0', etat: 'en_attente', creeLeMs: il_y_a(120_000) }])
    await expect(ouvrirEncaissement(demande, f, MAINTENANT)).rejects.toMatchObject({ status: 409 })
    expect(demandeEnCours([{ id: 'c1', etat: 'echoue', creeLeMs: il_y_a(30_000) }, { id: 'c0', etat: 'en_attente', creeLeMs: il_y_a(120_000) }], MAINTENANT)).toEqual({ id: 'c0', resteMs: ATTENTE_MAX_MS - 120_000 })
  })
  it('une demande non finale SANS date : comptée récente (prudence) → refusée', async () => {
    await expect(ouvrirEncaissement(demande, faux([{ id: 'c0', etat: 'en_attente', creeLeMs: null }]), MAINTENANT)).rejects.toMatchObject({ status: 409 })
  })
  it('la liste du prestataire illisible : 503, rien n’est envoyé (on ne risque pas un second débit)', async () => {
    const f = faux(new Error('réseau'))
    await expect(ouvrirEncaissement(demande, f, MAINTENANT)).rejects.toMatchObject({ status: 503, code: 'verification_en_cours' })
    expect(f.demandes).toEqual([])
  })
  it('aucune demande avant : la demande part', async () => {
    const f = faux([])
    await ouvrirEncaissement(demande, f, MAINTENANT)
    expect(f.demandes).toHaveLength(1)
  })
})

describe('traiter un avis vérifié', () => {
  const ECRITURE = {
    p_source: 'automatique', p_fournisseur: 'monerails', p_reference: 'c1', p_app: 'a1', p_owner: 'u1', p_objet: 'abonnement',
    p_montant: 13400, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: 'monerails', p_frais: 1400,
  }
  it('OPTION A · le mode test seul est EN VIGUEUR (garde-fou : l’ouvrir est un commit nommé)', () => {
    expect(MODE_TEST_SEULEMENT).toBe(true)
  })
  it('OPTION A · avis de TEST réussi, au montant demandé : vérifié, RIEN n’est écrit, et l’issue dit ce qui l’aurait été', async () => {
    expect(await traiterAvis(avis(), 'monerails')).toEqual({ issue: 'test_verifie', app: 'a1', serait: ECRITURE, ventilation: { abonnement: 12000, frais: 1400 } })
    expect(etat.rpc, 'un avis de test a écrit dans le registre').toEqual([])
  })
  it('mode réel ouvert (plus tard) : avis réel réussi → enregistrer_paiement (monerails, référence = id du prestataire)', async () => {
    expect(await traiterAvis(avis({ test: false }), 'monerails', { modeTestSeulement: false })).toEqual({ issue: 'enregistre', app: 'a1' })
    expect(etat.rpc).toEqual([['enregistrer_paiement', ECRITURE]])
  })
  it('mode réel ouvert : le même avis rejoué → « déjà enregistré », rien de plus', async () => {
    etat.reponse = { data: { statut: 'deja_enregistre' }, error: null }
    expect(await traiterAvis(avis({ test: false }), 'monerails', { modeTestSeulement: false })).toEqual({ issue: 'deja_enregistre', app: 'a1' })
  })
  it('MODE TEST : un avis réel n’écrit rien', async () => {
    expect((await traiterAvis(avis({ test: false }), 'monerails')).issue).toBe('ignore')
    expect(etat.rpc).toEqual([])
  })
  it('montant sous l’attendu ou devise différente : refusé, rien n’est écrit', async () => {
    expect((await traiterAvis(avis({ montant: 100 }), 'monerails')).issue).toBe('refuse')
    expect((await traiterAvis(avis({ devise: 'XOF' }), 'monerails')).issue).toBe('refuse')
    expect(etat.rpc).toEqual([])
  })
  it('FRAIS · le montant attendu est RECALCULÉ : les métadonnées de la demande ne prouvent rien', async () => {
    // Une demande inscrite à 12 000 (sans frais), payée 12 000 : refusée.
    const r = await traiterAvis(avis({ montant: 12000, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 12000 } }), 'monerails')
    expect(r).toEqual({ issue: 'refuse', raison: 'montant 12000 < attendu 13400 (12000 + 1400 de frais, AIRTEL)' })
    // Sans aucun montant inscrit, 13 400 Airtel passe : seul le recalcul compte.
    expect((await traiterAvis(avis({ rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: null } }), 'monerails')).issue).toBe('test_verifie')
  })
  it('FRAIS · par l’opérateur DE L’AVIS : Moov 13 100 passe, Airtel 13 100 est refusé, 13 399 aussi ; sans opérateur, refusé', async () => {
    expect((await traiterAvis(avis({ operateur: 'MOOV', montant: 13100 }), 'monerails')).issue).toBe('test_verifie')
    expect((await traiterAvis(avis({ operateur: 'AIRTEL', montant: 13100 }), 'monerails')).issue).toBe('refuse')
    expect((await traiterAvis(avis({ montant: 13399 }), 'monerails')).issue).toBe('refuse')
    expect((await traiterAvis(avis({ operateur: null }), 'monerails')).issue).toBe('refuse')
    expect(etat.rpc).toEqual([])
  })
  it('FRAIS · RÈGLE « au moins » : payé plus que l’attendu (frais baissés depuis la demande) passe ; prix monté depuis : refusé', async () => {
    etat.reglages = { ...REGLAGES, frais_encaissement_airtel_pct: '5' }
    expect((await traiterAvis(avis(), 'monerails')).issue).toBe('test_verifie')
    etat.reglages = { ...REGLAGES, prix_mensuel_xaf: '15000' }
    expect((await traiterAvis(avis(), 'monerails')).issue).toBe('refuse')
  })
  it('FRAIS · réglages illisibles à l’arrivée de l’avis : « erreur » (500 → le prestataire redonne l’avis), rien n’est écrit', async () => {
    etat.reglages = { ...REGLAGES, frais_reversement_pct: '' }
    expect(await traiterAvis(avis(), 'monerails')).toEqual({ issue: 'erreur', raison: 'frais non réglés : frais_reversement_pct' })
    etat.reglages = null
    expect((await traiterAvis(avis({ test: false }), 'monerails', { modeTestSeulement: false })).issue).toBe('erreur')
    expect(etat.rpc).toEqual([])
  })
  it('échec, état non final : ignoré ; PAYÉ sans rattachement : REFUSÉ (appli introuvable, 2026-11-23) ; rien n’est écrit', async () => {
    expect((await traiterAvis(avis({}, 'encaissement_echoue'), 'monerails')).issue).toBe('ignore')
    expect((await traiterAvis(avis({ etat: 'en_attente' }), 'monerails')).issue).toBe('ignore')
    expect(await traiterAvis(avis({ rattachement: null }), 'monerails')).toEqual({ issue: 'refuse', raison: 'appli introuvable : encaissement sans rattachement Deribfy' })
    expect(etat.rpc).toEqual([])
  })
  it('COLONNE FRAIS · p_frais = ce qui dépasse le prix : 13 400 Airtel → 1 400 ; payé 13 500 → 1 500 ; Moov 13 100 → 1 100', async () => {
    await traiterAvis(avis({ test: false }), 'monerails', { modeTestSeulement: false })
    await traiterAvis(avis({ id: 'c2', test: false, montant: 13500 }), 'monerails', { modeTestSeulement: false })
    await traiterAvis(avis({ id: 'c3', test: false, operateur: 'MOOV', montant: 13100 }), 'monerails', { modeTestSeulement: false })
    expect(etat.rpc.map((x) => { const p = (x as [string, { p_montant: number; p_frais: number }])[1]; return [p.p_montant, p.p_frais] })).toEqual([[13400, 1400], [13500, 1500], [13100, 1100]])
  })
  it('DOUBLE PAIEMENT · un SECOND débit validé pour la même appli est enregistré lui aussi (sa propre référence : un mois de plus)', async () => {
    expect((await traiterAvis(avis({ id: 'c1', test: false }), 'monerails', { modeTestSeulement: false })).issue).toBe('enregistre')
    expect((await traiterAvis(avis({ id: 'c2', test: false }), 'monerails', { modeTestSeulement: false })).issue).toBe('enregistre')
    expect(etat.rpc.map((x) => (x as [string, { p_reference: string; p_app: string }])[1]).map((p) => `${p.p_app}/${p.p_reference}`)).toEqual(['a1/c1', 'a1/c2'])
  })
  it('mode réel ouvert, erreur de la base : l’issue le dit (le webhook rendra 500, le prestataire réessaiera)', async () => {
    etat.reponse = { data: null, error: { message: 'connexion perdue' } }
    expect(await traiterAvis(avis({ test: false }), 'monerails', { modeTestSeulement: false })).toEqual({ issue: 'erreur', raison: 'connexion perdue' })
  })
  it('2026-11-23 · appli introuvable pour ce compte : REFUS définitif (redonner l’avis n’y changerait rien)', async () => {
    etat.reponse = { data: null, error: { message: 'PAIEMENT_APPLI_ETRANGERE: cette appli n’appartient pas à ce compte' } }
    expect(await traiterAvis(avis({ test: false }), 'monerails', { modeTestSeulement: false })).toEqual({ issue: 'refuse', raison: 'appli introuvable pour ce compte (a1)' })
  })
})
