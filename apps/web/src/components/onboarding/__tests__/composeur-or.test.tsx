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

/**
 * CLIQUET DE PLACEMENT — POSE APRES AVOIR VU LE DEFAUT A L'ECRAN.
 *
 * Le trombone et la fleche sont posés depuis le BAS du cadre « relative ».
 * Ce cadre doit donc ne RIEN contenir d'autre que le champ et ces deux
 * boutons : le jour où la note est retombée dedans, elle a agrandi le cadre
 * et le trombone est descendu SUR son propre texte.
 *
 * Deux faits sont épinglés ici, pas une intention :
 *  — la note vient APRES la fermeture du cadre ;
 *  — le texte commence à droite du trombone, pas dessous.
 */
describe('cliquet — le trombone ne se déplace pas, et rien ne passe dessous', () => {
  const AVEC = {
    ...PROPS,
    joindre: () => {},
    note: 'NOTE_ICI',
  }

  it('la note est SŒUR du cadre, jamais fille', () => {
    const html = renderToStaticMarkup(<Composeur {...AVEC} />)
    // La fleche ferme, PUIS le cadre ferme, PUIS la note commence.
    // Avant le correctif on lisait `</button><div class="mt-2` : la note
    // etait dedans, et c'est exactement ce que cette ligne interdit.
    expect(html).toContain('</button></div><div class="mt-2 px-2 text-xs text-slate-400">')
    expect(html).not.toContain('</button><div class="mt-2')
  })

  it('le texte laisse la place au trombone', () => {
    const avec = renderToStaticMarkup(<Composeur {...AVEC} />)
    const sans = renderToStaticMarkup(<Composeur {...PROPS} />)
    // Le trombone occupe 16 → 52 px a gauche. `pl-6` (24 px) ferait passer
    // le texte DESSOUS ; `pl-14` (56 px) le fait commencer apres.
    expect(avec).toContain('pl-14 pr-16 py-4')
    expect(avec).not.toContain('pl-6')
    // Et les trois modes, eux, gardent leur `pl-6` au caractere pres.
    expect(sans).toContain('pl-6 pr-16 py-4')
    expect(sans).not.toContain('pl-14')
  })
})
