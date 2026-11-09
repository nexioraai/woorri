import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable, type Filtre } from '@/lib/testing/postgrest'

// ============================================================
// LOT 13.1 — POSTULER À UN APPEL D'OFFRES.
//
// C'EST LA SURFACE LA PLUS SENSIBLE DU CHANTIER, devant les documents : une
// offre contient un PRIX. Une erreur ici ne donne pas une page moche — elle
// donne le prix d'un soumissionnaire à son concurrent, et rend la procédure
// attaquable.
//
// SIX RÈGLES QUE LE CODE SEUL NE DIT PAS :
//   · postuler exige un compte ACTIF — s'inscrire ne suffit pas ;
//   · la Centrale ne postule pas à ses propres marchés ;
//   · on ne dépose plus après la date limite ;
//   · un avis en préparation ne reçoit rien ;
//   · un fournisseur ne voit QUE ses offres, et ne signe QUE les siennes ;
//   · seule la Centrale retient, écarte et répond.
// ============================================================

const journal = journalVierge()
let sitesPublic: ReponseTable = { data: null, error: null }
let sitesTable: ReponseTable = { data: { ouvre_des_comptes: true }, error: null }
let comptes: ReponseTable = { data: null, error: null }
let avisTable: ReponseTable = { data: null, error: null }
let offresTable: ReponseTable = { data: [], error: null }

let porteur: { id: string } | null = null
let estProprietaire = false
let insere: Record<string, unknown> | null = null
let modifie: Record<string, unknown> | null = null
let filtresMaj: string[] = []
let deposes: string[] = []
let retires: string[] = []
let signes: string[] = []

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: porteur }, error: null }) } }),
}))

vi.mock('@/lib/auth/require-site-owner', () => ({
  requireSiteOwner: async () =>
    estProprietaire ? { site: { id: 'site-1', slug: 'cpa' } } : { response: new Response(null, { status: 403 }) },
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => {
      const base = creerFrom({
        sites_public: { reponse: () => sitesPublic },
        sites: { reponse: () => sitesTable },
        site_comptes: { reponse: () => comptes },
        appels_offres: { reponse: () => avisTable },
        offres: { reponse: () => offresTable },
      }, journal)(t)
      return Object.assign(base, {
        insert: (ligne: Record<string, unknown>) => {
          insere = ligne
          return { select: () => ({ single: async () => ({ data: { id: 'o1', ...ligne }, error: null }) }) }
        },
        update: (ligne: Record<string, unknown>) => {
          modifie = ligne; filtresMaj = []
          const c: Record<string, unknown> = {
            eq: (col: string) => { filtresMaj.push(col); return c },
            select: () => c,
            maybeSingle: async () => ({ data: { id: 'o1', ...ligne }, error: null }),
          }
          return c
        },
      })
    },
    storage: {
      from: () => ({
        upload: async (chemin: string) => { deposes.push(chemin); return { error: null } },
        remove: async (l: string[]) => { retires.push(...l); return { error: null } },
        createSignedUrl: async (chemin: string, s: number) => {
          signes.push(chemin)
          return { data: { signedUrl: `https://stockage.test/signe/${chemin}?exp=${s}` }, error: null }
        },
      }),
    },
  },
}))

import { GET, POST, PATCH } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const JETON = { authorization: 'Bearer jeton' }
const DEMAIN = new Date(Date.now() + 86400000).toISOString()
const HIER = new Date(Date.now() - 86400000).toISOString()

const OFFRE = {
  id: 'o1', avis_id: 'a1', compte_id: 'c-moi', nom: 'Dr Ahmat', contact: 'ahmat@labo.td',
  prix: 150000, devise: 'XAF', chemin: 'sites/site-1/avis/a1/abc-offre.pdf',
  nom_fichier: 'offre.pdf', octets: 2048, type_mime: 'application/pdf',
  etat: 'recue', reponse: null, repondu_le: null, depose_le: '2026-11-09', site_id: 'site-1',
}

beforeEach(() => {
  porteur = { id: 'u-moi' }
  estProprietaire = false
  sitesPublic = { data: { id: 'site-1' }, error: null }
  sitesTable = { data: { ouvre_des_comptes: true }, error: null }
  comptes = { data: { id: 'c-moi', etat: 'actif' }, error: null }
  avisTable = { data: { id: 'a1', etat: 'ouvert', publie: true, remise_le: DEMAIN }, error: null }
  offresTable = { data: [OFFRE], error: null }
  insere = null; modifie = null; filtresMaj = []
  deposes = []; retires = []; signes = []
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
})

