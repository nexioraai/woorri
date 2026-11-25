/**
 * MOBILE MONEY — PRIX UNIQUE, NUMÉRO MASQUÉ, REMBOURSEMENT, DROPSHIPPING, RÉEL LIMITÉ (2026-11-23).
 *
 * ① le réel pour le SEUL compte du propriétaire, et seulement avec les trois
 *    conditions (compte, clé live, réglage qui le nomme) ;
 * ② le numéro est masqué PAR LE REGISTRE avant toute écriture, avec la même
 *    règle que la base ;
 * ③ le remboursement écrit, il n'envoie RIEN ;
 * ④ le dropshipping : carte seulement ;
 * ⑤ le rattrapage et l'activation relisent avec la clé de LEUR mode.
 *
 * Ce que ce fichier NE PEUT PAS voir : la vraie API MoneRails, la vraie base
 * (les fonctions SQL sont prouvées sur Postgres jetable, à part).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const etat = vi.hoisted(() => ({
  rpc: [] as [string, Record<string, unknown>][],
  email: null as string | null,
  reglages: {} as Record<string, string>,
  modes: [] as string[],
}))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: async (n: string, p: Record<string, unknown>) => { etat.rpc.push([n, p]); return { data: { statut: 'ouverte', id: 'd1' }, error: null } },
    auth: { admin: { getUserById: async () => ({ data: { user: etat.email === null ? null : { email: etat.email } }, error: null }) } },
  },
}))
vi.mock('@/lib/apps/quota', () => ({ lireReglagesTexte: async () => etat.reglages }))
vi.mock('@/lib/payments/interrupteur', () => ({ interrupteurOuvert: async () => false }))
vi.mock('@/lib/alertes', () => ({ alerter: async () => 'alerte' }))
import { COMPTES_REEL, cleDuRegime, decideRegime, reglageNommeLeCourriel, reglageOuvreATous } from '../regime'
import { estMasque, FORME_MASQUEE, masquePourEcrire, masquer, registreDemandes, type DemandeEnBase, type RegistreDemandes } from '../demandes'
import { regimeDuCompte, reelPermisPourProprietaire } from '../encaissement'
import { FORME_PAIEMENT_SORTANT, rembourserALaMain } from '../remboursement'
import { rattraper } from '../rattrapage'
import { mobileMoneyPermis, moyensDePaiement } from '../../moyens-par-produit'
import type { Encaissement, FournisseurMobileMoney } from '../types'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const lire = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
beforeEach(() => { etat.rpc = []; etat.email = null; etat.reglages = {}; etat.modes = [] })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('① L3 · le réel pour le seul compte du propriétaire', () => {
  const PROPRIO = 'contact@deribfy.com'
  it('le compte permis est ÉCRIT : contact@deribfy.com, et lui seul', () => {
    expect(COMPTES_REEL).toEqual([PROPRIO])
  })
  it('les TROIS conditions ensemble → réel ; une seule manque → test', () => {
    const ok = { email: PROPRIO, cleLive: 'mr_live_x', reglage: PROPRIO }
    expect(decideRegime(ok)).toBe('reel')
    expect(decideRegime({ ...ok, email: 'Contact@Deribfy.com ' }), 'la casse ne compte pas').toBe('reel')
    expect(decideRegime({ ...ok, email: 'autre@x.com', reglage: 'autre@x.com' })).toBe('test')
    expect(decideRegime({ ...ok, email: null })).toBe('test')
    expect(decideRegime({ ...ok, cleLive: undefined })).toBe('test')
    expect(decideRegime({ ...ok, cleLive: '' })).toBe('test')
    expect(decideRegime({ ...ok, cleLive: 'mr_test_x' }), 'une clé de test posée comme clé live').toBe('test')
    expect(decideRegime({ ...ok, reglage: null })).toBe('test')
    expect(decideRegime({ ...ok, reglage: '' })).toBe('test')
    expect(decideRegime({ ...ok, reglage: 'tous' }), '« tous » ouvre le réel (clé live présente)').toBe('reel')
    expect(decideRegime({ ...ok, reglage: 'contact@deribfy.co' }), 'un courriel voisin').toBe('test')
    expect(decideRegime({ ...ok, reglage: 'a@b.c, CONTACT@deribfy.com' })).toBe('reel')
  })
  it('« tous » + clé live → TOUS les comptes en réel ; sans clé live ou sans compte → test', () => {
    const tous = { email: 'abbas@x.com', cleLive: 'mr_live_x', reglage: 'tous' }
    expect(decideRegime(tous)).toBe('reel')
    expect(decideRegime({ ...tous, reglage: ' TOUS ' }), 'casse et espaces ignorés').toBe('reel')
    expect(decideRegime({ ...tous, cleLive: undefined })).toBe('test')
    expect(decideRegime({ ...tous, cleLive: '' })).toBe('test')
    expect(decideRegime({ ...tous, cleLive: 'mr_test_x' }), 'une clé de test posée comme clé live').toBe('test')
    expect(decideRegime({ ...tous, email: null }), 'personne de connecté').toBe('test')
    expect(decideRegime({ ...tous, reglage: 'tous les comptes' }), 'seul « tous » exactement').toBe('test')
    expect(decideRegime({ ...tous, reglage: '' }), 'vide : personne en réel').toBe('test')
    expect(decideRegime({ ...tous, reglage: null })).toBe('test')
    expect(decideRegime({ ...tous, reglage: 'contact@deribfy.com' }), 'mon courriel seul : un autre reste en test').toBe('test')
    expect(reglageOuvreATous('tous')).toBe(true)
    expect(reglageOuvreATous('tous,abbas@x.com')).toBe(false)
  })
  it('le réglage doit NOMMER le courriel : « tous » ou un identifiant de compte ne suffisent pas', () => {
    expect(reglageNommeLeCourriel('tous', PROPRIO)).toBe(false)
    expect(reglageNommeLeCourriel('5f0c9a1e-0000-0000-0000-000000000000', PROPRIO)).toBe(false)
    expect(reglageNommeLeCourriel(` ${PROPRIO} `, PROPRIO)).toBe(true)
    expect(reglageNommeLeCourriel(PROPRIO, '')).toBe(false)
  })
  it('la clé du mode : test = mr_test_, réel = mr_live_ ; jamais l’une pour l’autre', () => {
    expect(cleDuRegime('test', ' mr_test_a ')).toBe('mr_test_a')
    expect(cleDuRegime('test', 'mr_live_a')).toBeNull()
    expect(cleDuRegime('reel', 'mr_live_a')).toBe('mr_live_a')
    expect(cleDuRegime('reel', 'mr_test_a')).toBeNull()
    expect(cleDuRegime('reel', undefined)).toBeNull()
  })
  it('regimeDuCompte lit le réglage `mobile_money` et la clé live de l’environnement', async () => {
    etat.reglages = { mobile_money: PROPRIO }
    expect(await regimeDuCompte(PROPRIO)).toBe('test')
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_abc')
    expect(await regimeDuCompte(PROPRIO)).toBe('reel')
    expect(await regimeDuCompte('client@x.com')).toBe('test')
    expect(await regimeDuCompte(null)).toBe('test')
  })
  it('un avis RÉEL : le courriel du propriétaire est relu par son identifiant, jamais pris dans l’avis', async () => {
    vi.stubEnv('MONERAILS_CLE_LIVE', 'mr_live_abc')
    etat.reglages = { mobile_money: PROPRIO }
    etat.email = PROPRIO
    expect(await reelPermisPourProprietaire('u1')).toBe(true)
    etat.email = 'client@x.com'
    expect(await reelPermisPourProprietaire('u1')).toBe(false)
    etat.email = null
    expect(await reelPermisPourProprietaire('u1')).toBe(false)
  })
})

describe('② le numéro vraiment masqué', () => {
  it('la forme masquée : au plus 3 chiffres, AU MOINS 4 points, au plus 2 chiffres', () => {
    for (const ok of ['235••••••01', '••••••', '••••', '23••••5']) expect(estMasque(ok), ok).toBe(true)
    for (const ko of ['23566000001', '66000001', '235•6600000', '235•••01', '2356••••••01', '235••••••012', '', 'abc••••']) expect(estMasque(ko), ko).toBe(false)
  })
  it('masquer : 11 chiffres → 235••••••01 ; trop court pour cacher 4 chiffres → tout masqué ; toujours une forme masquée', () => {
    expect(masquer('23566000001')).toBe('235••••••01')
    expect(masquer('+235 66 00 00 01')).toBe('235••••••01')
    expect(masquer('66000001')).toBe('••••••')
    expect(masquer('12')).toBe('••••••')
    for (const n of ['1', '123456', '12345678', '123456789', '23566000001', '123456789012345']) expect(estMasque(masquer(n)), n).toBe(true)
  })
  it('le REGISTRE masque lui-même : le numéro entier entre, seul le masque part en base', async () => {
    await registreDemandes.ouvrir({ fournisseur: 'monerails', app: 'a1', proprietaire: 'u1', operateur: 'AIRTEL', telephone: '23566000001', montant: 14000, prix: 12000, frais: 2000, attenteS: 600 })
    expect(etat.rpc).toHaveLength(1)
    expect(etat.rpc[0]?.[1].p_telephone_masque).toBe('235••••••01')
    expect(JSON.stringify(etat.rpc)).not.toMatch(/66000001|23566000001/u)
  })
  it('masquePourEcrire refuse ce qui ne serait pas masqué (dernier rempart avant la base)', () => {
    expect(masquePourEcrire('23566000001')).toBe('235••••••01')
    // Un masquage défaillant (il rendrait le numéro tel quel) : l'écriture est REFUSÉE.
    expect(() => masquePourEcrire('23566000001', (t) => t)).toThrow('numéro non masqué : écriture refusée')
    expect(() => masquePourEcrire('23566000001', (t) => t.slice(0, 9) + '•')).toThrow()
  })
  it('LA MÊME RÈGLE QUE LA BASE : le motif du code est celui de la contrainte SQL, au caractère près', () => {
    const sql = lire('supabase/sql/mobile_money_telephone_masque.sql')
    const enBase = /check \(telephone_masque ~ '([^']+)'\)/u.exec(sql)?.[1]
    expect(enBase).toBe(FORME_MASQUEE.source)
    // L'ancienne contrainte acceptait un numéro en clair : elle n'est plus posée (hors annulation).
    expect(sql).not.toMatch(motifTexte("'^[0-9•]{6,15}$'"))
  })
  it('l’encaissement passe le numéro ENTIER au registre (qui masque) — plus de masque fait ailleurs', () => {
    const src = lire('src/lib/payments/mobile-money/encaissement.ts')
    expect(src).toMatch(motifTexte('telephone: tel, montant'))
    expect(src).not.toMatch(/telephoneMasque|masquer\(/u)
  })
})

describe('③ le remboursement : il écrit, il n’envoie RIEN', () => {
  const demande = (x: Partial<DemandeEnBase> = {}): DemandeEnBase => ({
    id: 'd1', cree_le: '2026-11-23T10:00:00Z', fournisseur: 'monerails', app_id: 'a1', owner_id: 'u1', operateur: 'AIRTEL', telephone_masque: '235••••••01',
    montant: 14000, prix: 12000, frais: 2000, reference: 'col_1', test: false, etat: 'reussie', ferme_le: null, avis_recu_le: null, decision: null, raison: null,
    active_par: null, active_le: null, ...x,
  })
  const registre = (d: DemandeEnBase | null): RegistreDemandes => ({
    ouvrir: async () => { throw new Error('x') }, noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined,
    aRattraper: async () => [], lire: async () => d, marquerActivee: async () => undefined,
  })
  const annulerOk = (statut = 'annule', derniere = true) => vi.fn(async (_p: Record<string, unknown>) => ({ data: { statut, derniere }, error: null }))
  const E = { id: 'd1', par: 'issayamiyoussouf@gmail.com', paiementSortant: 'po_123abc', montant: 14000 }
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('AUCUN appel réseau ne doit partir d’un remboursement') })) })

  it('une demande payée, réelle : la ligne « annulation » est demandée avec la référence du paiement sortant et le nom', async () => {
    const annuler = annulerOk()
    expect(await rembourserALaMain(E, { registre: registre(demande()), annuler })).toEqual({ ok: true, effet: 'annule', derniere: true, objet: 'abonnement' })
    expect(annuler.mock.calls[0]?.[0]).toEqual({ p_fournisseur: 'monerails', p_reference: 'col_1', p_payout: 'po_123abc', p_montant: 14000, p_par: 'issayamiyoussouf@gmail.com' })
    // Une demande activée à la main se rembourse aussi.
    expect((await rembourserALaMain(E, { registre: registre(demande({ etat: 'activee_main' })), annuler })).ok).toBe(true)
    // Le même remboursement redemandé : « déjà annulé », sans erreur.
    expect(await rembourserALaMain(E, { registre: registre(demande()), annuler: annulerOk('deja_annule', false) })).toEqual({ ok: true, effet: 'deja_annule', derniere: false, objet: 'abonnement' })
  })
  it('UN LOT (2026-11-25) : le même geste ; la base dit « lot », l’écran dit « lot retiré du compteur, abonnement intact »', async () => {
    const annuler = vi.fn(async (_p: Record<string, unknown>) => ({ data: { statut: 'annule', derniere: false, objet: 'lot' }, error: null }))
    expect(await rembourserALaMain({ ...E, montant: 3500 }, { registre: registre(demande({ montant: 3500, prix: 3000, frais: 500 })), annuler })).toEqual({ ok: true, effet: 'annule', derniere: false, objet: 'lot' })
    expect(annuler.mock.calls[0]?.[0]).toMatchObject({ p_reference: 'col_1', p_montant: 3500 })
    const page = lire('src/app/admin/mobile-money/page.tsx')
    expect(page).toMatch(motifTexte("${d.objet === 'lot' ? ', lot retiré du compteur, abonnement intact' : ''}"))
    expect(lire('src/app/api/admin/mobile-money/rembourser/route.ts')).toMatch(motifTexte('objet: r.objet'))
  })
  it('jamais un TEST, jamais une demande non payée, jamais sans référence de paiement sortant, jamais au-delà du montant', async () => {
    const annuler = annulerOk()
    expect(await rembourserALaMain(E, { registre: registre(null), annuler })).toMatchObject({ ok: false, status: 404 })
    expect(await rembourserALaMain(E, { registre: registre(demande({ test: true })), annuler })).toMatchObject({ ok: false, status: 409 })
    expect(await rembourserALaMain(E, { registre: registre(demande({ test: null })), annuler })).toMatchObject({ ok: false, status: 409 })
    for (const e of ['ouverte', 'refusee', 'echouee', 'remboursee', 'abandonnee'] as const) {
      expect(await rembourserALaMain(E, { registre: registre(demande({ etat: e })), annuler }), e).toMatchObject({ ok: false, status: 409 })
    }
    for (const s of ['', 'po', 'po 12', 'po_<script>']) {
      expect(await rembourserALaMain({ ...E, paiementSortant: s }, { registre: registre(demande()), annuler }), s).toMatchObject({ ok: false, status: 400 })
    }
    for (const m of [0, -1, 14001, 13999.5, Number.NaN]) {
      expect(await rembourserALaMain({ ...E, montant: m }, { registre: registre(demande()), annuler }), String(m)).toMatchObject({ ok: false, status: 400 })
    }
    expect(annuler).not.toHaveBeenCalled()
  })
  it('le registre ne connaît pas le paiement : rien n’est annulé, et c’est dit ; une erreur du registre remonte', async () => {
    expect(await rembourserALaMain(E, { registre: registre(demande()), annuler: annulerOk('paiement_inconnu') })).toMatchObject({ ok: false, status: 409 })
    expect(await rembourserALaMain(E, { registre: registre(demande()), annuler: async () => ({ data: null, error: { message: 'REMBOURSEMENT_MONTANT' } }) })).toMatchObject({ ok: false, status: 500 })
  })
  it('la forme du paiement sortant est LA MÊME que la base', () => {
    const sql = lire('supabase/sql/mobile_money_remboursement.sql')
    expect(sql).toMatch(motifTexte(`p_payout !~ '${FORME_PAIEMENT_SORTANT.source}'`))
  })
  it('le module de remboursement n’importe AUCUN prestataire (aucun envoi d’argent possible)', () => {
    const src = lire('src/lib/payments/mobile-money/remboursement.ts')
    expect(src).not.toMatch(/from '\.\/(fournisseur|monerails)'|fetch\(/u)
  })
  it('la route est réservée au fondateur (403 sinon), et la page porte le bouton sur une demande payée réelle', () => {
    expect(lire('src/app/api/admin/mobile-money/rembourser/route.ts')).toMatch(motifTexte("if (!estAdmin(garde.email)) return NextResponse.json({ error: 'Réservé au fondateur.' }, { status: 403 })"))
    const page = lire('src/app/admin/mobile-money/page.tsx')
    expect(page).toMatch(motifTexte("(x.etat === 'reussie' || x.etat === 'activee_main') && x.test === false"))
    expect(page).toMatch(motifTexte("fetch('/api/admin/mobile-money/rembourser'"))
  })
})

describe('④ le dropshipping : carte seulement', () => {
  it('la règle : carte partout ; mobile money partout SAUF le dropshipping', () => {
    expect(moyensDePaiement('dropshipping')).toEqual(['carte'])
    expect(mobileMoneyPermis('dropshipping')).toBe(false)
    for (const p of ['vitrine', 'boutique', 'application'] as const) {
      expect(moyensDePaiement(p), p).toEqual(['carte', 'mobile_money'])
      expect(mobileMoneyPermis(p), p).toBe(true)
    }
  })
  it('la route mobile money passe par la règle', () => {
    expect(lire('src/app/api/generateur/mobile-money/route.ts')).toMatch(motifTexte("!mobileMoneyPermis('application')"))
  })
  it('CLIQUET · aucun écran hors de l’atelier n’importe le formulaire mobile money ni n’appelle sa route', () => {
    const fichiers: string[] = []
    const parcourir = (d: string) => {
      for (const n of readdirSync(join(process.cwd(), d))) {
        const p = `${d}/${n}`
        if (n === '__tests__' || n === 'node_modules') continue
        if (statSync(join(process.cwd(), p)).isDirectory()) parcourir(p)
        else if (/\.(tsx?|jsx?)$/u.test(n)) fichiers.push(p)
      }
    }
    parcourir('src/app')
    parcourir('src/components')
    const branches = fichiers.filter((p) => /PayerMobileMoney|\/api\/generateur\/mobile-money/u.test(readFileSync(join(process.cwd(), p), 'utf8')))
    // 2026-11-24 : la fenêtre « Publier » des APPLIS montre le formulaire
    // (atelier et « Mes projets ») — une appli n'est jamais du dropshipping.
    expect(branches.sort()).toEqual([
      'src/app/atelier/[id]/page.tsx',
      'src/components/apps/FenetrePublier.tsx',
      'src/components/atelier/PayerMobileMoney.tsx',
    ])
  })
})

describe('⑤ chaque demande se relit avec la clé de SON mode', () => {
  const ENC: Encaissement = { id: 'col_1', etat: 'en_attente', montant: 14000, devise: 'XAF', operateur: 'AIRTEL', test: false, action: null, rattachement: null, echec: null }
  it('le rattrapage : une demande réelle → le prestataire RÉEL ; une demande de test → le TEST', async () => {
    const vieux = new Date(Date.parse('2026-11-23T12:00:00Z') - 3600_000).toISOString()
    const d = (id: string, test: boolean): DemandeEnBase => ({
      id, cree_le: vieux, fournisseur: 'monerails', app_id: 'a1', owner_id: 'u1', operateur: 'AIRTEL', telephone_masque: '235••••••01',
      montant: 14000, prix: 12000, frais: 2000, reference: `col_${id}`, test, etat: 'ouverte', ferme_le: null, avis_recu_le: null, decision: null, raison: null, active_par: null, active_le: null,
    })
    const reg: RegistreDemandes = {
      ouvrir: async () => { throw new Error('x') }, noterReference: async () => undefined, abandonner: async () => undefined, noterAvis: async () => undefined,
      aRattraper: async () => [d('r', false), d('t', true)], lire: async () => null, marquerActivee: async () => undefined,
    }
    const fournisseurs = await import('../fournisseur')
    const espion = vi.spyOn(fournisseurs, 'fournisseurMobileMoney').mockImplementation((regime = 'test') => {
      etat.modes.push(regime)
      return { nom: 'monerails', lire: async () => ENC } as unknown as FournisseurMobileMoney
    })
    await rattraper({ registre: reg, maintenantMs: Date.parse('2026-11-23T12:00:00Z') })
    espion.mockRestore()
    expect(etat.modes).toEqual(['reel', 'test'])
  })
  it('l’activation à la main relit avec la clé RÉELLE (seul un paiement réel s’active)', () => {
    expect(lire('src/lib/payments/mobile-money/activation-main.ts')).toMatch(motifTexte("fournisseurMobileMoney('reel')"))
  })
})

describe('la page /admin mène au mobile money', () => {
  it('une carte de /admin pointe /admin/mobile-money, et cette page existe', () => {
    // Une carte mise en commentaire ne compte pas : elle n'apparaît pas à l'écran.
    const admin = lire('src/app/admin/page.tsx').replace(/\{\/\*[\s\S]*?\*\/\}/gu, '')
    const cartes = admin.match(/<StatCard\b[^>]*\/>/gu) ?? []
    const carte = cartes.find((c) => c.includes('href="/admin/mobile-money"'))
    expect(carte, 'aucune carte de /admin ne pointe /admin/mobile-money').toBeDefined()
    expect(carte).toMatch(motifTexte('Mobile money'))
    expect(statSync(join(process.cwd(), 'src/app/admin/mobile-money/page.tsx')).isFile()).toBe(true)
  })
})
