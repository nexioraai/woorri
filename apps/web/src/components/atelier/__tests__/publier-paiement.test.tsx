/**
 * « PUBLIER » MÈNE AU PAIEMENT (décision du propriétaire, 2026-11-21 ; revue
 * le 2026-11-22 : le libellé est « Publier » partout, le prix n'est que sur la
 * page Stripe, et le geste est le même dans l'atelier et « Mes projets » —
 * voir publier-unique.test.ts).
 *
 * Un client non abonné qui peut payer par carte n'est plus bloqué : « Publier »
 * l'envoie chez Stripe, prix affiché sur le bouton AVANT le départ. Paiement
 * fermé pour son compte → une phrase, jamais une erreur brute. Un seul chemin :
 * plus de « S'abonner » à côté.
 *
 * Ce que ce test NE PEUT PAS voir : la page Stripe elle-même, et le retour réel
 * après un vrai paiement (c'est le paiement de preuve du propriétaire).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import * as phrases from '@/lib/apps/compteur-phrases'
import { actionPublier, PHRASE_ABONNEMENT_REQUIS, PHRASE_PUBLIER_FERMEE, prixLisible } from '@/lib/apps/compteur-phrases'

const GRATUITE = { exempte: false as const, formule: 'gratuite' as const, restantes: 10, payeJusquAu: null, actif: false }
const ABONNEE = { ...GRATUITE, formule: 'abonnee' as const, payeJusquAu: '2026-12-31T00:00:00Z', actif: true }
const ECHUE = { ...ABONNEE, actif: false }
const USD20 = { montant: 20, devise: 'USD' }
const ATELIER = readFileSync(join(__dirname, '../../../app/atelier/[id]/page.tsx'), 'utf8')
const BORD = readFileSync(join(__dirname, '../../../app/dashboard/page.tsx'), 'utf8')
const MODULE = readFileSync(join(__dirname, '../../apps/publierAppli.ts'), 'utf8')

describe('ce que fait un clic sur « Publier »', () => {
  it('payé, exempté ou compteur illisible : publier', () => {
    expect(actionPublier(ABONNEE, false, null)).toBe('publier')
    expect(actionPublier({ exempte: true }, false, null)).toBe('publier')
    expect(actionPublier(null, false, null)).toBe('publier')
  })
  it('non payé (gratuite ou échue), carte OUVERTE et prix connu : payer chez Stripe', () => {
    expect(actionPublier(GRATUITE, true, USD20)).toBe('payer')
    expect(actionPublier(ECHUE, true, USD20)).toBe('payer')
  })
  it('non payé, carte FERMÉE (interrupteur vide) ou prix illisible : une phrase, pas Stripe', () => {
    expect(actionPublier(GRATUITE, false, null)).toBe('fermee')
    expect(actionPublier(GRATUITE, true, null)).toBe('fermee')
  })
  it('RÈGLE 1 (2026-11-22) : « Publier » tout court, partout — le prix n’est que sur la page Stripe', () => {
    expect(prixLisible(USD20)).toBe('20 $ US / mois')
    expect('libellePublier' in phrases, 'le libellé à prix est revenu').toBe(false)
    for (const [nom, src] of [['atelier', ATELIER], ['Mes projets', BORD], ['module', MODULE]] as const) {
      expect(src, `${nom} : un « Publier — <prix> » est revenu`).not.toMatch(/Publier — |prixLisible\(/u)
    }
    // Le bouton de l'atelier dit « Publier », sans rien d'autre.
    expect(ATELIER).toMatch(/onClick=\{\(\) => \{ void publier\(\); \}\}[\s\S]{0,400}<Globe[^>]*\/>\s*Publier\s*<\/button>/u)
  })
  it('aucune phrase ne promet WhatsApp, FCFA, espèces ni opérateur', () => {
    for (const p of [PHRASE_PUBLIER_FERMEE, PHRASE_ABONNEMENT_REQUIS]) expect(p).not.toMatch(/WhatsApp|\+235|FCFA|espèces|Airtel|Moov/u)
  })
})

describe('l’atelier : un seul chemin, sans cadenas ni bandeau', () => {
  it('le clic passe par le module partagé ; l’écran ne choisit plus lui-même entre publier et Stripe', () => {
    expect(ATELIER).toMatch(motifTexte('const issue = await lancerPublication({'))
    expect(ATELIER, 'l’atelier décide encore seul').not.toMatch(/actionPublier\(|versStripe\('abonnement'\)/u)
    expect(ATELIER).toMatch(motifTexte("if (issue.type === 'fermee') { setAvisPublication({ texte: issue.message, publierMaintenant: false }); return; }"))
  })
  it('plus de bouton désactivé, de cadenas, de bandeau WhatsApp, ni de « S’abonner » à côté', () => {
    expect(ATELIER).not.toMatch(/PublicationBloquee|CommentPayerPublication|BoutonAbonnement|S’abonner — 20/u)
    expect(ATELIER).not.toMatch(/WhatsApp/u)
  })
  it('RÈGLE 6 à l’écran : au retour de Stripe, l’appli publiée par le webhook est montrée ; sinon « Publier maintenant »', () => {
    expect(ATELIER).toMatch(motifTexte("setAvisPublication({ texte: 'Abonnement actif : votre application est en ligne.', publierMaintenant: false });"))
    expect(ATELIER).toMatch(motifTexte('setLienPublic(adresse);'))
    expect(ATELIER).toMatch(motifTexte("setAvisPublication({ texte: 'Abonnement actif : votre application peut être publiée.', publierMaintenant: true });"))
    expect(ATELIER).toMatch(motifTexte('Publier maintenant'))
  })
})
