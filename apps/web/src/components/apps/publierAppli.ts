/**
 * « PUBLIER » EST « PUBLIER », OÙ QU'IL SE TROUVE (décision du propriétaire, 2026-11-22).
 *
 * MESURÉ par le propriétaire, compte contact@deribfy.com : dans l'atelier,
 * « Publier » ouvrait Stripe ; dans « Mes projets », le même mot demandait le
 * nom à chaque clic puis répondait « Publier demande un abonnement en cours ».
 * Deux copies du geste, deux comportements. Ce module est la seule copie : les
 * deux boutons l'appellent, avec les mêmes arguments.
 *
 *   1. lire ce que « Publier » va faire (`/api/generateur/publier/etat`) ;
 *   2. carte fermée pour ce compte → la phrase, sans rien demander ;
 *   3. nom pas encore choisi → le demander ; déjà choisi → ne PAS le redemander ;
 *   4. appeler la route (avec la question de la lecture publique) :
 *        non payé → le nom s'enregistre, la page Stripe s'ouvre ;
 *        payé     → l'appli se publie (ou se republie), sans Stripe.
 * Le paiement reçu, c'est le webhook qui publie : aucun autre clic.
 */
import { publierAvecAccord } from '@/components/apps/accordLecturePublique'
import { adresseProposee } from '@/lib/apps/nom-produit'
import { PHRASE_PUBLIER_FERMEE, type ActionPublier } from '@/lib/apps/compteur-phrases'

export type IssuePublication =
  | { readonly type: 'annulee' }
  | { readonly type: 'fermee'; readonly message: string }
  | { readonly type: 'paiement' }
  | { readonly type: 'amnesique'; readonly message: string; readonly regenerer: string }
  | { readonly type: 'erreur'; readonly message: string }
  | {
      readonly type: 'publiee'
      readonly lien: string
      readonly compte: { adresse?: string; motDePasse?: string | null } | null
      readonly erreurSousDomaine: string | null
    }

/** La question du nom, la même pour les deux boutons. */
export function questionDuNom(titre: string | null): string {
  return `Adresse publique de « ${titre ?? 'votre application'} » :\n` +
    '<adresse>.deribfy.app\n\nMinuscules, chiffres et tirets. ' +
    'Un seul niveau : les points sont refusés. Laisser vide pour un lien simple.'
}

export const PHRASE_PUBLICATION_ECHOUEE = 'La publication a échoué. Réessayez.'

export type OptionsPublication = {
  readonly id: string
  readonly titre: string | null
  readonly demande: string
  /** `Bearer <jeton>` de la session. */
  readonly autorisation: string
  /** Pour les tests ; l'écran prend `window.prompt` et `window.location.assign`. */
  readonly demanderNom?: (question: string, suggestion: string) => string | null
  readonly ouvrir?: (url: string) => void
}

export async function lancerPublication(o: OptionsPublication): Promise<IssuePublication> {
  const demanderNom = o.demanderNom ?? ((q: string, s: string) => window.prompt(q, s))
  const ouvrir = o.ouvrir ?? ((url: string) => { window.location.assign(url) })
  try {
    const e = await fetch(`/api/generateur/publier/etat?id=${encodeURIComponent(o.id)}`, { headers: { Authorization: o.autorisation } })
    const etat = (await e.json().catch(() => ({}))) as { action?: ActionPublier; nom?: string | null; error?: string }
    if (!e.ok || etat.action === undefined) return { type: 'erreur', message: etat.error ?? PHRASE_PUBLICATION_ECHOUEE }
    if (etat.action === 'fermee') return { type: 'fermee', message: PHRASE_PUBLIER_FERMEE }

    // LE NOM : demandé une fois. Enregistré, il n'est plus redemandé.
    let sous = typeof etat.nom === 'string' && etat.nom !== '' ? etat.nom : null
    if (sous === null) {
      const saisi = demanderNom(questionDuNom(o.titre), adresseProposee(o.titre ?? o.demande))
      if (saisi === null) return { type: 'annulee' }
      sous = saisi.trim().toLowerCase()
    }

    const res = await publierAvecAccord(
      `/api/generateur/publier?id=${encodeURIComponent(o.id)}${sous !== '' ? `&sous=${encodeURIComponent(sous)}` : ''}`,
      o.autorisation,
    )
    // Le champ s'appelle `lien`, pas `url` — bug attrapé en production le
    // 2026-10-30. On lit les deux : si la route renomme, le bouton survit.
    const d = (await res.json().catch(() => null)) as {
      paiement?: string; lien?: string; url?: string; error?: string; erreurSousDomaine?: string
      compte?: { adresse?: string; motDePasse?: string | null } | null
      amnesique?: boolean; regenerer?: string; quoiFaire?: string
    } | null
    if (res.ok && typeof d?.paiement === 'string') {
      ouvrir(d.paiement)
      return { type: 'paiement' }
    }
    // UNE PUBLICATION REFUSÉE POUR AMNÉSIE DONNE SA SORTIE : la demande revient
    // déjà augmentée, l'écran la porte telle quelle.
    if (!res.ok && d?.amnesique === true) {
      return { type: 'amnesique', message: `${String(d.error ?? '')} ${String(d.quoiFaire ?? '')}`.trim(), regenerer: String(d.regenerer ?? '') }
    }
    const lien = d?.lien ?? d?.url
    if (!res.ok || lien === undefined || lien === '') return { type: 'erreur', message: d?.error ?? 'La publication a échoué.' }
    return { type: 'publiee', lien, compte: d?.compte ?? null, erreurSousDomaine: d?.erreurSousDomaine ?? null }
  } catch {
    return { type: 'erreur', message: PHRASE_PUBLICATION_ECHOUEE }
  }
}

/** L'adresse EN LIGNE de l'appli, ou null : un nom enregistré sans paiement n'en a pas. */
export async function adresseEnLigne(id: string, autorisation: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/generateur/publier/etat?id=${encodeURIComponent(id)}`, { headers: { Authorization: autorisation } })
    if (!res.ok) return null
    const a = ((await res.json()) as { adresse?: string | null }).adresse
    return typeof a === 'string' && a !== '' ? a : null
  } catch {
    return null
  }
}
