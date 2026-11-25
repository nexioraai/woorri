/**
 * « PUBLIER » UN SITE — la même fenêtre que les applis (lot L5, 2026-11-25).
 *
 *   1. lire ce que « Publier » propose (`/api/sites/[slug]/publication`) ;
 *   2. carte SEULEMENT (Dropshipping, ou mobile money fermé) → la page Stripe,
 *      comme avant, sans fenêtre ;
 *   3. sinon LA fenêtre : Adresse (figée : celle du site) › Paiement ›
 *      Confirmation ; « Carte bancaire » → Stripe ; « Mobile money » → le
 *      formulaire (7 000 / 10 500 FCFA), l'attente, puis le lien du site.
 */
import type { DemandeFenetre } from '@/components/apps/publierAppli'
import type { MoyenPublication } from '@/lib/apps/compteur-phrases'

export const TITRE_FENETRE_SITE = 'Publier votre site'
export const LIBELLES_SITE = {
  adresse: 'Adresse de votre site',
  apresMobileMoney: 'Dès que vous validez le paiement sur votre téléphone, votre site est publié.',
  enLigne: 'Votre site est en ligne',
  testSansPublication: 'Paiement de test confirmé. En mode test, le site n’est pas publié.',
} as const
export const PHRASE_PUBLIER_SITE_FERME = 'Le paiement en ligne de ce site n’est pas encore ouvert.'

export type EtatSite = { enLigne: boolean; lien: string; moyens: MoyenPublication[]; payeJusquAu: string | null; rappel: 'bientot' | 'echu' | null }
export type IssueSite =
  | { readonly type: 'paiement' }
  | { readonly type: 'mobile_money' }
  | { readonly type: 'annulee' }
  | { readonly type: 'erreur'; readonly message: string }

export async function lireEtatSite(slug: string, autorisation: string): Promise<EtatSite | null> {
  try {
    const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/publication`, { headers: { Authorization: autorisation } })
    if (!res.ok) return null
    return (await res.json()) as EtatSite
  } catch {
    return null
  }
}

/** La page Stripe du site — le chemin de toujours (`/api/checkout`). */
async function versStripe(slug: string, autorisation: string, ouvrir: (url: string) => void): Promise<string | null> {
  try {
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: autorisation }, body: JSON.stringify({ slug }) })
    const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
    if (typeof d.url === 'string') { ouvrir(d.url); return null }
    return d.error ?? 'La page de paiement n’a pas pu s’ouvrir.'
  } catch {
    return 'La page de paiement n’a pas pu s’ouvrir. Réessayez.'
  }
}

export async function lancerPublicationSite(o: {
  readonly slug: string
  readonly autorisation: string
  readonly ouvrirFenetre: (d: DemandeFenetre) => void
  readonly apresMobileMoney?: () => Promise<unknown>
  /** Pour les tests ; l'écran prend `window.location.assign`. */
  readonly ouvrir?: (url: string) => void
}): Promise<IssueSite> {
  const ouvrir = o.ouvrir ?? ((url: string) => { window.location.assign(url) })
  const etat = await lireEtatSite(o.slug, o.autorisation)
  if (etat === null) return { type: 'erreur', message: 'La publication ne répond pas. Réessayez.' }
  if (etat.moyens.length === 0) return { type: 'erreur', message: PHRASE_PUBLIER_SITE_FERME }
  // Carte SEULE (le Dropshipping, ou le mobile money fermé) : comme avant, droit à Stripe.
  if (etat.moyens.length === 1 && etat.moyens[0] === 'carte') {
    const e = await versStripe(o.slug, o.autorisation, ouvrir)
    return e === null ? { type: 'paiement' } : { type: 'erreur', message: e }
  }
  const sansBearer = o.autorisation.replace(/^Bearer\s+/u, '')
  return new Promise<IssueSite>((resolve) => {
    o.ouvrirFenetre({
      titre: TITRE_FENETRE_SITE,
      adresseInitiale: o.slug,
      adresseModifiable: false,
      listes: [],
      libelleBouton: 'Publier',
      moyens: etat.moyens,
      avecEtapes: true,
      compte: null,
      verifier: null,
      libelles: LIBELLES_SITE,
      mobileMoney: etat.moyens.includes('mobile_money')
        ? {
            app: `site-${o.slug}`,
            adresseApi: `/api/sites/${encodeURIComponent(o.slug)}/mobile-money?cible=site`,
            jeton: () => Promise.resolve(sansBearer),
            onPaye: o.apresMobileMoney ?? (() => Promise.resolve()),
            // Le site est EN LIGNE dès que l'avis est enregistré : la Confirmation montre son lien.
            lireAdresse: async () => { const e = await lireEtatSite(o.slug, o.autorisation); return e !== null && e.enLigne && e.payeJusquAu !== null ? e.lien : null },
          }
        : null,
      valider: async (_adresse, moyen) => {
        if (moyen === 'mobile_money') { resolve({ type: 'mobile_money' }); return 'mobile_money' }
        const e = await versStripe(o.slug, o.autorisation, ouvrir)
        if (e !== null) return e
        resolve({ type: 'paiement' })
        return null
      },
      annuler: () => { resolve({ type: 'annulee' }) },
    })
  })
}
