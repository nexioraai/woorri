import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'

// ============================================================
// LOT 17 — L'INSCRIPTION DIRECTE.
//
// Décision du propriétaire, 2026-11-10 : pas de courriel de confirmation,
// pas d'examen par la Centrale ; le compte est visible sur le tableau de
// bord. Ce cliquet tient ce qui reste à protéger : le site doit OUVRIR des
// comptes, le rôle « agent » ne se réclame pas, une adresse déjà connue
// n'est JAMAIS reprise, et l'état du compte n'est pas écrit par la route.
// ============================================================

let journal = journalVierge()
let ouvre = true
let siteTrouve: unknown = { id: 'site-1' }
let erreurCompte: unknown = null
let existant: string | null = null
const createUser = vi.fn()
const deleteUser = vi.fn<(id: string) => Promise<object>>(async () => ({}))
const updateUserById = vi.fn(async () => ({}))
const journaliser = vi.fn<(e: unknown) => Promise<void>>(async () => {})

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => creerFrom({
      sites_public: { reponse: () => ({ data: siteTrouve, error: null }) },
      site_comptes: { reponse: () => ({ data: null, error: erreurCompte }) },
    }, journal)(t),
    rpc: async () => ({ data: existant, error: null }),
    auth: { admin: { createUser: (a: unknown) => createUser(a), deleteUser: (id: string) => deleteUser(id), updateUserById: (...a: unknown[]) => updateUserById(...(a as [])) } },
  },
}))
let preuveUserId: string | null = null
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithPassword: async () => ({ data: { user: preuveUserId ? { id: preuveUserId } : null }, error: preuveUserId ? null : { message: 'invalid' } }) } }),
}))
vi.mock('@/app/sites/[slug]/acces/ouvreDesComptes', () => ({ ouvreDesComptes: async () => ouvre }))
vi.mock('@/lib/audit/journaliser', () => ({ journaliser: (e: unknown) => journaliser(e) }))

