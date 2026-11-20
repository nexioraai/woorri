/**
 * L'INTERRUPTEUR DU PAIEMENT PAR CARTE (2026-11-20) — éteint par défaut.
 *
 * « Je ne veux pas qu'un client paie par un chemin jamais prouvé. » Le réglage
 * `abonnement_carte` : absent ou vide → éteint ; une liste → ces comptes
 * seulement (le compte d'essai) ; « tous » → tous. Une lecture qui échoue éteint.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({ reponse: { data: null as null | { valeur: string }, error: null as null | { message: string } } }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  return { supabaseAdmin: { from: creerFrom({ quota_reglages: { reponse: () => etat.reponse } }, journalVierge()) } }
})
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({}) }))
import { abonnementCarteOuvert } from '../abonnement-appli'

const avec = (v: string | null) => { etat.reponse = { data: v === null ? null : { valeur: v }, error: null } }
beforeEach(() => avec(null))

describe('l’interrupteur du paiement par carte', () => {
  it('clé absente (le SQL n’est pas appliqué) : éteint', async () => {
    expect(await abonnementCarteOuvert('u-1', 'essai@exemple.com')).toBe(false)
  })
  it('vide : éteint pour tous', async () => {
    avec('')
    expect(await abonnementCarteOuvert('u-1', 'essai@exemple.com')).toBe(false)
  })
  it('un compte d’essai : ouvert pour lui seul (par adresse ou identifiant)', async () => {
    avec('essai@exemple.com')
    expect(await abonnementCarteOuvert('u-1', 'essai@exemple.com')).toBe(true)
    expect(await abonnementCarteOuvert('u-2', 'marchand@exemple.com')).toBe(false)
    avec('u-2, autre@x.y')
    expect(await abonnementCarteOuvert('u-2', 'marchand@exemple.com')).toBe(true)
  })
  it('« tous » : ouvert pour tous', async () => {
    avec('tous')
    expect(await abonnementCarteOuvert('u-9', 'qui@que.ce')).toBe(true)
  })
  it('une lecture qui échoue : éteint', async () => {
    etat.reponse = { data: null, error: { message: 'base injoignable' } }
    expect(await abonnementCarteOuvert('u-1', 'essai@exemple.com')).toBe(false)
  })
})
