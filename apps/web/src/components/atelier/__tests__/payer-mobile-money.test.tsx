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
import { phraseEtat } from '@/components/atelier/PayerMobileMoney'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })

describe('payer par mobile money — l’écran', () => {
  it('les phrases d’état : PIN, code USSD de secours, échec sans débit', () => {
    expect(phraseEtat({ etat: 'en_attente', echec: null, action: { type: 'approuver', message: null, ussd: '*211#' } }))
      .toBe('Validez le paiement sur votre téléphone avec votre code secret. Si rien n’arrive, composez *211#.')
    expect(phraseEtat({ etat: 'echoue', echec: 'Solde insuffisant', action: null })).toBe('Le paiement a échoué : Solde insuffisant. Rien n’a été débité ; vous pouvez réessayer.')
    expect(phraseEtat({ etat: 'reussi', echec: null, action: null })).toMatch(motifTexte('Paiement reçu'))
  })

  it('le montant vient du serveur et s’affiche AVANT de payer ; « Renouveler » pour une appli abonnée', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { PayerMobileMoney } = await import('@/components/atelier/PayerMobileMoney')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ montant: 12000, devise: 'XAF', operateurs: [{ code: 'AIRTEL', nom: 'Airtel Money', validation: ['pin'] }, { code: 'MOOV', nom: 'Moov Money', validation: ['pin'] }] }), { status: 200 })))
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(PayerMobileMoney, { app: 'a1', jeton: async () => 't', renouveler: true, onPaye: async () => null }))
    })
    const bouton = racine.querySelector('button') as HTMLButtonElement
    expect(bouton.textContent).toBe('Renouveler — mobile money')
    await React.act(async () => { bouton.click() })
    await React.act(async () => { await new Promise((ok) => setTimeout(ok, 0)) })
    expect(racine.textContent).toMatch(motifTexte('Montant à payer : 12 000 FCFA pour un mois.'))
    expect(racine.textContent).toMatch(motifTexte('mode test'))
    expect([...racine.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Airtel Money', 'Moov Money'])
    expect((racine.querySelector('button[type="submit"]') as HTMLButtonElement).textContent).toBe('Payer 12 000 FCFA')
    vi.unstubAllGlobals()
  })

  it('l’atelier ne montre le formulaire que si l’interrupteur est ouvert', () => {
    const atelier = readFileSync(join(__dirname, '../../../app/atelier/[id]/page.tsx'), 'utf8')
    expect(atelier).toMatch(motifTexte('{compteur !== null && !compteur.exempte && mobileMoney && ('))
  })
})