const filtres = (t: string): Filtre[] => journal.filtres[t] ?? []
const req = (q = '') => new Request(`https://x.test/api/sites/cpa/offres${q}`, { headers: JETON })

const depot = (champs: Record<string, string> = {}, avecFichier = true) => {
  const f = new FormData()
  if (avecFichier) f.append('fichier', new File(['x'], 'offre.pdf', { type: 'application/pdf' }))
  f.append('avis', 'a1'); f.append('nom', 'Dr Ahmat'); f.append('contact', 'ahmat@labo.td')
  for (const [k, v] of Object.entries(champs)) f.set(k, v)
  return new Request('https://x.test/api/sites/cpa/offres', { method: 'POST', headers: JETON, body: f })
}

describe('qui peut postuler', () => {
  it('🔴 sans jeton, le MÊME refus', async () => {
    const r = await POST(new Request('https://x.test/', { method: 'POST', body: new FormData() }), params)
    expect(r.status).toBe(403)
    expect(insere).toBeNull()
  })

  it('🔴 une SESSION ne suffit pas : il faut un compte ACTIF', async () => {
    // S'inscrire est à la portée de n'importe qui. Répondre à un marché
    // public demande d'avoir été ADMIS.
    for (const etat of ['en_attente', 'suspendu']) {
      comptes = { data: { id: 'c-moi', etat }, error: null }
      expect((await POST(depot(), params)).status, etat).toBe(403)
      expect(insere, etat).toBeNull()
    }
  })

  it('🔴 la CENTRALE ne postule pas à ses propres marchés', async () => {
    estProprietaire = true
    const r = await POST(depot(), params)
    expect(r.status).toBe(403)
    expect(insere).toBeNull()
  })
})

describe('quand on peut postuler', () => {
  it('🔴 PAS après la date limite — et le refus dit la date', async () => {
    // Une offre arrivée après coup rendrait la procédure attaquable par
    // tous les autres soumissionnaires.
    avisTable = { data: { id: 'a1', etat: 'ouvert', publie: true, remise_le: HIER }, error: null }
    const r = await POST(depot(), params)
    expect(r.status).toBe(409)
    expect(String((await r.json()).error)).toContain(HIER.slice(0, 10))
    expect(deposes).toHaveLength(0)
  })

  it('🔴 PAS sur un avis en préparation', async () => {
    // On répondrait à des conditions qui peuvent encore changer.
    avisTable = { data: { id: 'a1', etat: 'preparation', publie: true, remise_le: DEMAIN }, error: null }
    expect((await POST(depot(), params)).status).toBe(409)
    expect(insere).toBeNull()
  })

  it('🔴 PAS sur un avis non publié', async () => {
    avisTable = { data: { id: 'a1', etat: 'ouvert', publie: false, remise_le: DEMAIN }, error: null }
    expect((await POST(depot(), params)).status).toBe(409)
  })

  it('🔴 PAS sur un avis d’un AUTRE site', async () => {
    avisTable = { data: null, error: null }
    expect((await POST(depot(), params)).status).toBe(403)
    expect(insere).toBeNull()
  })

  it('🔴 sans date limite déclarée, le dépôt reste possible', async () => {
    // Une date absente n'est pas une date dépassée.
    avisTable = { data: { id: 'a1', etat: 'ouvert', publie: true, remise_le: null }, error: null }
    expect((await POST(depot(), params)).status).toBe(201)
  })
})

describe('ce qui est écrit', () => {
  it('🔴 l’identité vient du JETON, jamais du formulaire', async () => {
    await POST(depot({ compte: 'c-du-concurrent' }), params)
    expect(insere).toMatchObject({ compte_id: 'c-moi', site_id: 'site-1' })
  })

  it('🔴 `etat` n’est pas envoyé — une offre arrive `recue`', async () => {
    await POST(depot({ etat: 'retenue' }), params)
    expect(insere).not.toHaveProperty('etat')
  })

  it('🔴 un prix illisible vaut ABSENCE, il ne perd pas l’offre', async () => {
    // Refuser un dossier recevable parce qu'un chiffre est mal tapé serait
    // disproportionné.
    await POST(depot({ prix: 'cent mille' }), params)
    expect(insere).toMatchObject({ prix: null })
  })

  it('🔴 un prix correct passe, espaces et virgule compris', async () => {
    await POST(depot({ prix: '1 500,50' }), params)
    expect(insere).toMatchObject({ prix: 1500.5 })
  })

  it('🔴 sans fichier, rien n’est déposé', async () => {
    const r = await POST(depot({}, false), params)
    expect(r.status).toBe(400)
    expect(deposes).toHaveLength(0)
  })

  it('🔴 sans nom ni contact, rien n’est déposé', async () => {
    const f = new FormData()
    f.append('fichier', new File(['x'], 'o.pdf', { type: 'application/pdf' }))
    f.append('avis', 'a1')
    const r = await POST(new Request('https://x.test/', { method: 'POST', headers: JETON, body: f }), params)
    expect(r.status).toBe(400)
    expect(deposes).toHaveLength(0)
  })

  it('🔴 deux offres du même nom ne s’écrasent pas', async () => {
    await POST(depot(), params); await POST(depot(), params)
    expect(deposes).toHaveLength(2)
    expect(deposes[0]).not.toBe(deposes[1])
  })
})

