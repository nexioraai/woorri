import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'
import * as route from '../route'

// ============================================================
// LOT 14.1 — LA CENTRALE ÉCRIT SES AVIS.
//
// Mesuré le 2026-11-10 : aucun fichier n'écrivait dans `appels_offres`. La
// Centrale ne pouvait pas publier un marché sans passer par nous.
//
// CE QUE CE CLIQUET TIENT :
//   · un avis naît en préparation et NON PUBLIÉ, quoi que dise le corps ;
//   · il ne change jamais de site ;
//   · une date illisible est REFUSÉE, pas effacée ;
//   · quitter « attribué » efface l'attribution ;
//   · il n'existe PAS de suppression — elle emporterait les offres reçues.
// ============================================================

const journal = journalVierge()
const table: ReponseTable = { data: [], error: null }
let proprietaire: unknown = { site: { id: 'site-1', slug: 'cpa' } }
let insere: Record<string, unknown> | null = null
let modifie: Record<string, unknown> | null = null
let filtresMaj: string[] = []

vi.mock('@/lib/auth/require-site-owner', () => ({ requireSiteOwner: async () => proprietaire }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => Object.assign(creerFrom({ appels_offres: { reponse: () => table } }, journal)(t), {
      insert: (l: Record<string, unknown>) => {
        insere = l
        return { select: () => ({ single: async () => ({ data: { id: 'a1', ...l }, error: null }) }) }
      },
      update: (l: Record<string, unknown>) => {
        modifie = l; filtresMaj = []
        const c: Record<string, unknown> = {
          eq: (col: string) => { filtresMaj.push(col); return c },
          select: () => c,
          maybeSingle: async () => ({ data: { id: 'a1', ...l }, error: null }),
        }
        return c
      },
    }),
  },
}))

const params = { params: Promise.resolve({ slug: 'cpa' }) }
const envoi = (methode: string, corps: unknown) =>
  new Request('https://x.test/api/sites/cpa/avis', {
    method: methode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps),
  })

beforeEach(() => {
  proprietaire = { site: { id: 'site-1', slug: 'cpa' } }
  insere = null; modifie = null; filtresMaj = []
})

describe('créer un avis', () => {
  it('🔴 il naît en PRÉPARATION et NON PUBLIÉ, quoi que dise le corps', async () => {
    // Un avis qui partirait en ligne à la création exposerait un brouillon à
    // des fournisseurs réels.
    await route.POST(envoi('POST', { reference: '004/AONO/CPA/2026', objet: 'Antipaludiques', etat: 'ouvert', publie: true }), params)
    expect(insere).toMatchObject({ etat: 'preparation', publie: false })
  })

  it('🔴 il est rattaché AU SITE du propriétaire, jamais à un site reçu', async () => {
    await route.POST(envoi('POST', { reference: 'R-1', objet: 'Gants', site_id: 'un-autre' }), params)
    expect(insere).toMatchObject({ site_id: 'site-1' })
  })

  it('🔴 aucune attribution à la naissance', async () => {
    await route.POST(envoi('POST', { reference: 'R-1', objet: 'Gants', attributaire: 'Labo X', montant_attribue: 5 }), params)
    expect(insere).toMatchObject({ attributaire: null, montant_attribue: null, attribue_le: null })
  })

  it('🔴 la référence devient une adresse utilisable', async () => {
    await route.POST(envoi('POST', { reference: '004/AONO/CPA/2026 — Lot É', objet: 'Gants' }), params)
    expect(insere?.reference_slug).toBe('004-aono-cpa-2026-lot-e')
  })

  it('🔴 sans référence ni objet, rien n’est écrit', async () => {
    expect((await route.POST(envoi('POST', { reference: 'R-1' }), params)).status).toBe(400)
    expect(insere).toBeNull()
  })

  it('🔴 un non-propriétaire ne crée rien', async () => {
    proprietaire = { response: new Response(null, { status: 403 }) }
    expect((await route.POST(envoi('POST', { reference: 'R-1', objet: 'Gants' }), params)).status).toBe(403)
    expect(insere).toBeNull()
  })
})

describe('modifier un avis', () => {
  it('🔴 `site_id` ne s’écrit JAMAIS — un avis ne change pas de site', async () => {
    await route.PATCH(envoi('PATCH', { id: 'a1', objet: 'Gants stériles', site_id: 'un-autre', reference: 'X' }), params)
    expect(Object.keys(modifie ?? {})).toEqual(['objet'])
  })

  it('🔴 l’écriture est filtrée par SITE, même avec un `id`', async () => {
    await route.PATCH(envoi('PATCH', { id: 'a1', publie: true }), params)
    expect(filtresMaj).toContain('site_id')
  })

  it('🔴 une date ILLISIBLE est refusée, pas effacée', async () => {
    // Effacer en silence la date limite d'un marché le rendrait ouvert sans
    // échéance.
    const r = await route.PATCH(envoi('PATCH', { id: 'a1', remise_le: 'demain matin' }), params)
    expect(r.status).toBe(400)
    expect(modifie).toBeNull()
  })

  it('🔴 quitter « attribué » EFFACE l’attribution', async () => {
    await route.PATCH(envoi('PATCH', { id: 'a1', etat: 'ouvert' }), params)
    expect(modifie).toMatchObject({ etat: 'ouvert', attributaire: null, montant_attribue: null, attribue_le: null })
  })

  it('🔴 attribuer garde ce qu’on lui donne', async () => {
    await route.PATCH(envoi('PATCH', { id: 'a1', etat: 'attribue', attributaire: 'Labo X', montant_attribue: '1500' }), params)
    expect(modifie).toMatchObject({ etat: 'attribue', attributaire: 'Labo X', montant_attribue: 1500 })
  })

  it('🔴 un état ou une portée inventés sont refusés', async () => {
    for (const corps of [{ etat: 'clos' }, { portee: 'regional' }, { publie: 'oui' }]) {
      modifie = null
      expect((await route.PATCH(envoi('PATCH', { id: 'a1', ...corps }), params)).status, JSON.stringify(corps)).toBe(400)
      expect(modifie).toBeNull()
    }
  })

  it('🔴 l’objet ne se vide pas', async () => {
    expect((await route.PATCH(envoi('PATCH', { id: 'a1', objet: '  ' }), params)).status).toBe(400)
    expect(modifie).toBeNull()
  })

  it('🔴 un envoi qui ne change RIEN est refusé', async () => {
    expect((await route.PATCH(envoi('PATCH', { id: 'a1' }), params)).status).toBe(400)
  })
})

describe('il n’existe pas de suppression', () => {
  it('🔴 la route n’exporte AUCUN `DELETE`', () => {
    // `offres.avis_id` est en cascade : supprimer un avis effacerait les
    // offres reçues, c'est-à-dire la trace d'un marché public. On dépublie.
    expect(Object.keys(route).sort()).toEqual(['GET', 'PATCH', 'POST'])
  })
})
