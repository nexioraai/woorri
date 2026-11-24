/**
 * LE PAIEMENT MOBILE MONEY REÇU PUBLIE L'APPLI (2026-11-24), et la règle des
 * moyens proposés par la fenêtre « Publier ».
 */
import { describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({ sections: { accordLecturePublique: { tables: 'produit', le: 'x' } } as unknown, lu: [] as [string, string][], erreur: false }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/payments/publier-apres-paiement', () => ({ publierApresPaiement: async () => 'publiee' }))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const journal = journalVierge()
  const from = creerFrom({
    app_generations: {
      reponse: (f) => {
        etat.lu.push([String(f.find((x) => x[1] === 'id')?.[2]), String(f.find((x) => x[1] === 'owner_id')?.[2])])
        return etat.erreur ? { data: null, error: { message: 'base' } } : { data: { sections_acquises: etat.sections }, error: null }
      },
    },
  }, journal)
  return { supabaseAdmin: { from } }
})

import { publierApresEncaissement } from '../publication'
import { actionPublier, moyensDePublication, LIBELLE_MOYEN } from '@/lib/apps/compteur-phrases'

const GRATUITE = { formule: 'gratuite', utilisees: 0, limite: 10, actif: false, exempte: false } as never
const USD = { montant: 20, devise: 'USD' } as never

describe('publierApresEncaissement', () => {
  it('lit l’accord GARDÉ avec l’appli de CE propriétaire, et le passe à la publication', async () => {
    etat.lu = []
    const publier = vi.fn(async () => 'publiee' as const)
    expect(await publierApresEncaissement('a1', 'u1', publier)).toBe('publiee')
    expect(etat.lu).toEqual([['a1', 'u1']])
    expect(publier).toHaveBeenCalledWith({ app: 'a1', proprietaire: 'u1', accordLecture: 'produit' })
  })
  it('aucun accord gardé, ou base illisible : publication SANS accord (la garde de lecture publique tranche)', async () => {
    const publier = vi.fn(async () => 'refusee' as const)
    etat.sections = {}
    await publierApresEncaissement('a1', 'u1', publier)
    expect(publier).toHaveBeenLastCalledWith({ app: 'a1', proprietaire: 'u1', accordLecture: null })
    etat.sections = { accordLecturePublique: { tables: 'produit', le: 'x' } }
    etat.erreur = true
    await publierApresEncaissement('a1', 'u1', publier)
    expect(publier).toHaveBeenLastCalledWith({ app: 'a1', proprietaire: 'u1', accordLecture: null })
    etat.erreur = false
  })
})

describe('les moyens proposés par « Publier »', () => {
  it('carte (ouverte ET prix lisible), puis mobile money (ouvert), dans cet ordre', () => {
    expect(moyensDePublication(true, USD, true)).toEqual(['carte', 'mobile_money'])
    expect(moyensDePublication(true, USD, false)).toEqual(['carte'])
    expect(moyensDePublication(true, null, true), 'carte sans prix lisible').toEqual(['mobile_money'])
    expect(moyensDePublication(false, USD, true)).toEqual(['mobile_money'])
    expect(moyensDePublication(false, null, false)).toEqual([])
  })
  it('non payée : « payer » dès qu’UN moyen est ouvert ; aucun → « fermee »', () => {
    expect(actionPublier(GRATUITE, false, null, true)).toBe('payer')
    expect(actionPublier(GRATUITE, true, USD, false)).toBe('payer')
    expect(actionPublier(GRATUITE, false, null, false)).toBe('fermee')
    expect(actionPublier(GRATUITE, false, null), 'sans le 4e argument : comme avant').toBe('fermee')
  })
  it('les libellés : aucun prix, aucun « frais », aucun pourcentage', () => {
    expect(LIBELLE_MOYEN).toEqual({ carte: 'Carte bancaire', mobile_money: 'Mobile money (Airtel / Moov)' })
    expect(Object.values(LIBELLE_MOYEN).join(' ')).not.toMatch(/frais|%|FCFA|\$|[0-9]/iu)
  })
})
