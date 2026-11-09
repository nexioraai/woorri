import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable, type Filtre } from '@/lib/testing/postgrest'

// ============================================================
// LOT 12.1 — LES DOCUMENTS D'UN COMPTE.
//
// C'EST LA SURFACE LA PLUS SENSIBLE DU CHANTIER. Une erreur ici ne donne
// pas une page moche : elle donne l'agrément d'un fournisseur à son
// concurrent, ou la facture d'un hôpital à un autre.
//
// SIX RÈGLES QUE LE CODE SEUL NE DIT PAS :
//   · le titulaire ne voit QUE son dossier — un `?compte=` reçu est ignoré ;
//   · le filtre par SITE reste partout, même avec un identifiant précis ;
//   · le SENS se déduit de qui dépose, il ne se demande pas ;
//   · `chemin` ne sort jamais — c'est la clé dans le seau ;
//   · un document RETIRÉ ne se télécharge plus, mais sa ligne reste ;
//   · chacun ne retire QUE ce qu'il a déposé.
// ============================================================

const journal = journalVierge()
let sitesPublic: ReponseTable = { data: null, error: null }
let sitesTable: ReponseTable = { data: { ouvre_des_comptes: true, pieces_fournisseur: [] }, error: null }
let comptes: ReponseTable = { data: null, error: null }
let documents: ReponseTable = { data: [], error: null }

let porteur: { id: string; email: string } | null = null
let estProprietaire = false
let insere: Record<string, unknown> | null = null
let modifie: Record<string, unknown> | null = null
let filtresMaj: string[] = []
let deposes: string[] = []
let retires: string[] = []
let signes: string[] = []
let optionsDepot: Record<string, unknown>[] = []

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: porteur }, error: null }) } }),
}))

vi.mock('@/lib/auth/require-site-owner', () => ({
  requireSiteOwner: async () =>
    estProprietaire
      ? { site: { id: 'site-1', slug: 'cpa' } }
      : { response: new Response(null, { status: 403 }) },
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => {
      const base = creerFrom({
        sites_public: { reponse: () => sitesPublic },
        sites: { reponse: () => sitesTable },
        site_comptes: { reponse: () => comptes },
        comptes_documents: { reponse: () => documents },
      }, journal)(t)
      return Object.assign(base, {
        insert: (ligne: Record<string, unknown>) => {
          insere = ligne
          return { select: () => ({ single: async () => ({ data: { id: 'd1', ...ligne }, error: null }) }) }
        },
        update: (ligne: Record<string, unknown>) => {
          modifie = ligne; filtresMaj = []
          const c: Record<string, unknown> = {
            eq: (col: string) => { filtresMaj.push(col); return c },
            select: () => c,
            maybeSingle: async () => ({ data: { id: 'd1', retire_le: ligne.retire_le }, error: null }),
          }
          return c
        },
      })
    },
    storage: {
      from: () => ({
        upload: async (chemin: string, _f: unknown, opts?: Record<string, unknown>) => {
          deposes.push(chemin); optionsDepot.push(opts ?? {}); return { error: null }
        },
        remove: async (l: string[]) => { retires.push(...l); return { error: null } },
        createSignedUrl: async (chemin: string, s: number) => {
          signes.push(chemin)
          return { data: { signedUrl: `https://stockage.test/signe/${chemin}?exp=${s}` }, error: null }
        },
      }),
    },
  },
}))

import { GET, POST, DELETE } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const JETON = { authorization: 'Bearer jeton' }

const DOC = {
  id: 'd1', compte_id: 'c-moi', sens: 'vers_le_compte', depose_par: 'u-centrale',
  nom: 'Agrément 2026.pdf', chemin: 'sites/site-1/comptes/c-moi/abc-agrement.pdf',
  octets: 1234, type_mime: 'application/pdf',
  depose_le: '2026-11-09', retire_le: null, retire_par: null,
}

