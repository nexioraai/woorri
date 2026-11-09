import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable, type Filtre } from '@/lib/testing/postgrest'

// ============================================================
// LOT 11 — « OÙ EN EST MON COMPTE ? »
//
// CE FICHIER EXISTE PARCE QUE LE LOT 10 N'EN AVAIT AUCUN. La route
// `/api/sites/[slug]/comptes` est partie sans appelant, sans test vitest et
// sans script versionné : ses « 17 + 7 + 11 points » étaient des mesures de
// séance, perdues le jour même. Une garde qu'aucun cliquet ne tient n'est
// pas une garde, c'est une intention.
//
// CE QUE CE CLIQUET TIENT, ET QUI NE SE DEVINE PAS :
//   · l'identité vient du JETON, jamais du corps ni d'un paramètre ;
//   · le filtre par SITE est posé, même quand on cherche par personne ;
//   · on ne peut pas se déclarer `agent` ;
//   · redemander ne réveille PAS un compte suspendu.
// ============================================================

const journal = journalVierge()
let sitesPublic: ReponseTable = { data: null, error: null }
let sitesTable: ReponseTable = { data: { ouvre_des_comptes: true }, error: null }
let comptes: ReponseTable = { data: null, error: null }
let insere: Record<string, unknown> | null = null
let modifie: Record<string, unknown> | null = null
let filtresMaj: string[] = []

/** Qui le jeton désigne. `null` = jeton absent ou invalide. */
let porteur: { id: string; email: string } | null = null

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: porteur }, error: null }) },
  }),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => {
      const base = creerFrom(
        {
          sites_public: { reponse: () => sitesPublic },
          sites: { reponse: () => sitesTable },
          site_comptes: { reponse: () => comptes },
        },
        journal,
      )(t)
      // `insert` n'est pas simulé par le harnais : on CAPTURE ce qui part,
      // parce que c'est exactement ce que la dette §10 concerne.
      return Object.assign(base, {
        // `update` n'est pas simule par le harnais : on CAPTURE ce qui part
        // ET les filtres poses -- c'est la regle « jamais la ligne d'autrui »
        // qu'il faut rendre observable.
        update: (ligne: Record<string, unknown>) => {
          modifie = ligne
          filtresMaj = []
          const chaine: Record<string, unknown> = {
            eq: (col: string) => { filtresMaj.push(col); return chaine },
            select: () => chaine,
            maybeSingle: async () => ({ data: { id: 'c1', ...ligne }, error: null }),
          }
          return chaine
        },
        insert: (ligne: Record<string, unknown>) => {
          insere = ligne
          return {
            select: () => ({
              single: async () => ({ data: { id: 'c1', ...ligne, etat: 'en_attente' }, error: null }),
            }),
          }
        },
      })
    },
  },
}))

import { GET, POST, PATCH } from '../route'

const SITE = { id: 'site-1', slug: 'cpa' }
const params = { params: Promise.resolve({ slug: 'cpa' }) }
const avecJeton = (corps?: unknown) =>
  new Request('https://x.test/api/sites/cpa/mon-compte', {
    method: corps === undefined ? 'GET' : 'POST',
    headers: { authorization: 'Bearer jeton-valable', 'content-type': 'application/json' },
    ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
  })

beforeEach(() => {
  porteur = { id: 'user-42', email: 'pharmacie@hopital.td' }
  sitesPublic = { data: SITE, error: null }
  sitesTable = { data: { ouvre_des_comptes: true }, error: null }
  comptes = { data: null, error: null }
  insere = null
  modifie = null
  filtresMaj = []
  for (const k of Object.keys(journal.filtres)) delete journal.filtres[k]
})

const filtres = (t: string): Filtre[] => journal.filtres[t] ?? []
const colonnes = (t: string) => filtres(t).map((f) => f[1])

describe('un inconnu n’apprend rien', () => {
  it('🔴 sans jeton, le MÊME refus — jamais une information', async () => {
    const r = await GET(new Request('https://x.test/'), params)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ error: 'Accès refusé.' })
  })

  it('🔴 un jeton que l’authentification ne reconnaît pas est un inconnu', async () => {
    porteur = null
    expect((await GET(avecJeton(), params)).status).toBe(403)
  })

  it('🔴 un site inconnu ou non publié rend le MÊME refus', async () => {
    // Pas un 404 : distinguer apprendrait qu'un site existe mais n'est pas
    // publié, ce que `fetchPage` refuse déjà de dire.
    sitesPublic = { data: null, error: null }
    const r = await GET(avecJeton(), params)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ error: 'Accès refusé.' })
  })
})

