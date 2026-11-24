/**
 * MOBILE MONEY — LOTS L1 ET L2 (2026-11-23), en mode test seulement.
 *
 * L1 : la confirmation porte une clé d'idempotence ; le montant entre dans la
 *      clé d'un encaissement ; le VERROU en base refuse une seconde demande
 *      ouverte (la concurrence réelle est prouvée sur Postgres jetable, à part) ;
 *      un avis est traité dans un budget de 8 s.
 * L2 : le rattrapage relit les demandes ouvertes et les règle par le MÊME
 *      chemin qu'un avis ; un avis payé mais refusé est journalisé, alerté,
 *      et activable à la main par le fondateur seul ; tout est lisible dans /admin.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const etat = vi.hoisted(() => ({ rpc: [] as [string, Record<string, unknown>][], reponse: { data: { statut: 'enregistre' }, error: null } as { data: unknown; error: unknown }, admin: true }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { rpc: async (n: string, p: Record<string, unknown>) => { etat.rpc.push([n, p]); return etat.reponse } } }))
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => ({ prix_mensuel_xaf: '12000', frais_encaissement_airtel_pct: '7', frais_encaissement_moov_pct: '5', frais_reversement_pct: '3.5', frais_retrait_pct: '4', arrondi_frais_xaf: '100' }) }))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async () => false }))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
import { cleIdempotence, ouvrirEncaissement, traiterEtNoterAvis } from '../encaissement'
import { cleConfirmation, monerails } from '../monerails'
import { masquePourEcrire, masquer, type DemandeEnBase, type NoteAvis, type RegistreDemandes } from '../demandes'
import { dansLeBudget } from '../budget-avis'
import { rattraper, RATTRAPAGE_MAX_MS } from '../rattrapage'
import { activerALaMain } from '../activation-main'
import type { AvisVerifie, Encaissement, FournisseurMobileMoney } from '../types'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const ENC: Encaissement = { id: 'col_1', etat: 'reussi', montant: 14000, devise: 'XAF', operateur: 'AIRTEL', test: true, action: null, rattachement: { app: 'a1', proprietaire: 'u1', objet: 'abonnement', montantInscrit: 14000 }, echec: null }
const MAINTENANT = Date.parse('2026-11-23T12:00:00Z')

/** Un registre en mémoire, avec le verrou « une ouverte par appli » de l'index unique. */
function registreMemoire(lignes: DemandeEnBase[] = []): RegistreDemandes & { lignes: DemandeEnBase[]; notes: NoteAvis[]; abandons: [string, string][]; references: [string, string, boolean][]; activees: [string, string][] } {
  const notes: NoteAvis[] = []
  const abandons: [string, string][] = []
  const references: [string, string, boolean][] = []
  const activees: [string, string][] = []
  return {
    lignes, notes, abandons, references, activees,
    async ouvrir(o) {
      const ouverte = lignes.find((l) => l.app_id === o.app && l.ferme_le === null)
      if (ouverte !== undefined) return { issue: 'deja_ouverte', id: ouverte.id, creeLe: ouverte.cree_le }
      const id = `d${String(lignes.length + 1)}`
      lignes.push(demandeEnBase({ id, app_id: o.app, montant: o.montant, prix: o.prix, frais: o.frais, operateur: o.operateur, telephone_masque: masquePourEcrire(o.telephone) }))
      return { issue: 'ouverte', id }
    },
    async noterReference(id, reference, test) { references.push([id, reference, test]) },
    async abandonner(id, raison) { abandons.push([id, raison]); const l = lignes.find((x) => x.id === id); if (l !== undefined) Object.assign(l, { ferme_le: 'x', etat: 'abandonnee' }) },
    async noterAvis(n) { notes.push(n) },
    async aRattraper() { return lignes.filter((l) => l.etat === 'ouverte' && l.reference !== null) },
    async lire(id) { return lignes.find((l) => l.id === id) ?? null },
    async marquerActivee(id, par) { activees.push([id, par]) },
  }
}
function demandeEnBase(x: Partial<DemandeEnBase>): DemandeEnBase {
  return { id: 'd1', cree_le: new Date(MAINTENANT - 60_000).toISOString(), fournisseur: 'monerails', app_id: 'a1', owner_id: 'u1', operateur: 'AIRTEL', telephone_masque: '235••••••00', montant: 14000, prix: 12000, frais: 2000, reference: null, test: true, etat: 'ouverte', ferme_le: null, avis_recu_le: null, decision: null, raison: null, active_par: null, active_le: null, ...x }
}
function fournisseur(o: { encaisser?: () => Promise<Encaissement>; liste?: () => Promise<never[]>; lire?: (id: string) => Promise<Encaissement> } = {}): FournisseurMobileMoney & { encaissements: number } {
  const f = {
    nom: 'monerails' as const, encaissements: 0,
    operateurs: async () => [], autoriser: async () => ENC, verifierAvis: () => null,
    encaissementsDe: o.liste ?? (async () => []),
    encaisser: async () => { f.encaissements += 1; return o.encaisser !== undefined ? o.encaisser() : { ...ENC, etat: 'en_attente' as const } },
    lire: o.lire ?? (async () => ENC),
  }
  return f
}
const demande = { app: 'a1', proprietaire: 'u1', operateur: 'AIRTEL', telephone: '66000000', nomClient: 'Awa' }

