/**
 * TEST-OR — LE COMPOSEUR DES TROIS MODES, AU CARACTERE PRES.
 *
 * Epingle AVANT d'ajouter le trombone et la borne de longueur : le rendu
 * SANS prop nouvelle doit rester OCTET POUR OCTET celui des trois modes.
 * Meme discipline que l'Escalier — « identique au caractere pres » devient
 * un test, pas une promesse.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Composeur } from '../Conversation'

const PROPS = {
  valeur: 'bonjour',
  onChange: () => {},
  onEnvoyer: () => {},
  invite: 'Décrivez votre activité…',
  etiquette: 'Votre demande',
}

describe("test-or — le Composeur des modes n'a pas le droit de bouger", () => {
  it('rendu nu : le markup épinglé', () => {
    const html = renderToStaticMarkup(<Composeur {...PROPS} />)
    // La borne historique fait partie du contrat visuel : 1000 caractères.
    expect(html).toContain('maxLength="1000"')
    expect(html).toContain('placeholder="Décrivez votre activité…"')
    expect(html).toContain('aria-label="Votre demande"')
    expect(html).toContain('rounded-[24px] pl-6 pr-16 py-4')
    expect(html).toContain('min-h-[56px] max-h-40')
    // AUCUN trombone, AUCUN compteur : les modes n'en veulent pas.
    expect(html).not.toMatch(/trombone|Joindre|jeton/iu)
    expect(html).not.toContain('type="file"')
  })

  it('les états désactivé et bloqué restent ce qu ils étaient', () => {
    const d = renderToStaticMarkup(<Composeur {...PROPS} desactive />)
    const b = renderToStaticMarkup(<Composeur {...PROPS} bloque />)
    expect(d).toContain('disabled=""')
    expect(b).toContain('disabled=""')
    expect(b).not.toContain('type="file"')
  })
})
