/**
 * LA ROUTE DU FORMULAIRE MOBILE MONEY (2026-11-21) : interrupteur d'abord, appli
 * du compte, et jamais de déclaration de paiement. UN SEUL PRIX à l'écran et
 * dans les réponses (2026-11-23) ; le RÉEL pour le seul compte du propriétaire (L3).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
const etat = vi.hoisted(() => ({ email: 'client@exemple.com', modes: [] as string[], ouvert: false, ligne: null as null | Record<string, unknown>, appels: [] as string[], reglages: {} as Record<string, string>, ouverts: [] as unknown[] }))
const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', frais_retrait_pct: '4', arrondi_frais_xaf: '100',
}
// 2026-11-23 : le verrou et le journal en base ont leur propre test (mobile-money-l1-l2) ; ici, un registre qui ouvre toujours.
vi.mock('@/lib/payments/mobile-money/demandes', () => ({
  masquer: (t: string) => t.slice(0, 3) + '••••••' + t.slice(-2),
  registreDemandes: { ouvrir: async () => ({ issue: 'ouverte', id: 'd1' }), noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined, aRattraper: async () => [], lire: async () => null, marquerActivee: async () => undefined },
}))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u1', email: etat.email }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({ [TABLE_GENERATIONS]: { reponse: () => ({ data: etat.ligne, error: null }) } }, journalVierge()) } }
})
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => etat.reglages }))
const ENC = { id: 'col_1', etat: 'en_attente', montant: 14000, devise: 'XAF', operateur: 'AIRTEL', test: true, action: { type: 'approuver', message: 'Entrez votre PIN', ussd: '*211#' }, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 14000 }, echec: null }
vi.mock('@/lib/payments/mobile-money/fournisseur', () => ({
  fournisseurMobileMoney: (regime = 'test') => (etat.modes.push(regime), {
    nom: 'monerails',
    operateurs: async () => {
      etat.appels.push('operateurs')
      return [{ code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] }, { code: 'MOOV', nom: 'Moov Money', validation: ['pin'] }, { code: 'ORANGE', nom: 'Orange Money', validation: ['pin'] }]
    },
    encaissementsDe: async () => { etat.appels.push('encaissementsDe'); return etat.ouverts },
    encaisser: async () => { etat.appels.push('encaisser'); return ENC },
    lire: async () => { etat.appels.push('lire'); return ENC },
    autoriser: async () => { etat.appels.push('autoriser'); return ENC },
  }),
}))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async (cle: string) => cle === 'mobile_money' && etat.ouvert }))
import { GET, POST } from '../route'

const url = (q = '') => `https://www.deribfy.com/api/generateur/mobile-money?id=a1${q}`
const poster = (corps: unknown, q = '') => POST(new Request(url(q), { method: 'POST', body: JSON.stringify(corps) }))
beforeEach(() => { vi.unstubAllEnvs(); etat.email = 'client@exemple.com'; etat.modes = []; etat.ouvert = false; etat.ligne = { id: 'a1', statut: 'livree' }; etat.appels = []; etat.reglages = { ...REGLAGES }; etat.ouverts = [] })

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
  it('UN SEUL PRIX · GET rend UN montant (14 000), des opérateurs SANS prix propre ; un opérateur non proposé n’apparaît pas', async () => {
    etat.ouvert = true
    expect(await (await GET(new Request(url()))).json()).toEqual({ montant: 14000, devise: 'XAF', test: true, operateurs: [
      { code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] },
      { code: 'MOOV', nom: 'Moov Money', validation: ['pin'] },
    ] })
  })
  it('UN SEUL PRIX · aucune réponse au client ne contient « frais », un pourcentage, ni le prix net', async () => {
    etat.ouvert = true
    const textes = [await (await GET(new Request(url()))).text(), await (await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })).text()]
    etat.reglages = { ...REGLAGES, frais_retrait_pct: '' }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    textes.push(await (await GET(new Request(url()))).text())
    warn.mockRestore()
    textes.push(await (await poster({ operateur: 'ORANGE', telephone: '66000000', nom: 'Awa' })).text())
    for (const t of textes) {
      expect(t, t).not.toMatch(/frais|%|12000|12\s000|prix/iu)
    }
  })
  it('FRAIS · un réglage manquant : 409 + phrase claire, AUCUN montant rendu, le prestataire n’est pas appelé', async () => {
    etat.ouvert = true
    etat.reglages = { ...REGLAGES, frais_encaissement_moov_pct: '' }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const r = await GET(new Request(url()))
    warn.mockRestore()
    expect(r.status).toBe(409)
    const d = (await r.json()) as Record<string, unknown>
    expect(d).toEqual({ error: 'Le paiement mobile money est indisponible pour le moment. Aucun montant n’est demandé.' })
    expect(etat.appels).toEqual([])
    expect((await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })).status).toBe(409)
    expect(etat.appels).not.toContain('encaisser')
  })
  it('allumé : POST ouvre l’encaissement et rend une vue SANS le rattachement interne', async () => {
    etat.ouvert = true
    const r = await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })
    expect(r.status).toBe(201)
    const d = (await r.json()) as Record<string, unknown>
    expect(d).toEqual({ encaissement: 'col_1', etat: 'en_attente', montant: 14000, devise: 'XAF', test: true, action: { type: 'approuver', message: 'Entrez votre PIN', ussd: '*211#' }, echec: null })
    expect(d.rattachement).toBeUndefined()
  })
  it('DOUBLE PAIEMENT · une demande en cours pour cette appli : POST → 409 avec la phrase, AUCUN encaissement', async () => {
    etat.ouvert = true
    etat.ouverts = [{ id: 'col_0', etat: 'en_attente', creeLeMs: Date.now() - 2 * 60_000 }]
    const r = await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })
    expect(r.status).toBe(409)
    const d = (await r.json()) as { error: string; code: string }
    expect(d.code).toBe('paiement_en_cours')
    expect(d.error).toMatch(/^Un paiement est déjà en cours pour cette application : validez-le sur votre téléphone, ou attendez [0-9]+ min avant d’en demander un autre\.$/u)
    expect(etat.appels).toEqual(['encaissementsDe'])
  })
  it('L3 · le RÉEL pour le seul compte du propriétaire, et seulement avec les TROIS conditions', async () => {
    etat.ouvert = true
    const regime = async () => { etat.modes = []; const d = (await (await GET(new Request(url()))).json()) as { test: boolean }; return [etat.modes[0], d.test] }
    // Aucune condition : test.
    expect(await regime()).toEqual(['test', true])
    // Le compte seul : test.
    etat.email = 'contact@deribfy.com'
    expect(await regime()).toEqual(['test', true])
    // + la clé live : encore test (le réglage ne le nomme pas).
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_abc')
    expect(await regime()).toEqual(['test', true])
    // « tous » + clé live : réel pour ce compte…
    etat.reglages = { ...REGLAGES, mobile_money: 'tous' }
    expect(await regime()).toEqual(['reel', false])
    // … et pour n'importe quel autre compte.
    etat.email = 'abbas@x.com'
    expect(await regime()).toEqual(['reel', false])
    etat.email = 'contact@deribfy.com'
    // Les trois : réel.
    etat.reglages = { ...REGLAGES, mobile_money: 'abbas@x.com, Contact@Deribfy.com' }
    expect(await regime()).toEqual(['reel', false])
    // Un autre compte, nommé dans le réglage, avec la clé : test.
    etat.email = 'abbas@x.com'
    expect(await regime()).toEqual(['test', true])
    // Une clé de test posée comme clé live : test.
    etat.email = 'contact@deribfy.com'
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_test_abc')
    expect(await regime()).toEqual(['test', true])
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