describe('un site qui n’ouvre pas de comptes n’en a pas', () => {
  // CACHER L'ÉCRAN NE SUFFIT PAS. Les quatre écrans d'accès sont des routes
  // MOTEUR : elles existent sur les 42 sites. Sans cette garde, il suffirait
  // d'appeler cette route à la main pour poser une ligne dans `site_comptes`
  // sur une boutique de fleurs.
  it('🔴 lecture refusée, du MÊME refus qu’un site inventé', async () => {
    sitesTable = { data: { ouvre_des_comptes: false }, error: null }
    const r = await GET(avecJeton(), params)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ error: 'Accès refusé.' })
  })

  it('🔴 demande refusée, et RIEN n’est écrit', async () => {
    sitesTable = { data: { ouvre_des_comptes: false }, error: null }
    const r = await POST(avecJeton({ role: 'structure', organisation: 'Fleuriste' }), params)
    expect(r.status).toBe(403)
    expect(insere).toBeNull()
  })

  it('🔴 une capacité ABSENTE vaut fermée — jamais ouverte par défaut', async () => {
    // `!!undefined` vaut faux par chance ; l'égalité stricte le dit par
    // décision. Une projection oubliée ne doit pas ouvrir 42 sites.
    sitesTable = { data: {}, error: null }
    expect((await GET(avecJeton(), params)).status).toBe(403)
  })
})

describe('une personne authentifiée voit SON compte, et rien d’autre', () => {
  it('🔴 la ligne est cherchée par l’identifiant DU JETON', async () => {
    await GET(avecJeton(), params)
    const f = filtres('site_comptes')
    expect(f).toContainEqual(['eq', 'user_id', 'user-42'])
  })

  it('🔴 le filtre par SITE est posé, même en cherchant par personne', async () => {
    // Sans lui, une personne ayant un compte sur un site verrait son état
    // sur tous les autres — la fuite que le harnais rend observable.
    await GET(avecJeton(), params)
    expect(colonnes('site_comptes')).toContain('site_id')
  })

  it('🔴 sans compte, la réponse le dit — elle ne refuse pas', async () => {
    // C'est tout le point de cette route : `requireSiteCompte` refuserait,
    // et la personne redemanderait indéfiniment.
    const r = await GET(avecJeton(), params)
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ compte: null })
  })

  it('🔴 un compte EN ATTENTE est rendu, pas masqué', async () => {
    comptes = { data: { id: 'c1', email: 'p@h.td', role: 'structure', etat: 'en_attente', organisation: 'Hôpital', reference: null, cree_le: '2026-11-09' }, error: null }
    const r = await GET(avecJeton(), params)
    expect((await r.json()).compte).toMatchObject({ etat: 'en_attente' })
  })

  it('🔴 `user_id` n’est JAMAIS rendu', async () => {
    // Le porteur connaît déjà le sien ; le renvoyer n'apprend rien à
    // personne d'utile, et l'inscrit dans des journaux de navigateur.
    //
    // LA FIXTURE DOIT LE CONTENIR, sinon ce test ne mesure RIEN : le harnais
    // projette depuis la ligne donnée, et une colonne absente de la fixture
    // ne sort pas même quand la projection la demande. Premier jet sans
    // `user_id` : la mutation qui l'ajoutait à `VU` restait verte.
    comptes = { data: { id: 'c1', user_id: 'user-42', email: 'p@h.td', role: 'structure', etat: 'actif', organisation: 'H', reference: null, cree_le: 'x' }, error: null }
    expect(JSON.stringify(await (await GET(avecJeton(), params)).json())).not.toContain('user_id')
  })
})

describe('demander un accès', () => {
  it('🔴 l’identité INSÉRÉE vient du jeton, jamais du corps — la dette §10', async () => {
    await POST(avecJeton({ role: 'structure', organisation: 'Hôpital général', user_id: 'je-choisis', email: 'autre@ailleurs.td' }), params)
    expect(insere).toMatchObject({ user_id: 'user-42', email: 'pharmacie@hopital.td' })
  })

  it('🔴 `etat` n’est pas envoyé — le déclencheur décide seul', async () => {
    await POST(avecJeton({ role: 'fournisseur', organisation: 'Labo' }), params)
    expect(insere).not.toHaveProperty('etat')
  })

  it('🔴 on ne peut pas se déclarer AGENT', async () => {
    // `agent` est un rôle de la Centrale : il s'accorde, il ne se réclame
    // pas. La CHECK de la base l'accepterait sans broncher.
    const r = await POST(avecJeton({ role: 'agent', organisation: 'Moi' }), params)
    expect(r.status).toBe(400)
    expect(insere).toBeNull()
  })

  it('🔴 un rôle inventé est refusé, et rien n’est écrit', async () => {
    for (const role of ['administrateur', '', 'STRUCTURE', 42]) {
      insere = null
      expect((await POST(avecJeton({ role, organisation: 'X' }), params)).status, String(role)).toBe(400)
      expect(insere).toBeNull()
    }
  })

  it('🔴 sans organisation, rien n’est écrit', async () => {
    const r = await POST(avecJeton({ role: 'structure' }), params)
    expect(r.status).toBe(400)
    expect(insere).toBeNull()
  })

  it('🔴 REDEMANDER NE RÉVEILLE PAS UN COMPTE SUSPENDU', async () => {
    // Sans cette règle, « suspendu » redeviendrait « en attente » en
    // recliquant, et le propriétaire pourrait réactiver sans jamais savoir
    // qu'il avait suspendu. Une sanction qui s'efface n'est pas une sanction.
    comptes = { data: { id: 'c1', email: 'p@h.td', role: 'fournisseur', etat: 'suspendu', organisation: 'Labo', reference: null, cree_le: 'x' }, error: null }
    const r = await POST(avecJeton({ role: 'structure', organisation: 'Autre' }), params)
    expect(insere).toBeNull()
    expect(await r.json()).toMatchObject({ compte: { etat: 'suspendu' }, nouvelle: false })
  })

  it('🔴 redemander quand on est ACTIF ne recrée rien non plus', async () => {
    comptes = { data: { id: 'c1', email: 'p@h.td', role: 'structure', etat: 'actif', organisation: 'H', reference: null, cree_le: 'x' }, error: null }
    await POST(avecJeton({ role: 'fournisseur', organisation: 'Autre' }), params)
    expect(insere).toBeNull()
  })

  it('🔴 sans jeton, aucune demande n’est écrite', async () => {
    const r = await POST(new Request('https://x.test/', { method: 'POST', body: '{}' }), params)
    expect(r.status).toBe(403)
    expect(insere).toBeNull()
  })
})

