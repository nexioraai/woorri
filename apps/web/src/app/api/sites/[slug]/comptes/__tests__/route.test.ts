import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// ============================================================
// LOT 10 / LOT 11 — LA DETTE §10, ET LE CLIQUET QUI LA TIENT FERMÉE.
//
// CE QUE LA DETTE DISAIT : « La route accepte un `user_id` du propriétaire
// sans vérifier que cette personne existe dans auth.users. Ce que ça
// produit : un compte fantôme — une ligne qui ne correspond à personne.
// Inoffensif aujourd'hui, mais le genre de chose qui devient dangereuse
// quand une deuxième route la croit. »
//
// ELLE A VÉCU UN JOUR SANS AUCUN TEST. Cette route est partie au lot 10
// sans appelant, sans vitest et sans script versionné : la seule preuve
// était une mesure de séance, perdue le soir même.
//
// CE CLIQUET TIENT DEUX CHOSES QUE LE CODE SEUL NE DIT PAS :
//   · un `user_id` reçu est REFUSÉ, pas ignoré en silence ;
//   · l'identifiant inséré est celui que la BASE a résolu depuis l'adresse.
// ============================================================

let proprietaire: unknown = { site: { id: 'site-1', slug: 'cpa' } }
let resolu: { data: unknown; error: unknown } = { data: null, error: null }
let insere: Record<string, unknown> | null = null
let rpcAppele: { nom: string; args: unknown } | null = null
let modifie: Record<string, unknown> | null = null

vi.mock('@/lib/auth/require-site-owner', () => ({
  requireSiteOwner: async () => proprietaire,
}))
vi.mock('@/lib/auth/require-site-compte', () => ({
  requireSiteCompte: async () => ({ response: new Response(null, { status: 403 }) }),
}))
// LE HARNAIS FIDÈLE, PAS UN DOUBLE ÉCRIT À LA MAIN.
//
// Premier jet : un `from()` maison dont `select` et `eq` rendaient l'objet
// lui-même. Il est PLUS PERMISSIF que PostgREST sur deux axes — la
// projection ignorée, les filtres invisibles — et le cliquet
// `postgrestProjectionFidelity` l'a refusé le jour même : « 41 harnais pour
// un plafond de 40 ». Il avait raison : avec ce double, retirer un
// `.eq('site_id', …)` ne casserait aucun test.
const journal = journalVierge()
const lignes: ReponseTable = { data: [], error: null }

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: async (nom: string, args: unknown) => { rpcAppele = { nom, args }; return resolu },
    from: (t: string) => {
      const base = creerFrom({ site_comptes: { reponse: () => lignes } }, journal)(t)
      // `insert` n'est pas du ressort du harnais : on CAPTURE ce qui part,
      // parce que c'est exactement ce que la dette §10 concerne.
      return Object.assign(base, {
        update: (ligne: Record<string, unknown>) => {
          modifie = ligne
          const c: Record<string, unknown> = {
            eq: () => c, select: () => c,
            maybeSingle: async () => ({ data: { id: 'c1', ...ligne }, error: null }),
          }
          return c
        },
        insert: (ligne: Record<string, unknown>) => {
          insere = ligne
          return { select: () => ({ single: async () => ({ data: { id: 'c1', ...ligne }, error: null }) }) }
        },
      })
    },
  },
}))

import { POST, PATCH } from '../route'

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const envoi = (corps: unknown) =>
  new Request('https://x.test/api/sites/cpa/comptes', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps),
  })

beforeEach(() => {
  proprietaire = { site: { id: 'site-1', slug: 'cpa' } }
  resolu = { data: 'user-77', error: null }
  insere = null
  rpcAppele = null
  modifie = null
})

