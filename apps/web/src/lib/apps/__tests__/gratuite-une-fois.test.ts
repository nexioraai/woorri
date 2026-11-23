/**
 * B2 · UNE SEULE APPLI GRATUITE PAR COMPTE, POUR TOUJOURS (décision du propriétaire, 2026-11-22).
 *
 * `etatDeLaGratuite` lit, avant toute réservation, si l'appli gratuite du
 * compte est encore là (non payée) ou a été SUPPRIMÉE sans jamais avoir été
 * payée. Le constat de départ (la base seule rend une création gratuite après
 * une suppression) est prouvé sur un vrai Postgres par scripts/preuve-quota-sql.mjs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { motifTexte } from './motif-texte'

vi.mock('server-only', () => ({}))
const etat = vi.hoisted(() => ({
  applis: [] as { id: string; statut: string }[],
  compteurs: [] as { app_id: string; statut: string; paye_jusqu_au: string | null }[],
  panne: false,
  journal: { filtres: {}, projections: {}, ecritures: {} } as import('@/lib/testing/postgrest').JournalPostgrest,
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({
    [TABLE_GENERATIONS]: { reponse: () => (etat.panne ? { data: null, error: { message: 'panne' } } : { data: etat.applis, error: null }) },
    app_compteurs: { reponse: () => ({ data: etat.compteurs, error: null }) },
  }, etat.journal) } }
})
import { etatDeLaGratuite } from '../quota'
import { TABLE_GENERATIONS } from '../journal'

const FUTUR = '2099-01-01T00:00:00Z'
const PASSE = '2026-01-01T00:00:00Z'
beforeEach(() => { etat.applis = []; etat.compteurs = []; etat.panne = false; etat.journal.filtres = {}; etat.journal.projections = {}; etat.journal.ecritures = {} })

describe('l’appli gratuite d’un compte', () => {
  it('compte neuf : rien n’est pris', async () => {
    expect(await etatDeLaGratuite('u-1')).toEqual({ appNonPayee: null, gratuiteSupprimee: false })
  })
  it('une appli livrée non payée : c’est elle qu’on propose d’abonner', async () => {
    etat.applis = [{ id: 'a', statut: 'livree' }]
    expect(await etatDeLaGratuite('u-1')).toEqual({ appNonPayee: 'a', gratuiteSupprimee: false })
  })
  it('une appli livrée PAYÉE : elle ne prend pas la place gratuite', async () => {
    etat.applis = [{ id: 'a', statut: 'livree' }]
    etat.compteurs = [{ app_id: 'a', statut: 'abonnee', paye_jusqu_au: FUTUR }]
    expect(await etatDeLaGratuite('u-1')).toEqual({ appNonPayee: null, gratuiteSupprimee: false })
  })
  it('B2 : l’appli gratuite SUPPRIMÉE sans jamais avoir été payée consomme la gratuité à jamais', async () => {
    etat.applis = [{ id: 'a', statut: 'supprimee' }]
    expect((await etatDeLaGratuite('u-1'))?.gratuiteSupprimee).toBe(true)
    etat.compteurs = [{ app_id: 'a', statut: 'gratuite', paye_jusqu_au: null }]
    expect((await etatDeLaGratuite('u-1'))?.gratuiteSupprimee, 'ses modifications gratuites entamées : toujours gratuite').toBe(true)
  })
  it('une appli supprimée qui A ÉTÉ payée (même échue) : elle ne bloque pas', async () => {
    etat.applis = [{ id: 'a', statut: 'supprimee' }]
    etat.compteurs = [{ app_id: 'a', statut: 'abonnee', paye_jusqu_au: PASSE }]
    expect(await etatDeLaGratuite('u-1')).toEqual({ appNonPayee: null, gratuiteSupprimee: false })
  })
  it('la lecture filtre le compte et les deux statuts, et une panne rend null (on ne crée rien)', async () => {
    await etatDeLaGratuite('u-1')
    expect(etat.journal.filtres[TABLE_GENERATIONS]).toEqual(expect.arrayContaining([['eq', 'owner_id', 'u-1'], ['in', 'statut', ['livree', 'supprimee']]]))
    expect(etat.journal.filtres.app_compteurs).toEqual(expect.arrayContaining([['eq', 'owner_id', 'u-1']]))
    etat.panne = true
    expect(await etatDeLaGratuite('u-1')).toBeNull()
  })
})

describe('B1 · le refus mène au parcours « Publier » de l’appli existante', () => {
  const lire = (...b: string[]) => readFileSync(join(__dirname, '..', '..', '..', ...b), 'utf8')
  it('l’écran de création montre « Passer à l’abonnement », vers l’atelier de l’appli, avec ?publier=1', () => {
    const ecran = lire('components', 'onboarding', 'ConversationApplication.tsx')
    expect(ecran).toContain('{BOUTON_PASSER_A_L_ABONNEMENT}')
    expect(ecran).toContain('href={`/atelier/${encodeURIComponent(appAAbonner)}?publier=1`}')
    expect(ecran).toMatch(motifTexte("d.gratuiteUtilisee === true && typeof d.appAAbonner === 'string' ? d.appAAbonner : null"))
  })
  it('l’atelier, ouvert avec ?publier=1, lance le parcours « Publier » une fois', () => {
    const atelier = lire('app', 'atelier', '[id]', 'page.tsx')
    expect(atelier).toContain("if (p.get('publier') !== '1') return;")
    expect(atelier).toMatch(motifTexte('window.setTimeout(() => { void publier(); }, 0);'))
  })
})
