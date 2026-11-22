/**
 * F2 (2026-11-21) : une facture d'APPLICATION payée et non enregistrée = un
 * client qui a payé sans être activé. UN courriel à CHAQUE occurrence — jamais
 * regroupé sous l'anti-spam d'une heure, qui garde les autres types.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const etat = vi.hoisted(() => ({ envois: [] as { subject: string }[], dejaCetteHeure: 5 }))
vi.mock('resend', () => ({ Resend: class { emails = { send: async (m: { subject: string }) => { etat.envois.push(m); return { id: 'e' } } } } }))
vi.mock('@/lib/supabase-admin', () => {
  const chaine: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq']) chaine[m] = () => chaine
  chaine.gte = async () => ({ count: etat.dejaCetteHeure })
  return { supabaseAdmin: { from: () => ({ insert: async () => ({ error: null }), ...chaine }) } }
})
import { logAnomaly } from '../anomaly'

beforeEach(() => { etat.envois = []; etat.dejaCetteHeure = 5; process.env.RESEND_API_KEY = 're_test' })

describe('alerte d’une facture d’application non enregistrée', () => {
  it('cinq déjà cette heure : stripe_facture_application envoie QUAND MÊME un courriel', async () => {
    await logAnomaly({ type: 'stripe_facture_application', severity: 'blocked', details: { facture: 'in_1', erreur: 'x' } })
    expect(etat.envois.map((e) => e.subject)).toEqual(['⚠️ Anomalie checkout : stripe_facture_application'])
  })
  it('témoin : un autre type, déjà alerté cette heure, reste regroupé (anti-spam inchangé)', async () => {
    await logAnomaly({ type: 'site_adresse_non_attribuee', severity: 'warning', details: {} })
    expect(etat.envois).toEqual([])
  })
})