// ============================================================
// LOT 11 — L'ORGANISATION SE FIGE À L'EXAMEN.
//
// Avant l'examen, c'est une faute de frappe qu'on corrige. Après, c'est ce
// que la Centrale a APPROUVÉ : la changer déplacerait silencieusement qui
// l'on représente, sans nouvel examen — exactement la raison pour laquelle
// le rôle ne se modifie jamais.
// ============================================================

describe('corriger son organisation', () => {
  const patch = (corps: unknown) =>
    new Request('https://x.test/api/sites/cpa/mon-compte', {
      method: 'PATCH',
      headers: { authorization: 'Bearer jeton-valable', 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    })

  it('🔴 tant que la demande ATTEND, elle se corrige', async () => {
    comptes = { data: { id: 'c1', etat: 'en_attente' }, error: null }
    const r = await PATCH(patch({ organisation: 'Hôpital général de Moundou' }), params)
    expect(r.status).toBe(200)
    expect(modifie).toMatchObject({ organisation: 'Hôpital général de Moundou' })
  })

  it('🔴 une fois le compte ACTIF, elle ne bouge plus — et on dit pourquoi', async () => {
    comptes = { data: { id: 'c1', etat: 'actif' }, error: null }
    const r = await PATCH(patch({ organisation: 'Autre chose' }), params)
    expect(r.status).toBe(409)
    expect(modifie).toBeNull()
    // La personne est authentifiée et c'est SA ligne : lui cacher la raison
    // la ferait réessayer sans comprendre.
    expect(String((await r.json()).error).length).toBeGreaterThan(30)
  })

  it('🔴 un compte SUSPENDU ne se corrige pas non plus', async () => {
    // L'ORGANISATION DOIT ÊTRE VALABLE pour que ce test mesure l'ÉTAT.
    // Premier jet : « X », un seul signe — refusé en 400 par la validation,
    // bien avant la règle que ce test prétend tenir. Il mesurait la longueur
    // en croyant mesurer la suspension.
    comptes = { data: { id: 'c1', etat: 'suspendu' }, error: null }
    expect((await PATCH(patch({ organisation: 'Clinique du Centre' }), params)).status).toBe(409)
    expect(modifie).toBeNull()
  })

  it('🔴 NI le rôle, NI l’état, NI la référence ne partent', async () => {
    // Reprendre le corps tel quel laisserait passer n'importe quelle colonne
    // qu'on ajouterait un jour.
    comptes = { data: { id: 'c1', etat: 'en_attente' }, error: null }
    await PATCH(patch({ organisation: 'Hôpital', role: 'agent', etat: 'actif', reference: 'F-001' }), params)
    expect(Object.keys(modifie ?? {}).sort()).toEqual(['maj_le', 'organisation'])
  })

  it('🔴 l’écriture est filtrée par PERSONNE, jamais par le seul `id`', async () => {
    comptes = { data: { id: 'c1', etat: 'en_attente' }, error: null }
    await PATCH(patch({ organisation: 'Hôpital' }), params)
    expect(filtresMaj).toContain('user_id')
  })

  it('🔴 sans jeton, rien n’est modifié', async () => {
    const r = await PATCH(new Request('https://x.test/', { method: 'PATCH', body: '{}' }), params)
    expect(r.status).toBe(403)
    expect(modifie).toBeNull()
  })

  it('🔴 une organisation vide est refusée', async () => {
    comptes = { data: { id: 'c1', etat: 'en_attente' }, error: null }
    expect((await PATCH(patch({ organisation: ' ' }), params)).status).toBe(400)
    expect(modifie).toBeNull()
  })
})