beforeEach(() => { etat.rpc = []; etat.reponse = { data: { statut: 'enregistre' }, error: null } })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('L1 · les clés d’idempotence', () => {
  it('le MONTANT entre dans la clé : un prix changé dans la fenêtre donne une autre clé (plus de 422)', () => {
    expect(cleIdempotence('a', '2356', 'AIRTEL', 13400, MAINTENANT)).not.toBe(cleIdempotence('a', '2356', 'AIRTEL', 13500, MAINTENANT))
    expect(cleIdempotence('a', '2356', 'AIRTEL', 13400, MAINTENANT)).toBe(cleIdempotence('a', '2356', 'AIRTEL', 13400, MAINTENANT + 60_000))
  })
  it('la confirmation par code porte une clé : même demande + même code = même clé', async () => {
    expect(cleConfirmation('c9', '1234')).toBe(cleConfirmation('c9', '1234'))
    expect(cleConfirmation('c9', '1234')).not.toBe(cleConfirmation('c9', '4321'))
    expect(cleConfirmation('c9', '1234')).toMatch(/^[0-9a-f]{48}$/u)
    vi.stubEnv('MONERAILS_CLE_TEST', 'mr_test_abc')
    const appels: RequestInit[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => { appels.push(init); return new Response(JSON.stringify({ id: 'c9', object: 'collection', status: 'processing', amount: 13400, currency: 'XAF', livemode: false }), { status: 200 }) }))
    await monerails.autoriser('c9', '1234')
    expect((appels[0]?.headers as Record<string, string>)['Idempotency-Key']).toBe(cleConfirmation('c9', '1234'))
  })
})

describe('L1 · le verrou en base', () => {
  it('une demande ouverte : la seconde (autre numéro) est REFUSÉE, et le prestataire n’est jamais appelé', async () => {
    const r = registreMemoire(); const f = fournisseur()
    await ouvrirEncaissement(demande, f, MAINTENANT, r)
    await expect(ouvrirEncaissement({ ...demande, telephone: '66111111', operateur: 'MOOV' }, f, MAINTENANT, r)).rejects.toMatchObject({ status: 409, code: 'paiement_en_cours' })
    expect(f.encaissements).toBe(1)
  })
  it('la demande partie : sa référence est notée, le numéro est MASQUÉ dans la table', async () => {
    const r = registreMemoire()
    await ouvrirEncaissement(demande, fournisseur(), MAINTENANT, r)
    expect(r.references).toEqual([['d1', 'col_1', true]])
    expect(r.lignes[0]?.telephone_masque).toBe('235••••••00')
    expect(masquer('23566123456')).toBe('235••••••56')
  })
  it('le prestataire refuse, ou sa liste est illisible : le verrou se LIBÈRE, la raison reste', async () => {
    const r = registreMemoire()
    await expect(ouvrirEncaissement(demande, fournisseur({ encaisser: async () => { throw new Error('refusé') } }), MAINTENANT, r)).rejects.toThrow()
    expect(r.abandons.map((a) => a[0])).toEqual(['d1'])
    await expect(ouvrirEncaissement(demande, fournisseur({ liste: async () => { throw new Error('hors service') } }), MAINTENANT, r)).rejects.toMatchObject({ status: 503 })
    expect(r.abandons.map((a) => a[0])).toEqual(['d1', 'd2'])
  })
  it('un verrou illisible : REFUS (on ne risque pas un second débit)', async () => {
    const r = { ...registreMemoire(), ouvrir: async () => { throw new Error('base absente') } }
    await expect(ouvrirEncaissement(demande, fournisseur(), MAINTENANT, r)).rejects.toMatchObject({ status: 503, code: 'verrou_illisible' })
  })
})

describe('L1 · moins de 10 s pour répondre à un avis', () => {
  it('au-delà du budget, l’issue est « erreur » (→ 500, le prestataire redonne l’avis)', async () => {
    const lent = new Promise<never>(() => undefined)
    const debut = Date.now()
    expect(await dansLeBudget(lent, 50)).toEqual({ issue: 'erreur', raison: 'traitement au-delà de 50 ms' })
    expect(Date.now() - debut).toBeLessThan(1000)
    expect(await dansLeBudget(Promise.resolve({ issue: 'ignore', raison: 'x' }), 50)).toEqual({ issue: 'ignore', raison: 'x' })
  })
  it('la route d’avis passe par le budget ET le journal', () => {
    const route = readFileSync(join(process.cwd(), 'src/app/api/webhooks/mobile-money/[fournisseur]/route.ts'), 'utf8')
    expect(route).toMatch(motifTexte('await dansLeBudget(traiterEtNoterAvis(avis, f.nom))'))
  })
})

