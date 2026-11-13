// G30 (2026-11-13) — CLIQUET DE COMPORTEMENT : LE COMPOSEUR NE TRONQUE JAMAIS EN SILENCE.
//
// MESURÉ : quatre lignes de génération à 1 000 signes exactement pour des
// cahiers de 1 900 à 2 600 — `maxLength={1000}` coupait le collage sans un mot.
// Ici le composeur est RENDU dans un DOM, un texte est collé par l'événement
// natif `input`, et on lit ce qu'il garde et ce qu'il dit :
//   ① 2 600 signes collés → 2 600 gardés, aucun compteur, aucun message,
//      et l'envoi transmet bien 2 600 ;
//   ② 30 000 signes collés → 30 000 gardés (rien n'est tronqué), le message
//      `role="alert"` nomme la longueur et le seuil de lecture (24 000) ;
//   ③ 20 000 signes (≥ 80 % du seuil) → le compteur apparaît, pas le message.
// Rouge-puis-vert : remettre `maxLength={1000}` sur le <textarea> rougit ① et ②.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

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
  // LE MÉCANISME LUI-MÊME : un collage programmatique contourne `maxLength`
  // (le navigateur ne tronque que la saisie de la personne), donc coller ici
  // ne reproduit pas la coupe. L'attribut absent EST le cliquet : le
  // remettre rougit ici, avant toute mesure de comportement.
  expect(champ.hasAttribute('maxlength'), 'un maxLength est revenu sur le champ : la troncature muette aussi').toBe(false)
  return { React, racine, champ, envoye }
}

describe('G30 — le composeur garde ce qu’on y colle, et dit quand la lecture s’arrête', () => {
  it('① 2 600 signes collés partent entiers, sans compteur ni message', async () => {
    const { React, racine, champ, envoye } = await monter()
    const texte = 'Application mobile et web pour le « Complexe Scolaire La Renaissance » — '.repeat(40).slice(0, 2600)
    expect(texte).toHaveLength(2600)
    await React.act(async () => { coller(champ, texte) })
    expect(champ.value).toHaveLength(2600)
    expect(racine.querySelector('[role="alert"]')).toBeNull()
    expect(racine.textContent).not.toMatch(/signes/u)
    await React.act(async () => { (racine.querySelector('button[aria-label="Envoyer"]') as HTMLButtonElement).click() })
    expect(envoye).toHaveLength(1)
    expect(envoye[0]).toHaveLength(2600)
  })

  it('② 30 000 signes collés sont gardés, et le message nomme la longueur et le seuil de 24 000', async () => {
    const { React, racine, champ } = await monter()
    await React.act(async () => { coller(champ, 'x'.repeat(30_000)) })
    expect(champ.value, 'le texte a été tronqué').toHaveLength(30_000)
    const alerte = racine.querySelector('[role="alert"]')
    expect(alerte, 'aucun message : la coupe de lecture serait muette').not.toBeNull()
    expect(alerte!.textContent ?? '').toMatch(motifTexte('Votre texte fait 30 000 signes.'))
    expect(alerte!.textContent ?? '').toMatch(motifTexte('s’arrête à 24 000 signes'))
    // L'envoi reste possible : la génération, elle, lit tout.
    expect((racine.querySelector('button[aria-label="Envoyer"]') as HTMLButtonElement).disabled).toBe(false)
  })

  it('③ à 80 % du seuil, le compteur apparaît ; le message, non', async () => {
    const { React, racine, champ } = await monter()
    await React.act(async () => { coller(champ, 'y'.repeat(20_000)) })
    expect(racine.querySelector('[role="alert"]')).toBeNull()
    expect(racine.textContent ?? '').toMatch(motifTexte('20 000 / 24 000 signes'))
  })
})
