/**
 * LE CAHIER DES CHARGES JOINT — PROUVÉ À 0 $.
 *
 * L'extraction PDF tourne dans le navigateur ; pdfjs sait aussi lire en
 * Node, ce qui permet de prouver la MÉCANIQUE sur de vrais PDF — un avec
 * couche texte, un SCANNÉ — sans ouvrir un navigateur. Les DÉCISIONS
 * (format, scan, coût) sont pures et se prouvent directement.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  formatDuFichier,
  raisonDuRefus,
  estProbablementUnScan,
  estimation,
  SEUIL_COUCHE_TEXTE,
  LONGUEUR_AVEC_DOCUMENT,
  MESSAGE_SCAN,
} from '../document-joint'

const FIXTURES = join(import.meta.dirname, 'fixtures')

describe('quels fichiers on lit, et ce qu on dit des autres', () => {
  it('PDF et texte sont lus — par type MIME ou par extension', () => {
    expect(formatDuFichier('cahier.pdf', 'application/pdf')).toBe('pdf')
    expect(formatDuFichier('cahier.PDF', '')).toBe('pdf') // extension seule
    expect(formatDuFichier('notes.txt', 'text/plain')).toBe('texte')
    expect(formatDuFichier('notes.md', '')).toBe('texte')
  })

  it('les autres sont REFUSÉS, et le refus DIT quoi faire', () => {
    expect(formatDuFichier('cahier.docx', '')).toBe('refuse')
    expect(raisonDuRefus('cahier.docx')).toContain('Enregistrez-le en PDF')
    expect(formatDuFichier('scan.jpg', 'image/jpeg')).toBe('refuse')
    expect(raisonDuRefus('scan.jpg')).toContain('reconnaissance de texte')
    expect(raisonDuRefus('archive.zip')).toContain('Formats acceptés')
  })
})

describe('le PDF SCANNÉ est détecté, jamais envoyé en vide', () => {
  it('un texte vide ou minuscule = scan', () => {
    expect(estProbablementUnScan('', 3)).toBe(true)
    expect(estProbablementUnScan('   \n  ', 1)).toBe(true)
    expect(estProbablementUnScan('x'.repeat(SEUIL_COUCHE_TEXTE - 1), 1)).toBe(true)
  })

  it('dix pages qui rendent trois lignes = scan AUSSI — la moyenne compte', () => {
    expect(estProbablementUnScan('a'.repeat(150), 10)).toBe(true) // 15 car./page
    expect(estProbablementUnScan('a'.repeat(400), 10)).toBe(false) // 40 car./page
  })

  it('un vrai cahier des charges n est PAS pris pour un scan', () => {
    const vrai = readFileSync(join(FIXTURES, 'cahier.txt'), 'utf8')
    expect(estProbablementUnScan(vrai, 1)).toBe(false)
  })
})

describe('le coût est ANNONCÉ avant l envoi', () => {
  it('le libellé donne les jetons ET les dollars', () => {
    const e = estimation('a'.repeat(20_000)) // ~8 pages
    expect(e.jetons).toBe(5_000)
    expect(e.coutUsd).toBeCloseTo(0.025, 4)
    expect(e.libelle).toContain('jetons')
    expect(e.libelle).toContain('$')
  })

  it('un cahier de quarante pages reste annoncé, pas caché', () => {
    const e = estimation('a'.repeat(100_000))
    expect(e.jetons).toBe(25_000)
    expect(e.libelle).toMatch(/\+0,13 \$|\+0\.13 \$/u)
  })

  it('la borne de saisie avec document laisse entrer un cahier entier', () => {
    expect(LONGUEUR_AVEC_DOCUMENT).toBeGreaterThan(100_000)
  })

  it('le message du scan dit quoi faire, pas seulement ce qui ne marche pas', () => {
    expect(MESSAGE_SCAN).toContain('SCAN')
    expect(MESSAGE_SCAN).toContain('Copiez-collez')
  })
})

describe('l extraction, sur de VRAIS PDF (pdfjs en Node)', () => {
  // pdfjs refuse son build moderne hors navigateur ; en Node il exige le
  // build `legacy`. Le chargeur étant injectable, la MÉCANIQUE se prouve
  // ici telle quelle — c'est le même code que celui du navigateur.
  const legacy = async () => {
    const m = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument: unknown
    }
    // Hors navigateur, pdfjs exige qu'on DÉSIGNE son worker : sans lui,
    // « Setting up fake worker failed ». Le navigateur, lui, le résout par
    // `import.meta.url` dans le module d'extraction.
    const { createRequire } = await import('node:module')
    m.GlobalWorkerOptions.workerSrc = createRequire(import.meta.url).resolve(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
    )
    return m as unknown as import('../extraction-pdf').Pdfjs
  }
  const lire = (nom: string): ArrayBuffer => {
    const o = readFileSync(join(FIXTURES, nom))
    return o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer
  }

  it('un PDF AVEC couche texte rend son contenu', async () => {
    const { extraireTexteDuPdf } = await import('../extraction-pdf')
    const r = await extraireTexteDuPdf(lire('cahier-avec-texte.pdf'), legacy)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.pages).toBe(1)
    expect(r.texte).toContain('CAHIER DES CHARGES')
    expect(r.texte).toContain('mandataire')
    expect(r.texte).toContain('recu de decharge')
  })

  it('un PDF SCANNÉ est détecté et SIGNALÉ — pas de vide envoyé', async () => {
    const { extraireTexteDuPdf } = await import('../extraction-pdf')
    const r = await extraireTexteDuPdf(lire('cahier-scanne.pdf'), legacy)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.raison).toBe('scan')
  })
})
