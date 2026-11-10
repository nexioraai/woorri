import { describe, it, expect } from 'vitest'
import { indicatifDuPays, corrigerIndicatif, lienTel } from '@/lib/telephone'

// LOT 20 — « +1 235 22 51 00 00 » sur le site d'une centrale tchadienne
// (mesuré le 2026-11-10). Le moteur ne devine plus « +1 », retire un « +1 »
// parasite, et ne met que « + » et des chiffres dans un lien d'appel.
describe('le téléphone d’un site généré', () => {
  it('🔴 l’indicatif suit le pays', () => {
    expect(indicatifDuPays("N'Djaména, Tchad")).toBe('+235')
    expect(indicatifDuPays('Libreville, Gabon')).toBe('+241')
    expect(indicatifDuPays('Paris, France')).toBe('+33')
  })

  it('🔴 un pays inconnu n’a AUCUN indicatif — jamais « +1 » par défaut', () => {
    expect(indicatifDuPays('Oulan-Bator, Mongolie')).toBeNull()
    expect(indicatifDuPays('')).toBeNull()
    expect(indicatifDuPays(undefined)).toBeNull()
  })

  it('🔴 « +1 » collé devant l’indicatif du pays est retiré, rien d’autre ne bouge', () => {
    expect(corrigerIndicatif('+1 235 22 51 00 00', '+235')).toBe('+235 22 51 00 00')
    expect(corrigerIndicatif('+235 22 51 00 00', '+235')).toBe('+235 22 51 00 00')
    expect(corrigerIndicatif('+1 514 555 0101', '+1')).toBe('+1 514 555 0101')
    expect(corrigerIndicatif('+1 514 555 0101', null)).toBe('+1 514 555 0101')
  })

  it('🔴 le lien d’appel ne contient que « + » et des chiffres', () => {
    expect(lienTel('+235 22 51 00 00')).toBe('tel:+23522510000')
    expect(lienTel('(+235) 22-51-00-00')).toBe('tel:+23522510000')
    expect(lienTel('')).toBeNull()
  })
})
