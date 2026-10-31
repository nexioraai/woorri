/**
 * EP-304 — LE DOCUMENT DÉCIDE, ET IL LE PROUVE PAR DES IDENTIFIANTS.
 *
 * Chantier unifié (arbitrage du 2026-10-31) : le lexique fermé du juge et la
 * table fixe de l'élicitation étaient le même défaut. Le modèle ne rend que
 * des NUMÉROS d'énoncés — la provenance est exacte par construction, et une
 * exigence hallucinée ne peut pas exister.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decouperEnEnonces } from '../enonces'
import {
  construirePrompt,
  MOTIFS_HORS_PERIMETRE,
  verifierExtraction,
} from '../extraction-exigences'

const CAHIER = readFileSync(join(__dirname, 'fixtures', 'cahier-9ee1ca86.txt'), 'utf8')
const ENONCES = decouperEnEnonces(CAHIER)
/** Un énoncé du cahier qui parle d'Android/iPhone — la limite du moteur. */
const ID_NATIF = ENONCES.find((e) => /android|iphone/iu.test(e.texte))?.id ?? 0
/**
 * Un énoncé ORDINAIRE — que le moteur ne déclare PAS lui-même. Choisi par
 * mesure : le premier essai employait l'énoncé 2, qui parle d'Android, et le
 * moteur le déclarait à juste titre. Le test était faux, pas le code.
 */
const ID_SIMPLE =
  ENONCES.find((e) => !/android|iphone|ios\b|app store|google play/iu.test(e.texte))?.id ?? 0

describe('EP-304 · la vérification de l’extraction', () => {
  it('① UN NUMÉRO QUI N’EXISTE PAS EST REFUSÉ — l’invention est impossible', () => {
    const r = verifierExtraction(
      JSON.stringify({ exigences: [{ nom: 'Fantôme', enonces: [99_999, 1] }] }),
      CAHIER,
    )
    expect(r.refus.join(' ')).toMatch(/n'existent pas/u)
    expect(r.exigences[0]?.enonces).toEqual([1])
  })

  it('② LA PARTITION EST VÉRIFIÉE : un énoncé ne va qu’à une exigence', () => {
    const r = verifierExtraction(
      JSON.stringify({
        exigences: [
          { nom: 'A', enonces: [2, 3] },
          { nom: 'B', enonces: [3, 4] },
        ],
      }),
      CAHIER,
    )
    expect(r.refus.join(' ')).toMatch(/réclamé deux fois/u)
    expect(r.exigences[1]?.enonces).toEqual([4])
  })

  it('③ LES ORPHELINS SONT COMPTÉS, jamais effacés', () => {
    const r = verifierExtraction(JSON.stringify({ exigences: [{ nom: 'A', enonces: [1] }] }), CAHIER)
    expect(r.orphelins.length).toBe(ENONCES.length - 1)
    expect(r.orphelins).not.toContain(1)
  })

  it('④ LA TROISIÈME CORBEILLE EXISTE — ce qui n’est pas une demande', () => {
    // « Version 1.0 — document de cadrage » n'est pas une capacité à livrer.
    // Sans cette corbeille, le modèle inventerait une exigence pour l'absorber.
    const r = verifierExtraction(
      JSON.stringify({
        exigences: [{ nom: 'A', enonces: [2] }],
        nonExigences: [{ enonce: 1, motif: 'metadonnee' }],
      }),
      CAHIER,
    )
    expect(r.nonExigences).toEqual([{ enonce: 1, motif: 'metadonnee' }])
    expect(r.orphelins).not.toContain(1)
  })

  it('⑤ UN MOTIF HORS LISTE NE PASSE PAS — l’exigence reste à couvrir', () => {
    for (const motif of ['pas le temps', 'trop complexe', '']) {
      const r = verifierExtraction(
        JSON.stringify({ exigences: [{ nom: 'A', enonces: [ID_SIMPLE], horsPerimetre: { motif } }] }),
        CAHIER,
      )
      expect(r.exigences[0]?.horsPerimetre, `« ${motif} » a été accepté`).toBeUndefined()
    }
  })

  it('⑥ « REPORTÉ PAR LE CLIENT » EST REFUSÉ AU MODÈLE — porte refermée', () => {
    // La seule des cinq causes que le modèle pouvait s'attribuer sans preuve.
    expect(MOTIFS_HORS_PERIMETRE['reporte_par_le_client']?.voix).toEqual(['humain'])
    const r = verifierExtraction(
      JSON.stringify({
        exigences: [{ nom: 'A', enonces: [ID_SIMPLE], horsPerimetre: { motif: 'reporte_par_le_client' } }],
      }),
      CAHIER,
    )
    expect(r.exigences[0]?.horsPerimetre).toBeUndefined()
    expect(r.refus.join(' ')).toMatch(/n'appartient qu'à l'humain/u)
  })

  it('⑦ LE MOTEUR DÉCLARE LE NATIF LUI-MÊME — et de sa propre voix', () => {
    // N3 : Deribfy ne construit pas de natif. C'est un FAIT, pas un avis du
    // modèle — et c'est le mécanisme anti-boucle : jamais renvoyé au modèle.
    expect(ID_NATIF, 'le cahier Hayine parle bien d’Android/iPhone').toBeGreaterThan(0)
    const r = verifierExtraction(
      JSON.stringify({ exigences: [{ nom: 'Application mobile', enonces: [ID_NATIF] }] }),
      CAHIER,
    )
    expect(r.exigences[0]?.horsPerimetre?.motif).toBe('build_natif_requis')
    expect(r.exigences[0]?.horsPerimetre?.voix).toBe('moteur')
  })

  it('⑧ L’AMBIGUÏTÉ EST UN MOTIF, PAS UNE SORTIE', () => {
    const r = verifierExtraction(
      JSON.stringify({ exigences: [{ nom: 'A', enonces: [ID_SIMPLE], horsPerimetre: { motif: 'ambigue' } }] }),
      CAHIER,
    )
    expect(r.exigences[0]?.horsPerimetre?.motif).toBe('ambigue')
    expect(MOTIFS_HORS_PERIMETRE['ambigue']?.voix).toContain('modele')
  })

  it('⑨ UNE RÉPONSE ILLISIBLE NE DÉTRUIT RIEN — tout reste orphelin', () => {
    const r = verifierExtraction('je ne sais pas faire', CAHIER)
    expect(r.refus.join(' ')).toMatch(/illisible/u)
    expect(r.orphelins.length).toBe(ENONCES.length)
    expect(r.exigences).toEqual([])
  })

  it('⑩ LE PROMPT NE DEMANDE QUE DES NUMÉROS, et nomme les motifs fermés', () => {
    const p = construirePrompt(ENONCES.slice(0, 5))
    expect(p).toMatch(/TU NE RECOPIES AUCUN TEXTE/u)
    expect(p).toContain('service_externe_requis')
    expect(p, 'le motif humain ne doit pas être proposé au modèle').not.toContain(
      'reporte_par_le_client',
    )
    expect(p).toContain('1. ')
  })
})