describe('l’identité ne se fournit pas', () => {
  it('🔴 un `user_id` dans le corps est REFUSÉ, pas ignoré', async () => {
    // L'ignorer en silence laisserait croire au propriétaire que son envoi
    // a été pris en compte — et il s'étonnerait du compte créé.
    const r = await POST(envoi({ user_id: 'je-choisis', email: 'a@b.td', role: 'structure' }), params)
    expect(r.status).toBe(400)
    expect(insere).toBeNull()
  })

  it('🔴 l’identifiant inséré est celui que la BASE a résolu', async () => {
    await POST(envoi({ email: 'Pharmacie@Hopital.TD', role: 'structure' }), params)
    expect(insere).toMatchObject({ user_id: 'user-77' })
  })

  it('🔴 l’adresse est normalisée avant d’être cherchée', async () => {
    // Supabase enregistre en minuscules ; la saisie du propriétaire arrive
    // comme il l'a tapée. Sans normalisation, l'admission échouerait sur une
    // majuscule et personne ne comprendrait pourquoi.
    await POST(envoi({ email: '  Pharmacie@Hopital.TD ', role: 'structure' }), params)
    expect(rpcAppele).toMatchObject({
      nom: 'identifiant_par_courriel',
      args: { courriel: 'pharmacie@hopital.td' },
    })
  })

  it('🔴 personne à cette adresse → RIEN n’est créé', async () => {
    // Pas de compte fantôme : la personne s'inscrit d'abord.
    resolu = { data: null, error: null }
    const r = await POST(envoi({ email: 'inconnu@nulle.part', role: 'structure' }), params)
    expect(r.status).toBe(404)
    expect(insere).toBeNull()
  })

  it('🔴 sans adresse, rien n’est créé', async () => {
    expect((await POST(envoi({ role: 'structure' }), params)).status).toBe(400)
    expect(insere).toBeNull()
  })
})

describe('admettre n’est pas activer', () => {
  it('🔴 `etat` n’est jamais envoyé — le déclencheur décide seul', async () => {
    await POST(envoi({ email: 'a@b.td', role: 'fournisseur', etat: 'actif' }), params)
    expect(insere).not.toHaveProperty('etat')
  })

  it('🔴 le compte est rattaché AU SITE du propriétaire, pas à un site reçu', async () => {
    await POST(envoi({ email: 'a@b.td', role: 'structure', site_id: 'un-autre-site' }), params)
    expect(insere).toMatchObject({ site_id: 'site-1' })
  })
})

describe('seul le propriétaire admet', () => {
  it('🔴 un non-propriétaire est refusé, et rien n’est écrit', async () => {
    proprietaire = { response: new Response(JSON.stringify({ error: 'x' }), { status: 403 }) }
    const r = await POST(envoi({ email: 'a@b.td', role: 'structure' }), params)
    expect(r.status).toBe(403)
    expect(insere).toBeNull()
    expect(rpcAppele).toBeNull()
  })
})

// ============================================================
// LOT 12.3 — LE VERDICT N'EST PAS L'ÉTAT.
//
// `etat` dit si le compte ENTRE (actif, suspendu) ; `qualification` dit ce
// que la Centrale PENSE du fournisseur. Les confondre ferait qu'activer un
// compte vaudrait le qualifier — deux décisions, deux examens, deux dates.
//
// ET LA DATE ACCOMPAGNE LE VERDICT, SEULEMENT LUI. La poser sur un
// changement d'état raconterait un examen qui n'a pas eu lieu.
// ============================================================

describe('prononcer une qualification', () => {
  const patch = (corps: unknown) =>
    new Request('https://x.test/api/sites/cpa/comptes', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps),
    })

  it('🔴 le verdict s’écrit AVEC sa date', async () => {
    await PATCH(patch({ id: 'c1', qualification: 'qualifie' }), params)
    expect(modifie).toMatchObject({ qualification: 'qualifie' })
    expect(String(modifie?.qualification_le ?? '').length).toBeGreaterThan(0)
  })

  it('🔴 changer l’ÉTAT ne pose AUCUNE date de qualification', async () => {
    // Elle raconterait un examen qui n'a pas eu lieu.
    await PATCH(patch({ id: 'c1', etat: 'actif' }), params)
    expect(modifie).toMatchObject({ etat: 'actif' })
    expect(modifie).not.toHaveProperty('qualification_le')
    expect(modifie).not.toHaveProperty('qualification')
  })

  it('🔴 revenir à « non examinée » EFFACE la date', async () => {
    // Garder celle d'un verdict retiré ferait lire « examiné le 12 » sur un
    // compte qui ne l'est plus.
    await PATCH(patch({ id: 'c1', qualification: 'non_examinee' }), params)
    expect(modifie).toMatchObject({ qualification: 'non_examinee', qualification_le: null })
  })

  it('🔴 un envoi qui ne change RIEN est refusé', async () => {
    // Sans ce refus, un corps vide toucherait `maj_le` et ferait croire à
    // une décision.
    const r = await PATCH(patch({ id: 'c1' }), params)
    expect(r.status).toBe(400)
    expect(modifie).toBeNull()
  })

  it('🔴 un non-propriétaire ne prononce rien', async () => {
    proprietaire = { response: new Response(null, { status: 403 }) }
    const r = await PATCH(patch({ id: 'c1', qualification: 'qualifie' }), params)
    expect(r.status).toBe(403)
    expect(modifie).toBeNull()
  })
})
