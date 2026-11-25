/**
 * LES SITES EN MOBILE MONEY (lot L5, 2026-11-25) — le serveur.
 *   · le prix : Vitrine 6 000 net → 7 000, Boutique 9 000 net → 10 500 ; jamais le dropshipping ;
 *   · l'avis d'un site → enregistrer_paiement_site (en ligne, échéance), rien de publié par le webhook ;
 *   · l'ouverture prend le verrou du SITE ; les routes ; l'activation à la main ; le remboursement refusé ;
 *   · le rappel au propriétaire (3 jours avant, puis après).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({
  rpc: [] as [string, Record<string, unknown>][],
  reponse: { data: { statut: 'enregistre' }, error: null } as { data: unknown; error: { message: string } | null },
  reglages: {} as Record<string, string> | null,
  site: { id: 's1', mode: 1, owner_id: 'u1', archived_at: null, slug: 'ma-vitrine', published: false, subscription_status: null } as Record<string, unknown>,
  viaAdmin: false,
  mm: true,
  encaissees: [] as Record<string, unknown>[],
  listees: [] as [string, string | undefined][],
  ouvertures: [] as Record<string, unknown>[],
  abonnement: null as null | { paye_jusqu_au: string },
}))
const REGLAGES = {
  prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5', frais_reversement_pct: '3.5',
  frais_retrait_pct: '4', arrondi_frais_xaf: '100', lot_prix_xaf: '3000', prix_site_vitrine_xaf: '6000', prix_site_boutique_xaf: '9000',
}
vi.mock('server-only', () => ({}))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => etat.reglages }))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async () => etat.mm }))
vi.mock('@/lib/auth/require-site-owner', () => ({
  requireSiteOwner: async () => ({ ok: true, site: etat.site, email: 'client@exemple.td', viaAdmin: etat.viaAdmin }),
}))
vi.mock('@/lib/payments/mobile-money/demandes', () => ({
  masquer: (t: string) => t,
  registreDemandes: {
    ouvrir: async (o: Record<string, unknown>) => { etat.ouvertures.push(o); return { issue: 'ouverte', id: 'd1' } },
    noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined, aRattraper: async () => [], lire: async () => null, marquerActivee: async () => undefined,
  },
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return { supabaseAdmin: {
    from: creerFrom({
      sites: { reponse: () => ({ data: { mode: etat.site.mode }, error: null }) },
      site_abonnements: { reponse: () => ({ data: etat.abonnement, error: null }) },
    }, journalVierge()),
    rpc: async (n: string, p: Record<string, unknown>) => { etat.rpc.push([n, p]); return etat.reponse },
  } }
})
vi.mock('@/lib/payments/mobile-money/fournisseur', () => ({
  fournisseurMobileMoney: () => ({
    nom: 'monerails', operateurs: async () => [{ code: 'AIRTEL', nom: 'Airtel Money', validation: 'approbation' }, { code: 'MOOV', nom: 'Moov Money', validation: 'approbation' }],
    encaissementsDe: async (id: string, type?: string) => { etat.listees.push([id, type]); return [] },
    encaisser: async (d: Record<string, unknown>) => { etat.encaissees.push(d); return { id: 'c1', etat: 'en_attente', montant: d.montant, devise: 'XAF', test: true, action: null, echec: null, rattachement: d.rattachement } },
    lire: async () => ({}), autoriser: async () => ({}), verifierAvis: () => null,
  }),
}))

import { ouvrirEncaissementSite, prixNetSitePourMode, traiterAvis } from '@/lib/payments/mobile-money/encaissement'
import { prixMobileMoney, tarifDepuisReglages } from '@/lib/payments/mobile-money/frais'
import { versEncaissement } from '@/lib/payments/mobile-money/monerails'
import { activerALaMain } from '@/lib/payments/mobile-money/activation-main'
import { PHRASE_REMBOURSEMENT_SITE, rembourserALaMain } from '@/lib/payments/mobile-money/remboursement'
import { produitDuMode, rappelDe, PHRASE_SITE_CARTE_SEULEMENT } from '@/lib/payments/site-mobile-money'
import { GET as MM, POST as MM_POST } from '@/app/api/sites/[slug]/mobile-money/route'
import { GET as PUBLICATION } from '@/app/api/sites/[slug]/publication/route'
import type { AvisVerifie, Encaissement } from '@/lib/payments/mobile-money/types'

beforeEach(() => {
  vi.unstubAllEnvs(); vi.stubEnv('STRIPE_PRICE_VITRINE', 'price_v'); vi.stubEnv('STRIPE_PRICE_BOUTIQUE', 'price_b'); vi.stubEnv('STRIPE_PRICE_DROPSHIPPING', 'price_d')
  etat.rpc = []; etat.reponse = { data: { statut: 'enregistre' }, error: null }; etat.reglages = { ...REGLAGES }
  etat.site = { id: 's1', mode: 1, owner_id: 'u1', archived_at: null, slug: 'ma-vitrine', published: false, subscription_status: null }
  etat.viaAdmin = false; etat.mm = true; etat.encaissees = []; etat.listees = []; etat.ouvertures = []; etat.abonnement = null
})

describe('le calcul (montré au propriétaire)', () => {
  it('Vitrine 6 000 net → 7 000 FCFA ; Boutique 9 000 net → 10 500 FCFA ; formule de l’appli', () => {
    const t = tarifDepuisReglages(REGLAGES)
    if (!t.ok) throw new Error('tarif')
    expect(prixMobileMoney(t.tarif, 6000)).toEqual({ prix: 6000, frais: 1000, total: 7000 })
    expect(prixMobileMoney(t.tarif, 9000)).toEqual({ prix: 9000, frais: 1500, total: 10500 })
    expect(6000 / 0.96 * 1.035 / 0.93).toBeCloseTo(6955.65, 2)
    expect(9000 / 0.96 * 1.035 / 0.93).toBeCloseTo(10433.47, 2)
  })
  it('le prix NET par type ; le dropshipping n’en a pas ; un prix non réglé non plus', async () => {
    expect(await prixNetSitePourMode(1)).toBe(6000)
    expect(await prixNetSitePourMode(2)).toBe(9000)
    expect(await prixNetSitePourMode(3)).toBeNull()
    etat.reglages = { ...REGLAGES, prix_site_vitrine_xaf: '' }
    expect(await prixNetSitePourMode(1)).toBeNull()
  })
  it('produit d’un type ; rappel 3 jours avant, puis après', () => {
    expect([1, 2, 3, 9].map(produitDuMode)).toEqual(['vitrine', 'boutique', 'dropshipping', null])
    const now = Date.parse('2026-12-10T12:00:00Z')
    expect(rappelDe(null, now)).toBeNull()
    expect(rappelDe('2026-12-20T12:00:00Z', now)).toBeNull()
    expect(rappelDe('2026-12-13T12:00:00Z', now)).toBe('bientot')
    expect(rappelDe('2026-12-13T12:00:01Z', now), 'plus de 3 jours').toBeNull()
    expect(rappelDe('2026-12-10T11:59:59Z', now)).toBe('echu')
  })
})

describe('l’avis d’un SITE', () => {
  const ENC: Encaissement = { id: 'c-site', etat: 'reussi', montant: 7000, devise: 'XAF', operateur: 'AIRTEL', test: false, action: null, rattachement: { app: null, site: 's1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 7000 }, echec: null }
  const avis = (e: Partial<Encaissement> = {}): AvisVerifie => ({ id: 'evt', type: 'encaissement_reussi', encaissement: { ...ENC, ...e } })
  const REEL = { reelPermis: async () => true }
  it('7 000 pour une Vitrine → enregistrer_paiement_site (frais 1 000), issue avec le site', async () => {
    expect(await traiterAvis(avis(), 'monerails', REEL)).toEqual({ issue: 'enregistre', site: 's1', proprietaire: 'u1', objet: 'abonnement' })
    expect(etat.rpc).toEqual([['enregistrer_paiement_site', expect.objectContaining({ p_site: 's1', p_owner: 'u1', p_montant: 7000, p_frais: 1000, p_reference: 'c-site', p_devise: 'XAF' })]])
  })
  it('une Boutique attend 10 500 : 7 000 refusé, rien n’est écrit', async () => {
    etat.site = { ...etat.site, mode: 2 }
    const r = await traiterAvis(avis(), 'monerails', REEL)
    expect(r).toMatchObject({ issue: 'refuse' })
    expect((r as { raison: string }).raison).toContain('attendu 10500')
    expect(etat.rpc).toEqual([])
  })
  it('dropshipping : refusé (carte seulement), rien n’est écrit', async () => {
    etat.site = { ...etat.site, mode: 3 }
    expect(await traiterAvis(avis(), 'monerails', REEL)).toMatchObject({ issue: 'refuse' })
    expect(etat.rpc).toEqual([])
  })
  it('test : vérifié, RIEN n’est écrit', async () => {
    expect(await traiterAvis(avis({ test: true }), 'monerails', REEL)).toMatchObject({ issue: 'test_verifie', site: 's1' })
    expect(etat.rpc).toEqual([])
  })
  it('refus DÉFINITIF de la base (compte étranger) → refuse ; erreur passagère → erreur (le prestataire redonne)', async () => {
    etat.reponse = { data: null, error: { message: 'PAIEMENT_SITE_ETRANGER: x' } }
    expect(await traiterAvis(avis(), 'monerails', REEL)).toMatchObject({ issue: 'refuse' })
    etat.reponse = { data: null, error: { message: 'connexion perdue' } }
    expect(await traiterAvis(avis(), 'monerails', REEL)).toMatchObject({ issue: 'erreur' })
  })
})

describe('ouvrir l’encaissement d’un site', () => {
  it('le prix du site, le verrou du SITE, la liste du SITE, marqué site', async () => {
    const { fournisseurMobileMoney } = await import('@/lib/payments/mobile-money/fournisseur')
    await ouvrirEncaissementSite({ site: 's1', proprietaire: 'u1', operateur: 'MOOV', telephone: '66000001', nomClient: 'Awa', prixNet: 6000 }, fournisseurMobileMoney())
    expect(etat.ouvertures[0]).toMatchObject({ site: 's1', montant: 7000, prix: 6000, frais: 1000 })
    expect(etat.listees).toEqual([['s1', 'site']])
    expect(etat.encaissees[0]).toMatchObject({ montant: 7000, description: 'Deribfy — abonnement d’un site', rattachement: { app: null, site: 's1', objet: 'abonnement' } })
  })
})

describe('les métadonnées MoneRails : une cible, jamais deux', () => {
  const col = (m: Record<string, string>) => ({ id: 'c', object: 'collection', status: 'succeeded', amount: 7000, currency: 'XAF', operator: 'AIRTEL', livemode: false, metadata: { deribfy_proprietaire: 'u1', deribfy_objet: 'abonnement', ...m } })
  it('un site ; une appli ; deux cibles ou aucune → pas un paiement Deribfy ; un lot de site non plus', () => {
    expect(versEncaissement(col({ deribfy_site: 's1' })).rattachement).toMatchObject({ app: null, site: 's1' })
    expect(versEncaissement(col({ deribfy_app: 'a1' })).rattachement).toMatchObject({ app: 'a1', site: null })
    expect(versEncaissement(col({ deribfy_site: 's1', deribfy_app: 'a1' })).rattachement).toBeNull()
    expect(versEncaissement(col({})).rattachement).toBeNull()
    expect(versEncaissement(col({ deribfy_site: 's1', deribfy_objet: 'lot' })).rattachement).toBeNull()
  })
})

describe('les routes d’un site', () => {
  const req = (u: string, m = 'GET', corps?: unknown) => new Request(`https://www.deribfy.com${u}`, { method: m, headers: { Authorization: 'Bearer x' }, body: corps === undefined ? undefined : JSON.stringify(corps) })
  const ctx = { params: Promise.resolve({ slug: 'ma-vitrine' }) }
  it('GET mobile money : 7 000 pour une Vitrine, 10 500 pour une Boutique', async () => {
    expect(((await (await MM(req('/api/sites/ma-vitrine/mobile-money'), ctx)).json()) as { montant: number }).montant).toBe(7000)
    etat.site = { ...etat.site, mode: 2 }
    expect(((await (await MM(req('/api/sites/ma-vitrine/mobile-money'), ctx)).json()) as { montant: number }).montant).toBe(10500)
  })
  it('dropshipping : 403 « carte seulement », le prestataire n’est pas appelé', async () => {
    etat.site = { ...etat.site, mode: 3 }
    const r = await MM(req('/api/sites/ma-vitrine/mobile-money'), ctx)
    expect(r.status).toBe(403)
    expect(((await r.json()) as { error: string }).error).toBe(PHRASE_SITE_CARTE_SEULEMENT)
  })
  it('un administrateur sur le site d’autrui : 403 (seul le propriétaire paie)', async () => {
    etat.viaAdmin = true
    expect((await MM(req('/api/sites/ma-vitrine/mobile-money'), ctx)).status).toBe(403)
  })
  it('POST : la demande part au prix du site, marquée site', async () => {
    const r = await MM_POST(req('/api/sites/ma-vitrine/mobile-money', 'POST', { operateur: 'AIRTEL', telephone: '66000001', nom: 'Awa' }), ctx)
    expect(r.status).toBe(201)
    expect(etat.encaissees[0]).toMatchObject({ montant: 7000, rattachement: { site: 's1', app: null } })
  })
  it('GET publication : Vitrine → carte ET mobile money ; Dropshipping → carte SEULE ; mobile money fermé → carte seule', async () => {
    const lire = async () => (await (await PUBLICATION(req('/api/sites/ma-vitrine/publication'), ctx)).json()) as { moyens: string[]; lien: string; payeJusquAu: string | null }
    expect(await lire()).toMatchObject({ moyens: ['carte', 'mobile_money'], lien: 'https://ma-vitrine.deribfy.app', payeJusquAu: null })
    etat.site = { ...etat.site, mode: 3 }
    expect((await lire()).moyens).toEqual(['carte'])
    etat.site = { ...etat.site, mode: 1 }; etat.mm = false
    expect((await lire()).moyens).toEqual(['carte'])
  })
  it('GET publication : l’échéance d’un site ENCORE publié par le mobile money', async () => {
    etat.abonnement = { paye_jusqu_au: '2099-01-01T00:00:00Z' }
    etat.site = { ...etat.site, subscription_status: 'mobile_money', published: true }
    expect(await (await PUBLICATION(req('/api/sites/ma-vitrine/publication'), ctx)).json()).toMatchObject({ enLigne: true, payeJusquAu: '2099-01-01T00:00:00Z', rappel: null })
    etat.site = { ...etat.site, subscription_status: 'active' }
    expect(((await (await PUBLICATION(req('/api/sites/ma-vitrine/publication'), ctx)).json()) as { payeJusquAu: unknown }).payeJusquAu, 'passé à Stripe').toBeNull()
  })
})

describe('activation à la main et remboursement d’une demande de site', () => {
  const D = { id: 'd1', etat: 'refusee', test: false, reference: 'c-site', fournisseur: 'monerails', app_id: null, site_id: 's1', owner_id: 'u1', prix: 6000, montant: 7000 }
  it('activation : par enregistrer_paiement_site, jamais le registre des applis', async () => {
    const appli = vi.fn(); const site = vi.fn(async () => ({ data: { statut: 'enregistre' }, error: null }))
    const r = await activerALaMain('d1', 'Youssouf', {
      registre: { lire: async () => D, marquerActivee: async () => undefined } as never,
      fournisseur: { lire: async () => ({ etat: 'reussi', test: false, montant: 7000, rattachement: { objet: 'abonnement' } }) } as never,
      enregistrer: appli, enregistrerSite: site,
    })
    expect(r).toEqual({ ok: true, statut: 'enregistre' })
    expect(appli).not.toHaveBeenCalled()
    expect(site).toHaveBeenCalledWith(expect.objectContaining({ p_site: 's1', p_montant: 7000, p_frais: 1000, p_source: 'manuelle' }))
  })
  it('remboursement d’un site : refusé (409), rien n’est écrit', async () => {
    const annuler = vi.fn()
    const r = await rembourserALaMain({ id: 'd1', par: 'Youssouf', paiementSortant: 'po_123456', montant: 7000 }, { registre: { lire: async () => ({ ...D, etat: 'reussie' }) } as never, annuler })
    expect(r).toEqual({ ok: false, status: 409, erreur: PHRASE_REMBOURSEMENT_SITE })
    expect(annuler).not.toHaveBeenCalled()
  })
})
