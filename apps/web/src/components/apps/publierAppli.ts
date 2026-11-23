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

/** Ce que « Publier » va faire, et où en est l'appli (GET /api/generateur/publier/etat). */
export type EtatPublication = {
  readonly action: ActionPublier
  readonly nom: string | null
  readonly adresse: string | null
  readonly nomModifiable: boolean
  readonly publicationAuto: 'echec' | null
}

export async function lireEtatPublication(id: string, autorisation: string): Promise<EtatPublication | null> {
  try {
    const res = await fetch(`/api/generateur/publier/etat?id=${encodeURIComponent(id)}`, { headers: { Authorization: autorisation } })
    if (!res.ok) return null
    const d = (await res.json()) as Partial<EtatPublication>
    if (d.action === undefined) return null
    return {
      action: d.action,
      nom: typeof d.nom === 'string' && d.nom !== '' ? d.nom : null,
      adresse: typeof d.adresse === 'string' && d.adresse !== '' ? d.adresse : null,
      nomModifiable: d.nomModifiable === true,
      publicationAuto: d.publicationAuto === 'echec' ? 'echec' : null,
    }
  } catch {
    return null
  }
}

/** L'adresse EN LIGNE de l'appli, ou null : un nom enregistré sans paiement n'en a pas. */
export async function adresseEnLigne(id: string, autorisation: string): Promise<string | null> {
  return (await lireEtatPublication(id, autorisation))?.adresse ?? null
}

// ── LE RETOUR DE STRIPE (décision du propriétaire, 2026-11-22).
//
// Le client vient de payer ; c'est le webhook qui publie. L'écran dit où on
// en est, et se met à jour SEUL (il relit l'état toutes les quelques
// secondes) : jamais « recliquez sur Publier ».
export type EtapeRetour = 'activation' | 'publication' | 'en_ligne' | 'echec'

export function etapeDuRetour(e: EtatPublication | null): EtapeRetour {
  if (e?.adresse != null) return 'en_ligne'
  if (e?.publicationAuto === 'echec') return 'echec'
  // Payé (la décision dit « publier ») mais pas encore en ligne : le webhook travaille.
  if (e?.action === 'publier') return 'publication'
  return 'activation'
}

export const PHRASES_RETOUR: Readonly<Record<EtapeRetour, string>> = {
  activation: 'Paiement reçu par Stripe — l’activation arrive dans quelques secondes.',
  publication: 'Paiement reçu. Publication en cours…',
  en_ligne: 'Votre application est en ligne',
  echec: 'Le paiement est bien reçu, mais la publication automatique n’a pas abouti. Nous sommes prévenus. « Publier » la relance, sans payer une seconde fois.',
}

/** Toutes les combien de millisecondes l'écran relit l'état, et jusqu'à quand. */
export const RELECTURE_RETOUR_MS = 5000
export const RELECTURE_RETOUR_MAX = 360 // trente minutes

// ── « CHANGER L'ADRESSE » (décision du propriétaire, 2026-11-22) : tant que
//    l'appli n'a jamais été en ligne. Mêmes contrôles que « Publier ».
export type IssueNom =
  | { readonly type: 'annulee' }
  | { readonly type: 'changee'; readonly nom: string }
  | { readonly type: 'erreur'; readonly message: string }

export async function changerAdresse(o: {
  readonly id: string
  readonly titre: string | null
  readonly nomActuel: string
  readonly autorisation: string
  readonly demanderNom?: (question: string, suggestion: string) => string | null
}): Promise<IssueNom> {
  const demanderNom = o.demanderNom ?? ((q: string, s: string) => window.prompt(q, s))
  const saisi = demanderNom(questionDuNom(o.titre), o.nomActuel)
  if (saisi === null) return { type: 'annulee' }
  const sous = saisi.trim().toLowerCase()
  if (sous === '') return { type: 'erreur', message: 'Choisissez une adresse.' }
  try {
    const res = await fetch(`/api/generateur/publier/nom?id=${encodeURIComponent(o.id)}&sous=${encodeURIComponent(sous)}`, {
      method: 'POST', headers: { Authorization: o.autorisation },
    })
    const d = (await res.json().catch(() => ({}))) as { nom?: string; error?: string }
    if (!res.ok || typeof d.nom !== 'string') return { type: 'erreur', message: d.error ?? 'L’adresse n’a pas pu être changée.' }
    return { type: 'changee', nom: d.nom }
  } catch {
    return { type: 'erreur', message: 'L’adresse n’a pas pu être changée. Réessayez.' }
  }
}

// ── LE MOT DE PASSE DE L'APPLI : la fonction EXISTANTE « Refaire le mot de
//    passe » (POST /api/generateur/compte), pas un nouveau mécanisme. Après
//    une publication faite par le webhook, personne n'a vu le premier : le
//    « créer », c'est le refaire.
export const LIBELLE_CREER_MOT_DE_PASSE = 'Créer mon mot de passe'
export const LIBELLE_MOT_DE_PASSE = 'Créer / refaire mon mot de passe'
export const CONFIRMER_MOT_DE_PASSE =
  'Créer un nouveau mot de passe pour cette application ?\n\n' +
  'S’il en existait déjà un, il cessera de fonctionner immédiatement : les ' +
  'personnes qui s’en servent devront recevoir le nouveau.'

export type IssueMotDePasse =
  | { readonly ok: true; readonly adresse: string | undefined; readonly motDePasse: string | null }
  | { readonly ok: false; readonly message: string }

export async function refaireMotDePasse(id: string, autorisation: string): Promise<IssueMotDePasse> {
  try {
    const res = await fetch(`/api/generateur/compte?id=${encodeURIComponent(id)}`, { method: 'POST', headers: { Authorization: autorisation } })
    const d = (await res.json().catch(() => ({}))) as { adresse?: string; motDePasse?: string; error?: string; motif?: string }
    if (!res.ok) return { ok: false, message: `${String(d.error ?? 'Le renouvellement a échoué.')} ${String(d.motif ?? '')}`.trim() }
    return { ok: true, adresse: d.adresse, motDePasse: d.motDePasse ?? null }
  } catch {
    return { ok: false, message: 'Le renouvellement a échoué. Réessayez.' }
  }
}
