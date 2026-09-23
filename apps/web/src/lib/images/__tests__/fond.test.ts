// ============================================================
// CLIQUET — UNE CAPACITÉ NON DÉPLOYÉE NE SE PRÉSENTE PAS COMME DISPONIBLE.
//
// La suppression de fond exige un worker séparé (modèle de ~176 Mo, hors
// d'atteinte du serverless). Tant qu'il n'est pas déployé, l'option ne doit
// PAS apparaître dans l'interface du marchand.
//
// POURQUOI C'EST UN CLIQUET ET PAS UN DÉTAIL : une fonctionnalité annoncée et
// indisponible est pire qu'une fonctionnalité absente. Le marchand clique,
// rien ne se passe, et il cesse de faire confiance au reste de l'outil — y
// compris à ce qui marche.
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ENV }
  vi.resetModules()
})

async function charger() {
  vi.resetModules()
  return import('../fond')
}

describe('disponibilité déclarée', () => {
  beforeEach(() => {
    process.env = { ...ENV }
  })

  it('SANS worker déclaré, la capacité se dit indisponible', async () => {
    delete process.env.IMAGE_WORKER_URL
    delete process.env.IMAGE_WORKER_TOKEN
    const { fondDisponible } = await charger()
    expect(fondDisponible()).toBe(false)
  })

  it('avec une adresse MAIS SANS jeton, elle reste indisponible', async () => {
    // Un worker sans jeton accepterait n'importe qui à écrire des images pour
    // des boutiques réelles. L'absence de jeton n'est pas une demi-mesure :
    // c'est une capacité non déployée.
    process.env.IMAGE_WORKER_URL = 'https://worker.exemple'
    delete process.env.IMAGE_WORKER_TOKEN
    const { fondDisponible } = await charger()
    expect(fondDisponible()).toBe(false)
  })

  it('avec les DEUX, elle se dit disponible', async () => {
    process.env.IMAGE_WORKER_URL = 'https://worker.exemple'
    process.env.IMAGE_WORKER_TOKEN = 'secret'
    const { fondDisponible } = await charger()
    expect(fondDisponible()).toBe(true)
  })
})

describe('appel — fail-safe intégral', () => {
  it('non déployé : un résultat NÉGATIF, jamais une exception', async () => {
    // L'appelant garde l'original et l'améliorée. Le marchand perd une
    // option, pas sa photo.
    delete process.env.IMAGE_WORKER_URL
    delete process.env.IMAGE_WORKER_TOKEN
    const { supprimerFond } = await charger()
    const r = await supprimerFond(Buffer.alloc(1000))
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.raison).toBe('non_deploye')
  })

  it('worker injoignable : signalé comme tel, sans jamais lever', async () => {
    process.env.IMAGE_WORKER_URL = 'https://worker.inexistant.test'
    process.env.IMAGE_WORKER_TOKEN = 'secret'
    const { supprimerFond } = await charger()
    // `vitest.setup.ts` arrête tout appel réseau externe : le rejet qu'il
    // produit est exactement le cas « injoignable » que cette route doit
    // absorber. Le garde-fou sert ici de simulateur de panne.
    const r = await supprimerFond(Buffer.alloc(1000), '#FFFFFF', 500)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.raison).toBe('injoignable')
  })
})