describe('L2 · l’avis journalisé, l’avis payé mais refusé', () => {
  const avis = (e: Partial<Encaissement> = {}, type: AvisVerifie['type'] = 'encaissement_reussi'): AvisVerifie => ({ id: 'evt', type, encaissement: { ...ENC, ...e } })
  it('payé mais montant insuffisant : journal « refusée » + ALERTE (étape paiement)', async () => {
    const r = registreMemoire(); const alerte = vi.fn<(a: { etape: string; sujetId?: string | null }) => Promise<string>>(async () => 'a')
    const issue = await traiterEtNoterAvis(avis({ montant: 13000 }), 'monerails', { registre: r, alerte })
    expect(issue.issue).toBe('refuse')
    expect(r.notes[0]).toMatchObject({ reference: 'col_1', etat: 'refusee', decision: 'refuse', test: true })
    expect(alerte).toHaveBeenCalledTimes(1)
    expect(alerte.mock.calls[0]?.[0]).toMatchObject({ etape: 'paiement', sujetId: 'a1' })
  })
  it('payé sans appli à activer : refusée, alertée', async () => {
    const r = registreMemoire(); const alerte = vi.fn(async () => 'a')
    await traiterEtNoterAvis(avis({ rattachement: null }), 'monerails', { registre: r, alerte })
    expect(r.notes[0]?.etat).toBe('refusee')
    expect(alerte).toHaveBeenCalledTimes(1)
  })
  it('test vérifié : journal « réussie », décision test_verifie, AUCUNE alerte, rien au registre', async () => {
    const r = registreMemoire(); const alerte = vi.fn(async () => 'a')
    await traiterEtNoterAvis(avis(), 'monerails', { registre: r, alerte })
    expect(r.notes[0]).toMatchObject({ etat: 'reussie', decision: 'test_verifie' })
    expect(alerte).not.toHaveBeenCalled()
    expect(etat.rpc).toEqual([])
  })
  it('échec chez le prestataire : « échouée » ; erreur chez nous : rien n’est clos (l’avis reviendra)', async () => {
    const r = registreMemoire()
    await traiterEtNoterAvis(avis({ etat: 'echoue' }, 'encaissement_echoue'), 'monerails', { registre: r })
    expect(r.notes[0]?.etat).toBe('echouee')
    etat.reponse = { data: null, error: { message: 'connexion perdue' } }
    await traiterEtNoterAvis(avis({ test: false }), 'monerails', { registre: r, reelPermis: async () => true })
    expect(r.notes).toHaveLength(1)
  })
})

describe('L2 · le rattrapage des avis perdus', () => {
  it('une demande ouverte, payée chez le prestataire : réglée par le MÊME chemin, avec la MÊME référence', async () => {
    const r = registreMemoire([demandeEnBase({ reference: 'col_1', test: false, cree_le: new Date(MAINTENANT - 3600_000).toISOString() })])
    const bilan = await rattraper({ registre: r, fournisseur: fournisseur({ lire: async () => ({ ...ENC, test: false }) }), maintenantMs: MAINTENANT, traiter: (a, f, o) => traiterEtNoterAvis(a, f, { ...o, reelPermis: async () => true }) })
    expect(bilan.reglees).toEqual([{ reference: 'col_1', issue: 'enregistre' }])
    // LA RÉFÉRENCE DU REGISTRE est celle du prestataire, comme pour un avis :
    // un avis tardif tombe sur `deja_enregistre` — jamais deux activations.
    expect(etat.rpc[0]?.[1]).toMatchObject({ p_reference: 'col_1', p_fournisseur: 'monerails' })
    expect(r.notes[0]).toMatchObject({ reference: 'col_1', etat: 'reussie' })
  })
  it('le même paiement rattrapé deux fois : le registre dit « déjà enregistré » la seconde', async () => {
    const r = registreMemoire([demandeEnBase({ reference: 'col_1', test: false, cree_le: new Date(MAINTENANT - 3600_000).toISOString() })])
    const o = { registre: r, fournisseur: fournisseur({ lire: async () => ({ ...ENC, test: false }) }), maintenantMs: MAINTENANT, traiter: (a: AvisVerifie, f: string, x?: Parameters<typeof traiterEtNoterAvis>[2]) => traiterEtNoterAvis(a, f, { ...x, reelPermis: async () => true }) }
    await rattraper(o)
    etat.reponse = { data: { statut: 'deja_enregistre' }, error: null }
    expect((await rattraper(o)).reglees).toEqual([{ reference: 'col_1', issue: 'deja_enregistre' }])
  })
  it('encore en attente : laissée ouverte ; au-delà de 72 h : abandonnée ; trop récente : pas relue ; illisible : dite', async () => {
    const vieille = demandeEnBase({ id: 'v', reference: 'col_v', cree_le: new Date(MAINTENANT - RATTRAPAGE_MAX_MS - 1000).toISOString() })
    const jeune = demandeEnBase({ id: 'j', reference: 'col_j', cree_le: new Date(MAINTENANT - 3600_000).toISOString() })
    const neuve = demandeEnBase({ id: 'n', reference: 'col_n', cree_le: new Date(MAINTENANT - 30_000).toISOString() })
    const casse = demandeEnBase({ id: 'k', reference: 'col_k', cree_le: new Date(MAINTENANT - 3600_000).toISOString() })
    const r = registreMemoire([vieille, jeune, neuve, casse])
    const lues: string[] = []
    const bilan = await rattraper({ registre: r, maintenantMs: MAINTENANT, fournisseur: fournisseur({ lire: async (id) => { lues.push(id); if (id === 'col_k') throw new Error('panne'); return { ...ENC, id, etat: 'en_attente' } } }) })
    expect(lues).not.toContain('col_n')
    expect(bilan).toMatchObject({ relues: 3, encoreOuvertes: 1, abandonnees: 1, illisibles: [{ reference: 'col_k', erreur: 'panne' }] })
    expect(r.abandons.map((a) => a[0])).toEqual(['v'])
  })
})

