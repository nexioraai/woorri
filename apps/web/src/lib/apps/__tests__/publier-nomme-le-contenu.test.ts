/**
 * DÉCISION 2 (2026-11-16) — LE MESSAGE DE PUBLICATION NOMME LE CONTENU.
 *
 * Il disait « vehicule, reparation ». Mesuré le même jour (simulation des
 * vrais émetteurs, ENQUETE_LECTURE_PUBLIQUE.md §2) : publier rend lisibles
 * TOUTES les colonnes conservées et TOUTES les lignes. Le message doit le
 * dire dans les mots du commerçant, et dire que la liste ENTIÈRE se
 * télécharge.
 *
 * ① le libellé : déclaré (français d'abord), sinon le nom sans tirets bas ;
 *    un champ non conservé (dérivé, sensible) n'est pas annoncé ;
 * ② la VRAIE route POST le dit, avec la liste téléchargeable, et voyage
 *    `contenus` ; les phrases tenues par EP-356 restent ;
 * ③ la fenêtre d'accord le répète table par table.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { contenusPublics, libelleChamp, PHRASE_LISTE_ENTIERE } from '../contenu-public'
import { accordLecturePublique } from '@/components/apps/accordLecturePublique'
import { motifTexte } from './motif-texte'

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }),
}))
const f = (name: string, extra: Record<string, unknown> = {}) => ({ id: `fld_${name}`, name, type: 'text', required: false, ...extra })
/** L'atelier de l'avertissement : véhicule et réparation publics. */
const ENTITES = [
  { id: 'ent_client', name: 'client', fields: [f('nom'), f('telephone')] },
  { id: 'ent_vehicule', name: 'vehicule', lecturePublique: true, fields: [f('client_id'), f('marque'), f('immatriculation', { label: [{ locale: 'fr', text: 'Immatriculation' }] })] },
  { id: 'ent_reparation', name: 'reparation', lecturePublique: true, fields: [f('description'), f('statut'), f('montant_main_oeuvre'), f('code_secret', { sensitive: true }), f('total', { derived: { op: 'sum' } })] },
]
vi.mock('@/lib/supabase-admin', () => {
  const b = {
    select() { return b },
    eq() { return b },
    maybeSingle() {
      return Promise.resolve({
        data: {
          publication_jeton: null, statut: 'livree', demande: 'un atelier', sections_acquises: null,
          document: { schema: 'create table vehicule (id text)', politiques: '', entites: ENTITES },
        },
        error: null,
      })
    },
  }
  return { supabaseAdmin: { from: () => b } }
})

import { POST } from '@/app/api/generateur/publier/route'

describe('Décision 2 — publier nomme ce qui sera lu', () => {
  it('① le libellé déclaré, sinon le nom sans tirets bas ; ni dérivé ni sensible', () => {
    expect(libelleChamp({ name: 'montant_main_oeuvre' })).toBe('montant main oeuvre')
    expect(libelleChamp({ name: 'x', label: [{ locale: 'en', text: 'Plate' }, { locale: 'fr', text: 'Plaque' }] })).toBe('Plaque')
    expect(libelleChamp({ name: 'x_y', label: 'pas une liste' })).toBe('x y')
    expect(contenusPublics(ENTITES as never)).toEqual([
      { table: 'vehicule', champs: ['client id', 'marque', 'Immatriculation'] },
      { table: 'reparation', champs: ['description', 'statut', 'montant main oeuvre'] },
    ])
  })

  it('② la vraie route refuse en NOMMANT le contenu et la liste téléchargeable', async () => {
    const r = await POST(new Request('https://deribfy.test/api/generateur/publier?id=g-1', { method: 'POST' }))
    expect(r.status).toBe(409)
    const d = (await r.json()) as { error: string; tables: string[]; contenus: unknown; lecturePublique: boolean }
    expect(d.lecturePublique).toBe(true)
    expect(d.tables).toEqual(['vehicule', 'reparation'])
    expect(d.contenus).toEqual(contenusPublics(ENTITES as never))
    expect(d.error).toMatch(motifTexte('Tout le monde pourra lire : « vehicule » (client id, marque, Immatriculation) ; « reparation » (description, statut, montant main oeuvre).'))
    expect(d.error).toMatch(motifTexte(PHRASE_LISTE_ENTIERE))
    expect(d.error).toMatch(motifTexte('PAR TOUT LE MONDE, sans compte'))
    expect(d.error).toMatch(motifTexte('Personne ne pourra y écrire'))
    expect(d.error).not.toContain('code secret')
  })

  afterEach(() => { delete (globalThis as { window?: unknown }).window })

  it('③ la fenêtre d’accord répète le contenu de chaque table, et la liste téléchargeable', () => {
    let vu = ''
    ;(globalThis as { window?: unknown }).window = { confirm: (m: string) => { vu = m; return false } }
    expect(accordLecturePublique({
      lecturePublique: true,
      tables: ['vehicule', 'reparation'],
      contenus: contenusPublics(ENTITES as never),
    })).toBe(false)
    expect(vu).toMatch(motifTexte('• vehicule — tout le monde pourra lire : client id, marque, Immatriculation'))
    expect(vu).toMatch(motifTexte('• reparation — tout le monde pourra lire : description, statut, montant main oeuvre'))
    expect(vu).toMatch(motifTexte(PHRASE_LISTE_ENTIERE))
  })

  it('③ une réponse sans `contenus` (route plus ancienne) garde au moins les noms', () => {
    let vu = ''
    ;(globalThis as { window?: unknown }).window = { confirm: (m: string) => { vu = m; return true } }
    expect(accordLecturePublique({ lecturePublique: true, tables: ['annonce'] })).toBe(true)
    expect(vu).toContain('  • annonce\n')
  })
})
