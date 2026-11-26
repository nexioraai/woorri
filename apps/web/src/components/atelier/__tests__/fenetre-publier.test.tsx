/**
 * LA FENÊTRE « PUBLIER » (décision du propriétaire, 2026-11-22 ; refonte
 * visuelle le 2026-11-24), RENDUE. Ce test la monte dans un DOM et la
 * manipule comme une personne : étapes, adresse vérifiée en direct, cartes de
 * paiement, formulaire mobile money, attente, confirmation.
 *
 * Ce qu'il NE PEUT PAS voir : le rendu à l'œil (couleurs, tenue à 390 px,
 * transitions) — ça se regarde à l'écran (captures du 2026-11-24).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { DemandeFenetre } from '@/components/apps/publierAppli'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })
// Un paiement « en attente » survit au rechargement (stockage du navigateur) : chaque test repart sans.
beforeEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); window.localStorage.clear() })

const attendre = async (ms = 5) => { const React = await import('react'); await React.act(async () => { await new Promise((r) => setTimeout(r, ms)) }) }
async function monter(demande: DemandeFenetre, onFermer = vi.fn()): Promise<{ racine: HTMLElement; onFermer: ReturnType<typeof vi.fn> }> {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { FenetrePublier } = await import('@/components/apps/FenetrePublier')
  const racine = document.createElement('div')
  document.body.appendChild(racine)
  await React.act(async () => { createRoot(racine).render(React.createElement(FenetrePublier, { demande, onFermer })) })
  await attendre(20)
  return { racine, onFermer }
}
const demande = (d: Partial<DemandeFenetre> = {}): DemandeFenetre => ({
  titre: 'Publier votre application', adresseInitiale: 'gestion-de-stock', adresseModifiable: true, listes: [],
  libelleBouton: 'Publier', moyens: [], mobileMoney: null, avecEtapes: true, compte: null, verifier: null,
  valider: vi.fn(async () => null), annuler: vi.fn(), ...d,
})
const boutons = (r: HTMLElement) => [...r.querySelectorAll('button')].map((b) => b.textContent?.trim())
const bouton = (r: HTMLElement, texte: string) => [...r.querySelectorAll('button')].find((x) => x.textContent?.trim() === texte)
const cliquer = async (r: HTMLElement, texte: string) => {
  const React = await import('react')
  const b = bouton(r, texte)
  expect(b, `bouton « ${texte} » absent (là : ${boutons(r).join(' | ')})`).toBeDefined()
  await React.act(async () => { b?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((x) => setTimeout(x, 5)) })
}
const taper = async (r: HTMLElement, valeur: string) => {
  const React = await import('react')
  const champ = r.querySelector('#fenetre-publier-adresse') as HTMLInputElement
  const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await React.act(async () => { poser?.call(champ, valeur); champ.dispatchEvent(new Event('input', { bubbles: true })) })
}
const radios = (r: HTMLElement) => [...r.querySelectorAll('input[type="radio"]')] as HTMLInputElement[]
const choisir = async (r: HTMLElement, valeur: string) => {
  const React = await import('react')
  const x = radios(r).find((b) => b.value === valeur)
  expect(x, `choix « ${valeur} » absent`).toBeDefined()
  await React.act(async () => { x?.click() })
}
const DEUX = ['carte', 'mobile_money'] as const

describe('la fenêtre « Publier »', () => {
  it('le titre, l’adresse déjà remplie suivie de « .deribfy.app », et deux boutons', async () => {
    const { racine } = await monter(demande())
    expect(racine.querySelector('[role="dialog"]')).not.toBeNull()
    expect(racine.querySelector('h2')?.textContent).toBe('Publier votre application')
    expect((racine.querySelector('#fenetre-publier-adresse') as HTMLInputElement).value).toBe('gestion-de-stock')
    expect(racine.textContent).toContain('.deribfy.app')
    expect(boutons(racine)).toEqual(['Annuler', 'Publier'])
  })

  it('rien de public : aucune phrase « À savoir »', async () => {
    const { racine } = await monter(demande())
    expect(racine.textContent).not.toContain('À savoir')
  })

  it('une liste publique : UNE phrase simple par liste, sans aucun mot technique', async () => {
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

  it('rien à payer : « Publier » valide l’adresse ; un refus du nom s’affiche DANS la fenêtre, qui reste ouverte', async () => {
    const valider = vi.fn(async (a: string) => (a === 'pris' ? '« pris » est deja pris par une autre application.' : null))
    const { racine, onFermer } = await monter(demande({ valider }))
    await taper(racine, '  Pris ')
    await cliquer(racine, 'Publier')
    expect(valider).toHaveBeenCalledWith('pris', null)
    expect(racine.querySelector('[role="alert"]')?.textContent).toContain('deja pris')
    expect(onFermer).not.toHaveBeenCalled()
    await taper(racine, 'mon-stock')
    await cliquer(racine, 'Publier')
    expect(valider).toHaveBeenLastCalledWith('mon-stock', null)
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('un format refusé se dit tout de suite, et le bouton ne part pas', async () => {
    const { racine } = await monter(demande())
    await taper(racine, 'A')
    expect(racine.textContent).toContain('Minuscules, chiffres et tirets')
    expect(bouton(racine, 'Publier')?.disabled).toBe(true)
  })

  it('« Annuler » ferme sans rien valider', async () => {
    const d = demande()
    const { racine, onFermer } = await monter(d)
    await cliquer(racine, 'Annuler')
    expect(d.annuler).toHaveBeenCalledTimes(1)
    expect(d.valider).not.toHaveBeenCalled()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('nom déjà enregistré : l’adresse est montrée, non modifiable', async () => {
    const { racine } = await monter(demande({ adresseInitiale: 'gestion-stock', adresseModifiable: false }))
    expect((racine.querySelector('#fenetre-publier-adresse') as HTMLInputElement).readOnly).toBe(true)
    expect(boutons(racine)).toEqual(['Annuler', 'Publier'])
  })
})

describe('REFONTE (2026-11-24) · les étapes', () => {
  const etapes = (r: HTMLElement) => [...r.querySelectorAll('ol[aria-label="Étapes"] li')].map((li) => [li.textContent?.replace(/^\d/u, '').trim(), li.getAttribute('aria-current')])
  it('à payer : Adresse › Paiement › Confirmation, la première est l’étape en cours', async () => {
    const { racine } = await monter(demande({ moyens: DEUX }))
    expect(etapes(racine)).toEqual([['Adresse', 'step'], ['Paiement', null], ['Confirmation', null]])
  })
  it('rien à payer : Adresse › Confirmation ; « Changer l’adresse » : aucune étape', async () => {
    const un = await monter(demande())
    expect(etapes(un.racine).map((e) => e[0])).toEqual(['Adresse', 'Confirmation'])
    document.body.innerHTML = ''
    const deux = await monter(demande({ avecEtapes: false }))
    expect(etapes(deux.racine)).toEqual([])
  })
  it('« Continuer » passe au Paiement (l’étape avance), « ‹ Adresse » revient', async () => {
    const { racine } = await monter(demande({ moyens: DEUX }))
    await cliquer(racine, 'Continuer')
    expect(etapes(racine)).toEqual([['Adresse', null], ['Paiement', 'step'], ['Confirmation', null]])
    await cliquer(racine, 'Adresse')
    expect(etapes(racine)[0]).toEqual(['Adresse', 'step'])
  })
  it('adresse figée et rien à accepter : on commence au Paiement', async () => {
    const { racine } = await monter(demande({ moyens: DEUX, adresseModifiable: false }))
    expect(etapes(racine)[1]).toEqual(['Paiement', 'step'])
  })
})

describe('REFONTE · l’adresse vérifiée en direct', () => {
  it('déjà prise : la phrase claire, la bordure rouge, « Continuer » bloqué ; libre : « Adresse disponible »', async () => {
    const verifier = vi.fn(async (a: string) => (a === 'gestion-pharmacie' ? '« gestion-pharmacie » est déjà prise par une autre application. Choisissez-en une autre.' : null))
    const { racine } = await monter(demande({ moyens: DEUX, verifier }))
    await taper(racine, 'gestion-pharmacie')
    expect(bouton(racine, 'Continuer')?.disabled, 'part pendant la vérification').toBe(true)
    await attendre(450)
    expect(verifier).toHaveBeenLastCalledWith('gestion-pharmacie')
    expect(racine.querySelector('#fenetre-publier-verif')?.textContent).toBe('« gestion-pharmacie » est déjà prise par une autre application. Choisissez-en une autre.')
    expect((racine.querySelector('#fenetre-publier-adresse') as HTMLInputElement).getAttribute('aria-invalid')).toBe('true')
    expect(bouton(racine, 'Continuer')?.disabled).toBe(true)
    await taper(racine, 'ma-pharmacie')
    await attendre(450)
    expect(racine.querySelector('#fenetre-publier-verif')?.textContent).toBe('Adresse disponible')
    expect(bouton(racine, 'Continuer')?.disabled).toBe(false)
  })
  it('déjà prise : la touche Entrée ne passe pas au Paiement non plus', async () => {
    const verifier = vi.fn(async () => 'déjà prise')
    const { racine } = await monter(demande({ moyens: DEUX, verifier }))
    await taper(racine, 'gestion-pharmacie')
    await attendre(450)
    const React = await import('react')
    const champ = racine.querySelector('#fenetre-publier-adresse') as HTMLInputElement
    await React.act(async () => { champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    await attendre(10)
    expect(racine.querySelector('[role="radiogroup"]'), 'passé au paiement malgré l’adresse prise').toBeNull()
  })
  it('une saisie dépassée ne gagne pas : seule la dernière adresse tapée est jugée', async () => {
    const verifier = vi.fn(async (_a: string) => null)
    const { racine } = await monter(demande({ moyens: DEUX, verifier }))
    await taper(racine, 'aaa')
    await taper(racine, 'aaab')
    await taper(racine, 'aaabc')
    await attendre(450)
    expect(verifier.mock.calls.map((c) => c[0])).toEqual(['aaabc'])
  })
  it('adresse figée : aucune vérification', async () => {
    const verifier = vi.fn(async () => null)
    await monter(demande({ adresseModifiable: false, verifier }))
    await attendre(450)
    expect(verifier).not.toHaveBeenCalled()
  })
})

describe('REFONTE · le paiement', () => {
  const auPaiement = async (d: Partial<DemandeFenetre> = {}) => {
    const m = await monter(demande({ moyens: DEUX, ...d }))
    await cliquer(m.racine, 'Continuer')
    return m
  }
  it('deux grandes cartes : « Carte bancaire » et « Mobile money » (Airtel ou Moov), la carte choisie, UN bouton « Publier », aucun prix ni « frais »', async () => {
    const { racine } = await auPaiement()
    expect(radios(racine).map((b) => [b.value, b.checked])).toEqual([['carte', true], ['mobile_money', false]])
    const titres = [...racine.querySelectorAll('[role="radiogroup"] label')].map((l) => l.textContent)
    expect(titres).toEqual(['Carte bancairePaiement sécurisé en ligne', 'Mobile moneyAirtel ou Moov'])
    expect(boutons(racine)).toEqual(['Adresse', 'Publier'])
    expect(racine.textContent).not.toMatch(/frais|%|FCFA|\$|[0-9]{4}|Visa|Mastercard|Orange/iu)
    expect(racine.querySelectorAll('img').length, 'une image de marque').toBe(0)
  })
  it('la carte choisie est mise en valeur, l’autre non', async () => {
    const { racine } = await auPaiement()
    await choisir(racine, 'mobile_money')
    const [carte, mm] = [...racine.querySelectorAll('[role="radiogroup"] label')]
    expect(mm?.className).toContain('border-accent')
    expect(carte?.className).not.toMatch(motifTexte('border-accent '))
  })
  it('le moyen coché part avec « Publier » : carte par défaut, mobile money une fois choisi', async () => {
    const valider = vi.fn(async () => null)
    const { racine } = await auPaiement({ valider })
    await cliquer(racine, 'Publier')
    expect(valider).toHaveBeenLastCalledWith('gestion-de-stock', 'carte')
    document.body.innerHTML = ''
    const v2 = vi.fn(async () => null)
    const deux = await auPaiement({ valider: v2 })
    await choisir(deux.racine, 'mobile_money')
    await cliquer(deux.racine, 'Publier')
    expect(v2).toHaveBeenLastCalledWith('gestion-de-stock', 'mobile_money')
  })
  it('un refus du nom au paiement ramène à l’Adresse, avec la phrase', async () => {
    const valider = vi.fn(async () => '« gestion-de-stock » est deja pris par une autre application.')
    const { racine } = await auPaiement({ valider })
    await cliquer(racine, 'Publier')
    expect(racine.querySelector('#fenetre-publier-adresse')).not.toBeNull()
    expect(racine.querySelector('[role="alert"]')?.textContent).toMatch(motifTexte('deja pris'))
  })
})

describe('REFONTE · mobile money : formulaire, attente, réussite', () => {
  const OFFRE = { montant: 14000, devise: 'XAF', test: false, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money' }, { code: 'MOOV', nom: 'Moov Money' }] }
  const reseau = (post: Record<string, unknown>) => vi.fn(async (_u: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === 'POST' ? post : OFFRE), { status: 200 }))
  const remplir = async (r: HTMLElement) => {
    const React = await import('react')
    const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const [tel, nom] = [...r.querySelectorAll('form input')] as HTMLInputElement[]
    await React.act(async () => {
      poser?.call(tel, '66000001'); tel?.dispatchEvent(new Event('input', { bubbles: true }))
      poser?.call(nom, 'Awa Mahamat'); nom?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await React.act(async () => { (r.querySelector('form') as HTMLFormElement).requestSubmit(); await new Promise((x) => setTimeout(x, 20)) })
  }
  const auFormulaire = async (lireAdresse = vi.fn(async () => null as string | null)) => {
    const valider = vi.fn(async () => 'mobile_money' as const)
    const m = await monter(demande({ moyens: DEUX, valider, mobileMoney: { app: 'app-1', jeton: async () => 'j', onPaye: async () => undefined, lireAdresse, relectureMs: 40 } }))
    await cliquer(m.racine, 'Continuer')
    await choisir(m.racine, 'mobile_money')
    await cliquer(m.racine, 'Publier')
    await attendre(30)
    return m
  }
  it('UN SEUL MOYEN : sa carte prend toute la largeur ; DEUX : deux colonnes (2026-11-26)', async () => {
    const grille = (r: HTMLElement) => r.querySelector('[role="radiogroup"]') as HTMLElement
    const un = await monter(demande({ moyens: ['mobile_money'], adresseModifiable: false }))
    expect(grille(un.racine).dataset.moyens).toBe('1')
    expect(grille(un.racine).className).not.toContain('sm:grid-cols-2')
    expect(grille(un.racine).className).toContain('grid-cols-1')
    const deux = await monter(demande({ moyens: DEUX, adresseModifiable: false }))
    expect(grille(deux.racine).className).toContain('sm:grid-cols-2')
  })
  it('FORMULAIRE MOBILE MONEY, sur téléphone : « ‹ Moyen de paiement » au-dessus, « Fermer » en dernier ; les autres pieds gardent leur ordre (2026-11-26)', async () => {
    vi.stubGlobal('fetch', reseau({}))
    const { racine } = await auFormulaire()
    const pied = [...racine.querySelectorAll('[data-ordre]')].at(-1) as HTMLElement
    expect(pied.dataset.ordre).toBe('naturel')
    expect(pied.className.split(' ')).toContain('flex-col')
    expect(pied.className).not.toContain('flex-col-reverse')
    expect([...pied.querySelectorAll('button')].map((b) => b.textContent?.trim())).toEqual(['Moyen de paiement', 'Fermer'])
    const autre = await monter(demande({ moyens: DEUX, adresseModifiable: false }))
    const piedPaiement = autre.racine.querySelector('[data-ordre]') as HTMLElement
    expect(piedPaiement.dataset.ordre).toBe('inverse')
    expect(piedPaiement.className).toContain('flex-col-reverse')
  })
  it('mobile money accepté : la fenêtre RESTE ouverte et montre le formulaire (opérateur, numéro), sans « frais »', async () => {
    vi.stubGlobal('fetch', reseau({}))
    const { racine, onFermer } = await auFormulaire()
    expect(onFermer).not.toHaveBeenCalled()
    const texte = racine.textContent ?? ''
    expect(texte).toMatch(motifTexte('Airtel Money'))
    expect(texte).toMatch(motifTexte('Numéro mobile money'))
    expect(texte).toMatch(motifTexte('Dès que vous validez le paiement sur votre téléphone, votre application est publiée.'))
    expect(texte).not.toMatch(motifTexte('se publie seule'))
    expect(texte).not.toMatch(/frais|%/iu)
    expect(racine.querySelector('input[type="radio"]'), 'le choix reste affiché').toBeNull()
  })
  it('après « Payer » : l’écran d’attente « Validez le paiement sur votre téléphone », avec un indicateur animé', async () => {
    vi.stubGlobal('fetch', reseau({ encaissement: 'e1', etat: 'en_attente', montant: 14000, devise: 'XAF', test: false, action: null, echec: null }))
    const { racine } = await auFormulaire()
    await remplir(racine)
    expect(racine.textContent).toMatch(motifTexte('Validez le paiement sur votre téléphone'))
    expect(racine.querySelector('.motion-safe\\:animate-spin'), 'indicateur animé absent').not.toBeNull()
    expect(racine.querySelector('form'), 'le formulaire reste affiché pendant l’attente').toBeNull()
    // Le titre une seule fois, la consigne dessous (capture du 2026-11-24 : le titre était répété).
    expect((racine.textContent ?? '').split('Validez le paiement sur votre téléphone').length - 1).toBe(1)
    expect(racine.textContent).toMatch(motifTexte('Saisissez votre code secret dans le message qui s’affiche.'))
  })
  it('paiement réussi : Confirmation, « Publication en cours… », puis le lien de l’appli et « Ouvrir »', async () => {
    vi.stubGlobal('fetch', reseau({ encaissement: 'e1', etat: 'reussi', montant: 14000, devise: 'XAF', test: false, action: null, echec: null }))
    let lien: string | null = null
    const lireAdresse = vi.fn(async () => lien)
    const { racine } = await auFormulaire(lireAdresse)
    await remplir(racine)
    await attendre(30)
    expect(racine.textContent).toMatch(motifTexte('Paiement reçu. Publication en cours…'))
    expect([...racine.querySelectorAll('ol[aria-label="Étapes"] li')].map((li) => li.getAttribute('aria-current'))).toEqual([null, null, 'step'])
    lien = 'https://ma-pharmacie.deribfy.app'
    await attendre(120)
    expect(racine.textContent).toMatch(motifTexte('Votre application est en ligne'))
    const ouvrir = [...racine.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Ouvrir')
    expect(ouvrir?.getAttribute('href')).toBe('https://ma-pharmacie.deribfy.app')
    expect(ouvrir?.getAttribute('target')).toBe('_blank')
  })
  it('paiement de TEST réussi : la Confirmation le dit, sans promettre de publication', async () => {
    vi.stubGlobal('fetch', reseau({ encaissement: 'e1', etat: 'reussi', montant: 14000, devise: 'XAF', test: true, action: null, echec: null }))
    const lireAdresse = vi.fn(async () => null)
    const { racine } = await auFormulaire(lireAdresse)
    await remplir(racine)
    await attendre(30)
    expect(racine.textContent).toMatch(motifTexte('En mode test, l’application n’est pas publiée.'))
    expect(lireAdresse).not.toHaveBeenCalled()
  })
})

describe('REFONTE · la confirmation d’une publication sans paiement à faire', () => {
  it('« Publier » rend le lien : Confirmation, le lien, « Ouvrir » ; déjà en ligne, elle le dit', async () => {
    const valider = vi.fn(async () => ({ lien: 'https://atitta.deribfy.app', dejaEnLigne: true }))
    const { racine, onFermer } = await monter(demande({ valider, adresseModifiable: false }))
    await cliquer(racine, 'Publier')
    expect(onFermer).not.toHaveBeenCalled()
    expect(racine.textContent).toMatch(motifTexte('Votre application est en ligne'))
    expect(racine.textContent).toMatch(motifTexte('Elle l’était déjà'))
    expect([...racine.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Ouvrir')?.getAttribute('href')).toBe('https://atitta.deribfy.app')
  })
})


describe('CORRECTIONS (2026-11-24, après les captures)', () => {
  const OFFRE = { montant: 14000, devise: 'XAF', test: false, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money' }] }
  const reseau = (post: Record<string, unknown>) => vi.fn(async (_u: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === 'POST' ? post : OFFRE), { status: 200 }))
  const auFormulaire = async () => {
    const valider = vi.fn(async () => 'mobile_money' as const)
    const m = await monter(demande({ moyens: DEUX, valider, mobileMoney: { app: 'app-1', jeton: async () => 'j', onPaye: async () => undefined, lireAdresse: async () => null, relectureMs: 40 } }))
    await cliquer(m.racine, 'Continuer')
    await choisir(m.racine, 'mobile_money')
    await cliquer(m.racine, 'Publier')
    await attendre(30)
    return m
  }
  it('l’attente dit « Pas reçu de message ? Vous pourrez réessayer dans 10 minutes. »', async () => {
    vi.stubGlobal('fetch', reseau({ encaissement: 'e1', etat: 'en_attente', montant: 14000, devise: 'XAF', test: false, action: null, echec: null }))
    const { racine } = await auFormulaire()
    const React = await import('react')
    const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const [tel, nom] = [...racine.querySelectorAll('form input')] as HTMLInputElement[]
    await React.act(async () => { poser?.call(tel, '66000001'); tel?.dispatchEvent(new Event('input', { bubbles: true })); poser?.call(nom, 'Awa'); nom?.dispatchEvent(new Event('input', { bubbles: true })) })
    await React.act(async () => { (racine.querySelector('form') as HTMLFormElement).requestSubmit(); await new Promise((x) => setTimeout(x, 20)) })
    expect(racine.textContent).toMatch(motifTexte('Pas reçu de message ? Vous pourrez réessayer dans 10 minutes.'))
    expect(racine.textContent).not.toMatch(motifTexte('Une seule demande à la fois'))
    // Demande partie : plus de retour au choix du moyen.
    expect(bouton(racine, 'Moyen de paiement'), 'retour possible pendant l’attente').toBeUndefined()
  })
  it('« ‹ Moyen de paiement » ramène aux deux cartes (avant tout envoi)', async () => {
    vi.stubGlobal('fetch', reseau({}))
    const { racine } = await auFormulaire()
    expect(bouton(racine, 'Moyen de paiement')).toBeDefined()
    await cliquer(racine, 'Moyen de paiement')
    expect(radios(racine).map((r) => r.value)).toEqual(['carte', 'mobile_money'])
  })
  it('le numéro : « +235 » fixe devant, on tape les huit chiffres', async () => {
    vi.stubGlobal('fetch', reseau({}))
    const { racine } = await auFormulaire()
    const tel = racine.querySelector('input[type="tel"]') as HTMLInputElement
    expect(tel.placeholder).toBe('66 00 00 00')
    expect(tel.previousElementSibling?.textContent).toBe('+235')
  })

  const avecCompte = (lire: CompteLu, creer = vi.fn(async () => ({ ok: true as const, adresse: 'admin@ma-pharmacie.deribfy.app', motDePasse: 'Mdp-Neuf-42' }))) =>
    ({ lire: vi.fn(async () => lire), creerMotDePasse: creer })
  type CompteLu = { etat: string; adresse?: string } | null
  it('IDENTIFIANTS · publication qui rend le mot de passe : la Confirmation le montre, avec où les retrouver', async () => {
    const valider = vi.fn(async () => ({ lien: 'https://ma-pharmacie.deribfy.app', dejaEnLigne: false, compte: { adresse: 'admin@ma-pharmacie.deribfy.app', motDePasse: 'Mdp-Une-Fois-7' } }))
    const { racine } = await monter(demande({ valider, adresseModifiable: false, compte: avecCompte({ etat: 'actif', adresse: 'x' }) }))
    await cliquer(racine, 'Publier')
    await attendre(20)
    const bloc = racine.querySelector('[data-identifiants]')
    expect(bloc?.textContent).toMatch(motifTexte('Vos identifiants de connexion à l’application'))
    expect(bloc?.textContent).toContain('admin@ma-pharmacie.deribfy.app')
    expect(bloc?.textContent).toContain('Mdp-Une-Fois-7')
    expect(bloc?.textContent).toMatch(motifTexte('Vous les retrouverez à tout moment dans « Mes projets »'))
    expect(bouton(racine, 'Créer mon mot de passe'), 'déjà montré : pas de bouton').toBeUndefined()
  })
  it('IDENTIFIANTS · publiée par le paiement (aucun mot de passe vu) : l’adresse de connexion, puis « Créer mon mot de passe » le montre', async () => {
    const compte = avecCompte({ etat: 'actif', adresse: 'admin@ma-pharmacie.deribfy.app' })
    const valider = vi.fn(async () => ({ lien: 'https://ma-pharmacie.deribfy.app', dejaEnLigne: true, compte: null }))
    const { racine } = await monter(demande({ valider, adresseModifiable: false, compte }))
    await cliquer(racine, 'Publier')
    await attendre(20)
    expect(compte.lire).toHaveBeenCalledTimes(1)
    expect(racine.querySelector('[data-identifiants]')?.textContent).toContain('admin@ma-pharmacie.deribfy.app')
    await cliquer(racine, 'Créer mon mot de passe')
    await attendre(20)
    expect(compte.creerMotDePasse).toHaveBeenCalledTimes(1)
    expect(racine.querySelector('[data-identifiants]')?.textContent).toContain('Mdp-Neuf-42')
  })
  it('IDENTIFIANTS · appli sans données : aucun compte, aucun bloc', async () => {
    const valider = vi.fn(async () => ({ lien: 'https://ma-vitrine.deribfy.app', dejaEnLigne: false, compte: null }))
    const { racine } = await monter(demande({ valider, adresseModifiable: false, compte: avecCompte({ etat: 'sans-donnees' }) }))
    await cliquer(racine, 'Publier')
    await attendre(20)
    expect(racine.querySelector('[data-identifiants]')).toBeNull()
  })
  it('IDENTIFIANTS · aussi après un paiement MOBILE MONEY : la Confirmation relit le compte', async () => {
    vi.stubGlobal('fetch', reseau({ encaissement: 'e1', etat: 'reussi', montant: 14000, devise: 'XAF', test: false, action: null, echec: null }))
    const compte = avecCompte({ etat: 'actif', adresse: 'admin@ma-pharmacie.deribfy.app' })
    const valider = vi.fn(async () => 'mobile_money' as const)
    const { racine } = await monter(demande({ moyens: DEUX, valider, compte, mobileMoney: { app: 'app-1', jeton: async () => 'j', onPaye: async () => undefined, lireAdresse: async () => 'https://ma-pharmacie.deribfy.app', relectureMs: 40 } }))
    await cliquer(racine, 'Continuer')
    await choisir(racine, 'mobile_money')
    await cliquer(racine, 'Publier')
    await attendre(30)
    const React = await import('react')
    const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const [tel, nom] = [...racine.querySelectorAll('form input')] as HTMLInputElement[]
    await React.act(async () => { poser?.call(tel, '66000001'); tel?.dispatchEvent(new Event('input', { bubbles: true })); poser?.call(nom, 'Awa'); nom?.dispatchEvent(new Event('input', { bubbles: true })) })
    await React.act(async () => { (racine.querySelector('form') as HTMLFormElement).requestSubmit(); await new Promise((x) => setTimeout(x, 20)) })
    await attendre(80)
    expect(racine.textContent).toMatch(motifTexte('Votre application est en ligne'))
    expect(racine.querySelector('[data-identifiants]')?.textContent).toContain('admin@ma-pharmacie.deribfy.app')
    expect(bouton(racine, 'Créer mon mot de passe')).toBeDefined()
  })
})

describe('LOT DE MODIFICATIONS (2026-11-24) · la même fenêtre', () => {
  const RESEAU_LOT = (post: Record<string, unknown>) => vi.fn(async (u: string, init?: RequestInit) => {
    if (String(u).includes('/api/generateur/lot')) {
      if (init?.method === 'POST') return new Response(JSON.stringify({ paiement: 'https://checkout.stripe.com/c/pay/cs_lot' }), { status: 200 })
      return new Response(JSON.stringify({ possible: true, taille: 50, moyens: ['carte', 'mobile_money'] }), { status: 200 })
    }
    expect(String(u), 'le formulaire doit demander le LOT').toContain('objet=lot')
    return new Response(JSON.stringify(init?.method === 'POST' ? post : { montant: 3500, devise: 'XAF', test: false, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money' }] }), { status: 200 })
  })
  const ouvrirLot = async () => {
    const { lancerAchatLot } = await import('@/components/apps/acheterLot')
    let d: DemandeFenetre | null = null
    const ouvertes: string[] = []
    const issue = lancerAchatLot({ id: 'app-1', autorisation: 'Bearer j', ouvrirFenetre: (x) => { d = x }, ouvrir: (u) => { ouvertes.push(u) } })
    await attendre(10)
    expect(d, 'la fenêtre ne s’est pas ouverte').not.toBeNull()
    const m = await monter(d!)
    return { ...m, issue, ouvertes, demande: d! }
  }
  it('étapes Paiement › Confirmation (pas d’adresse), deux cartes, bouton « Ajouter », aucun prix à côté', async () => {
    vi.stubGlobal('fetch', RESEAU_LOT({}))
    const { racine } = await ouvrirLot()
    expect([...racine.querySelectorAll('ol[aria-label="Étapes"] li')].map((li) => li.textContent?.replace(/^\d/u, '').trim())).toEqual(['Paiement', 'Confirmation'])
    expect(racine.querySelector('h2')?.textContent).toBe('Ajouter des modifications')
    expect(radios(racine).map((r) => r.value)).toEqual(['carte', 'mobile_money'])
    expect(racine.querySelector('#fenetre-publier-adresse')).toBeNull()
    expect(boutons(racine)).toEqual(['Annuler', 'Ajouter'])
    expect(racine.textContent).not.toMatch(/frais|FCFA|\$|deribfy\.app/iu)
  })
  it('carte : la page Stripe du lot s’ouvre', async () => {
    vi.stubGlobal('fetch', RESEAU_LOT({}))
    const { racine, ouvertes, issue } = await ouvrirLot()
    await cliquer(racine, 'Ajouter')
    expect(ouvertes).toEqual(['https://checkout.stripe.com/c/pay/cs_lot'])
    expect(await issue).toEqual({ type: 'paiement' })
  })
  it('mobile money : « Un lot de 50 modifications : 3 500 FCFA. », puis la réussite dit que les modifications s’ajoutent', async () => {
    vi.stubGlobal('fetch', RESEAU_LOT({ encaissement: 'e1', etat: 'reussi', montant: 3500, devise: 'XAF', test: false, action: null, echec: null }))
    const { racine } = await ouvrirLot()
    await choisir(racine, 'mobile_money')
    await cliquer(racine, 'Ajouter')
    await attendre(30)
    expect(racine.textContent).toMatch(motifTexte('Un lot de 50 modifications : 3 500 FCFA.'))
    expect(racine.textContent).toMatch(motifTexte('50 modifications s’ajoutent à votre compteur.'))
    const React = await import('react')
    const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const [tel, nom] = [...racine.querySelectorAll('form input')] as HTMLInputElement[]
    await React.act(async () => { poser?.call(tel, '66000001'); tel?.dispatchEvent(new Event('input', { bubbles: true })); poser?.call(nom, 'Awa'); nom?.dispatchEvent(new Event('input', { bubbles: true })) })
    await React.act(async () => { (racine.querySelector('form') as HTMLFormElement).requestSubmit(); await new Promise((x) => setTimeout(x, 30)) })
    expect(racine.textContent).toMatch(motifTexte('Paiement reçu : 50 modifications s’ajoutent à votre compteur.'))
    expect(racine.textContent).not.toMatch(motifTexte('Votre application est en ligne'))
  })
  it('sans abonnement en cours : pas de fenêtre, la phrase', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ possible: false, raison: 'Un lot de modifications s’ajoute à un abonnement en cours.' }), { status: 200 })))
    const { lancerAchatLot } = await import('@/components/apps/acheterLot')
    const ouvrir = vi.fn()
    expect(await lancerAchatLot({ id: 'app-1', autorisation: 'Bearer j', ouvrirFenetre: ouvrir })).toEqual({ type: 'impossible', message: 'Un lot de modifications s’ajoute à un abonnement en cours.' })
    expect(ouvrir).not.toHaveBeenCalled()
  })
})

describe('DÉFAUT DU 2026-11-25 · « MODE TEST » et « Chargement… » sans fin', () => {
  const auFormulaire = async () => {
    const valider = vi.fn(async () => 'mobile_money' as const)
    const m = await monter(demande({ moyens: DEUX, valider, mobileMoney: { app: 'app-1', jeton: async () => 'j', onPaye: async () => undefined, lireAdresse: async () => null, relectureMs: 40 } }))
    await cliquer(m.racine, 'Continuer')
    await choisir(m.racine, 'mobile_money')
    await cliquer(m.racine, 'Publier')
    return m
  }
  it('pendant le chargement : AUCUN « MODE TEST » (le serveur n’a encore rien dit)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    const { racine } = await auFormulaire()
    await attendre(30)
    expect(racine.textContent).toMatch(motifTexte('Chargement…'))
    expect(racine.textContent, '« MODE TEST » affiché avant toute réponse').not.toMatch(/mode test/iu)
  })
  it('compte en RÉEL (réponse test: false) : le formulaire, sans « MODE TEST »', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ montant: 14000, devise: 'XAF', test: false, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money' }] }), { status: 200 })))
    const { racine } = await auFormulaire()
    await attendre(30)
    expect(racine.textContent).toMatch(motifTexte('Numéro mobile money'))
    expect(racine.textContent).not.toMatch(/mode test/iu)
  })
  it('compte en TEST (réponse test: true) : le badge, comme avant', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ montant: 14000, devise: 'XAF', test: true, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money' }] }), { status: 200 })))
    const { racine } = await auFormulaire()
    await attendre(30)
    expect(racine.textContent).toMatch(/mode test/iu)
  })
  it('requête rejetée (réseau coupé) : plus de « Chargement… » sans fin — la phrase, et « Réessayer » qui relance', async () => {
    let fois = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      fois += 1
      if (fois === 1) throw new TypeError('Load failed')
      return new Response(JSON.stringify({ montant: 14000, devise: 'XAF', test: false, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money' }] }), { status: 200 })
    }))
    const { racine } = await auFormulaire()
    await attendre(30)
    expect(racine.textContent).not.toMatch(motifTexte('Chargement…'))
    expect(racine.textContent).toMatch(motifTexte('Le paiement mobile money ne répond pas. Vérifiez votre connexion, puis réessayez.'))
    await cliquer(racine, 'Réessayer')
    await attendre(30)
    expect(racine.textContent).toMatch(motifTexte('Numéro mobile money'))
  })
  it('requête qui ne répond jamais : abandonnée après le délai, la phrase et « Réessayer »', async () => {
    const mod = await import('@/components/atelier/PayerMobileMoney')
    expect(mod.DELAI_APPEL_MS).toBe(20_000)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      vi.stubGlobal('fetch', vi.fn((_u: string, init?: RequestInit) => new Promise<Response>((_ok, ko) => { init?.signal?.addEventListener('abort', () => { ko(new DOMException('aborted', 'AbortError')) }) })))
      const React = await import('react')
      const { createRoot } = await import('react-dom/client')
      const racine = document.createElement('div')
      document.body.appendChild(racine)
      await React.act(async () => { createRoot(racine).render(React.createElement(mod.PayerMobileMoney, { app: 'a9', jeton: async () => 't', renouveler: false, onPaye: async () => null, ouvertDOffice: true, enFenetre: true })) })
      await React.act(async () => { await vi.advanceTimersByTimeAsync(10) })
      expect(racine.textContent).toMatch(motifTexte('Chargement…'))
      await React.act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
      expect(racine.textContent).not.toMatch(motifTexte('Chargement…'))
      expect(racine.textContent).toMatch(motifTexte('Réessayer'))
    } finally {
      vi.useRealTimers()
    }
  })
})
