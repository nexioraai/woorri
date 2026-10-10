/**
 * TEST-OR — L'ESCALIER DES TROIS MODES, AU CARACTERE PRES.
 *
 * Epingle AVANT d'ajouter les props optionnelles des applis : le rendu
 * SANS props nouvelles doit rester OCTET POUR OCTET celui des trois modes.
 * « Identique au caractere pres » devient un test, pas une promesse.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Escalier } from '../Conversation'

const ETAPES = ['Analyse de votre activité…', 'Conception des modules métier…', 'Finalisation…']

describe("test-or — le rendu des modes n'a pas le droit de bouger", () => {
  it('marche 1 active : le markup épinglé, octet pour octet', () => {
    const html = renderToStaticMarkup(<Escalier etapes={ETAPES} courante={1} />)
    expect(html).toBe(
      '<div class="flex items-center gap-3 transition-all duration-500" style="opacity:1"><div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500" style="background:#FA5D1E;border:2px solid transparent"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M20 6L9 17l-5-5"></path></svg></div><span class="text-sm transition-colors duration-500" style="color:#cbbfae">Analyse de votre activité…</span></div><div class="flex items-center gap-3 transition-all duration-500" style="opacity:1"><div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500" style="background:rgba(224,112,64,0.2);border:2px solid #FA5D1E"><div class="w-2 h-2 rounded-full bg-[#FA5D1E] animate-pulse"></div></div><span class="text-sm transition-colors duration-500" style="color:#fff">Conception des modules métier…</span></div><div class="flex items-center gap-3 transition-all duration-500" style="opacity:0.35"><div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500" style="background:rgba(255,255,255,0.06);border:2px solid transparent"></div><span class="text-sm transition-colors duration-500" style="color:#6f6456">Finalisation…</span></div>',
    )
  })

  it('marche 0 et dernière marche : formes extrêmes stables', () => {
    const debut = renderToStaticMarkup(<Escalier etapes={ETAPES} courante={0} />)
    const fin = renderToStaticMarkup(<Escalier etapes={ETAPES} courante={2} />)
    expect(debut).toContain('animate-pulse')
    expect(debut).not.toContain('M20 6L9 17l-5-5') // rien de coché au départ
    expect((fin.match(/M20 6L9 17l-5-5/g) ?? []).length).toBe(2) // deux marches cochées
  })
})

describe('les props optionnelles des applis — ajoutees APRES, jamais dedans', () => {
  it('fraction, compteur et panneau se rendent sous les marches', () => {
    const html = renderToStaticMarkup(
      <Escalier
        etapes={ETAPES}
        courante={1}
        fraction={{ faites: 7, total: 22, libelle: 'Sections écrites' }}
        compteur={{ restants: 12, libelle: 'Points à corriger' }}
        panneau={<p>APERCU-ICI</p>}
      />,
    )
    expect(html).toContain('Sections écrites')
    expect(html).toContain('7/22')
    expect(html).toContain('width:32%')
    expect(html).toContain('Points à corriger')
    expect(html).toContain('>12</span>')
    expect(html).toContain('APERCU-ICI')
    // et le markup des marches lui-meme reste STRICTEMENT prefixe du rendu or
    const or = renderToStaticMarkup(<Escalier etapes={ETAPES} courante={1} />)
    expect(html.startsWith(or)).toBe(true)
  })
})
