import { describe, it, expect } from 'vitest'
import { verifierFichier, TAILLE_MAX_OCTETS } from '../fichiers/verifierFichier'

describe('verifierFichier — prévenir avant l’envoi (CPA, 2026-11-17)', () => {
  it('accepte les photos et documents admis, en majuscules aussi', () => {
    for (const n of ['a.jpg', 'B.JPEG', 'c.png', 'd.webp', 'e.pdf', 'f.docx', 'g.xlsx']) expect(verifierFichier({ name: n, size: 1000 })).toBeNull()
  })
  it('refuse le HEIC avec la marche à suivre sur iPhone', () => {
    expect(verifierFichier({ name: 'IMG_1893.HEIC', size: 1000 })).toMatch(/HEIC.*JPEG.*compatible/)
  })
  it('refuse un format inconnu en le nommant', () => {
    expect(verifierFichier({ name: 'video.mp4', size: 1000 })).toMatch(/« \.mp4 » non accepté/)
  })
  it('4 Mo passe, au-delà non (mesuré : 4,4 Mo coupé par l’hébergeur)', () => {
    expect(verifierFichier({ name: 'a.jpg', size: TAILLE_MAX_OCTETS })).toBeNull()
    expect(verifierFichier({ name: 'a.jpg', size: 4.4 * 1048576 })).toMatch(/trop lourd \(4\.4 Mo\)/)
  })
})
