/**
 * LE BOUTON « PUBLIER » BLOQUÉ A UNE ISSUE (2026-11-20) — phrases et rendu.
 * Ce que ce test NE PEUT PAS voir : la tenue de la barre à 390 px (capture).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { libellePublicationBloquee, LIEN_WHATSAPP_PAIEMENT, moyensDePaiement, phraseCommentPayer, publicationOuverte } from '@/lib/apps/compteur-phrases'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })

const gratuite = { exempte: false as const, formule: 'gratuite' as const, restantes: 10, payeJusquAu: null, actif: false }

describe('publier demande l’abonnement — l’écran', () => {
  it('qui peut publier : exempté, abonné actif ; compteur illisible = le serveur tranche', () => {
    expect(publicationOuverte({ exempte: true })).toBe(true)
    expect(publicationOuverte({ ...gratuite, formule: 'abonnee', actif: true })).toBe(true)
    expect(publicationOuverte(null)).toBe(true)
    expect(publicationOuverte(gratuite)).toBe(false)
    expect(publicationOuverte({ ...gratuite, formule: 'abonnee', actif: false })).toBe(false)
  })

  it('les moyens de paiement viennent du RÉGLAGE ; absent ou vide → espèces seulement, jamais un opérateur promis', () => {
    expect(moyensDePaiement(null)).toEqual(['espèces'])
    expect(moyensDePaiement('  ')).toEqual(['espèces'])
    expect(moyensDePaiement('espèces, Airtel Money')).toEqual(['espèces', 'Airtel Money'])
    expect(phraseCommentPayer(moyensDePaiement(null))).toBe('Pour payer : WhatsApp +235 68 36 41 35 (espèces).')
    expect(phraseCommentPayer(moyensDePaiement('espèces, Airtel Money'))).toBe('Pour payer : WhatsApp +235 68 36 41 35 (espèces, Airtel Money).')
    expect(phraseCommentPayer(moyensDePaiement(null))).not.toMatch(/Airtel|Moov/u)
  })

  it('le libellé porte le prix donné, jamais un prix écrit', () => {
    expect(libellePublicationBloquee(12000)).toBe('Publier demande l’abonnement — 12 000 FCFA par mois')
    expect(libellePublicationBloquee(7500)).toBe('Publier demande l’abonnement — 7 500 FCFA par mois')
    expect(libellePublicationBloquee(null)).toBe('Publier demande l’abonnement')
    expect(LIEN_WHATSAPP_PAIEMENT).toBe('https://wa.me/23568364135')
  })

  it('rendu : « Publier » désactivé ; sous la barre, le prix réglé et un lien WhatsApp qui dit comment payer', async () => {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { CommentPayerPublication, PublicationBloquee } = await import('@/components/atelier/PublicationBloquee')
    const racine = document.createElement('div')
    document.body.appendChild(racine)
    await React.act(async () => {
      createRoot(racine).render(React.createElement(React.Fragment, null,
        React.createElement(PublicationBloquee, { prixMensuelXaf: 12000 }),
        React.createElement(CommentPayerPublication, { prixMensuelXaf: 12000, moyens: ['espèces'] })))
    })
    const bouton = racine.querySelector('button') as HTMLButtonElement
    expect(bouton.disabled).toBe(true)
    expect(bouton.textContent).toBe('Publier')
    expect(bouton.getAttribute('title')).toBe('Publier demande l’abonnement — 12 000 FCFA par mois')
    const bandeau = racine.querySelector('#payer-publication') as HTMLElement
    expect(bandeau.textContent).toBe('Publier demande l’abonnement — 12 000 FCFA par mois. Pour payer : WhatsApp +235 68 36 41 35 (espèces).')
    const lien = racine.querySelector('a') as HTMLAnchorElement
    expect(lien.getAttribute('href')).toBe('https://wa.me/23568364135')
    expect(lien.textContent).toBe('Pour payer : WhatsApp +235 68 36 41 35 (espèces).')
  })

  it('l’atelier montre le bandeau « comment payer » exactement quand « Publier » est bloqué', () => {
    const atelier = readFileSync(join(__dirname, '../../../app/atelier/[id]/page.tsx'), 'utf8')
    expect(atelier).toMatch(motifTexte('{publicationOuverte(compteur) ? ('))
    expect(atelier).toMatch(motifTexte('<PublicationBloquee prixMensuelXaf={prixMensuelXaf} />'))
    expect(atelier).toMatch(motifTexte('{!publicationOuverte(compteur) && <CommentPayerPublication prixMensuelXaf={prixMensuelXaf} moyens={moyensPaiement} />}'))
  })
})
