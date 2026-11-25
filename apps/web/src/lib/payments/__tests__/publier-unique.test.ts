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
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { join } from 'node:path'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/payments/mobile-money/encaissement', async (origine) => ({
  ...(await origine<typeof import('@/lib/payments/mobile-money/encaissement')>()),
  mobileMoneyOuvert: async () => etat.mm,
  lireTarifMobileMoney: async () => (etat.tarifMm ? { ok: true, tarif: {} } : { ok: false, manque: ['frais_retrait_pct'] }),
}))

type Appli = {
  id: string; owner_id: string; nom: string | null; demande: string; statut: string
  document: unknown; publication_jeton: string | null; publication_slug: string | null
  sections_acquises: unknown; publie_le?: string | null; created_at?: string
}
const etat = vi.hoisted(() => ({
  email: 'contact@deribfy.com',
  carte: 'contact@deribfy.com' as string,
  // 2026-11-24 : le mobile money proposé à ce compte (interrupteur) et son tarif réglé.
  mm: false,
  tarifMm: true,
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
  // Le compte de l'œuvre (base des œuvres en double) : qui a reçu quel mot de passe.
  motsDePasseCrees: [] as { quand: 'publication' | 'renouvellement'; nom: string | null }[],
}))
vi.mock('@/lib/apps/base-oeuvres', () => ({ configBaseOeuvres: () => ({ ok: true, config: { url: 'https://oeuvres.supabase.co', cleSecrete: 'cle-factice' } }) }))
vi.mock('@/lib/apps/poser-oeuvre', () => ({ poserOeuvre: async () => ({ ok: true, elagues: [] }) }))
vi.mock('@/lib/apps/compte-oeuvre', async (orig) => ({
  ...(await orig<typeof import('@/lib/apps/compte-oeuvre')>()),
  assurerCompteOeuvre: async (o: { nom: string | null }) => { etat.motsDePasseCrees.push({ quand: 'publication', nom: o.nom }); return { adresse: `admin@${String(o.nom)}.deribfy.app`, motDePasse: 'mdp-de-la-publication' } },
  renouvelerMotDePasse: async (o: { nom: string | null }) => { etat.motsDePasseCrees.push({ quand: 'renouvellement', nom: o.nom }); return { adresse: `admin@${String(o.nom)}.deribfy.app`, motDePasse: 'mdp-cree-par-le-client' } },
  adresseActuelle: async () => 'admin@gestion-stock.deribfy.app',
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
            // La liste de « Mes projets » (`.limit(50)`) rend un tableau.
            if (f[f.length - 1]?.[0] === 'limit') return { data: [{ ...etat.appli }], error: null }
            // Une AUTRE appli demandée par son identifiant : elle n'est pas à ce compte.
            const id = dernier(f, 'id')
            if (id !== undefined && id !== etat.appli.id) return { data: null, error: null }
            return { data: { ...etat.appli }, error: null }
          },
        },
        app_compteurs: {
          reponse: () => ({ data: etat.paye ? { statut: 'abonnee', paye_jusqu_au: '2099-01-01T00:00:00Z', limite: 50, supplement: 0, utilisees: 0 } : null, error: null }),
        },
        quota_reglages: {
          reponse: (f) => ({ data: { valeur: dernier(f, 'cle') === 'abonnement_carte' ? etat.carte : '10' }, error: null }),
        },
        // LES ALERTES QUE `logAnomaly` A NOTÉES : la route d'état y lit l'échec
        // de la publication automatique, comme en production.
        checkout_anomalies: {
          reponse: (f) => {
            const type = dernier(f, 'type'); const app = dernier(f, 'details->>app')
            const a = etat.alertes.find((x) => x.type === type && x.details.app === app)
            return { data: a === undefined ? null : { id: 'anomalie-1' }, error: null }
          },
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
import { LIBELLE_MOYEN, PHRASE_PUBLIER_FERMEE } from '@/lib/apps/compteur-phrases'
import { PHRASE_MOYEN_FERME } from '@/lib/apps/decision-publication'
import { PHRASE_ABONNEMENT_EN_COURS } from '@/lib/payments/abonnement-appli'
import { changerAdresse, etapeDuRetour, lireEtatPublication, PHRASE_DEJA_EN_LIGNE, refaireMotDePasse, type DemandeFenetre } from '@/components/apps/publierAppli'
import { GET as COMPTE } from '@/app/api/generateur/compte/route'
import { POST as SUPPRIMER } from '@/app/api/generateur/supprimer/route'
import { GET as MES_APPLICATIONS } from '@/app/api/generateur/mes-applications/route'
import { PHRASE_NOM_FIGE } from '@/lib/apps/nom-enregistre'
import { GET as VERIFIER_NOM, POST as CHANGER_NOM } from '@/app/api/generateur/publier/nom/route'
import { PHRASE_ADRESSE_FORMAT } from '@/lib/apps/adresse-libre'
import { POST as COMPTE_POST } from '@/app/api/generateur/compte/route'

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
  if (u.startsWith('/api/generateur/publier/nom')) return req.method === 'GET' ? VERIFIER_NOM(req) : CHANGER_NOM(req)
  if (u.startsWith('/api/generateur/compte') && req.method === 'POST') return COMPTE_POST(req)
  throw new Error(`appel inattendu : ${u}`)
}

// LA FENÊTRE « PUBLIER » (2026-11-22) : le double joue la personne — elle
// tape `reponseAuNom` (ou annule si null) et valide. Ce que la fenêtre a
// montré, et ce qu'elle a affiché comme refus, est noté.
const fenetres: DemandeFenetre[] = []
const erreursFenetre: string[] = []
const resultatsFenetre: unknown[] = []
const questions: string[] = []
const fenetre = (d: DemandeFenetre): void => {
  fenetres.push(d)
  questions.push(d.titre)
  void (async () => {
    if (reponseAuNom === null) { d.annuler(); return }
    const e = await d.valider(reponseAuNom, moyenChoisi)
    resultatsFenetre.push(e)
    if (typeof e === 'string' && e !== 'mobile_money') { erreursFenetre.push(e); d.annuler() }
  })()
}
const ouvertes: string[] = []
let reponseAuNom: string | null = 'gestion-stock'
let moyenChoisi: 'carte' | 'mobile_money' | null = null
const clic = (_b: Bouton): Promise<IssuePublication> =>
  lancerPublication({
    id: 'app-stock', titre: 'Gestion de stock', demande: 'Gérer le stock', autorisation: 'Bearer jeton',
    ouvrirFenetre: fenetre,
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
  etat.mm = false
  etat.tarifMm = true
  moyenChoisi = null
  etat.appli = {
    id: 'app-stock', owner_id: 'u-contact', nom: 'Gestion de stock', demande: 'Gérer le stock', statut: 'livree',
    document: { fichiers: { 'index.html': '<p>stock</p>' } }, publication_jeton: null, publication_slug: null, sections_acquises: {}, publie_le: null,
  }
  etat.motsDePasseCrees = []
  process.env.OEUVRES_DATABASE_URL_POOLER_TRANSACTION = 'postgres://factice'
  etat.autre = null
  etat.paye = false
  etat.abonnements = []; etat.sessions = []; etat.domaines = []; etat.alertes = []; etat.sequence = []
  etat.journal.filtres = {}; etat.journal.projections = {}; etat.journal.ecritures = {}; etat.appliquees = 0
  questions.length = 0; ouvertes.length = 0; reponseAuNom = 'gestion-stock'
  fenetres.length = 0; erreursFenetre.length = 0
  // AUCUNE BOÎTE NATIVE : un prompt ou un confirm ferait rougir le test.
  vi.stubGlobal('window', { prompt: () => { throw new Error('boîte native « prompt »') }, confirm: () => { throw new Error('boîte native « confirm »') }, setTimeout, clearTimeout })
})

/**
 * Les clés d'un objet littéral, au PREMIER niveau seulement (2026-11-24) : les
 * commentaires sont retirés, et ce qui est entre parenthèses, accolades ou
 * crochets imbriqués ne compte pas — une option écrite sur plusieurs lignes,
 * ou une fonction qui construit un objet, n'ajoute pas de fausses clés.
 */
function clesDePremierNiveau(corps: string): string[] {
  const sans = corps.replace(/\/\/[^\n]*/gu, '')
  const cles: string[] = []
  let profondeur = 0
  let debut = true
  for (let i = 0; i < sans.length; i += 1) {
    const c = sans[i]!
    if ('({['.includes(c)) profondeur += 1
    else if (')}]'.includes(c)) profondeur -= 1
    else if (c === ',' && profondeur === 0) debut = true
    else if (debut && profondeur === 0 && /[A-Za-z]/u.test(c)) {
      const m = /^([A-Za-z]+)\s*(:|,|$)/u.exec(sans.slice(i))
      if (m !== null) { cles.push(m[1]!); i += m[1]!.length - 1 }
      debut = false
    }
  }
  return cles
}

describe('⓪ les deux boutons appellent le MÊME module, avec les MÊMES options', () => {
  for (const b of BOUTONS) {
    it(`${b} : un seul appel, à lancerPublication, sans question ni redirection à lui`, () => {
      const src = PAGES[b]
      const appels = [...src.matchAll(/lancerPublication\(\{([\s\S]*?)\}\);/gu)]
      expect(appels, `${b} n’appelle pas le module, ou l’appelle deux fois`).toHaveLength(1)
      expect(clesDePremierNiveau(appels[0]?.[1] ?? '').sort()).toEqual(['apresMobileMoney', 'autorisation', 'demande', 'id', 'ouvrirFenetre', 'titre'])
      expect(appels[0]?.[1], `${b} ne passe pas SA fenêtre`).toMatch(motifTexte('ouvrirFenetre: setFenetre'))
      expect(src, `${b} ne montre pas la fenêtre partagée`).toMatch(motifTexte('<FenetrePublier demande={fenetre}'))
      // Aucune autre copie du geste : ni la question du nom, ni la route, ni Stripe en direct.
      expect(src, `${b} pose encore une boîte native pour publier`).not.toMatch(/window\.prompt\(\s*`Adresse publique|accordLecturePublique\(/u)
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
      // UNE fenêtre Deribfy : le titre, l'adresse proposée d'après le titre, le bouton du paiement.
      expect(fenetres).toHaveLength(1)
      expect(fenetres[0]).toMatchObject({ titre: 'Publier votre application', adresseInitiale: 'gestion-de-stock', adresseModifiable: true, listes: [], libelleBouton: 'Publier' })
      // Le refus s'affiche DANS la fenêtre ; la personne annule ensuite.
      expect(erreursFenetre[0]?.includes('nom n est pas utilisable'), 'refus attendu dans la fenêtre').toBe(true)
      expect(r1).toEqual({ type: 'annulee' })
      etat.autre = { id: 'autre-app', publication_slug: 'pris-ailleurs' }
      reponseAuNom = 'pris-ailleurs'
      expect(await clic(b)).toEqual({ type: 'annulee' })
      expect(erreursFenetre[1]?.includes('deja pris'), 'refus attendu dans la fenêtre').toBe(true)
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
    expect(await clic('atelier')).toEqual({ type: 'paiement' })
    vues.push(...(fenetres[0]?.listes ?? []).map((l) => l.nom))
    expect(vues, 'la liste publique n’a pas été montrée avant Stripe').toEqual(['Annonce'])
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

// ════════════════════════════════════════════════════════════════════════
// LES TROIS AJOUTS DU PROPRIÉTAIRE (2026-11-22).
// ════════════════════════════════════════════════════════════════════════

const AVEC_BASE = { schema: 'create table public.article (id uuid primary key)', fichiers: { 'index.html': '<p>stock</p>' } }
const appelDe = (route: (r: Request) => Promise<Response>, chemin: string, init?: RequestInit) =>
  route(new Request(`https://www.deribfy.com${chemin}`, init))
const etatDuCompte = async (): Promise<string> =>
  ((await (await appelDe(COMPTE, '/api/generateur/compte?id=app-stock')).json()) as { etat: string }).etat
const etapeMaintenant = async () => etapeDuRetour(await lireEtatPublication('app-stock', 'Bearer jeton'))

describe('AJOUT 1 · le retour de Stripe et le mot de passe', () => {
  it('appli AVEC base : en ligne, puis « Créer mon mot de passe » rend un mot de passe que le client voit', async () => {
    etat.appli.document = AVEC_BASE
    await clic('atelier')
    expect(await etapeMaintenant(), 'avant l’activation').toBe('activation')
    expect(await payer()).toBe('publiee')
    expect(await etapeMaintenant()).toBe('en_ligne')
    // Le webhook a créé le compte — son mot de passe n'a été rendu à PERSONNE.
    expect(etat.motsDePasseCrees).toEqual([{ quand: 'publication', nom: 'gestion-stock' }])
    expect(await etatDuCompte(), 'le compte n’est pas actif : pas de bouton').toBe('actif')
    // Le bouton : la fonction EXISTANTE « Refaire le mot de passe ».
    const r = await refaireMotDePasse('app-stock', 'Bearer jeton')
    expect(r).toEqual({ ok: true, adresse: 'admin@gestion-stock.deribfy.app', motDePasse: 'mdp-cree-par-le-client' })
    expect(etat.motsDePasseCrees.at(-1)).toEqual({ quand: 'renouvellement', nom: 'gestion-stock' })
  })

  it('appli SANS base : en ligne, l’adresse seule — pas de compte, pas de mot de passe', async () => {
    await clic('Mes projets')
    expect(await payer()).toBe('publiee')
    expect(await etapeMaintenant()).toBe('en_ligne')
    expect(await etatDuCompte()).toBe('sans-donnees')
    expect((await refaireMotDePasse('app-stock', 'Bearer jeton')).ok).toBe(false)
    expect(etat.motsDePasseCrees).toEqual([])
  })

  it('webhook EN RETARD : payé, pas encore publié → « Publication en cours… », puis en ligne sans aucun clic', async () => {
    await clic('atelier')
    etat.paye = true
    expect(await etapeMaintenant()).toBe('publication')
    const clics = questions.length
    expect(await publierApresPaiement({ app: 'app-stock', proprietaire: 'u-contact', accordLecture: null })).toBe('publiee')
    expect(await etapeMaintenant()).toBe('en_ligne')
    expect(questions.length, 'un clic a été demandé').toBe(clics)
  })

  it('publication automatique ÉCHOUÉE : l’écran le dit (« echec »), et l’alerte est partie', async () => {
    etat.appli.document = { fichiers: { 'index.html': 'x' }, entites: [{ id: 'annonce', name: 'Annonce', fields: [], lecturePublique: true }] }
    etat.appli.publication_slug = 'gestion-stock'
    expect(await payer()).toBe('refusee')
    expect(etat.alertes.map((a) => a.type)).toEqual(['stripe_publication_application'])
    expect(await etapeMaintenant()).toBe('echec')
  })

  it('plus tard, dans « Mes projets » : l’adresse, et l’accès au mot de passe seulement pour une appli avec base', async () => {
    etat.appli.document = AVEC_BASE
    await clic('Mes projets'); await payer()
    const avec = ((await (await appelDe(MES_APPLICATIONS, '/api/generateur/mes-applications')).json()) as { applications: { adresse: string | null; aDesDonnees: boolean }[] }).applications[0]
    expect(avec).toMatchObject({ adresse: 'https://gestion-stock.deribfy.app', aDesDonnees: true })
    etat.appli.document = { fichiers: { 'index.html': 'x' } }
    const sans = ((await (await appelDe(MES_APPLICATIONS, '/api/generateur/mes-applications')).json()) as { applications: { aDesDonnees: boolean }[] }).applications[0]
    expect(sans?.aDesDonnees).toBe(false)
  })

  it('les deux écrans : le bouton du mot de passe passe par la fonction existante, et n’apparaît qu’avec une base', () => {
    for (const b of BOUTONS) expect(PAGES[b], `${b} n’emploie pas refaireMotDePasse`).toMatch(/refaireMotDePasse\(/u)
    expect(PAGES['Mes projets']).toMatch(motifTexte('a.adresse != null && a.aDesDonnees === true && ('))
    expect(PAGES.atelier).toMatch(motifTexte("compte?.etat === 'actif' && (compte.motDePasse ?? null) === null && ("))
    expect(PAGES.atelier).toMatch(/libelleRenouveler=\{LIBELLE_MOT_DE_PASSE\}/u)
    // Aucun « recliquez sur Publier » au retour : l'écran relit l'état seul.
    expect(PAGES.atelier).toMatch(motifTexte('window.setInterval(() => { if (!fini) void suivre(); }, RELECTURE_RETOUR_MS)'))
  })
})

describe('AJOUT 2 · libérer le nom d’une appli supprimée qui n’a jamais été en ligne', () => {
  const supprimer = () => appelDe(SUPPRIMER, '/api/generateur/supprimer', { method: 'POST', body: JSON.stringify({ id: 'app-stock' }) })

  it('nom enregistré, jamais publié : supprimée → le nom est LIBÉRÉ, aucun domaine à détacher', async () => {
    await clic('atelier')
    expect(etat.appli.publication_slug).toBe('gestion-stock')
    const d = (await (await supprimer()).json()) as { ok: boolean; nomLibere: string | null; nomEnQuarantaine: string | null }
    expect(d).toMatchObject({ ok: true, nomLibere: 'gestion-stock', nomEnQuarantaine: null })
    expect(etat.appli.publication_slug).toBeNull()
    expect(etat.domaines, 'un domaine jamais attaché a été « détaché »').toEqual([])
    // La condition est REDITE dans l'écriture : une publication entre-temps l'emporterait.
    expect(etat.journal.filtres.app_generations).toEqual(expect.arrayContaining([['is', 'publication_jeton', null], ['is', 'publie_le', null]]))
  })

  it('appli publiée puis remboursée (jeton retiré, date gardée) : supprimée → le nom RESTE en quarantaine', async () => {
    etat.appli.publication_slug = 'gestion-stock'
    etat.appli.publie_le = '2026-11-22T10:00:00Z'
    const d = (await (await supprimer()).json()) as { nomEnQuarantaine: string | null; nomLibere: string | null }
    expect(d).toMatchObject({ nomEnQuarantaine: 'gestion-stock', nomLibere: null })
    expect(etat.appli.publication_slug).toBe('gestion-stock')
    expect(etat.domaines.some((u) => u.includes('gestion-stock.deribfy.app')), 'le domaine n’est pas détaché').toBe(true)
  })

  it('appli EN LIGNE : supprimée → le nom reste en quarantaine (EP-308 inchangé)', async () => {
    await clic('atelier'); await payer()
    await supprimer()
    expect(etat.appli.publication_slug).toBe('gestion-stock')
    expect(etat.appli.publication_jeton).toBeNull()
  })
})

describe('AJOUT 3 · « Changer l’adresse », tant que l’appli n’a jamais été en ligne', () => {
  const changer = (nouveau: string | null) => { reponseAuNom = nouveau; return changerAdresse({ id: 'app-stock', nomActuel: 'gestion-stock', autorisation: 'Bearer jeton', ouvrirFenetre: fenetre }) }

  it('visible seulement avec un nom enregistré et une appli jamais en ligne', async () => {
    expect((await lireEtatPublication('app-stock', 'Bearer jeton'))?.nomModifiable, 'sans nom').toBe(false)
    await clic('atelier')
    expect((await lireEtatPublication('app-stock', 'Bearer jeton'))?.nomModifiable).toBe(true)
    await payer()
    expect((await lireEtatPublication('app-stock', 'Bearer jeton'))?.nomModifiable, 'en ligne').toBe(false)
    etat.appli.publication_jeton = null // remboursée : le jeton part, la date reste
    expect((await lireEtatPublication('app-stock', 'Bearer jeton'))?.nomModifiable, 'a été en ligne').toBe(false)
  })

  it('un nouveau nom valide remplace l’ancien (libéré) ; le prochain « Publier » part avec lui, sans question', async () => {
    await clic('Mes projets')
    expect(await changer('stock-moundou')).toEqual({ type: 'changee', nom: 'stock-moundou' })
    expect(etat.appli.publication_slug).toBe('stock-moundou')
    expect(etat.journal.filtres.app_generations).toEqual(expect.arrayContaining([['is', 'publication_jeton', null], ['is', 'publie_le', null]]))
    questions.length = 0
    expect(await clic('atelier')).toEqual({ type: 'paiement' })
    expect(questions).toEqual([])
    expect(await payer()).toBe('publiee')
    expect(await adresseEnLigne('app-stock', 'Bearer jeton')).toBe('https://stock-moundou.deribfy.app')
  })

  it('mêmes contrôles que « Publier » : format refusé, nom déjà pris — rien ne change', async () => {
    await clic('atelier')
    expect(await changer('A')).toEqual({ type: 'annulee' })
    expect(erreursFenetre.at(-1)?.includes('nom n est pas utilisable'), 'refus attendu dans la fenêtre').toBe(true)
    etat.autre = { id: 'autre-app', publication_slug: 'pris-ailleurs' }
    expect(await changer('pris-ailleurs')).toEqual({ type: 'annulee' })
    expect(erreursFenetre.at(-1)?.includes('deja pris'), 'refus attendu dans la fenêtre').toBe(true)
    expect(etat.appli.publication_slug).toBe('gestion-stock')
  })

  it('après une mise en ligne, le nom ne change plus (409), même dépubliée', async () => {
    await clic('atelier'); await payer()
    expect(await changer('autre-nom')).toEqual({ type: 'annulee' })
    expect(erreursFenetre.at(-1)).toBe(PHRASE_NOM_FIGE)
    etat.appli.publication_jeton = null
    expect(await changer('autre-nom')).toEqual({ type: 'annulee' })
    expect(erreursFenetre.at(-1)).toBe(PHRASE_NOM_FIGE)
    expect(etat.appli.publication_slug).toBe('gestion-stock')
  })

  it('les deux écrans : « Changer l’adresse » à côté de « Publier », par le module partagé, seulement si permis', () => {
    expect(PAGES.atelier).toMatch(motifTexte('etatPub?.nomModifiable === true && ('))
    expect(PAGES['Mes projets']).toMatch(motifTexte('a.nomModifiable === true && ('))
    for (const b of BOUTONS) expect(PAGES[b]).toMatch(/changerAdresse\(\{/u)
  })
})

describe('PARTIE 1 · une seule fenêtre avant Stripe, et l’accord gardé', () => {
  // 2026-11-23 : une table publique dit ce que le visiteur reçoit (champsPublics).
  const PRODUITS = { id: 'produit', name: 'Produits', lecturePublique: true, champsPublics: ['nom', 'quantite', 'seuil'], fields: [
    { id: 'nom', name: 'nom', type: 'text', required: true },
    { id: 'quantite', name: 'quantite', type: 'number', required: true, label: [{ locale: 'fr', text: 'quantité' }] },
    { id: 'seuil', name: 'seuil_alerte', type: 'number', required: false, label: [{ locale: 'fr', text: 'seuil d’alerte' }] },
  ] }
  const avecListe = (entites: unknown[]) => { etat.appli.document = { fichiers: { 'index.html': 'x' }, entites } }

  it('des données lisibles sans compte : la fenêtre les nomme en mots simples, et l’accord part avec le paiement', async () => {
    avecListe([PRODUITS])
    expect(await clic('Mes projets')).toEqual({ type: 'paiement' })
    expect(fenetres).toHaveLength(1)
    expect(fenetres[0]?.listes).toEqual([{ nom: 'Produits', champs: ['nom', 'quantité', 'seuil d’alerte'] }])
    expect(etat.sessions[0]?.metadata.deribfy_lecture_publique).toBe('produit')
  })

  it('RÈGLE 5 : nom choisi et accord DÉJÀ donné pour cette liste → Stripe directement, sans fenêtre', async () => {
    avecListe([PRODUITS])
    await clic('atelier')
    fenetres.length = 0
    expect(await clic('Mes projets')).toEqual({ type: 'paiement' })
    expect(fenetres, 'la fenêtre réapparaît alors que rien n’a changé').toEqual([])
    // L'accord gardé voyage chez Stripe comme avant.
    expect(etat.sessions[1]?.metadata.deribfy_lecture_publique).toBe('produit')
  })

  it('les données publiques ONT CHANGÉ depuis l’accord : la fenêtre revient, avec la nouvelle liste, nom figé', async () => {
    avecListe([PRODUITS])
    await clic('atelier')
    avecListe([PRODUITS, { id: 'client', name: 'Clients', lecturePublique: true, fields: [{ id: 'tel', name: 'telephone', type: 'text', required: true }] }])
    fenetres.length = 0
    expect(await clic('atelier')).toEqual({ type: 'paiement' })
    expect(fenetres).toHaveLength(1)
    expect(fenetres[0]).toMatchObject({ adresseInitiale: 'gestion-stock', adresseModifiable: false })
    expect(fenetres[0]?.listes.map((l) => l.nom)).toEqual(['Produits', 'Clients'])
  })

  it('rien de public : pas de phrase dans la fenêtre', async () => {
    await clic('atelier')
    expect(fenetres[0]?.listes).toEqual([])
  })

  it('appli DÉJÀ payée, sans nom : la fenêtre dit « Publier », pas « Continuer vers le paiement »', async () => {
    etat.paye = true
    expect(await clic('atelier')).toMatchObject({ type: 'publiee', lien: 'https://gestion-stock.deribfy.app' })
    expect(fenetres[0]?.libelleBouton).toBe('Publier')
    expect(etat.sessions).toEqual([])
  })

  it('la route garde l’accord pour la liste EXACTE, et ne le rejoue pas pour une autre', async () => {
    avecListe([PRODUITS])
    await clic('atelier')
    const garde = (etat.appli.sections_acquises as Record<string, { tables?: string }>).accordLecturePublique
    expect(garde?.tables).toBe('produit')
    // Une appel SANS accord dans le corps, liste inchangée : accepté par l'accord gardé.
    const r = await appelDe(PUBLIER, '/api/generateur/publier?id=app-stock', { method: 'POST' })
    expect(r.status, 'l’accord gardé n’est pas reconnu').toBe(200)
    // Liste changée : refus 409, la question revient.
    avecListe([PRODUITS, { id: 'client', name: 'Clients', lecturePublique: true, fields: [] }])
    expect((await appelDe(PUBLIER, '/api/generateur/publier?id=app-stock', { method: 'POST' })).status).toBe(409)
  })
})


describe('MOBILE MONEY DANS LA FENÊTRE « PUBLIER » (2026-11-24)', () => {
  const fenetreDu = () => fenetres[fenetres.length - 1]!
  it('carte ET mobile money ouverts : la fenêtre propose les deux, UN bouton « Publier », sans prix ni « frais »', async () => {
    etat.mm = true
    moyenChoisi = 'carte'
    expect(await clic('atelier')).toEqual({ type: 'paiement' })
    const f = fenetreDu()
    expect(f.moyens).toEqual(['carte', 'mobile_money'])
    expect(f.libelleBouton).toBe('Publier')
    expect(f.mobileMoney?.app).toBe('app-stock')
    const vu = JSON.stringify({ titre: f.titre, bouton: f.libelleBouton, moyens: f.moyens, LIBELLE_MOYEN })
    expect(vu).not.toMatch(/frais|%|FCFA|\$|[0-9]{3}/iu)
    expect(LIBELLE_MOYEN).toEqual({ carte: 'Carte bancaire', mobile_money: 'Mobile money (Airtel / Moov)' })
    // La carte choisie : Stripe, comme avant.
    expect(etat.sessions).toHaveLength(1)
  })
  it('mobile money choisi : le nom s’enregistre, AUCUNE page Stripe, la fenêtre passe au formulaire', async () => {
    etat.mm = true
    moyenChoisi = 'mobile_money'
    expect(await clic('Mes projets')).toEqual({ type: 'mobile_money' })
    expect(etat.appli.publication_slug).toBe('gestion-stock')
    expect(etat.appli.publication_jeton, 'publiée sans paiement').toBeNull()
    expect(etat.sessions).toEqual([])
    expect(ouvertes).toEqual([])
    expect(erreursFenetre).toEqual([])
  })
  it('carte FERMÉE, mobile money ouvert : « Publier » propose le mobile money (plus « paiement pas ouvert »)', async () => {
    etat.carte = ''
    etat.mm = true
    const r = await (await ETAT(new Request('https://www.deribfy.com/api/generateur/publier/etat?id=app-stock', { headers: { Authorization: 'Bearer x' } }))).json() as { action: string; moyens: string[] }
    expect(r).toMatchObject({ action: 'payer', moyens: ['mobile_money'] })
  })
  it('nom déjà choisi, rien à accepter, mobile money seul : la fenêtre s’ouvre quand même (le formulaire y est)', async () => {
    etat.carte = ''
    etat.mm = true
    etat.appli.publication_slug = 'gestion-stock'
    moyenChoisi = 'mobile_money'
    expect(await clic('atelier')).toEqual({ type: 'mobile_money' })
    expect(fenetres).toHaveLength(1)
    expect(fenetreDu().moyens).toEqual(['mobile_money'])
  })
  it('nom déjà choisi, carte seule : droit à Stripe sans fenêtre, comme avant', async () => {
    etat.appli.publication_slug = 'gestion-stock'
    expect(await clic('atelier')).toEqual({ type: 'paiement' })
    expect(fenetres).toEqual([])
  })
  it('tarif mobile money incomplet : seule la carte est proposée ; tout fermé : la phrase', async () => {
    etat.mm = true
    etat.tarifMm = false
    const lire = async () => (await (await ETAT(new Request('https://www.deribfy.com/api/generateur/publier/etat?id=app-stock', { headers: { Authorization: 'Bearer x' } }))).json()) as { action: string; moyens: string[] }
    expect(await lire()).toMatchObject({ action: 'payer', moyens: ['carte'] })
    etat.carte = ''
    expect(await lire()).toMatchObject({ action: 'fermee', moyens: [] })
  })
  it('la route refuse un moyen fermé (409) ou inconnu (400) : rien n’est écrit, rien n’est ouvert', async () => {
    const poster = (moyen: string) => PUBLIER(new Request(`https://www.deribfy.com/api/generateur/publier?id=app-stock&sous=gestion-stock&moyen=${moyen}`, { method: 'POST', headers: { Authorization: 'Bearer x' } }))
    const r1 = await poster('mobile_money')
    expect(r1.status).toBe(409)
    expect(((await r1.json()) as { error: string }).error).toBe(PHRASE_MOYEN_FERME)
    expect((await poster('bitcoin')).status).toBe(400)
    expect(etat.appli.publication_slug).toBeNull()
    expect(etat.sessions).toEqual([])
  })
  it('appli déjà payée : aucun moyen, « Publier » publie', async () => {
    etat.mm = true
    etat.paye = true
    const r = await (await ETAT(new Request('https://www.deribfy.com/api/generateur/publier/etat?id=app-stock', { headers: { Authorization: 'Bearer x' } }))).json() as { action: string; moyens: string[] }
    expect(r).toMatchObject({ action: 'publier', moyens: [] })
    etat.paye = false
  })
})


describe('A1 · B · « tous » pour la carte (2026-11-24)', () => {
  const lireEtat = async () => (await (await ETAT(new Request('https://www.deribfy.com/api/generateur/publier/etat?id=app-stock', { headers: { Authorization: 'Bearer x' } }))).json()) as { action: string; moyens: string[] }
  it('A1 · compte fondateur (hors quota) : publier N’EST PLUS gratuit — la fenêtre propose les moyens, rien n’est publié sans paiement', async () => {
    for (const email of ['issayamiyoussouf@gmail.com', 'abbasissay@gmail.com']) {
      etat.email = email
      etat.carte = email
      etat.mm = true
      expect(await lireEtat(), email).toMatchObject({ action: 'payer', moyens: ['carte', 'mobile_money'] })
    }
    moyenChoisi = 'mobile_money'
    expect(await clic('Mes projets')).toEqual({ type: 'mobile_money' })
    expect(etat.appli.publication_jeton, 'publiée sans paiement').toBeNull()
  })
  it('« abonnement_carte = tous » : la carte est proposée à N’IMPORTE QUEL compte, avec le mobile money', async () => {
    etat.carte = 'tous'
    etat.mm = true
    for (const email of ['client@exemple.com', 'autre@x.td', 'contact@deribfy.com']) {
      etat.email = email
      expect(await lireEtat(), email).toMatchObject({ action: 'payer', moyens: ['carte', 'mobile_money'] })
    }
    etat.carte = ' TOUS '
    expect(await lireEtat(), 'casse et espaces').toMatchObject({ moyens: ['carte', 'mobile_money'] })
    etat.carte = 'tous les comptes'
    expect(await lireEtat(), 'seul « tous » exactement').toMatchObject({ moyens: ['mobile_money'] })
  })
  it('B · « Publier » sur une appli DÉJÀ en ligne : réussi ET dit (dejaEnLigne) ; une première publication ne le dit pas', async () => {
    etat.paye = true
    etat.appli.publication_slug = 'gestion-stock'
    const premiere = await clic('atelier')
    expect(premiere).toMatchObject({ type: 'publiee', dejaEnLigne: false })
    const seconde = await clic('Mes projets')
    expect(seconde).toMatchObject({ type: 'publiee', dejaEnLigne: true })
    etat.paye = false
  })
  it('B · les deux écrans affichent la phrase quand c’est déjà en ligne', () => {
    expect(PHRASE_DEJA_EN_LIGNE).toBe('Votre application est déjà en ligne : rien n’a changé, son adresse reste la même.')
    expect(PAGES.atelier).toMatch(motifTexte('if (issue.dejaEnLigne) setAvisPublication({ texte: PHRASE_DEJA_EN_LIGNE, publierMaintenant: false });'))
    expect(PAGES['Mes projets']).toMatch(motifTexte('deja: issue.dejaEnLigne'))
    expect(PAGES['Mes projets']).toMatch(motifTexte('{lienPublic?.id === a.id && lienPublic.deja === true && ('))
    expect(PAGES['Mes projets']).toMatch(motifTexte('{PHRASE_DEJA_EN_LIGNE}'))
  })
})


describe('ADRESSE · jamais une adresse prise proposée ni acceptée (2026-11-24)', () => {
  const lireEtat = async () => (await (await ETAT(new Request('https://www.deribfy.com/api/generateur/publier/etat?id=app-stock', { headers: { Authorization: 'Bearer x' } }))).json()) as { adresseProposee: string | null }
  const verifier = async (sous: string, id = 'app-stock') => {
    const r = await VERIFIER_NOM(new Request(`https://www.deribfy.com/api/generateur/publier/nom?id=${id}&sous=${encodeURIComponent(sous)}`, { headers: { Authorization: 'Bearer x' } }))
    return { status: r.status, d: (await r.json()) as Record<string, unknown> }
  }
  it('le défaut mesuré : « Gestion pharmacie », `gestion-pharmacie` tenue par une AUTRE appli → le serveur propose `gestion-pharmacie-2`', async () => {
    etat.appli.nom = 'Gestion pharmacie'
    etat.autre = { id: 'autre-app', publication_slug: 'gestion-pharmacie' }
    expect((await lireEtat()).adresseProposee).toBe('gestion-pharmacie-2')
    // Et la fenêtre la montre telle quelle, sans le calcul local.
    reponseAuNom = null
    await clic('Mes projets')
    expect(fenetres[0]?.adresseInitiale).toBe('gestion-pharmacie-2')
  })
  it('libre : le nom lui-même ; nom déjà enregistré : rien de proposé (le sien fait foi)', async () => {
    etat.appli.nom = 'Gestion pharmacie'
    expect((await lireEtat()).adresseProposee).toBe('gestion-pharmacie')
    etat.appli.publication_slug = 'mon-nom'
    expect((await lireEtat()).adresseProposee).toBeNull()
  })
  it('la vérification en direct : prise → la phrase claire ; libre → libre ; format → la règle ; rien n’est écrit', async () => {
    etat.autre = { id: 'autre-app', publication_slug: 'gestion-pharmacie' }
    expect(await verifier('gestion-pharmacie')).toEqual({ status: 200, d: { libre: false, raison: 'prise_appli', message: '« gestion-pharmacie » est déjà prise par une autre application. Choisissez-en une autre.' } })
    expect(await verifier('ma-pharmacie')).toEqual({ status: 200, d: { libre: true } })
    expect(await verifier('A')).toEqual({ status: 200, d: { libre: false, raison: 'format', message: PHRASE_ADRESSE_FORMAT } })
    expect(etat.appli.publication_slug).toBeNull()
  })
  it('la vérification ne lit que SES applis : une autre → 404', async () => {
    expect((await verifier('x-y-z', 'inconnue')).status).toBe(404)
  })
  it('et jamais acceptée : valider une adresse prise reste refusé par la route, rien n’est écrit ni payé', async () => {
    etat.autre = { id: 'autre-app', publication_slug: 'gestion-pharmacie' }
    reponseAuNom = 'gestion-pharmacie'
    expect(await clic('atelier')).toEqual({ type: 'annulee' })
    expect(erreursFenetre[0]).toMatch(motifTexte('deja pris'))
    expect(etat.appli.publication_slug).toBeNull()
    expect(etat.sessions).toEqual([])
  })
  it('la fenêtre reçoit la vérification en direct quand l’adresse est libre de choix, pas quand elle est figée', async () => {
    reponseAuNom = null
    await clic('atelier')
    expect(typeof fenetres[0]?.verifier).toBe('function')
    expect(await fenetres[0]?.verifier?.('autre-libre')).toBeNull()
    etat.autre = { id: 'autre-app', publication_slug: 'deja-la' }
    expect(await fenetres[0]?.verifier?.('deja-la')).toMatch(motifTexte('déjà prise'))
    etat.appli.publication_slug = 'fige'
    fenetres.length = 0
    await clic('atelier')
    expect(fenetres[0]?.verifier ?? null).toBeNull()
  })
})


describe('REFONTE · la validation rend la confirmation à la fenêtre (2026-11-24)', () => {
  it('appli payée, adresse à choisir : la fenêtre reçoit le LIEN (elle montre « Ouvrir »), pas un simple « fermer »', async () => {
    etat.paye = true
    resultatsFenetre.length = 0
    expect(await clic('atelier')).toMatchObject({ type: 'publiee', dejaEnLigne: false })
    expect(resultatsFenetre).toHaveLength(1)
    expect(resultatsFenetre[0]).toMatchObject({ dejaEnLigne: false })
    expect(resultatsFenetre[0], 'le compte doit voyager jusqu’à la Confirmation').toHaveProperty('compte')
    expect(typeof fenetres[0]?.compte?.lire).toBe('function')
    expect(typeof fenetres[0]?.compte?.creerMotDePasse).toBe('function')
    expect(String((resultatsFenetre[0] as { lien: string }).lien)).toMatch(/gestion-stock/u)
    etat.paye = false
  })
})
