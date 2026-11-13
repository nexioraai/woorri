// G30 (2026-11-13) — CLIQUET DE COMPORTEMENT : LE COMPOSEUR NE TRONQUE JAMAIS, NE COMPTE JAMAIS.
//
// MESURÉ : quatre lignes de génération à 1 000 signes exactement pour des
// cahiers de 1 900 à 2 600 — `maxLength={1000}` coupait le collage sans un mot.
// Ici le composeur est RENDU dans un DOM, un texte est collé par l'événement
// natif `input`, et on lit ce qu'il garde et ce qu'il dit :
//   ① 2 600 signes collés → 2 600 gardés, aucun message, et l'envoi transmet 2 600 ;
//   ② 30 000 signes collés → 30 000 gardés et envoyés, AUCUN message, AUCUN
//      compteur, envoi actif — aucune limite n'est visible : un client qui
//      apporte un cahier de deux cents pages est le meilleur client possible ;
//   ③ 20 000 signes → ni compteur ni message non plus.
// Le mécanisme lui-même est épinglé dans `monter()` : l'attribut `maxlength`
// absent. Un collage programmatique contourne `maxLength` (le navigateur ne
// tronque que la saisie de la personne) : coller ne reproduit pas la coupe,
// l'attribut EST le cliquet. Rouge-puis-vert : `maxLength={1000}` remis → rouge.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })

/** Un collage : la valeur posée par le setter natif, puis l'événement `input` que React écoute. */
function coller(el: HTMLTextAreaElement, texte: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(el, texte)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
}

async function monter() {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { Composeur } = await import('../Conversation')
  const envoye: string[] = []
  function Hote() {
    const [valeur, setValeur] = React.useState('')
    return React.createElement(Composeur, {
      valeur, onChange: setValeur, onEnvoyer: () => { envoye.push(valeur) },
      invite: 'Décrivez votre activité…', etiquette: 'Votre demande',
    })
  }
  const racine = document.createElement('div')
  document.body.appendChild(racine)
  await React.act(async () => { createRoot(racine).render(React.createElement(Hote)) })
  const champ = racine.querySelector('textarea[aria-label="Votre demande"]') as HTMLTextAreaElement
  expect(champ).not.toBeNull()
  expect(champ.hasAttribute('maxlength'), 'un maxLength est revenu sur le champ : la troncature muette aussi').toBe(false)
  return { React, racine, champ, envoye }
}

const bouton = (racine: HTMLElement) => racine.querySelector('button[aria-label="Envoyer"]') as HTMLButtonElement
const AUCUNE_LIMITE = /signes|raccourci|limite|trop long/iu

describe('G30 — le composeur garde ce qu’on y colle, et n’affiche aucune limite', () => {
  it('① 2 600 signes collés partent entiers, sans message', async () => {
    const { React, racine, champ, envoye } = await monter()
    const texte = 'Application mobile et web pour le « Complexe Scolaire La Renaissance » — '.repeat(40).slice(0, 2600)
    expect(texte).toHaveLength(2600)
    await React.act(async () => { coller(champ, texte) })
    expect(champ.value).toHaveLength(2600)
    expect(racine.querySelector('[role="alert"]')).toBeNull()
    expect(racine.textContent ?? '').not.toMatch(AUCUNE_LIMITE)
    await React.act(async () => { bouton(racine).click() })
    expect(envoye).toHaveLength(1)
    expect(envoye[0]).toHaveLength(2600)
  })

  it('② 30 000 signes collés sont gardés et envoyés — aucun message, aucun compteur, envoi actif', async () => {
    const { React, racine, champ, envoye } = await monter()
    await React.act(async () => { coller(champ, 'x'.repeat(30_000)) })
    expect(champ.value, 'le texte a été tronqué').toHaveLength(30_000)
    expect(racine.querySelector('[role="alert"]'), 'une limite est devenue visible').toBeNull()
    expect(racine.textContent ?? '').not.toMatch(AUCUNE_LIMITE)
    expect(bouton(racine).disabled).toBe(false)
    await React.act(async () => { bouton(racine).click() })
    expect(envoye).toHaveLength(1)
    expect(envoye[0]).toHaveLength(30_000)
  })

  it('③ à 20 000 signes non plus : ni compteur, ni message', async () => {
    const { React, racine, champ } = await monter()
    await React.act(async () => { coller(champ, 'y'.repeat(20_000)) })
    expect(champ.value).toHaveLength(20_000)
    expect(racine.querySelector('[role="alert"]')).toBeNull()
    expect(racine.textContent ?? '').not.toMatch(AUCUNE_LIMITE)
  })
})