describe('ce qui sort', () => {
  it('🔴 `chemin` ne sort JAMAIS', async () => {
    const d = await (await GET(req(), params)).json()
    expect(JSON.stringify(d)).not.toContain('chemin')
    expect(JSON.stringify(d)).not.toContain('abc-offre.pdf')
  })

  it('🔴 un fournisseur ne voit QUE ses offres', async () => {
    await GET(req(), params)
    expect(filtres('offres')).toContainEqual(['eq', 'compte_id', 'c-moi'])
  })

  it('🔴 le filtre par SITE est posé', async () => {
    await GET(req(), params)
    expect(filtres('offres')).toContainEqual(['eq', 'site_id', 'site-1'])
  })

  it('🔴 un fournisseur ne signe QUE sa propre offre', async () => {
    // Sans cette ligne, il lirait le prix de ses concurrents.
    offresTable = { data: { ...OFFRE, compte_id: 'c-du-concurrent' }, error: null }
    expect((await GET(req('?telecharger=o1'), params)).status).toBe(403)
    expect(signes).toHaveLength(0)
  })

  it('🔴 le lien est SIGNÉ et COURT', async () => {
    offresTable = { data: OFFRE, error: null }
    const d = await (await GET(req('?telecharger=o1'), params)).json()
    expect(d.url).toContain('/signe/')
    expect(d.expireDans).toBeLessThanOrEqual(300)
  })
})

describe('la Centrale analyse, choisit et répond', () => {
  const patch = (corps: unknown) =>
    new Request('https://x.test/api/sites/cpa/offres', {
      method: 'PATCH', headers: { ...JETON, 'content-type': 'application/json' }, body: JSON.stringify(corps),
    })

  beforeEach(() => { estProprietaire = true })

  it('🔴 elle retient une offre', async () => {
    await PATCH(patch({ id: 'o1', etat: 'retenue' }), params)
    expect(modifie).toMatchObject({ etat: 'retenue' })
  })

  it('🔴 un état inventé est refusé', async () => {
    const r = await PATCH(patch({ id: 'o1', etat: 'presque' }), params)
    expect(r.status).toBe(400)
    expect(modifie).toBeNull()
  })

  it('🔴 la réponse part AVEC sa date', async () => {
    await PATCH(patch({ id: 'o1', reponse: 'Offre retenue pour le lot 2.' }), params)
    expect(modifie).toMatchObject({ reponse: 'Offre retenue pour le lot 2.' })
    expect(String(modifie?.repondu_le ?? '').length).toBeGreaterThan(0)
  })

  it('🔴 effacer la réponse efface la date', async () => {
    // Une date sans réponse décrit un échange que personne ne peut
    // raconter — et la base le refuserait.
    await PATCH(patch({ id: 'o1', reponse: '   ' }), params)
    expect(modifie).toMatchObject({ reponse: null, repondu_le: null })
  })

  it('🔴 l’écriture est filtrée par SITE', async () => {
    await PATCH(patch({ id: 'o1', etat: 'retenue' }), params)
    expect(filtresMaj).toContain('site_id')
  })

  it('🔴 un FOURNISSEUR ne retient pas sa propre offre', async () => {
    // Ce serait s'admettre soi-même — le défaut que ce dépôt refuse ailleurs.
    estProprietaire = false
    const r = await PATCH(patch({ id: 'o1', etat: 'retenue' }), params)
    expect(r.status).toBe(403)
    expect(modifie).toBeNull()
  })

  it('🔴 un envoi qui ne change RIEN est refusé', async () => {
    const r = await PATCH(patch({ id: 'o1' }), params)
    expect(r.status).toBe(400)
    expect(modifie).toBeNull()
  })
})