beforeEach(() => {
  porteur = { id: 'u-moi', email: 'fournisseur@labo.td' }
  estProprietaire = false
  sitesPublic = { data: { id: 'site-1' }, error: null }
  sitesTable = { data: { ouvre_des_comptes: true, pieces_fournisseur: [{ cle: 'agrement', libelle: 'Agrément', obligatoire: true }] }, error: null }
  comptes = { data: { id: 'c-moi', etat: 'actif' }, error: null }
  documents = { data: [DOC], error: null }
  insere = null; modifie = null; filtresMaj = []
  deposes = []; retires = []; signes = []; optionsDepot = []
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
})

const filtres = (t: string): Filtre[] => journal.filtres[t] ?? []
const req = (q = '') => new Request(`https://x.test/api/sites/cpa/documents${q}`, { headers: JETON })

describe('qui peut approcher ce dossier', () => {
  it('🔴 sans jeton, le MÊME refus', async () => {
    const r = await GET(new Request('https://x.test/'), params)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ error: 'Accès refusé.' })
  })

  it('🔴 un compte NON ACTIF ne voit aucune pièce', async () => {
    // Un dossier en attente d'examen ne donne aucun accès : sinon l'examen
    // serait décoratif.
    for (const etat of ['en_attente', 'suspendu']) {
      comptes = { data: { id: 'c-moi', etat }, error: null }
      expect((await GET(req('?compte=c-moi'), params)).status, etat).toBe(403)
    }
  })

  it('🔴 un site qui n’ouvre pas de comptes n’a pas de dossiers', async () => {
    sitesTable = { data: { ouvre_des_comptes: false }, error: null }
    expect((await GET(req(), params)).status).toBe(403)
  })
})

describe('le titulaire ne voit QUE son dossier', () => {
  it('🔴 un `?compte=` reçu est IGNORÉ', async () => {
    // L'accepter ferait de cette route l'annuaire des pièces du site.
    await GET(req('?compte=c-du-concurrent'), params)
    expect(filtres('comptes_documents')).toContainEqual(['eq', 'compte_id', 'c-moi'])
    expect(filtres('comptes_documents').some((f) => String(f[2]).includes('concurrent'))).toBe(false)
  })

  it('🔴 le filtre par SITE est posé', async () => {
    await GET(req(), params)
    expect(filtres('comptes_documents')).toContainEqual(['eq', 'site_id', 'site-1'])
  })

  it('🔴 `chemin` ne sort JAMAIS', async () => {
    // C'est la clé dans le seau : la rendre donne une prise à qui chercherait
    // à deviner, et n'apporte rien à l'écran.
    const d = await (await GET(req(), params)).json()
    expect(JSON.stringify(d)).not.toContain('chemin')
    expect(JSON.stringify(d)).not.toContain('agrement.pdf')
  })

  it('🔴 l’écran apprend s’il PEUT retirer, sans apprendre QUI a déposé', async () => {
    const d = await (await GET(req(), params)).json()
    expect(d.documents[0]).toHaveProperty('parMoi', false)
    expect(JSON.stringify(d)).not.toContain('u-centrale')
  })
})

