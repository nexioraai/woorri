/**
 * LA FENÊTRE « PUBLIER » (décision du propriétaire, 2026-11-22), RENDUE.
 *
 * Elle remplace deux boîtes natives du navigateur, dont une au texte jugé
 * incompréhensible (« clé de lecture… page publiée… Publier quand même ? »).
 * Ce test la monte dans un DOM et la manipule comme une personne.
 *
 * Ce qu'il NE PEUT PAS voir : le rendu à l'œil (couleurs, tenue à 390 px) —
 * ça se regarde à l'écran.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { DemandeFenetre } from '@/components/apps/publierAppli'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })
beforeEach(() => { document.body.innerHTML = '' })

async function monter(demande: DemandeFenetre, onFermer = vi.fn()): Promise<{ racine: HTMLElement; onFermer: ReturnType<typeof vi.fn> }> {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { FenetrePublier } = await import('@/components/apps/FenetrePublier')
  const racine = document.createElement('div')
  document.body.appendChild(racine)
  await React.act(async () => { createRoot(racine).render(React.createElement(FenetrePublier, { demande, onFermer })) })
  await React.act(async () => { await new Promise((r) => setTimeout(r, 5)) })
  return { racine, onFermer }
}
const demande = (d: Partial<DemandeFenetre> = {}): DemandeFenetre => ({
  titre: 'Publier votre application', adresseInitiale: 'gestion-de-stock', adresseModifiable: true, listes: [],
  libelleBouton: 'Continuer vers le paiement', valider: vi.fn(async () => null), annuler: vi.fn(), ...d,
})
const boutons = (r: HTMLElement) => [...r.querySelectorAll('button')].map((b) => b.textContent?.trim())
const cliquer = async (r: HTMLElement, texte: string) => {
  const React = await import('react')
  const b = [...r.querySelectorAll('button')].find((x) => x.textContent?.trim() === texte)
  expect(b, `bouton « ${texte} » absent`).toBeDefined()
  await React.act(async () => { b?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((x) => setTimeout(x, 5)) })
}
const taper = async (r: HTMLElement, valeur: string) => {
  const React = await import('react')
  const champ = r.querySelector('input') as HTMLInputElement
  const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await React.act(async () => { poser?.call(champ, valeur); champ.dispatchEvent(new Event('input', { bubbles: true })) })
}

describe('la fenêtre « Publier »', () => {
  it('le titre, l’adresse déjà remplie suivie de « .deribfy.app », et les deux boutons', async () => {
    const { racine } = await monter(demande())
    expect(racine.querySelector('[role="dialog"]')).not.toBeNull()
    expect(racine.querySelector('h2')?.textContent).toBe('Publier votre application')
    expect((racine.querySelector('input') as HTMLInputElement).value).toBe('gestion-de-stock')
    expect(racine.textContent).toContain('.deribfy.app')
    expect(boutons(racine)).toEqual(['Annuler', 'Continuer vers le paiement'])
  })

  it('rien de public : aucune phrase « À savoir »', async () => {
    const { racine } = await monter(demande())
    expect(racine.textContent).not.toContain('À savoir')
  })

  it('une liste publique : UNE phrase simple par liste, sans aucun mot technique', async () => {
    // 2026-11-23 : la phrase dit EXACTEMENT les informations visibles, les
    // lignes conditionnées, et une liste qui n'accorde rien n'est pas promise.
    const { racine } = await monter(demande({ listes: [
      { nom: 'Produits', champs: ['nom', 'quantité', 'seuil d’alerte'] },
      { nom: 'Annonces', champs: ['titre'], seulement: '« masqué » vaut non' },
      { nom: 'Clients', champs: [] },
    ] }))
    const texte = racine.textContent ?? ''
    expect(texte).toContain('À savoir : de votre liste « Produits », ces informations seront visibles par tout le monde : nom, quantité, seuil d’alerte. Le reste ne l’est pas. Personne ne pourra la modifier.')
    expect(texte).toContain('Seules les lignes où « masqué » vaut non le seront.')
    expect(texte).toContain('À savoir : votre liste « Clients » ne sera visible par personne')
    expect(texte).toContain('Si vous ne le voulez pas, annulez et demandez la modification dans l’atelier.')
    expect(texte, 'un mot technique est revenu').not.toMatch(/clé de lecture|page servie|page publiée|téléchargeable|PAR TOUT LE MONDE|quand même/u)
  })

  it('« Continuer » valide l’adresse saisie ; un refus du nom s’affiche DANS la fenêtre, qui reste ouverte', async () => {
    const valider = vi.fn(async (a: string) => (a === 'pris' ? '« pris » est deja pris par une autre application.' : null))
    const { racine, onFermer } = await monter(demande({ valider }))
    await taper(racine, '  Pris ')
    await cliquer(racine, 'Continuer vers le paiement')
    expect(valider).toHaveBeenCalledWith('pris')
    expect(racine.querySelector('[role="alert"]')?.textContent).toContain('deja pris')
    expect(onFermer).not.toHaveBeenCalled()
    await taper(racine, 'mon-stock')
    await cliquer(racine, 'Continuer vers le paiement')
    expect(valider).toHaveBeenLastCalledWith('mon-stock')
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('un format refusé se dit tout de suite, et le bouton ne part pas', async () => {
    const d = demande()
    const { racine } = await monter(d)
    await taper(racine, 'A')
    expect(racine.textContent).toContain('Minuscules, chiffres et tirets')
    expect([...racine.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Continuer vers le paiement')?.disabled).toBe(true)
  })

  it('« Annuler » ferme sans rien valider', async () => {
    const d = demande()
    const { racine, onFermer } = await monter(d)
    await cliquer(racine, 'Annuler')
    expect(d.annuler).toHaveBeenCalledTimes(1)
    expect(d.valider).not.toHaveBeenCalled()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('nom déjà enregistré : l’adresse est montrée, non modifiable ; appli payée : « Publier »', async () => {
    const { racine } = await monter(demande({ adresseInitiale: 'gestion-stock', adresseModifiable: false, libelleBouton: 'Publier' }))
    expect((racine.querySelector('input') as HTMLInputElement).readOnly).toBe(true)
    expect(boutons(racine)).toEqual(['Annuler', 'Publier'])
  })
})