import { POST } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const BON = { nom: 'Amina Mahamat', organisation: 'Pharma Sahel', role: 'fournisseur', telephone: '+235 66 12 34 56', email: 'Amina@Exemple.td', motDePasse: 'MotDePasse1!' }
const inscrire = (corps: Record<string, unknown> = BON) =>
  POST(new Request('https://x.test/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) }), params)

beforeEach(() => {
  journal = journalVierge(); ouvre = true; siteTrouve = { id: 'site-1' }; erreurCompte = null; existant = null; preuveUserId = null
  createUser.mockReset(); createUser.mockImplementation(async () => ({ data: { user: { id: 'u-1' } }, error: null }))
  deleteUser.mockClear(); updateUserById.mockClear(); journaliser.mockClear()
})

describe('un seul geste, et le compte existe', () => {
  it('🔴 l’accès est créé CONFIRMÉ — aucun courriel à attendre', async () => {
    const r = await inscrire()
    expect(r.status).toBe(201)
    expect(createUser).toHaveBeenCalledTimes(1)
    expect(createUser.mock.calls[0][0]).toMatchObject({ email: 'amina@exemple.td', password: 'MotDePasse1!', email_confirm: true })
  })

  it('🔴 le compte de site porte nom, téléphone, organisation, rôle — et l’identité vient de l’accès créé', async () => {
    await inscrire()
    const e = journal.ecritures['site_comptes'] as { op: string; charge: Record<string, unknown> }[]
    expect(e).toHaveLength(1)
    expect(e[0].op).toBe('insert')
    expect(e[0].charge).toEqual({ site_id: 'site-1', user_id: 'u-1', email: 'amina@exemple.td', role: 'fournisseur', organisation: 'Pharma Sahel', nom: 'Amina Mahamat', telephone: '+235 66 12 34 56' })
  })

  it('🔴 la route n’écrit JAMAIS l’état : c’est la base qui le pose', async () => {
    await inscrire({ ...BON, etat: 'suspendu' })
    const e = journal.ecritures['site_comptes'] as { charge: Record<string, unknown> }[]
    expect('etat' in e[0].charge).toBe(false)
  })

  it('🔴 l’inscription est écrite au journal', async () => {
    await inscrire()
    expect(journaliser).toHaveBeenCalledWith(expect.objectContaining({ action: 'compte.inscrire', siteId: 'site-1' }))
  })
})

describe('ce qui est refusé', () => {
  it('🔴 un site qui n’ouvre pas de comptes refuse, même appelé à la main', async () => {
    ouvre = false
    expect((await inscrire()).status).toBe(404)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('🔴 un site inconnu refuse', async () => {
    siteTrouve = null
    expect((await inscrire()).status).toBe(404)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('🔴 « agent » ne se réclame pas', async () => {
    expect((await inscrire({ ...BON, role: 'agent' })).status).toBe(400)
    expect(createUser).not.toHaveBeenCalled()
  })

  for (const [champ, valeur] of [['nom', 'A'], ['organisation', ''], ['telephone', 'abc'], ['email', 'pas-une-adresse'], ['motDePasse', 'court']] as const) {
    it(`🔴 ${champ} invalide → refus, aucun accès créé`, async () => {
      expect((await inscrire({ ...BON, [champ]: valeur })).status).toBe(400)
      expect(createUser).not.toHaveBeenCalled()
    })
  }

  it('🔴 le piège à robots : succès apparent, RIEN n’est créé', async () => {
    expect((await inscrire({ ...BON, site_web: 'http://spam' })).status).toBe(201)
    expect(createUser).not.toHaveBeenCalled()
    expect(journal.ecritures['site_comptes'] ?? []).toHaveLength(0)
  })
})

describe('une adresse déjà connue n’est jamais reprise', () => {
  it('🔴 mot de passe FAUX : 409, sans toucher à l’accès existant', async () => {
    createUser.mockImplementation(async () => ({ data: { user: null }, error: { message: 'already registered' } }))
    existant = 'u-autre'
    const r = await inscrire()
    expect(r.status).toBe(409)
    expect(updateUserById).not.toHaveBeenCalled()
    expect(journal.ecritures['site_comptes'] ?? []).toHaveLength(0)
  })

  it('🔴 le BON mot de passe d’un accès existant (autre site Deribfy) : rattaché, sans rien changer à l’accès', async () => {
    createUser.mockImplementation(async () => ({ data: { user: null }, error: { message: 'already registered' } }))
    existant = 'u-autre'; preuveUserId = 'u-autre'
    const r = await inscrire()
    expect(r.status).toBe(201)
    expect(updateUserById).not.toHaveBeenCalled()
    const e = journal.ecritures['site_comptes'] as { charge: Record<string, unknown> }[]
    expect(e[0].charge).toMatchObject({ user_id: 'u-autre', nom: 'Amina Mahamat' })
  })

  it('🔴 un accès existant n’est JAMAIS supprimé, même si le compte de site échoue', async () => {
    createUser.mockImplementation(async () => ({ data: { user: null }, error: { message: 'already registered' } }))
    existant = 'u-autre'; preuveUserId = 'u-autre'; erreurCompte = { code: '23514', message: 'check' }
    expect((await inscrire()).status).toBe(500)
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('🔴 si le compte de site échoue, l’accès tout juste créé est retiré — pas d’orphelin', async () => {
    erreurCompte = { code: '23514', message: 'check' }
    expect((await inscrire()).status).toBe(500)
    expect(deleteUser).toHaveBeenCalledWith('u-1')
  })
})

// CPA, 2026-11-19 — « parmi les clients, il y a des ONG ». Le client reste un
// compte `structure` ; son TYPE est écrit. Un fournisseur n'en porte jamais.
describe('le type de client', () => {
  const ecrit = () => (journal.ecritures['site_comptes'] as { charge: Record<string, unknown> }[]).map((e) => e.charge)

  it('🔴 une ONG s’inscrit comme client (`structure`) avec son type', async () => {
    expect((await inscrire({ ...BON, role: 'structure', type_client: 'ong' })).status).toBe(201)
    expect(ecrit()[0]).toMatchObject({ role: 'structure', type_client: 'ong' })
  })

  it('🔴 un fournisseur ne porte JAMAIS de type de client, même s’il en envoie un', async () => {
    await inscrire({ ...BON, role: 'fournisseur', type_client: 'ong' })
    expect(ecrit()[0]).not.toHaveProperty('type_client')
  })

  it('un type inconnu est ignoré', async () => {
    await inscrire({ ...BON, role: 'structure', type_client: 'banque' })
    expect(ecrit()[0]).not.toHaveProperty('type_client')
  })

  it('🔴 colonne pas encore créée : l’inscription retente SANS le type, au lieu d’être refusée', async () => {
    // Le harnais rend la même réponse aux deux écritures : on vérifie qu'une
    // SECONDE écriture, sans type, a bien été tentée après le refus de colonne.
    erreurCompte = { message: 'Could not find the \'type_client\' column of \'site_comptes\'', code: 'PGRST204' }
    await inscrire({ ...BON, role: 'structure', type_client: 'sante' })
    expect(ecrit()).toHaveLength(2)
    expect(ecrit()[0]).toHaveProperty('type_client', 'sante')
    expect(ecrit()[1]).not.toHaveProperty('type_client')
  })

})

// CPA, 2026-11-19 — « 10 caractères minimum, majuscule, minuscule, chiffre,
// signe » pour les clients, les fournisseurs et la DDM : le SERVEUR refuse,
// pas seulement l'écran, et rien n'est créé.
describe('le mot de passe fort', () => {
  it('🔴 un mot de passe faible est refusé AVANT toute création', async () => {
    for (const faible of ['motdepasse1', 'MOTDEPASSE1!', 'Motdepasse!', 'Mdp1!crt', 'MotDePasse12']) {
      const r = await inscrire({ ...BON, motDePasse: faible })
      expect(r.status, faible).toBe(400)
      expect((await r.json()).error, faible).toContain('10 caractères')
    }
    expect(createUser).not.toHaveBeenCalled()
    expect(journal.ecritures['site_comptes'] ?? []).toHaveLength(0)
  })
})
