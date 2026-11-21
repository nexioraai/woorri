import 'server-only'
/**
 * PAYER UNE APPLI PAR MOBILE MONEY — ce qui ne dépend PAS du prestataire (2026-11-21).
 *
 * Ouvrir un encaissement (montant lu dans le réglage, jamais écrit ici) et
 * traiter un avis VÉRIFIÉ : seul un avis « réussi », en mode test, au montant
 * demandé, pour une appli du bon compte, écrit une ligne dans `app_paiements`
 * — par `enregistrer_paiement`, qui refuse les doublons (fournisseur + référence).
 */
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { lirePrixMensuelXaf } from '@/lib/apps/quota'
import { interrupteurOuvert } from '@/lib/payments/interrupteur'
import { fournisseurMobileMoney } from './fournisseur'
import { ErreurFournisseur, type AvisVerifie, type Encaissement, type FournisseurMobileMoney } from './types'

export const PHRASE_MOBILE_MONEY_FERME = 'Le paiement par mobile money n’est pas encore ouvert.'

/** L'interrupteur `mobile_money` (réglage, éteint par défaut). */
export function mobileMoneyOuvert(proprietaire: string, email: string | null): Promise<boolean> {
  return interrupteurOuvert('mobile_money', proprietaire, email)
}

/**
 * Un numéro tchadien, au format international en chiffres : « 235 » + 8 chiffres.
 * On accepte 8 chiffres (on ajoute 235), « +235 … », espaces et tirets.
 * Pas de contrôle du préfixe 6X : les numéros de test de la doc sont 235000000xx.
 */
export function telephoneTchad(saisie: string): string | null {
  const c = saisie.replace(/[\s\-.()]/gu, '').replace(/^\+/u, '').replace(/^00/u, '')
  if (/^[0-9]{8}$/u.test(c)) return `235${c}`
  if (/^235[0-9]{8}$/u.test(c)) return c
  return null
}

/** Deux clics dans les dix minutes = la même clé = un seul encaissement. */
export function cleIdempotence(app: string, telephone: string, operateur: string, maintenantMs: number): string {
  const fenetre = Math.floor(maintenantMs / 600_000)
  return createHash('sha256').update(`${app}|${telephone}|${operateur}|${String(fenetre)}`).digest('hex').slice(0, 48)
}

export type DemandePaiement = {
  readonly app: string
  readonly proprietaire: string
  readonly operateur: string
  readonly telephone: string
  readonly nomClient: string
}

export async function ouvrirEncaissement(d: DemandePaiement, f: FournisseurMobileMoney = fournisseurMobileMoney()): Promise<Encaissement> {
  const prix = await lirePrixMensuelXaf()
  if (prix === null) throw new ErreurFournisseur('Le prix mensuel en FCFA n’est pas réglé : aucun paiement ne peut s’ouvrir.', 409, 'prix_vide')
  const tel = telephoneTchad(d.telephone)
  if (tel === null) throw new ErreurFournisseur('Numéro non reconnu : 8 chiffres, ou +235 suivi de 8 chiffres.', 400, 'telephone')
  const nom = d.nomClient.trim()
  if (nom.length < 2 || nom.length > 80) throw new ErreurFournisseur('Indiquez le nom du titulaire du compte (2 à 80 signes).', 400, 'nom')
  return f.encaisser({
    montant: prix,
    devise: 'XAF',
    pays: 'TD',
    operateur: d.operateur,
    telephone: tel,
    nomClient: nom,
    description: 'Deribfy — abonnement d’un mois',
    rattachement: { app: d.app, proprietaire: d.proprietaire, objet: 'abonnement', montantAttendu: prix },
    cle: cleIdempotence(d.app, tel, d.operateur, Date.now()),
  })
}

export type IssueAvis =
  | { readonly issue: 'enregistre' | 'deja_enregistre'; readonly app: string }
  | { readonly issue: 'ignore'; readonly raison: string }
  /** Signé mais incohérent (montant, devise) : rien n'est écrit, et on le dit fort. */
  | { readonly issue: 'refuse'; readonly raison: string }
  | { readonly issue: 'erreur'; readonly raison: string }

/** Un avis VÉRIFIÉ → le registre. Ne lève pas : l'issue se dit. */
export async function traiterAvis(avis: AvisVerifie, fournisseur: string): Promise<IssueAvis> {
  if (avis.type !== 'encaissement_reussi') return { issue: 'ignore', raison: `type ${avis.type}` }
  const e = avis.encaissement
  if (e === null) return { issue: 'ignore', raison: 'avis sans encaissement' }
  if (e.etat !== 'reussi') return { issue: 'ignore', raison: `état ${e.etat}` }
  // MODE TEST SEULEMENT (2026-11-21) : un avis réel n'active rien.
  if (!e.test) return { issue: 'ignore', raison: 'avis réel refusé : mode test seulement' }
  const r = e.rattachement
  if (r === null) return { issue: 'ignore', raison: 'encaissement sans rattachement Deribfy' }
  if (e.devise !== 'XAF') return { issue: 'refuse', raison: `devise ${e.devise}` }
  if (e.montant !== r.montantAttendu) return { issue: 'refuse', raison: `montant ${String(e.montant)} ≠ demandé ${String(r.montantAttendu)}` }
  const res = await supabaseAdmin.rpc('enregistrer_paiement', {
    p_source: 'automatique', p_fournisseur: fournisseur, p_reference: e.id,
    p_app: r.app, p_owner: r.proprietaire, p_objet: 'abonnement',
    p_montant: e.montant, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: fournisseur,
  })
  if (res.error !== null) return { issue: 'erreur', raison: res.error.message }
  const statut = (res.data as { statut?: string } | null)?.statut
  return { issue: statut === 'deja_enregistre' ? 'deja_enregistre' : 'enregistre', app: r.app }
}
