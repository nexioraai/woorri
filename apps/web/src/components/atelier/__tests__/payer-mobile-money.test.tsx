/**
 * LE FORMULAIRE MOBILE MONEY (2026-11-21) — ce que le client lit.
 * Ce que ce test NE PEUT PAS voir : la vraie API (les réponses brutes se
 * relèvent avec la clé de test) ni le rendu à l'œil (capture à part).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { PHRASE_UNE_DEMANDE, phraseAttente, phrasePrix, phraseEtat } from '@/components/atelier/PayerMobileMoney'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })

describe('payer par mobile money — l’écran', () => {
  it('TOUJOURS notre français : jamais le texte du prestataire, jamais un statut brut (mesuré en production le 2026-11-21)', () => {
    const anglais = 'A payment request was sent to the customer\'s phone. The customer approves it with their PIN.'
    const attente = phraseEtat({ etat: 'en_attente', echec: null, test: false, action: { type: 'approuver', message: anglais, ussd: '*211#' } })
    expect(attente).toBe('Validez le paiement sur votre téléphone : saisissez votre code secret dans le message qui s’affiche. Si rien n’arrive, composez *211#.')
    // Avec ou sans message du prestataire : la MÊME phrase (l'alternance anglais / français venait de là).
    expect(phraseEtat({ etat: 'en_attente', echec: null, test: false, action: null })).toBe('Validez le paiement sur votre téléphone : saisissez votre code secret dans le message qui s’affiche.')
    expect(phraseEtat({ etat: 'code_requis', echec: null, test: false, action: { type: 'code', message: 'Enter the code', ussd: null } })).toBe('Saisissez le code reçu par SMS.')
    const echec = phraseEtat({ etat: 'echoue', echec: 'failed', test: false, action: null })
    expect(echec).toBe('Le paiement n’a pas abouti : l’opérateur ne l’a pas validé. Rien n’a été débité ; vous pouvez réessayer.')
    for (const p of [attente, echec, phraseEtat({ etat: 'expire', echec: 'expired', test: false, action: null })]) {
      expect(p).not.toMatch(/failed|expired|payment|customer|PIN\b/u)
    }
    expect(phraseEtat({ etat: 'reussi', echec: null, test: false, action: null })).toMatch(motifTexte('Paiement reçu'))
  })

  it('en MODE TEST, une réussite ne promet AUCUNE activation (mesuré à l’essai 3, 2026-11-21)', () => {
    const test = phraseEtat({ etat: 'reussi', echec: null, test: true, action: null })
    expect(test).toBe('Paiement de test confirmé. Aucun abonnement n’est activé en mode test.')
    expect(test).not.toMatch(/s’active/u)
  })

  it('le délai affiché vient de l’heure de la demande', () => {
    expect(phraseAttente(0)).toBe('Demande envoyée à l’instant.')
    expect(phraseAttente(7)).toBe('En attente depuis 7 min.')
  })

  it('un paiement en attente SURVIT AU RECHARGEMENT, et « Changer de numéro » ramène au formulaire', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { PayerMobileMoney } = await import('@/components/atelier/PayerMobileMoney')
    window.localStorage.setItem('deribfy-mobile-money-a2', JSON.stringify({ encaissement: 'col_9', debut: Date.now() - 7 * 60_000 }))
    const appels: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      appels.push(String(u))
      if (String(u).includes('encaissement=col_9')) return new Response(JSON.stringify({ encaissement: 'col_9', etat: 'en_attente', montant: 12000, devise: 'XAF', test: true, action: { type: 'approuver', message: 'A payment request was sent', ussd: null }, echec: null }), { status: 200 })
      return new Response(JSON.stringify({ montant: 12000, devise: 'XAF', operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] }] }), { status: 200 })
    }))
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(PayerMobileMoney, { app: 'a2', jeton: async () => 't', renouveler: false, onPaye: async () => null }))
    })
    await React.act(async () => { await new Promise((ok) => setTimeout(ok, 0)) })
    expect(appels.some((u) => u.includes('encaissement=col_9')), 'le suivi n’a pas repris après rechargement').toBe(true)
    expect(racine.textContent).toMatch(motifTexte('En attente depuis 7 min.'))
    expect(racine.textContent).not.toMatch(/A payment request/u)
    // DOUBLE PAIEMENT : avant 10 minutes, l'écran dit qu'une autre demande ne partira pas.
    expect(racine.textContent).toMatch(motifTexte(PHRASE_UNE_DEMANDE))
    expect(PHRASE_UNE_DEMANDE).toBe('Pas reçu de message ? Vous pourrez réessayer dans 10 minutes.')
    const changer = [...racine.querySelectorAll('button')].find((b) => b.textContent === 'Changer de numéro') as HTMLButtonElement
    expect(changer).toBeTruthy()
    await React.act(async () => { changer.click() })
    await React.act(async () => { await new Promise((ok) => setTimeout(ok, 0)) })
    expect(racine.querySelector('form'), 'le formulaire n’est pas revenu').not.toBeNull()
    expect(window.localStorage.getItem('deribfy-mobile-money-a2')).toBeNull()
    vi.unstubAllGlobals()
  })

  it('DOUBLE PAIEMENT · après 10 minutes d’attente, la phrase « une seule demande » disparaît (une nouvelle est permise)', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { PayerMobileMoney } = await import('@/components/atelier/PayerMobileMoney')
    window.localStorage.setItem('deribfy-mobile-money-a3', JSON.stringify({ encaissement: 'col_8', debut: Date.now() - 12 * 60_000 }))
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      if (String(u).includes('encaissement=col_8')) return new Response(JSON.stringify({ encaissement: 'col_8', etat: 'en_attente', montant: 13400, devise: 'XAF', test: true, action: null, echec: null }), { status: 200 })
      return new Response(JSON.stringify({ prix: 12000, devise: 'XAF', operateurs: [] }), { status: 200 })
    }))
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(PayerMobileMoney, { app: 'a3', jeton: async () => 't', renouveler: false, onPaye: async () => null }))
    })
    await React.act(async () => { await new Promise((ok) => setTimeout(ok, 0)) })
    expect(racine.textContent).toMatch(motifTexte('En attente depuis 12 min.'))
    expect(racine.textContent).not.toMatch(motifTexte(PHRASE_UNE_DEMANDE))
    window.localStorage.removeItem('deribfy-mobile-money-a3')
    vi.unstubAllGlobals()
  })
  it('UN SEUL PRIX · la phrase du prix : un montant, rien d’autre', () => {
    expect(phrasePrix(14000)).toBe('Un mois d’abonnement : 14 000 FCFA.')
    expect(phrasePrix(7000)).toBe('Un mois d’abonnement : 7 000 FCFA.')
  })

  it('FRAIS · réglage manquant : la phrase du serveur, AUCUN formulaire, aucun montant', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { PayerMobileMoney } = await import('@/components/atelier/PayerMobileMoney')
    const phrase = 'Le paiement mobile money est indisponible pour le moment. Aucun montant n’est demandé.'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: phrase }), { status: 409 })))
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(PayerMobileMoney, { app: 'a3', jeton: async () => 't', renouveler: false, onPaye: async () => null }))
    })
    await React.act(async () => { (racine.querySelector('button') as HTMLButtonElement).click() })
    await React.act(async () => { await new Promise((ok) => setTimeout(ok, 0)) })
    expect(racine.textContent).toMatch(motifTexte(phrase))
    expect(racine.querySelector('form')).toBeNull()
    expect(racine.textContent).not.toMatch(/FCFA/u)
    vi.unstubAllGlobals()
  })

  it('UN SEUL PRIX · le même montant pour Airtel et Moov, AVANT de payer, sur le bouton ; jamais « frais » ni %, ; « Renouveler » pour une appli abonnée', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { PayerMobileMoney } = await import('@/components/atelier/PayerMobileMoney')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ montant: 14000, devise: 'XAF', test: true, operateurs: [
      { code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] },
      { code: 'MOOV', nom: 'Moov Money', validation: ['pin'] },
    ] }), { status: 200 })))
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(PayerMobileMoney, { app: 'a1', jeton: async () => 't', renouveler: true, onPaye: async () => null }))
    })
    const bouton = racine.querySelector('button') as HTMLButtonElement
    expect(bouton.textContent).toBe('Renouveler — mobile money')
    await React.act(async () => { bouton.click() })
    await React.act(async () => { await new Promise((ok) => setTimeout(ok, 0)) })
    expect(racine.textContent).toMatch(motifTexte('Un mois d’abonnement : 14 000 FCFA.'))
    expect(racine.textContent).toMatch(motifTexte('mode test'))
    expect([...racine.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Airtel Money', 'Moov Money'])
    const soumettre = () => (racine.querySelector('button[type="submit"]') as HTMLButtonElement).textContent
    expect(soumettre()).toBe('Payer 14 000 FCFA')
    const avant = racine.textContent
    // Le client passe à Moov : RIEN ne change, ni le montant ni le bouton.
    const choix = racine.querySelector('select') as HTMLSelectElement
    await React.act(async () => {
      const poser = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      poser?.call(choix, 'MOOV')
      choix.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(racine.textContent).toBe(avant)
    expect(soumettre()).toBe('Payer 14 000 FCFA')
    expect(racine.textContent).not.toMatch(/frais|%/iu)
    vi.unstubAllGlobals()
  })

  it('L3 · le badge « mode test » suit le serveur : absent quand le compte est en réel', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { PayerMobileMoney } = await import('@/components/atelier/PayerMobileMoney')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ montant: 14000, devise: 'XAF', test: false, operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] }] }), { status: 200 })))
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(PayerMobileMoney, { app: 'a9', jeton: async () => 't', renouveler: false, onPaye: async () => null }))
    })
    await React.act(async () => { (racine.querySelector('button') as HTMLButtonElement).click() })
    await React.act(async () => { await new Promise((ok) => setTimeout(ok, 0)) })
    expect(racine.textContent).toMatch(motifTexte('Un mois d’abonnement : 14 000 FCFA.'))
    expect(racine.textContent).not.toMatch(motifTexte('mode test'))
    vi.unstubAllGlobals()
  })

  it('l’atelier ne montre le formulaire dans la barre que si l’interrupteur est ouvert, et pour RENOUVELER seulement (2026-11-24)', () => {
    const atelier = readFileSync(join(__dirname, '../../../app/atelier/[id]/page.tsx'), 'utf8')
    expect(atelier).toMatch(motifTexte("{compteur !== null && !compteur.exempte && mobileMoney && compteur.formule === 'abonnee' && ("))
  })
})
