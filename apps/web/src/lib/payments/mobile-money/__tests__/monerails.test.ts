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
import { creerMonerails, monerails, referenceClient, signatureValide, TOLERANCE_AVIS_S, versEncaissement, versOuverts } from '../monerails'
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
  it('L3 · un avis RÉEL signé par le secret LIVE : accepté, et pas pris pour un test', () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET_LIVE', 'whsec_live')
    const reel = CORPS.replace('"livemode":false', '"livemode":true')
    const sig = createHmac('sha256', 'whsec_live').update(`${String(T)}.`).update(reel).digest('hex')
    const a = monerails.verifierAvis(reel, new Headers({ 'Monerail-Signature': `t=${String(T)},v1=${sig}` }), T)
    expect(a?.encaissement?.test).toBe(false)
  })
  it('L3 · le secret et livemode doivent s’accorder : réel signé par le secret de TEST, ou test signé par le secret LIVE → refusé', () => {
    vi.stubEnv('MONERAILS_WEBHOOK_SECRET_LIVE', 'whsec_live')
    const reel = CORPS.replace('"livemode":false', '"livemode":true')
    expect(monerails.verifierAvis(reel, new Headers({ 'Monerail-Signature': `t=${String(T)},v1=${signer(T, reel)}` }), T)).toBeNull()
    const sigLive = createHmac('sha256', 'whsec_live').update(`${String(T)}.`).update(CORPS).digest('hex')
    expect(monerails.verifierAvis(CORPS, new Headers({ 'Monerail-Signature': `t=${String(T)},v1=${sigLive}` }), T)).toBeNull()
    // Sans livemode du tout : refusé (on ne devine pas le mode).
    const sans = CORPS.replace(/,?"livemode":false/gu, '')
    expect(monerails.verifierAvis(sans, new Headers({ 'Monerail-Signature': `t=${String(T)},v1=${signer(T, sans)}` }), T)).toBeNull()
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

describe('LA CLÉ DU MODE (lot L3) : test = mr_test_, réel = mr_live_, jamais l’une pour l’autre', () => {
  const appels: unknown[] = []
  beforeEach(() => { appels.length = 0; vi.stubGlobal('fetch', vi.fn(async (...a: unknown[]) => { appels.push(a); return new Response(JSON.stringify({ data: [] }), { status: 200 }) })) })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('une clé réelle (mr_live_) posée comme clé de TEST est refusée AVANT tout appel réseau', async () => {
    vi.stubEnv('MONERAILS_CLE_TEST', 'mr_live_abc')
    await expect(monerails.operateurs('XAF', 'TD')).rejects.toMatchObject({ code: 'cle_non_test', status: 503 })
    expect(appels).toEqual([])
  })
  it('le RÉEL ne lit que MONERAILS_CLE_LIVE, et seulement une clé mr_live_ ; l’ancienne variable n’est plus lue', async () => {
    const reel = creerMonerails('reel')
    vi.stubEnv('MONERAILS_CLE_TEST', 'mr_test_abc')
    vi.stubEnv('MONERAILS_SECRET_KEY', 'mr_live_ancienne')
    await expect(reel.lire('c1')).rejects.toMatchObject({ code: 'cle_absente', status: 503 })
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_test_xyz')
    await expect(reel.lire('c1')).rejects.toMatchObject({ code: 'cle_non_live', status: 503 })
    expect(appels).toEqual([])
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_xyz')
    await reel.operateurs('XAF', 'TD')
    expect(((appels[0] as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe('Bearer mr_live_xyz')
    // Et le TEST garde sa clé à lui.
    await monerails.operateurs('XAF', 'TD')
    expect(((appels[1] as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe('Bearer mr_test_abc')
  })
  it('clé absente : refus clair, aucun appel', async () => {
    vi.stubEnv('MONERAILS_CLE_TEST', '')
    await expect(monerails.lire('c1')).rejects.toBeInstanceOf(ErreurFournisseur)
    expect(appels).toEqual([])
  })
  it('clé de test : la collecte part avec TD, XAF, le montant, le rattachement et une clé d’idempotence', async () => {
    vi.stubEnv('MONERAILS_CLE_TEST', 'mr_test_abc')
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
    vi.stubEnv('MONERAILS_CLE_TEST', 'mr_test_abc')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Invalid phone', code: 'invalid_phone' } }), { status: 400 })))
    await expect(monerails.lire('c1')).rejects.toMatchObject({ message: 'Invalid phone', code: 'invalid_phone', status: 400 })
  })

  it('la réponse BRUTE de MoneRails est journalisée à chaque demande de paiement — pas aux lectures de suivi', async () => {
    vi.stubEnv('MONERAILS_CLE_TEST', 'mr_test_abc')
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
      `[mobile-money] réponse brute MoneRails (test) POST /v1/collections → 201 ${brut}`,
      `[mobile-money] réponse brute MoneRails (test) POST /v1/collections/c9/authorize → 201 ${brut}`,
    ])
  })
})

describe('DOUBLE PAIEMENT · la liste des demandes d’une appli', () => {
  const APP = '7f3e9c2a-1b4d-4e8f-9a6c-2d5b8e1f0a37'
  const col = (id: string, ref: string | null, status: string, created_at: string | undefined = '2026-11-21T11:57:00.000Z') => ({ id, object: 'collection', client_reference: ref, status, created_at })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
  it('la référence client d’une appli : « app: » + son id (la même que celle posée à la demande)', () => {
    expect(referenceClient(APP)).toBe(`app:${APP}`)
  })
  it('appel : GET /v1/collections filtré par la référence de l’appli, page maximale de 100', async () => {
    vi.stubEnv('MONERAILS_CLE_TEST', 'mr_test_abc')
    const appels: unknown[][] = []
    vi.stubGlobal('fetch', vi.fn(async (...a: unknown[]) => { appels.push(a); return new Response(JSON.stringify({ object: 'list', data: [col('c1', `app:${APP}`, 'pending')], has_more: false }), { status: 200 }) }))
    expect(await monerails.encaissementsDe(APP)).toEqual([{ id: 'c1', etat: 'en_attente', creeLeMs: Date.parse('2026-11-21T11:57:00.000Z') }])
    expect(String(appels[0]?.[0])).toBe(`https://api.monerails.com/v1/collections?client_reference=app%3A${APP}&limit=100`)
    expect((appels[0]?.[1] as { method: string }).method).toBe('GET')
  })
  it('la référence est REVÉRIFIÉE : une collecte d’une autre appli (filtre ignoré) ne compte pas', () => {
    const r = { data: [col('c1', 'app:autre', 'pending'), col('c2', null, 'pending'), col('c3', `app:${APP}`, 'requires_otp')] }
    expect(versOuverts(r, APP).map((e) => e.id)).toEqual(['c3'])
  })
  it('états traduits ; date absente ou illisible → null (comptée récente par la règle)', () => {
    const r = { data: [col('a', `app:${APP}`, 'processing', 'pas une date'), col('b', `app:${APP}`, 'succeeded', undefined), col('c', `app:${APP}`, 'expired')] }
    r.data[1] = { ...r.data[1], created_at: undefined as unknown as string }
    expect(versOuverts(r, APP)).toEqual([
      { id: 'a', etat: 'en_cours', creeLeMs: null },
      { id: 'b', etat: 'reussi', creeLeMs: null },
      { id: 'c', etat: 'expire', creeLeMs: Date.parse('2026-11-21T11:57:00.000Z') },
    ])
  })
  it('réponse sans liste : erreur (la demande sera refusée, jamais « aucune demande en cours »)', () => {
    expect(() => versOuverts({ error: 'x' }, APP)).toThrow(ErreurFournisseur)
    expect(() => versOuverts(null, APP)).toThrow(ErreurFournisseur)
  })
})
