/**
 * « PUBLIER » UN SITE (lot L5, 2026-11-25) — la même fenêtre que les applis.
 * Le rendu à l'œil se regarde (captures du 2026-11-25) ; ici, le parcours.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import type { DemandeFenetre } from '@/components/apps/publierAppli'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })
beforeEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); window.localStorage.clear() })

const attendre = async (ms = 10) => { const React = await import('react'); await React.act(async () => { await new Promise((r) => setTimeout(r, ms)) }) }
const ETAT = (moyens: string[], extra: Record<string, unknown> = {}) => ({ enLigne: false, lien: 'https://ma-vitrine.deribfy.app', moyens, payeJusquAu: null, rappel: null, ...extra })
type Appel = { url: string; methode: string; corps?: string }

function reseau(etat: () => Record<string, unknown>, post: Record<string, unknown> = {}) {
  const appels: Appel[] = []
  const f = vi.fn(async (u: string, init?: RequestInit) => {
    const url = String(u); const methode = init?.method ?? 'GET'
    appels.push({ url, methode, ...(typeof init?.body === 'string' ? { corps: init.body } : {}) })
    if (url.includes('/publication')) return new Response(JSON.stringify(etat()), { status: 200 })
    if (url === '/api/checkout') return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_site' }), { status: 200 })
    if (url.includes('/mobile-money')) return new Response(JSON.stringify(methode === 'POST' ? post : { montant: 7000, devise: 'XAF', test: false, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money' }] }), { status: 200 })
    return new Response('{}', { status: 404 })
  })
  vi.stubGlobal('fetch', f)
  return appels
}

async function monter(d: DemandeFenetre) {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { FenetrePublier } = await import('@/components/apps/FenetrePublier')
  const racine = document.createElement('div'); document.body.appendChild(racine)
  await React.act(async () => { createRoot(racine).render(React.createElement(FenetrePublier, { demande: d, onFermer: () => undefined })) })
  await attendre(20)
  return racine
}
const cliquer = async (r: HTMLElement, texte: string) => {
  const React = await import('react')
  const b = [...r.querySelectorAll('button')].find((x) => x.textContent?.trim() === texte)
  expect(b, `bouton « ${texte} » absent`).toBeDefined()
  await React.act(async () => { b?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((x) => setTimeout(x, 10)) })
}
const choisir = async (r: HTMLElement, v: string) => {
  const React = await import('react')
  const x = [...r.querySelectorAll('input[type="radio"]')].find((b) => (b as HTMLInputElement).value === v) as HTMLInputElement | undefined
  expect(x).toBeDefined()
  await React.act(async () => { x?.click() })
}

describe('publier un SITE', () => {
  it('Dropshipping (carte SEULE) : droit à Stripe, comme avant, AUCUNE fenêtre', async () => {
    const appels = reseau(() => ETAT(['carte']))
    const { lancerPublicationSite } = await import('@/components/apps/publierSite')
    const ouvrir = vi.fn(); const fenetre = vi.fn()
    expect(await lancerPublicationSite({ slug: 'ma-boutique-drop', autorisation: 'Bearer j', ouvrirFenetre: fenetre, ouvrir })).toEqual({ type: 'paiement' })
    expect(fenetre).not.toHaveBeenCalled()
    expect(ouvrir).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_site')
    expect(appels.map((a) => `${a.methode} ${a.url}`)).toEqual(['GET /api/sites/ma-boutique-drop/publication', 'POST /api/checkout'])
  })
  it('aucun moyen ouvert : la phrase, rien n’est ouvert', async () => {
    reseau(() => ETAT([]))
    const { lancerPublicationSite, PHRASE_PUBLIER_SITE_FERME } = await import('@/components/apps/publierSite')
    expect(await lancerPublicationSite({ slug: 'x', autorisation: 'Bearer j', ouvrirFenetre: vi.fn(), ouvrir: vi.fn() })).toEqual({ type: 'erreur', message: PHRASE_PUBLIER_SITE_FERME })
  })
  it('Vitrine : LA fenêtre — « Publier votre site », adresse figée du site, Adresse ✓ › Paiement, deux cartes, aucun prix ni « frais »', async () => {
    reseau(() => ETAT(['carte', 'mobile_money']))
    const { lancerPublicationSite } = await import('@/components/apps/publierSite')
    let d: DemandeFenetre | null = null
    void lancerPublicationSite({ slug: 'ma-vitrine', autorisation: 'Bearer j', ouvrirFenetre: (x) => { d = x }, ouvrir: vi.fn() })
    await attendre(20)
    const r = await monter(d!)
    expect(r.querySelector('h2')?.textContent).toBe('Publier votre site')
    expect([...r.querySelectorAll('ol[aria-label="Étapes"] li')].map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null])
    expect([...r.querySelectorAll('input[type="radio"]')].map((x) => (x as HTMLInputElement).value)).toEqual(['carte', 'mobile_money'])
    expect(r.textContent).not.toMatch(/frais|FCFA|%|\$/iu)
    expect(d!.adresseInitiale).toBe('ma-vitrine')
    expect(d!.adresseModifiable).toBe(false)
  })
  it('carte : la page Stripe du site (le chemin de toujours)', async () => {
    reseau(() => ETAT(['carte', 'mobile_money']))
    const { lancerPublicationSite } = await import('@/components/apps/publierSite')
    let d: DemandeFenetre | null = null
    const ouvrir = vi.fn()
    const issue = lancerPublicationSite({ slug: 'ma-vitrine', autorisation: 'Bearer j', ouvrirFenetre: (x) => { d = x }, ouvrir })
    await attendre(20)
    const r = await monter(d!)
    await cliquer(r, 'Publier')
    expect(ouvrir).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_site')
    expect(await issue).toEqual({ type: 'paiement' })
  })
  it('mobile money : le formulaire appelle la route du SITE (7 000 FCFA), puis « Votre site est en ligne » avec son lien et « Ouvrir »', async () => {
    let paye = false
    const appels = reseau(() => (paye ? ETAT(['carte', 'mobile_money'], { enLigne: true, payeJusquAu: '2099-01-01T00:00:00Z' }) : ETAT(['carte', 'mobile_money'])),
      { encaissement: 'e1', etat: 'reussi', montant: 7000, devise: 'XAF', test: false, action: null, echec: null })
    const { lancerPublicationSite } = await import('@/components/apps/publierSite')
    let d: DemandeFenetre | null = null
    void lancerPublicationSite({ slug: 'ma-vitrine', autorisation: 'Bearer j', ouvrirFenetre: (x) => { d = x }, ouvrir: vi.fn() })
    await attendre(20)
    const r = await monter({ ...d!, mobileMoney: { ...d!.mobileMoney!, relectureMs: 30 } })
    await choisir(r, 'mobile_money')
    await cliquer(r, 'Publier')
    await attendre(30)
    expect(r.textContent).toMatch(motifTexte('Un mois d’abonnement : 7 000 FCFA.'))
    expect(r.textContent).toMatch(motifTexte('Dès que vous validez le paiement sur votre téléphone, votre site est publié.'))
    expect(appels.some((a) => a.url.startsWith('/api/sites/ma-vitrine/mobile-money?')), 'le formulaire n’appelle pas la route du site').toBe(true)
    expect(appels.some((a) => a.url.includes('/api/generateur/mobile-money')), 'le formulaire appelle la route des applis').toBe(false)
    const React = await import('react')
    const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const [tel, nom] = [...r.querySelectorAll('form input')] as HTMLInputElement[]
    await React.act(async () => { poser?.call(tel, '66000001'); tel?.dispatchEvent(new Event('input', { bubbles: true })); poser?.call(nom, 'Awa'); nom?.dispatchEvent(new Event('input', { bubbles: true })) })
    paye = true
    await React.act(async () => { (r.querySelector('form') as HTMLFormElement).requestSubmit(); await new Promise((x) => setTimeout(x, 30)) })
    await attendre(100)
    expect(r.textContent).toMatch(motifTexte('Votre site est en ligne'))
    const o = [...r.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Ouvrir')
    expect(o?.getAttribute('href')).toBe('https://ma-vitrine.deribfy.app')
    expect(r.textContent).not.toMatch(motifTexte('Votre application est en ligne'))
  })
})

describe('le rappel au propriétaire (carte du site)', () => {
  it('3 jours avant : la date et « Renouvelez-le » ; après : « reste en ligne », modifications arrêtées ; sinon rien', async () => {
    const { phraseRappel } = await import('@/components/dashboard/rappelSite')
    expect(phraseRappel({ payeJusquAu: '2026-12-13T12:00:00Z', rappel: 'bientot' })).toBe('Votre abonnement se termine le 13 décembre. Renouvelez-le pour continuer à modifier votre site.')
    expect(phraseRappel({ payeJusquAu: '2026-12-10T12:00:00Z', rappel: 'echu' })).toBe('L’abonnement de ce site est arrivé à échéance. Renouvelez-le pour reprendre les modifications. Votre site reste en ligne.')
    expect(phraseRappel({ payeJusquAu: '2026-12-30T12:00:00Z', rappel: null })).toBeNull()
  })
})
