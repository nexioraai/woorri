/**
 * LA ROUTE DU FORMULAIRE MOBILE MONEY (2026-11-21) : interrupteur d'abord, appli
 * du compte, et jamais de déclaration de paiement.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
const etat = vi.hoisted(() => ({ ouvert: false, ligne: null as null | Record<string, unknown>, appels: [] as string[], reglages: {} as Record<string, string>, ouverts: [] as unknown[] }))
const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5',
  frais_reversement_pct: '3.5', arrondi_frais_xaf: '100',
}
vi.mock('@/lib/auth/require-authenticated-user', () => ({ requireAuthenticatedUser: () => ({ ok: true, userId: 'u1', email: 'client@exemple.com' }) }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({ [TABLE_GENERATIONS]: { reponse: () => ({ data: etat.ligne, error: null }) } }, journalVierge()) } }
})
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => etat.reglages }))
const ENC = { id: 'col_1', etat: 'en_attente', montant: 13400, devise: 'XAF', operateur: 'AIRTEL', test: true, action: { type: 'approuver', message: 'Entrez votre PIN', ussd: '*211#' }, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 13400 }, echec: null }
vi.mock('@/lib/payments/mobile-money/fournisseur', () => ({
  fournisseurMobileMoney: () => ({
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
beforeEach(() => { etat.ouvert = false; etat.ligne = { id: 'a1', statut: 'livree' }; etat.appels = []; etat.reglages = { ...REGLAGES }; etat.ouverts = [] })

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
  it('FRAIS · GET rend, par opérateur, le prix, les frais et le total ; un opérateur sans taux n’est pas proposé', async () => {
    etat.ouvert = true
    expect(await (await GET(new Request(url()))).json()).toEqual({ prix: 12000, devise: 'XAF', operateurs: [
      { code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'], prix: 12000, frais: 1400, total: 13400 },
      { code: 'MOOV', nom: 'Moov Money', validation: ['pin'], prix: 12000, frais: 1100, total: 13100 },
    ] })
  })
  it('FRAIS · un réglage manquant : 409 + phrase claire, AUCUN montant rendu, le prestataire n’est pas appelé', async () => {
    etat.ouvert = true
    etat.reglages = { ...REGLAGES, frais_encaissement_moov_pct: '' }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const r = await GET(new Request(url()))
    warn.mockRestore()
    expect(r.status).toBe(409)
    const d = (await r.json()) as Record<string, unknown>
    expect(d).toEqual({ error: 'Le paiement mobile money est indisponible pour le moment : son prix ou ses frais ne sont pas réglés. Aucun montant n’est demandé.' })
    expect(etat.appels).toEqual([])
    expect((await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })).status).toBe(409)
    expect(etat.appels).not.toContain('encaisser')
  })
  it('allumé : POST ouvre l’encaissement et rend une vue SANS le rattachement interne', async () => {
    etat.ouvert = true
    const r = await poster({ operateur: 'AIRTEL', telephone: '66000000', nom: 'Awa' })
    expect(r.status).toBe(201)
    const d = (await r.json()) as Record<string, unknown>
    expect(d).toEqual({ encaissement: 'col_1', etat: 'en_attente', montant: 13400, devise: 'XAF', test: true, action: { type: 'approuver', message: 'Entrez votre PIN', ussd: '*211#' }, echec: null })
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
