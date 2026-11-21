/**
 * MONERAILS — signature des avis, traduction des objets, garde du mode test (2026-11-21).
 * Algorithme de référence : https://docs.monerails.com/webhooks/ (HMAC-SHA256 de
 * `t + "." + corps brut`, secret entier `whsec_…`, hex minuscule, 5 minutes).
 *
 * Ce que ce fichier NE PEUT PAS voir : la vraie API (aucune clé ici). Les
 * réponses brutes de MoneRails se relèvent à part, avec la clé de test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
vi.mock('server-only', () => ({}))
import { monerails, signatureValide, TOLERANCE_AVIS_S, versEncaissement } from '../monerails'
import { ErreurFournisseur } from '../types'

const SECRET = 'whsec_essai_123'
const signer = (t: number, corps: string, secret = SECRET) => createHmac('sha256', secret).update(`${String(t)}.${corps}`).digest('hex')
const T = 1_800_000_000
const CORPS = '{"id":"evt_1","object":"event","type":"collection.succeeded","livemode":false,"data":{"object":{"id":"c1","object":"collection","status":"succeeded","amount":12000,"currency":"XAF","metadata":{"deribfy_app":"a1","deribfy_proprietaire":"u1","deribfy_objet":"abonnement","deribfy_montant":"12000"}}}}'

describe('signature d’un avis', () => {
  it('bonne signature, dans la tolérance : acceptée', () => {
    expect(signatureValide(CORPS, `t=${String(T)},v1=${signer(T, CORPS)}`, SECRET, T + 10)).toBe(true)
  })
  it('limite des 5 minutes : 300 s acceptées, 301 s refusées (dans les deux sens)', () => {
    const h = `t=${String(T)},v1=${signer(T, CORPS)}`
    expect(TOLERANCE_AVIS_S).toBe(300)
    expect(signatureValide(CORPS, h, SECRET, T + 300)).toBe(true)
    expect(signatureValide(CORPS, h, SECRET, T + 301)).toBe(false)
    expect(signatureValide(CORPS, h, SECRET, T - 301)).toBe(false)
  })
  it('corps modifié d’un octet, mauvais secret, secret vide : refusés', () => {
    const h = `t=${String(T)},v1=${signer(T, CORPS)}`
    expect(signatureValide(CORPS.replace('12000', '12001'), h, SECRET, T)).toBe(false)
    expect(signatureValide(CORPS, h, 'whsec_autre', T)).toBe(false)
    expect(signatureValide(CORPS, h, '', T)).toBe(false)
  })
  it('rotation : deux v1, l’un des deux suffit ; en-tête vide ou bancal : refusé', () => {
    expect(signatureValide(CORPS, `t=${String(T)},v1=${'0'.repeat(64)},v1=${signer(T, CORPS)}`, SECRET, T)).toBe(true)
    expect(signatureValide(CORPS, '', SECRET, T)).toBe(false)
    expect(signatureValide(CORPS, `v1=${signer(T, CORPS)}`, SECRET, T)).toBe(false)
    expect(signatureValide(CORPS, `t=abc,v1=${signer(T, CORPS)}`, SECRET, T)).toBe(false)
    expect(signatureValide(CORPS, `t=${String(T)},v1=zz`, SECRET, T)).toBe(false)
  })
})

describe('verifierAvis lit le secret de l’environnement et traduit l’avis', () => {
  beforeEach(() => { vi.stubEnv('MONERAILS_WEBHOOK_SECRET', SECRET) })
  afterEach(() => { vi.unstubAllEnvs() })
  it('avis réussi → encaissement normalisé, rattaché', () => {
    const a = monerails.verifierAvis(CORPS, new Headers({ 'Monerail-Signature': `t=${String(T)},v1=${signer(T, CORPS)}` }), T)
    expect(a?.type).toBe('encaissement_reussi')
    expect(a?.encaissement).toMatchObject({ id: 'c1', etat: 'reussi', montant: 12000, devise: 'XAF', test: true, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 12000 } })
    expect(a?.encaissement?.operateur, 'pas d’opérateur dans cet avis').toBeNull()
  })
  it('l’opérateur de la collecte est lu (le montant attendu se recalcule avec lui)', () => {
    expect(versEncaissement({ id: 'x', status: 'succeeded', amount: 13400, currency: 'XAF', operator: 'AIRTEL', livemode: false }).operateur).toBe('AIRTEL')
  })
  it('un avis réel (livemode true dans l’enveloppe) n’est pas pris pour un test', () => {
    const reel = CORPS.replace('"livemode":false', '"livemode":true')
    const a = monerails.verifierAvis(reel, new Headers({ 'Monerail-Signature': `t=${String(T)},v1=${signer(T, reel)}` }), T)
    expect(a?.encaissement?.test).toBe(false)
  })
  it('secret absent de l’environnement : tout avis est refusé', () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET', '')
    expect(monerails.verifierAvis(CORPS, new Headers({ 'Monerail-Signature': `t=${String(T)},v1=${signer(T, CORPS)}` }), T)).toBeNull()
  })
})

describe('traduction d’une collecte', () => {
  it('états, action du client, échec', () => {
    expect(versEncaissement({ id: 'x', status: 'requires_otp', amount: 1, currency: 'XAF', livemode: false, next_action: { type: 'otp', message: 'Code ?', ussd_code: '*1#' } }))
      .toMatchObject({ etat: 'code_requis', action: { type: 'code', message: 'Code ?', ussd: '*1#' }, test: true })
    expect(versEncaissement({ id: 'x', status: 'failed', failure_code: 'failed', failure_message: 'Solde insuffisant', livemode: true }))
      .toMatchObject({ etat: 'echoue', echec: 'Solde insuffisant', test: false })
    expect(versEncaissement({ id: 'x', status: 'pending', metadata: { deribfy_app: 'a' } }).rattachement).toBeNull()
  })
})

describe('MODE TEST SEULEMENT : la clé', () => {
  const appels: unknown[] = []
  beforeEach(() => { appels.length = 0; vi.stubGlobal('fetch', vi.fn(async (...a: unknown[]) => { appels.push(a); return new Response(JSON.stringify({ data: [] }), { status: 200 }) })) })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('une clé réelle (mr_live_) est refusée AVANT tout appel réseau', async () => {
    vi.stubEnv('MONERAILS_SECRET_KEY', 'mr_live_abc')
    await expect(monerails.operateurs('XAF', 'TD')).rejects.toMatchObject({ code: 'cle_non_test', status: 503 })
    expect(appels).toEqual([])
  })
  it('clé absente : refus clair, aucun appel', async () => {
    vi.stubEnv('MONERAILS_SECRET_KEY', '')
    await expect(monerails.lire('c1')).rejects.toBeInstanceOf(ErreurFournisseur)
    expect(appels).toEqual([])
  })
  it('clé de test : la collecte part avec TD, XAF, le montant, le rattachement et une clé d’idempotence', async () => {
    vi.stubEnv('MONERAILS_SECRET_KEY', 'mr_test_abc')
    vi.stubGlobal('fetch', vi.fn(async (...a: unknown[]) => { appels.push(a); return new Response(JSON.stringify({ id: 'c9', object: 'collection', status: 'pending', amount: 12000, currency: 'XAF', livemode: false }), { status: 201 }) }))
    const e = await monerails.encaisser({
      montant: 13400, devise: 'XAF', pays: 'TD', operateur: 'AIRTEL', telephone: '23500000001', nomClient: 'Essai',
      description: 'Deribfy', rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 13400 }, ventilation: { prix: 12000, frais: 1400 }, cle: 'k1',
    })
    expect(e.id).toBe('c9')
    const [url, init] = appels[0] as [string, RequestInit]
    expect(url).toBe('https://api.monerails.com/v1/collections')
    const h = init.headers as Record<string, string>
    expect(h.Authorization).toBe('Bearer mr_test_abc')
    expect(h['Idempotency-Key']).toBe('k1')
    expect(JSON.parse(String(init.body))).toEqual({
      amount: 13400, currency: 'XAF', country: 'TD', operator: 'AIRTEL', phone: '23500000001',
      customer: { name: 'Essai' }, description: 'Deribfy', client_reference: 'app:a1',
      metadata: { deribfy_app: 'a1', deribfy_proprietaire: 'u1', deribfy_objet: 'abonnement', deribfy_montant: '13400', deribfy_prix: '12000', deribfy_frais: '1400' },
    })
  })
  it('une erreur du prestataire remonte avec son message et sa réponse brute', async () => {
    vi.stubEnv('MONERAILS_SECRET_KEY', 'mr_test_abc')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Invalid phone', code: 'invalid_phone' } }), { status: 400 })))
    await expect(monerails.lire('c1')).rejects.toMatchObject({ message: 'Invalid phone', code: 'invalid_phone', status: 400 })
  })

  it('la réponse BRUTE de MoneRails est journalisée à chaque demande de paiement — pas aux lectures de suivi', async () => {
    vi.stubEnv('MONERAILS_SECRET_KEY', 'mr_test_abc')
    const brut = '{"id":"c9","object":"collection","status":"pending","amount":12000,"currency":"XAF","livemode":false}'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(brut, { status: 201 })))
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await monerails.encaisser({
      montant: 13400, devise: 'XAF', pays: 'TD', operateur: 'AIRTEL', telephone: '23500000001', nomClient: 'Essai',
      description: 'Deribfy', rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 13400 }, ventilation: { prix: 12000, frais: 1400 }, cle: 'k1',
    })
    await monerails.autoriser('c9', '1234')
    await monerails.lire('c9')
    const lignes = log.mock.calls.map((c) => String(c[0]))
    log.mockRestore()
    expect(lignes).toEqual([
      `[mobile-money] réponse brute MoneRails POST /v1/collections → 201 ${brut}`,
      `[mobile-money] réponse brute MoneRails POST /v1/collections/c9/authorize → 201 ${brut}`,
    ])
  })
})