describe('déposer', () => {
  const depot = (nom = 'piece.pdf', compte?: string, sens?: string, piece?: string) => {
    const f = new FormData()
    f.append('fichier', new File(['x'], nom, { type: 'application/pdf' }))
    if (compte) f.append('compte', compte)
    if (sens) f.append('sens', sens)
    if (piece) f.append('piece', piece)
    return new Request('https://x.test/api/sites/cpa/documents', { method: 'POST', headers: JETON, body: f })
  }

  it('🔴 le SENS se déduit de qui dépose — un titulaire ne dépose pas « de la part de la Centrale »', async () => {
    await POST(depot(), params)
    expect(insere).toMatchObject({ sens: 'vers_la_centrale', depose_par: 'u-moi' })
  })

  it('🔴 un `sens` SOUFFLÉ dans le formulaire est ignoré', async () => {
    // PREMIER JET AVEUGLE : aucun test n'envoyait de `sens`, donc la
    // mutation qui le lisait du formulaire tombait sur son repli et restait
    // verte. Sans cette ligne, un fournisseur déposerait une pièce « de la
    // part de la Centrale » — et personne ne le verrait.
    await POST(depot('faux.pdf', undefined, 'vers_le_compte'), params)
    expect(insere).toMatchObject({ sens: 'vers_la_centrale' })
  })

  it('🔴 le dépôt refuse d’ÉCRASER, en plus du chemin unique', async () => {
    // Le chemin unique suffirait en théorie. `upsert: false` est la seconde
    // ceinture : si un jour le chemin cessait d'être unique, le stockage
    // refuserait au lieu d'effacer en silence une pièce dont la ligne
    // continuerait de prétendre qu'elle existe.
    await POST(depot(), params)
    expect(optionsDepot[0]).toMatchObject({ upsert: false })
  })

  it('🔴 une pièce DÉCLARÉE par la Centrale se rattache', async () => {
    await POST(depot('agrement.pdf', undefined, undefined, 'agrement'), params)
    expect(insere).toMatchObject({ piece: 'agrement' })
  })

  it('🔴 une pièce NON DEMANDÉE est refusée, et RIEN n’est déposé', async () => {
    // Le vocabulaire est fermé, mais il n'est pas écrit dans la route : il
    // est DÉCLARÉ par la Centrale. Accepter une clé inconnue poserait un
    // rattachement qui n'honore rien — le dossier resterait incomplet pour
    // toujours, et personne ne comprendrait pourquoi.
    const r = await POST(depot('x.pdf', undefined, undefined, 'inventee'), params)
    expect(r.status).toBe(400)
    expect(insere).toBeNull()
    // ET LE REFUS ARRIVE AVANT LE DÉPÔT : refuser après avoir écrit dans le
    // seau laisserait un octet payé que plus rien ne nomme.
    expect(deposes).toHaveLength(0)
  })

  it('🔴 sans pièce, le dépôt reste LIBRE — c’est le cas courant', async () => {
    await POST(depot(), params)
    expect(insere).toMatchObject({ piece: null })
  })

  it('🔴 côté Centrale, le sens est l’autre', async () => {
    estProprietaire = true
    porteur = { id: 'u-centrale', email: 'cpa@sante.td' }
    comptes = { data: { id: 'c-moi' }, error: null }
    await POST(depot('note.pdf', 'c-moi'), params)
    expect(insere).toMatchObject({ sens: 'vers_le_compte', depose_par: 'u-centrale' })
  })

  it('🔴 un compte d’un AUTRE site est refusé, et rien n’est écrit', async () => {
    estProprietaire = true
    porteur = { id: 'u-centrale', email: 'cpa@sante.td' }
    comptes = { data: null, error: null }
    const r = await POST(depot('note.pdf', 'c-ailleurs'), params)
    expect(r.status).toBe(403)
    expect(insere).toBeNull()
  })

  it('🔴 deux fichiers du même nom ne s’écrasent PAS', async () => {
    // Le second effacerait silencieusement le premier, dont la ligne
    // continuerait de prétendre qu'il existe.
    await POST(depot('rapport.pdf'), params)
    await POST(depot('rapport.pdf'), params)
    expect(deposes).toHaveLength(2)
    expect(deposes[0]).not.toBe(deposes[1])
  })

  it('🔴 le chemin range la pièce SOUS le site ET sous le compte', async () => {
    await POST(depot(), params)
    expect(deposes[0]).toMatch(/^sites\/site-1\/comptes\/c-moi\//)
  })

  it('🔴 sans fichier, rien n’est déposé', async () => {
    const f = new FormData()
    const r = await POST(new Request('https://x.test/', { method: 'POST', headers: JETON, body: f }), params)
    expect(r.status).toBe(400)
    expect(deposes).toHaveLength(0)
  })
})

describe('télécharger', () => {
  it('🔴 un lien SIGNÉ, jamais une adresse publique', async () => {
    // LA FIXTURE DOIT ÊTRE UNE LIGNE, PAS UNE LISTE : ce chemin lit en
    // `maybeSingle`. Premier jet : le tableau du `beforeEach`, dont
    // `compte_id` vaut `undefined` — la route refusait, à juste titre, et le
    // test mesurait un refus en croyant mesurer une signature.
    documents = { data: DOC, error: null }
    const d = await (await GET(req('?telecharger=d1'), params)).json()
    expect(d.url).toContain('/signe/')
    expect(signes).toHaveLength(1)
  })

  it('🔴 la signature est COURTE', async () => {
    // Un lien permanent transmis une fois ferait fuir la pièce pour toujours.
    documents = { data: DOC, error: null }
    const d = await (await GET(req('?telecharger=d1'), params)).json()
    expect(d.expireDans).toBeLessThanOrEqual(300)
  })

  it('🔴 le dossier d’un AUTRE compte ne se signe pas', async () => {
    documents = { data: { ...DOC, compte_id: 'c-du-concurrent' }, error: null }
    expect((await GET(req('?telecharger=d1'), params)).status).toBe(403)
    expect(signes).toHaveLength(0)
  })

  it('🔴 un document RETIRÉ ne se télécharge plus', async () => {
    documents = { data: { ...DOC, retire_le: '2026-11-10' }, error: null }
    const r = await GET(req('?telecharger=d1'), params)
    expect(r.status).toBe(410)
    expect(signes).toHaveLength(0)
  })

  it('🔴 le filtre par SITE est posé même avec un identifiant précis', async () => {
    documents = { data: DOC, error: null }
    await GET(req('?telecharger=d1'), params)
    expect(filtres('comptes_documents').map((f) => f[1])).toContain('site_id')
  })
})

describe('retirer', () => {
  const sup = (id = 'd1') =>
    new Request(`https://x.test/api/sites/cpa/documents?id=${id}`, { method: 'DELETE', headers: JETON })

  it('🔴 on ne retire QUE ce qu’on a déposé', async () => {
    // La Centrale ne fait pas disparaître l'agrément qu'un fournisseur lui a
    // remis, et réciproquement.
    documents = { data: { ...DOC, depose_par: 'u-centrale' }, error: null }
    const r = await DELETE(sup(), params)
    expect(r.status).toBe(403)
    expect(retires).toHaveLength(0)
    expect(modifie).toBeNull()
  })

  it('🔴 retirer garde la LIGNE et enlève le FICHIER', async () => {
    // « Ce document a existé et a été retiré le 12 » est une information ;
    // une disparition sans trace permettrait de nier un dépôt.
    documents = { data: { ...DOC, depose_par: 'u-moi' }, error: null }
    const r = await DELETE(sup(), params)
    expect(r.status).toBe(200)
    expect(retires).toContain(DOC.chemin)
    expect(modifie).toMatchObject({ retire_par: 'u-moi' })
    expect(String(modifie?.retire_le).length).toBeGreaterThan(0)
  })

  it('🔴 la date ET l’auteur partent ensemble', async () => {
    // Une date sans auteur décrit un retrait que personne ne peut raconter —
    // et la base le refuserait de toute façon.
    documents = { data: { ...DOC, depose_par: 'u-moi' }, error: null }
    await DELETE(sup(), params)
    expect(Object.keys(modifie ?? {}).sort()).toEqual(['retire_le', 'retire_par'])
  })

  it('🔴 l’écriture est filtrée par SITE', async () => {
    documents = { data: { ...DOC, depose_par: 'u-moi' }, error: null }
    await DELETE(sup(), params)
    expect(filtresMaj).toContain('site_id')
  })

  it('🔴 retirer deux fois ne retire pas deux fois', async () => {
    documents = { data: { ...DOC, depose_par: 'u-moi', retire_le: '2026-11-10' }, error: null }
    await DELETE(sup(), params)
    expect(retires).toHaveLength(0)
    expect(modifie).toBeNull()
  })

  it('🔴 sans identifiant, rien n’est touché', async () => {
    const r = await DELETE(new Request('https://x.test/', { method: 'DELETE', headers: JETON }), params)
    expect(r.status).toBe(400)
    expect(retires).toHaveLength(0)
  })
})
