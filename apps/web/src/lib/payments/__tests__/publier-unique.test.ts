/**
 * « PUBLIER » EST « PUBLIER », OÙ QU'IL SE TROUVE (décision du propriétaire, 2026-11-22).
 *
 * Le défaut mesuré par le propriétaire (compte contact@deribfy.com) : dans
 * l'atelier, « Publier » ouvrait Stripe ; dans « Mes projets », le même mot
 * redemandait le nom à chaque clic, puis répondait « Publier demande un
 * abonnement en cours », sans jamais ouvrir Stripe.
 *
 * CE QUE CE TEST FAIT TOURNER, DE BOUT EN BOUT, SUR UNE SEULE BASE EN MÉMOIRE :
 *   le module des deux boutons (`lancerPublication`)
 *   → la vraie route d'état (`/api/generateur/publier/etat`)
 *   → la vraie route de publication (`/api/generateur/publier`)
 *   → la vraie ouverture de Stripe (`ouvrirPaiementAppli`, F3 compris)
 *   → la vraie publication après paiement (`publierApresPaiement`, celle du webhook).
 * Seuls le réseau (Stripe, Vercel) et la base sont des doubles.
 *
 * « POUR CHACUN DES DEUX BOUTONS » : chaque règle tourne deux fois, une par
 * bouton. Les deux pages appellent le MÊME module avec les MÊMES options — le
 * cliquet ⓪ le lit dans leur source ; c'est ce qui rend la seconde passe
 * honnête. CE QUE CE TEST NE PEUT PAS VOIR : le rendu des deux pages (le
 * bouton à l'écran, la boîte de dialogue du nom), et la page Stripe elle-même.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('server-only', () => ({}))

type Appli = {
  id: string; owner_id: string; nom: string | null; demande: string; statut: string
  document: unknown; publication_jeton: string | null; publication_slug: string | null
  sections_acquises: unknown; publie_le?: string | null
}
const etat = vi.hoisted(() => ({
  email: 'contact@deribfy.com',
  carte: 'contact@deribfy.com' as string,
  appli: null as unknown as Appli,
  autre: null as null | { id: string; publication_slug: string },
  paye: false,
  abonnements: [] as { id: string; status: string; metadata: Record<string, string> }[],
  sessions: [] as { metadata: Record<string, string> }[],
  domaines: [] as string[],
  alertes: [] as { type: string; details: Record<string, unknown> }[],
  sequence: [] as string[],
  journal: { filtres: {}, projections: {}, ecritures: {} } as import('@/lib/testing/postgrest').JournalPostgrest,
  appliquees: 0,
}))

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: async () => ({ ok: true, userId: 'u-contact', email: etat.email }),
}))
vi.mock('@/lib/anomaly', () => ({ logAnomaly: async (a: { type: string; details?: Record<string, unknown> }) => { etat.alertes.push({ type: a.type, details: a.details ?? {} }) } }))
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    prices: { retrieve: async () => ({ unit_amount: 2000, currency: 'usd' }) },
    customers: { create: async () => ({ id: 'cus_contact' }) },
    subscriptions: { list: async () => ({ data: etat.abonnements }) },
    checkout: {
      sessions: {
        create: async (p: { metadata: Record<string, string> }) => {
          etat.sequence.push('stripe')
          etat.sessions.push({ metadata: p.metadata })
          return { url: `https://checkout.stripe.com/c/pay/cs_${String(etat.sessions.length)}` }
        },
      },
    },
  }),
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom } = await import('@/lib/testing/postgrest')
  // LES ÉCRITURES S'APPLIQUENT : le double fidèle les capture, on les rejoue
  // sur la ligne avant chaque lecture — un parcours en plusieurs clics a
  // besoin d'une mémoire.
  const appliquer = (): void => {
    const e = (etat.journal.ecritures.app_generations ?? []) as { op: string; charge?: Record<string, unknown> }[]
    for (; etat.appliquees < e.length; etat.appliquees += 1) {
      const w = e[etat.appliquees]
      if (w?.op === 'update' && w.charge !== undefined) {
        if ('publication_slug' in w.charge) etat.sequence.push('nom')
        if ('publication_jeton' in w.charge) etat.sequence.push('jeton')
        Object.assign(etat.appli, w.charge)
      }
    }
  }
  const dernier = (f: [string, string, unknown][], col: string, op = 'eq'): unknown => [...f].reverse().find((x) => x[0] === op && x[1] === col)?.[2]
  return {
    supabaseAdmin: {
      from: creerFrom({
        app_generations: {
          reponse: (f) => {
            appliquer()
            // Le contrôle d'unicité du nom : `.eq('publication_slug', x).neq('id', moi)`.
            const slug = dernier(f, 'publication_slug')
            if (slug !== undefined && f[f.length - 1]?.[0] === 'neq') {
              return { data: etat.autre !== null && etat.autre.publication_slug === slug ? { id: etat.autre.id } : null, error: null }
            }
            return { data: { ...etat.appli }, error: null }
          },
        },
        app_compteurs: {
          reponse: () => ({ data: etat.paye ? { statut: 'abonnee', paye_jusqu_au: '2099-01-01T00:00:00Z', limite: 50, supplement: 0, utilisees: 0 } : null, error: null }),
        },
        quota_reglages: {
          reponse: (f) => ({ data: { valeur: dernier(f, 'cle') === 'abonnement_carte' ? etat.carte : '10' }, error: null }),
        },
        comptes_stripe: { reponse: { data: { customer_id: 'cus_contact' }, error: null } },
        sites: { reponse: { data: null, error: null } },
      }, etat.journal),
    },
  }
})

import { lancerPublication, adresseEnLigne, type IssuePublication } from '@/components/apps/publierAppli'
import { GET as ETAT } from '@/app/api/generateur/publier/etat/route'
import { POST as PUBLIER } from '@/app/api/generateur/publier/route'
import { publierApresPaiement } from '@/lib/payments/publier-apres-paiement'
import { PHRASE_PUBLIER_FERMEE } from '@/lib/apps/compteur-phrases'
import { PHRASE_ABONNEMENT_EN_COURS } from '@/lib/payments/abonnement-appli'

const SRC = join(__dirname, '..', '..', '..')
const PAGES = {
  atelier: readFileSync(join(SRC, 'app', 'atelier', '[id]', 'page.tsx'), 'utf8'),
  'Mes projets': readFileSync(join(SRC, 'app', 'dashboard', 'page.tsx'), 'utf8'),
} as const
type Bouton = keyof typeof PAGES
const BOUTONS: readonly Bouton[] = ['atelier', 'Mes projets']

// Le réseau : les deux routes réelles derrière les adresses relatives, Vercel en double.
const reseau = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const u = String(url)
  if (u.startsWith('https://api.vercel.com/')) {
    etat.domaines.push(u)
    return new Response('{}', { status: 200 })
  }
  const req = new Request(`https://www.deribfy.com${u}`, init)
  if (u.startsWith('/api/generateur/publier/etat')) return ETAT(req)
  if (u.startsWith('/api/generateur/publier?')) return PUBLIER(req)
  throw new Error(`appel inattendu : ${u}`)
}

const questions: string[] = []
const ouvertes: string[] = []
let reponseAuNom: string | null = 'gestion-stock'
const clic = (_b: Bouton): Promise<IssuePublication> =>
  lancerPublication({
    id: 'app-stock', titre: 'Gestion de stock', demande: 'Gérer le stock', autorisation: 'Bearer jeton',
    demanderNom: (q) => { questions.push(q); return reponseAuNom },
    ouvrir: (url) => { ouvertes.push(url) },
  })
const payer = async (): Promise<string> => {
  etat.paye = true
  etat.abonnements = [{ id: 'sub_1', status: 'active', metadata: { deribfy_app_id: 'app-stock' } }]
  return publierApresPaiement({ app: 'app-stock', proprietaire: 'u-contact', accordLecture: null })
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('fetch', reseau)
  process.env.STRIPE_PRICE_APPLICATION = 'price_app'
  process.env.CLOUDFLARE_API_TOKEN = 'cf'; process.env.VERCEL_API_TOKEN = 'vc'; process.env.VERCEL_PROJECT_ID = 'prj'
  etat.email = 'contact@deribfy.com'
  etat.carte = 'contact@deribfy.com'
  etat.appli = {
    id: 'app-stock', owner_id: 'u-contact', nom: 'Gestion de stock', demande: 'Gérer le stock', statut: 'livree',
    document: { fichiers: { 'index.html': '<p>stock</p>' } }, publication_jeton: null, publication_slug: null, sections_acquises: {},
  }
  etat.autre = null
  etat.paye = false
  etat.abonnements = []; etat.sessions = []; etat.domaines = []; etat.alertes = []; etat.sequence = []
  etat.journal.filtres = {}; etat.journal.projections = {}; etat.journal.ecritures = {}; etat.appliquees = 0
  questions.length = 0; ouvertes.length = 0; reponseAuNom = 'gestion-stock'
})

describe('⓪ les deux boutons appellent le MÊME module, avec les MÊMES options', () => {
  for (const b of BOUTONS) {
    it(`${b} : un seul appel, à lancerPublication, sans question ni redirection à lui`, () => {
      const src = PAGES[b]
      const appels = [...src.matchAll(/lancerPublication\(\{([\s\S]*?)\}\);/gu)]
      expect(appels, `${b} n’appelle pas le module, ou l’appelle deux fois`).toHaveLength(1)
      const cles = (appels[0]?.[1] ?? '').split(',').map((x) => x.split(':')[0]?.trim()).filter((x) => x !== '')
      expect(cles.sort()).toEqual(['autorisation', 'demande', 'id', 'titre'])
      // Aucune autre copie du geste : ni la question du nom, ni la route, ni Stripe en direct.
      expect(src, `${b} pose encore sa propre question du nom`).not.toMatch(/window\.prompt\(\s*`Adresse publique/u)
      expect(src, `${b} appelle encore la route lui-même`).not.toMatch(/generateur\/publier/u)
      expect(src, `${b} part encore chez Stripe lui-même`).not.toMatch(/versStripe\('abonnement'\)/u)
    })
  }
})

for (const b of BOUTONS) {
  describe(`bouton « Publier » de ${b}`, () => {
    it('2 · premier clic, aucun nom : le nom est demandé, avec les contrôles (format, déjà pris)', async () => {
      reponseAuNom = 'A'
      const r1 = await clic(b)
      expect(questions).toHaveLength(1)
      expect(questions[0]).toContain('.deribfy.app')
      expect(r1).toEqual({ type: 'erreur', message: expect.stringContaining('nom n est pas utilisable') })
      etat.autre = { id: 'autre-app', publication_slug: 'pris-ailleurs' }
      reponseAuNom = 'pris-ailleurs'
      const r2 = await clic(b)
      expect(r2).toEqual({ type: 'erreur', message: expect.stringContaining('deja pris') })
      // Refusé : rien d'écrit, Stripe jamais ouvert.
      expect(etat.appli.publication_slug).toBeNull()
      expect(etat.sessions).toEqual([])
      expect(ouvertes).toEqual([])
    })

    it('2 bis · la personne annule la question : rien ne se passe', async () => {
      reponseAuNom = null
      expect(await clic(b)).toEqual({ type: 'annulee' })
      expect(etat.appli.publication_slug).toBeNull()
      expect(etat.sessions).toEqual([])
    })

    it('3 · le nom validé est ENREGISTRÉ, puis Stripe s’ouvre aussitôt', async () => {
      expect(await clic(b)).toEqual({ type: 'paiement' })
      expect(etat.appli.publication_slug).toBe('gestion-stock')
      expect(etat.sequence).toEqual(['nom', 'stripe'])
      expect(ouvertes).toEqual(['https://checkout.stripe.com/c/pay/cs_1'])
      expect(etat.sessions[0]?.metadata).toMatchObject({ deribfy_type: 'application', deribfy_app_id: 'app-stock', deribfy_owner_id: 'u-contact' })
    })

    it('4 · il ne paie pas : rien d’autre ne change, son nom reste — et ne publie RIEN', async () => {
      await clic(b)
      expect(etat.appli.publication_slug).toBe('gestion-stock')
      expect(etat.appli.publication_jeton).toBeNull()
      expect(await adresseEnLigne('app-stock', 'Bearer jeton'), 'un nom non payé a une adresse').toBeNull()
      expect(etat.domaines, 'un domaine a été attaché sans paiement').toEqual([])
    })

    it('5 · nom déjà choisi, non payé : Stripe s’ouvre DIRECTEMENT, sans redemander le nom', async () => {
      etat.appli.publication_slug = 'gestion-stock'
      expect(await clic(b)).toEqual({ type: 'paiement' })
      expect(questions, 'le nom a été redemandé').toEqual([])
      expect(etat.sequence, 'le nom a été réécrit').toEqual(['stripe'])
      expect(ouvertes).toHaveLength(1)
    })

    it('5 bis · F3 : un abonnement déjà en cours (il reclique, ou revient) : aucune seconde page Stripe', async () => {
      etat.appli.publication_slug = 'gestion-stock'
      etat.abonnements = [{ id: 'sub_1', status: 'incomplete', metadata: { deribfy_app_id: 'app-stock' } }]
      expect(await clic(b)).toEqual({ type: 'erreur', message: PHRASE_ABONNEMENT_EN_COURS })
      expect(etat.sessions).toEqual([])
      expect(ouvertes).toEqual([])
    })

    it('6 · paiement reçu : l’appli est publiée au nom choisi, sans autre clic', async () => {
      await clic(b)
      const clics = questions.length
      expect(await payer()).toBe('publiee')
      expect(etat.appli.publication_jeton).toMatch(/^[A-Za-z0-9_-]{8,}$/u)
      expect(etat.appli.publication_slug).toBe('gestion-stock')
      expect(etat.domaines.some((u) => u.includes('/domains')), 'le nom n’est pas attaché').toBe(true)
      expect(await adresseEnLigne('app-stock', 'Bearer jeton')).toBe('https://gestion-stock.deribfy.app')
      expect(questions.length, 'un clic a été demandé').toBe(clics)
      expect(etat.alertes).toEqual([])
    })

    it('7 · appli déjà payée : Publier republie, sans repasser par Stripe ni redemander le nom', async () => {
      await clic(b)
      await payer()
      const jeton = etat.appli.publication_jeton
      questions.length = 0; ouvertes.length = 0; etat.sessions = []
      const r = await clic(b)
      expect(r).toMatchObject({ type: 'publiee', lien: 'https://gestion-stock.deribfy.app', erreurSousDomaine: null })
      expect(etat.sessions, 'Stripe rouvert pour une appli payée').toEqual([])
      expect(questions).toEqual([])
      expect(etat.appli.publication_jeton, 'republier a changé le lien').toBe(jeton)
    })

    it('8 · carte fermée pour ce compte : la phrase, sans question, sans appel à la route, rien d’écrit', async () => {
      etat.carte = ''
      expect(await clic(b)).toEqual({ type: 'fermee', message: PHRASE_PUBLIER_FERMEE })
      expect(questions).toEqual([])
      expect(etat.sessions).toEqual([])
      expect(Object.values(etat.journal.ecritures).flat()).toEqual([])
    })
  })
}

describe('le cas du propriétaire : nom choisi, pas payé, revient plus tard, clique depuis l’AUTRE bouton', () => {
  for (const [premier, second] of [['atelier', 'Mes projets'], ['Mes projets', 'atelier']] as const) {
    it(`${premier} puis ${second} : le nom n’est demandé qu’une fois, Stripe s’ouvre les deux fois ; payé, publié`, async () => {
      expect(await clic(premier)).toEqual({ type: 'paiement' })
      expect(questions).toHaveLength(1)
      expect(await clic(second)).toEqual({ type: 'paiement' })
      expect(questions, `${second} redemande le nom`).toHaveLength(1)
      expect(ouvertes).toHaveLength(2)
      expect(etat.sequence).toEqual(['nom', 'stripe', 'stripe'])
      expect(await payer()).toBe('publiee')
      expect(await adresseEnLigne('app-stock', 'Bearer jeton')).toBe('https://gestion-stock.deribfy.app')
    })
  }
})

describe('un nom enregistré mais non payé ne publie rien', () => {
  it('une appli DÉJÀ en ligne par lien simple, période échue : le nouveau nom n’est pas posé (il serait public sans paiement)', async () => {
    etat.appli.publication_jeton = 'jeton-en-ligne'
    expect(await clic('Mes projets')).toEqual({ type: 'paiement' })
    expect(etat.appli.publication_slug).toBeNull()
    expect(etat.domaines).toEqual([])
  })
})

describe('la publication après paiement (webhook) : jamais de silence, jamais de levée', () => {
  it('renouvellement d’une appli déjà en ligne : rien n’est réécrit', async () => {
    etat.appli.publication_jeton = 'jeton-deja-la'
    etat.paye = true
    expect(await publierApresPaiement({ app: 'app-stock', proprietaire: 'u-contact', accordLecture: null })).toBe('deja_publiee')
    expect(Object.values(etat.journal.ecritures).flat()).toEqual([])
  })

  it('une table publique ACCEPTÉE au clic : l’accord voyage chez Stripe, et la publication après paiement le reconnaît', async () => {
    etat.appli.document = { fichiers: { 'index.html': 'x' }, entites: [{ id: 'annonce', name: 'Annonce', fields: [], lecturePublique: true }] }
    const vues: string[] = []
    vi.stubGlobal('window', { confirm: (m: string) => { vues.push(m); return true } })
    expect(await clic('atelier')).toEqual({ type: 'paiement' })
    expect(vues, 'la liste publique n’a pas été montrée avant Stripe').toHaveLength(1)
    const accord = etat.sessions[0]?.metadata.deribfy_lecture_publique ?? null
    expect(accord).toBe('annonce')
    etat.paye = true
    expect(await publierApresPaiement({ app: 'app-stock', proprietaire: 'u-contact', accordLecture: accord })).toBe('publiee')
    // Une table publique AJOUTÉE après l'accord : il ne la couvre pas.
    etat.appli.publication_jeton = null
    etat.appli.document = { fichiers: { 'index.html': 'x' }, entites: [
      { id: 'annonce', name: 'Annonce', fields: [], lecturePublique: true },
      { id: 'offre', name: 'Offre', fields: [], lecturePublique: true },
    ] }
    expect(await publierApresPaiement({ app: 'app-stock', proprietaire: 'u-contact', accordLecture: accord })).toBe('refusee')
  })

  it('une table publique jamais acceptée : pas publiée, alerte (le client garde « Publier »)', async () => {
    etat.appli.document = { fichiers: { 'index.html': 'x' }, entites: [{ id: 'annonce', name: 'Annonce', fields: [], lecturePublique: true }] }
    etat.paye = true
    const effet = await publierApresPaiement({ app: 'app-stock', proprietaire: 'u-contact', accordLecture: null })
    expect(effet).toBe('refusee')
    expect(etat.appli.publication_jeton).toBeNull()
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_publication_application'])
  })

  it('une panne au milieu : l’effet est dit, rien ne lève (le paiement est déjà enregistré)', async () => {
    etat.paye = true
    vi.stubGlobal('fetch', async () => { throw new Error('réseau coupé') })
    etat.appli.publication_slug = 'gestion-stock'
    const effet = await publierApresPaiement({ app: 'app-stock', proprietaire: 'u-contact', accordLecture: null })
    expect(['echec', 'publiee_sans_nom']).toContain(effet)
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_publication_application'])
  })
})
