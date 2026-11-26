/**
 * SEUL LE SERVEUR PUBLIE UN SITE (2026-11-26).
 *
 * La faille : `authenticated` avait le droit `UPDATE (published)` sur `sites` —
 * le propriétaire pouvait se mettre en ligne sans payer. La base le retire
 * (sites_publication_serveur.sql) ; le navigateur ne l'envoie plus
 * (SITE_FORBIDDEN_CLIENT_FIELDS), sinon la sauvegarde ENTIÈRE de l'éditeur
 * (Navbar, round-trip `{...site}`) serait refusée.
 *
 * Ce que ce test NE voit PAS : le refus réel de la base. Il est prouvé sur un
 * Postgres jetable (preuve des blocs 11-12) et en production par la
 * vérification n° 11.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { creerFrom, journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

let journal: JournalPostgrest = journalVierge()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => creerFrom({ sites: { reponse: { data: null, error: null } } }, journal)(t) },
}))

const { updateOwnedSite, SITE_FORBIDDEN_CLIENT_FIELDS } = await import('@/lib/supabase-owned-site')
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

beforeEach(() => { journal = journalVierge() })

describe('le navigateur ne publie plus un site', () => {
  it('la sauvegarde complète de l’éditeur (Navbar) part SANS `published`, le reste intact', async () => {
    await updateOwnedSite('ma-vitrine', 'moi@exemple.td', { name: 'Ma vitrine', published: true, slogan: 'Bienvenue', subscription_status: 'active' })
    const [ecriture] = journal.ecritures.sites as { op: string; charge: Record<string, unknown> }[]
    expect(ecriture.op).toBe('update')
    expect(ecriture.charge).toEqual({ name: 'Ma vitrine', slogan: 'Bienvenue' })
    expect(journal.filtres.sites).toEqual([['eq', 'slug', 'ma-vitrine'], ['eq', 'owner_email', 'moi@exemple.td']])
  })

  it('`published` est dans la liste des champs interdits au navigateur', () => {
    expect(SITE_FORBIDDEN_CLIENT_FIELDS).toContain('published')
  })

  it('le SQL retire le droit au navigateur, et la vérification le mesure', () => {
    expect(lire('supabase/sql/sites_publication_serveur.sql')).toMatch(motifTexte('revoke update (published) on table public.sites from public, anon, authenticated;'))
    expect(lire('supabase/sql/sites_publication_serveur_verification.sql')).toMatch(motifTexte("has_column_privilege('authenticated', 'public.sites', 'published', 'UPDATE')"))
  })

  it('aucun composant du navigateur n’écrit `published` sur `sites`', () => {
    for (const f of ['src/components/Navbar.tsx', 'src/app/edit/[slug]/page.tsx', 'src/components/editeur/EditeurVisuel.tsx']) {
      const appels = lire(f).match(/updateOwnedSite\([\s\S]*?\)/gu) ?? []
      for (const a of appels) expect(a, f).not.toMatch(/\bpublished\b/u)
    }
  })
})

describe('une demande mobile money de site pointe un site réel', () => {
  it('la clé étrangère existe, sans suppression en cascade', () => {
    const sql = lire('supabase/sql/mobile_money_demandes_site_cle.sql')
    expect(sql).toMatch(motifTexte('foreign key (site_id) references public.sites(id);'))
    expect(sql).not.toMatch(motifTexte('on delete cascade'))
  })
})
