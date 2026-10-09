/**
 * CLIQUETS — LA SAUVEGARDE LOCALE RECONSTRUIT UN ETAT A L'IDENTIQUE.
 *
 * Lecon du 2026-10-09 : l'etat de la ligne 0234da42 (6,87 $) ne vivait que
 * dans la table jumelle — une purge l'a rendu irrecuperable. Ces tests
 * prouvent le cycle complet HORS base (pur, CI) ; le harnais jumelle V8
 * prouve le meme cycle CONTRE la vraie jumelle.
 */
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sauverEtatLocal, chargerPourResurrection, cheminEtatLocal } from '../etat-local'

const LIGNE = {
  id: '0234da42-0e53-465e-be9d-34cad3837ff0',
  created_at: '2026-10-09T08:00:00.000Z',
  owner_email: 'tir-reel@test',
  demande: 'une application pour noter mes dépenses du jour et les consulter',
  nom: 'depenses-du-jour',
  ok: false,
  cout_usd: 6.8733,
  duree_ms: 1234,
  jetons_entree: 100,
  jetons_sortie: 200,
  diagnostics: ['BLOCK_FIELD_UNKNOWN@screens[2]'],
  tirages: 2,
  statut: 'en_cours',
  etape: 'reparation',
  sections_acquises: {
    phase: 'reparation',
    tentativesReparation: 1,
    acquis: { app: { name: 'depenses' }, entities: [{ id: 'ent_depense' }] },
  },
  niveaux_sondes: { p0: 'haut' },
  document: null,
  reprises: 1,
  battement: '2026-10-09T08:05:00.000Z',
  jeton_travailleur: 'aaaaaaaa-0000-4000-8000-000000000001',
}

describe('sauverEtatLocal', () => {
  it('ecrit la ligne complete la ou on le lui dit, et rend le chemin', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'etat-'))
    const chemin = sauverEtatLocal(LIGNE, dossier)
    expect(chemin).toBe(cheminEtatLocal(LIGNE.id, dossier))
    const relu = JSON.parse(readFileSync(chemin, 'utf8')) as typeof LIGNE
    expect(relu).toEqual(LIGNE)
  })

  it('refuse une ligne sans id — une sauvegarde innommable serait introuvable', () => {
    expect(() => sauverEtatLocal({ demande: 'x' })).toThrowError(/ETAT_LOCAL_SANS_ID/u)
  })
})

describe('chargerPourResurrection', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'etat-'))
  const charge = chargerPourResurrection(sauverEtatLocal(LIGNE, dossier))

  it('rend l etat paye INTACT : acquis, cout, diagnostics, compteurs', () => {
    expect(charge.sections_acquises).toEqual(LIGNE.sections_acquises)
    expect(charge.cout_usd).toBe(6.8733)
    expect(charge.diagnostics).toEqual(LIGNE.diagnostics)
    expect(charge.id).toBe(LIGNE.id)
    expect(charge.etape).toBe('reparation')
    expect(charge.niveaux_sondes).toEqual(LIGNE.niveaux_sondes)
  })

  it('une ligne figee en_cours ressuscite RELACHEE : en_attente, verrou nul', () => {
    expect(charge.statut).toBe('en_attente')
    expect(charge.battement).toBeNull()
    expect(charge.jeton_travailleur).toBeNull()
  })

  it('refuse une sauvegarde sans demande — la base la refuserait en silence plus tard', () => {
    const d2 = mkdtempSync(join(tmpdir(), 'etat-'))
    const chemin = sauverEtatLocal({ id: 'abc', demande: '' }, d2)
    expect(() => chargerPourResurrection(chemin)).toThrowError(/ETAT_LOCAL_INVALIDE/u)
  })
})
