// 2026-11-17 — LA BARRE DE L'ATELIER : la marque, l'appareil au centre,
// l'abonnement à côté de « Publier ».
//
// Cliquet (lecture de la source) pour l'ORDRE dans la barre — c'est une
// position, et seule la source la dit sans navigateur. Comportement (DOM)
// pour ce que les composants FONT.
//
// Ce que ce test NE PEUT PAS voir : le rendu réel (que le groupe tombe au
// centre à l'œil, que la barre tienne à 390 px). Ça se regarde à l'écran.
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const SRC = join(__dirname, '../../..')
const ATELIER = readFileSync(join(SRC, 'app/atelier/[id]/page.tsx'), 'utf8')
const CADRE = readFileSync(join(SRC, 'components/atelier/CadreApercu.tsx'), 'utf8')

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })
beforeEach(() => { document.body.innerHTML = '' })

async function monter(element: unknown): Promise<HTMLElement> {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const racine = document.createElement('div')
  document.body.appendChild(racine)
  await React.act(async () => { createRoot(racine).render(element as never) })
  return racine
}

describe('la barre de l’atelier', () => {
  it('① ordre : marque, titre, CHOIX DE L’APPAREIL, puis les gestes — et le cadre ne choisit plus', () => {
    const barre = ATELIER.slice(ATELIER.indexOf('<header'), ATELIER.indexOf('</header>'))
    const ou = (motif: string): number => barre.indexOf(motif)
    expect(ou('text-nexiora'), 'la marque Deribfy manque dans la barre').toBeGreaterThan(-1)
    expect(ou('{nom}</h1>')).toBeGreaterThan(ou('text-nexiora'))
    expect(ou('<ChoixAppareil'), 'le choix de l’appareil n’est pas entre le titre et les gestes').toBeGreaterThan(ou('{nom}</h1>'))
    expect(ou('Historique')).toBeGreaterThan(ou('<ChoixAppareil'))
    // UN SEUL CHEMIN VERS LE PAIEMENT (2026-11-21) : « Publier ». Le bouton
    // « S'abonner — Bientôt » a quitté la barre, et « Télécharger » suit « Publier ».
    expect(ou('<BoutonAbonnement'), '« S’abonner » est revenu dans la barre : deux chemins vers le paiement').toBe(-1)
    expect(ou('libellePublier(')).toBeGreaterThan(ou('Historique'))
    expect(ou('Télécharger')).toBeGreaterThan(ou('libellePublier('))
    // Gauche et droite prennent chacune la moitié du reste : le centre est au centre.
    expect(barre.match(/className="flex min-w-0 flex-1/gu)?.length, 'les deux zones latérales ne sont pas symétriques').toBe(2)
    // Une seule source de largeur : la barre la choisit, le cadre l'applique.
    expect(ATELIER).toMatch(/<CadreApercu[^>]*largeur=\{largeur\}/u)
    expect(CADRE).not.toMatch(/role="group"/u)
    expect(CADRE).not.toMatch(/useState/u)
  })

  it('M2 · sous 1024 px, deux onglets ; l’application à l’arrivée ; on y revient après chaque geste', () => {
    // Mesuré à 390 px (2026-11-17) : sans onglets, l’aperçu ne recevait aucune
    // largeur. Ce cliquet tient la RÈGLE ; le rendu, lui, se prouve à la capture.
    expect(ATELIER).toMatch(/useState<'conversation' \| 'application'>\('application'\)/u)
    expect(ATELIER).toMatch(/role="tablist"[^>]*className="[^"]*\blg:hidden\b/u)
    // Chaque panneau est masqué hors de son onglet, et toujours visible en lg.
    expect(ATELIER).toMatch(/id="panneau-conversation"[\s\S]{0,200}\? 'flex' : 'hidden'\}[^`]*\blg:flex\b/u)
    expect(ATELIER).toMatch(/id="panneau-application"[\s\S]{0,200}\? 'flex' : 'hidden'\}[^`]*\blg:flex\b/u)
    // Le résultat d’une modification se montre : sur téléphone il est dans l’autre onglet.
    const envoyer = ATELIER.slice(ATELIER.indexOf('const envoyer ='), ATELIER.indexOf('const revenirA ='))
    expect(envoyer.indexOf("setOnglet('application')")).toBeGreaterThan(envoyer.lastIndexOf('chargerApercu()'))
  })

  it('② le choix de l’appareil change la largeur et le dit (aria-pressed)', async () => {
    const React = await import('react')
    const { ChoixAppareil } = await import('../ChoixAppareil')
    const vus: number[] = []
    const racine = await monter(React.createElement(ChoixAppareil, { largeur: 1280, onChoisir: (l: number) => { vus.push(l) } }))
    const groupe = racine.querySelector('[role="group"]')
    expect(groupe?.getAttribute('aria-label')).toBe('Taille de l’aperçu')
    const boutons = [...racine.querySelectorAll('button')]
    expect(boutons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true'])
    await React.act(async () => { boutons[0]?.click() })
    expect(vus).toEqual([390])
  })
})