describe('L2 · « Activer ce paiement », fondateur seul', () => {
  const refusee = () => demandeEnBase({ id: 'r1', reference: 'col_1', test: false, etat: 'refusee', montant: 14000, prix: 12000 })
  it('une demande refusée, réelle, confirmée par le prestataire : inscrite (manuelle, MÊME référence), et le nom reste', async () => {
    const r = registreMemoire([refusee()]); const enregistrer = vi.fn<(p: Record<string, unknown>) => Promise<{ data: unknown; error: null }>>(async () => ({ data: { statut: 'enregistre' }, error: null }))
    const issue = await activerALaMain('r1', 'issayamiyoussouf@gmail.com', { registre: r, fournisseur: fournisseur({ lire: async () => ({ ...ENC, test: false }) }), enregistrer })
    expect(issue).toEqual({ ok: true, statut: 'enregistre' })
    expect(enregistrer.mock.calls[0]?.[0]).toMatchObject({ p_source: 'manuelle', p_fournisseur: 'monerails', p_reference: 'col_1', p_montant: 14000, p_frais: 2000, p_saisi_par: 'activation-main:issayamiyoussouf@gmail.com' })
    expect(r.activees).toEqual([['r1', 'issayamiyoussouf@gmail.com']])
  })
  it('jamais une demande non refusée, jamais un TEST, jamais sans confirmation du prestataire', async () => {
    const enregistrer = vi.fn(async () => ({ data: null, error: null }))
    const lireOk = fournisseur({ lire: async () => ({ ...ENC, test: false }) })
    expect(await activerALaMain('r1', 'f', { registre: registreMemoire([{ ...refusee(), etat: 'reussie' }]), fournisseur: lireOk, enregistrer })).toMatchObject({ ok: false, status: 409 })
    expect(await activerALaMain('r1', 'f', { registre: registreMemoire([{ ...refusee(), test: true }]), fournisseur: lireOk, enregistrer })).toMatchObject({ ok: false, status: 409 })
    expect(await activerALaMain('r1', 'f', { registre: registreMemoire([refusee()]), fournisseur: fournisseur({ lire: async () => ({ ...ENC, test: false, etat: 'echoue' }) }), enregistrer })).toMatchObject({ ok: false, status: 409 })
    expect(await activerALaMain('zz', 'f', { registre: registreMemoire([refusee()]), fournisseur: lireOk, enregistrer })).toMatchObject({ ok: false, status: 404 })
    expect(enregistrer).not.toHaveBeenCalled()
  })
  it('les routes : réservées au fondateur (403 sinon), la tâche planifiée exige son secret (401)', () => {
    const lire = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
    for (const p of ['src/app/api/admin/mobile-money/route.ts', 'src/app/api/admin/mobile-money/activer/route.ts']) {
      expect(lire(p), p).toMatch(motifTexte("if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })"))
    }
    expect(lire('src/app/api/cron/mobile-money/route.ts')).toMatch(motifTexte("req.headers.get('authorization') !== 'Bearer ' + secret"))
    expect(lire('vercel.json')).toMatch(motifTexte('"path": "/api/cron/mobile-money"'))
  })
})
