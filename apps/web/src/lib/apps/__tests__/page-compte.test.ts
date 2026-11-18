/**
 * LA PAGE « COMPTE » SERVIE PAR DERIBFY (option B, 2026-11-18).
 *
 * ① la page s'assemble avec le MÊME assembleur que les applis ;
 * ② le lien « Compte » n'est injecté que sur demande, hors de `#racine` ;
 * ③ la route de l'appli le demande seulement quand l'appli a une base ;
 * ④ la route `/compte` sert la page pour une appli publiée AVEC base, 404 sinon,
 *   avec les en-têtes du sous-domaine.
 *
 * Ce que ce fichier NE voit PAS : que la page connecte, change le mot de passe
 * et déconnecte dans un vrai navigateur — c'est la sonde navigateur qui le dit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { creerFrom, journalVierge } from '@/lib/testing/postgrest'
import { TABLE_GENERATIONS } from '../journal'

let ligne: Record<string, unknown> | null = null
let journal = journalVierge()
// LE DOUBLE FIDÈLE : il honore la projection comme PostgREST, et note les filtres.
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (t: string) => creerFrom({ [TABLE_GENERATIONS]: { reponse: () => ({ data: ligne, error: null }) } }, journal)(t) },
}))

import { assembler } from '../bac-a-sable'
import { pageAutonome } from '../boucle-directe'
import { FICHIERS_PAGE_COMPTE, LIEN_COMPTE_EMIS } from '../page-compte'
import { nomSchemaOeuvre } from '../poser-oeuvre'
import { NOM_PUBLIABLE_OEUVRES, NOM_SECRETE_OEUVRES, NOM_URL_DERIBFY, NOM_URL_OEUVRES } from '../base-oeuvres'
import { GET as servirAppli } from '@/app/a/[sous]/route'
import { GET as servirCompte } from '@/app/a/[sous]/compte/route'

const APPLI = `import { createRoot } from 'react-dom/client'\ncreateRoot(document.getElementById('racine')!).render(<p>pharma</p>)\n`
const publiee = (schema: string) => ({
  id: '11111111-aaaa-4aaa-8aaa-111111111111',
  nom: 'Pharma',
  publication_jeton: 'jeton',
  document: { schema, fichiers: { 'index.tsx': APPLI } },
})
const ctx = { params: Promise.resolve({ sous: 'pharma' }) }
const appel = new Request('https://pharma.deribfy.app/')

beforeEach(() => {
  ligne = null
  journal = journalVierge()
  vi.stubEnv(NOM_URL_OEUVRES, 'https://oeuvresoeuvresoeuvre.supabase.co')
  vi.stubEnv(NOM_PUBLIABLE_OEUVRES, 'sb_publishable_test')
  vi.stubEnv(NOM_SECRETE_OEUVRES, 'sb_secret_test')
  vi.stubEnv(NOM_URL_DERIBFY, 'https://deribfy.supabase.co')
})

describe('la page Compte servie par Deribfy', () => {
  it('① s’assemble comme une appli', async () => {
    const v = await assembler(new Map(FICHIERS_PAGE_COMPTE))
    expect(v.ok, v.ok ? '' : JSON.stringify(v)).toBe(true)
  }, 30_000)

  it('② le lien n’est injecté que sur demande, et hors de la racine', () => {
    expect(pageAutonome('void 0', 'X')).not.toContain(LIEN_COMPTE_EMIS)
    const avec = pageAutonome('void 0', 'X', undefined, 'servie', null, null, true)
    expect(avec.split(LIEN_COMPTE_EMIS)).toHaveLength(2)
    expect(avec.indexOf(LIEN_COMPTE_EMIS)).toBeLessThan(avec.indexOf('<div id="racine"></div>'))
  })

  it('③ l’appli servie porte le lien seulement si elle a une base', async () => {
    ligne = publiee('create table produit (id uuid);')
    const avecBase = await (await servirAppli(appel, ctx)).text()
    expect(avecBase).toContain(LIEN_COMPTE_EMIS)
    ligne = publiee('')
    const sansBase = await (await servirAppli(appel, ctx)).text()
    expect(sansBase).not.toContain(LIEN_COMPTE_EMIS)
  }, 30_000)

  it('④ /compte : servie avec base, 404 sans base ou sans publication', async () => {
    ligne = publiee('create table produit (id uuid);')
    const r = await servirCompte(appel, ctx)
    expect(r.status).toBe(200)
    // L'appli se trouve par son NOM publié — pas par un autre critère.
    expect(journal.filtres[TABLE_GENERATIONS]).toContainEqual(['eq', 'publication_slug', 'pharma'])
    expect(r.headers.get('content-security-policy')).toContain('https://oeuvresoeuvresoeuvre.supabase.co')
    const html = await r.text()
    expect(html).toContain('<title>Compte — Pharma</title>')
    // La page porte la base de L'APPLI : même schéma, donc même session.
    expect(html).toContain(JSON.stringify(nomSchemaOeuvre(publiee('').id)))
    expect(html).not.toContain(LIEN_COMPTE_EMIS)

    ligne = publiee('')
    expect((await servirCompte(appel, ctx)).status).toBe(404)
    ligne = { ...publiee('create table t (id uuid);'), publication_jeton: null }
    expect((await servirCompte(appel, ctx)).status).toBe(404)
    ligne = null
    expect((await servirCompte(appel, ctx)).status).toBe(404)
  }, 30_000)
})
