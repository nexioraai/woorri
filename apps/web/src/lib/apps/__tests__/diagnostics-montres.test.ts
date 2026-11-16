/**
 * LES DIAGNOSTICS SONT MONTRÉS (2026-11-16, PLAN_TOURS_AU_TEMPS.md §3.3).
 *
 * Ils existaient en base, et personne ne les voyait : une œuvre livrée avec
 * des défauts non bloquants s'affichait comme une autre. On EXERCE la route
 * (base remplacée, vraie fonction GET) ; la carte, elle, est tenue par sa
 * source, faute d'un rendu React dans ce harnais.
 */
import { describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }),
}))
const lu: { colonnes: string } = { colonnes: '' }
vi.mock('@/lib/supabase-admin', () => {
  const b = {
    select(c: string) { lu.colonnes = c; return b },
    neq() { return b },
    eq() { return b },
    order() { return b },
    limit() {
      return Promise.resolve({
        data: [{
          id: 'o1', created_at: '2026-11-16T15:16:10Z', statut: 'livree', moteur: 'direct', fournisseur: 'deepseek',
          cout_usd: 0.09, duree_ms: 319_000, nom: 'Registre', demande: 'un registre', document: { fichiers: { 'index.tsx': 'x' } },
          publication_slug: null, publication_jeton: null,
          diagnostics: ['Application PARTIELLEMENT éprouvée : 10 sur 12 (83 %)', 42],
        }],
        error: null,
      })
    },
  }
  return { supabaseAdmin: { from: () => b } }
})

import { GET } from '@/app/api/generateur/mes-applications/route'

describe('Les diagnostics, montrés à l’utilisateur', () => {
  it('① la liste les LIT en base et les rend (les valeurs non textuelles écartées)', async () => {
    const r = await GET(new Request('https://deribfy.test/api/generateur/mes-applications'))
    const d = (await r.json()) as { applications: { diagnostics: string[] }[] }
    expect(lu.colonnes, 'la colonne n’est pas lue').toMatch(/\bdiagnostics\b/u)
    expect(d.applications[0]?.diagnostics).toEqual(['Application PARTIELLEMENT éprouvée : 10 sur 12 (83 %)'])
  })

  it('② la carte d’une œuvre livrée les affiche', () => {
    const carte = lireSource(join(__dirname, '..', '..', '..', 'app', 'dashboard', 'page.tsx'))
    expect(carte).toMatch(motifTexte('point(s) à surveiller'))
    expect(carte).toMatch(motifTexte('(a.diagnostics ?? []).map('))
  })
})
