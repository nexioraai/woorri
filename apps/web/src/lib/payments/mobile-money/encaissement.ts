import 'server-only'
/**
 * PAYER UNE APPLI PAR MOBILE MONEY — ce qui ne dépend PAS du prestataire (2026-11-21).
 *
 * Ouvrir un encaissement (prix ET frais lus dans les réglages, jamais écrits
 * ici) et traiter un avis VÉRIFIÉ : seul un avis « réussi », au moins au
 * montant RECALCULÉ, pour une appli du bon compte, écrit une ligne dans
 * `app_paiements` — par `enregistrer_paiement`, qui refuse les doublons
 * (fournisseur + référence). En mode test, rien n'est écrit (option A).
 *
 * LES FRAIS (2026-11-21) : le client les paie, le propriétaire reçoit le prix
 * net. Le calcul vit dans `frais.ts` ; les taux dans `quota_reglages`.
 */
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { lireReglagesTexte } from '@/lib/apps/quota'
import { interrupteurOuvert } from '@/lib/payments/interrupteur'
import { fournisseurMobileMoney } from './fournisseur'
import { CLES_TARIF, PHRASE_FRAIS_NON_REGLES, prixPour, tarifDepuisReglages, type Tarif } from './frais'
import { ErreurFournisseur, type AvisVerifie, type Encaissement, type EncaissementOuvert, type FournisseurMobileMoney } from './types'

/** Le tarif du moment (prix + frais), lu en une requête ; ce qui manque est nommé. */
export async function lireTarifMobileMoney(): Promise<{ ok: true; tarif: Tarif } | { ok: false; manque: string[] }> {
  const v = await lireReglagesTexte(CLES_TARIF)
  if (v === null) return { ok: false, manque: ['quota_reglages illisible'] }
  return tarifDepuisReglages(v)
}

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

/**
 * UNE SEULE DEMANDE OUVERTE PAR APPLI (décision du propriétaire, 2026-11-21).
 * MoneRails n'annule rien : deux demandes validées = deux débits. Tant qu'une
 * demande n'est pas finale ET a moins de 10 minutes, une nouvelle est refusée.
 * Une demande sans date connue compte comme récente (prudence : refus).
 */
export const ATTENTE_MAX_MS = 600_000
const FINAUX: ReadonlySet<string> = new Set(['reussi', 'echoue', 'expire'])

export function demandeEnCours(liste: readonly EncaissementOuvert[], maintenantMs: number): { id: string; resteMs: number } | null {
  for (const e of liste) {
    if (FINAUX.has(e.etat)) continue
    const age = e.creeLeMs === null ? 0 : maintenantMs - e.creeLeMs
    if (age < ATTENTE_MAX_MS) return { id: e.id, resteMs: ATTENTE_MAX_MS - Math.max(0, age) }
  }
  return null
}

export function phraseDemandeEnCours(resteMs: number): string {
  const min = Math.max(1, Math.ceil(resteMs / 60_000))
  return `Un paiement est déjà en cours pour cette application : validez-le sur votre téléphone, ou attendez ${String(min)} min avant d’en demander un autre.`
}

export const PHRASE_VERIFICATION_IMPOSSIBLE = 'Impossible de vérifier qu’aucun paiement n’est déjà en cours. Aucun montant n’est demandé : réessayez dans un instant.'

export type DemandePaiement = {
  readonly app: string
  readonly proprietaire: string
  readonly operateur: string
  readonly telephone: string
  readonly nomClient: string
}

export async function ouvrirEncaissement(d: DemandePaiement, f: FournisseurMobileMoney = fournisseurMobileMoney(), maintenantMs: number = Date.now()): Promise<Encaissement> {
  // Le montant demandé = prix + frais, pour CET opérateur, lus MAINTENANT.
  const t = await lireTarifMobileMoney()
  if (!t.ok) throw new ErreurFournisseur(PHRASE_FRAIS_NON_REGLES, 409, 'frais_non_regles')
  const p = prixPour(t.tarif, d.operateur)
  if (p === null) throw new ErreurFournisseur('Cet opérateur n’a pas de frais réglés : choisissez Airtel Money ou Moov Money.', 400, 'operateur_sans_frais')
  const tel = telephoneTchad(d.telephone)
  if (tel === null) throw new ErreurFournisseur('Numéro non reconnu : 8 chiffres, ou +235 suivi de 8 chiffres.', 400, 'telephone')
  const nom = d.nomClient.trim()
  if (nom.length < 2 || nom.length > 80) throw new ErreurFournisseur('Indiquez le nom du titulaire du compte (2 à 80 signes).', 400, 'nom')
  // Une demande déjà ouverte pour cette appli ? La liste illisible = refus
  // (on ne prend pas le risque d'un second débit).
  let ouverts: EncaissementOuvert[]
  try { ouverts = await f.encaissementsDe(d.app) } catch (e) {
    throw new ErreurFournisseur(PHRASE_VERIFICATION_IMPOSSIBLE, 503, 'verification_en_cours', e instanceof ErreurFournisseur ? { status: e.status, code: e.code, brut: e.brut } : String(e))
  }
  const enCours = demandeEnCours(ouverts, maintenantMs)
  if (enCours !== null) throw new ErreurFournisseur(phraseDemandeEnCours(enCours.resteMs), 409, 'paiement_en_cours', { encaissement: enCours.id })
  return f.encaisser({
    montant: p.total,
    devise: 'XAF',
    pays: 'TD',
    operateur: d.operateur,
    telephone: tel,
    nomClient: nom,
    description: 'Deribfy — abonnement d’un mois',
    rattachement: { app: d.app, proprietaire: d.proprietaire, objet: 'abonnement', montantInscrit: p.total },
    ventilation: { prix: p.prix, frais: p.frais },
    cle: cleIdempotence(d.app, tel, d.operateur, maintenantMs),
  })
}

/**
 * MODE TEST SEULEMENT (2026-11-21). Tant que c'est vrai : un avis RÉEL est
 * refusé, et un avis de TEST est vérifié puis seulement JOURNALISÉ — option A
 * du propriétaire : « en mode test, un avis ne doit rien écrire de réel ».
 * Rien n'atteint `app_paiements` (registre en ajout seul, sans effacement).
 * Ouvrir le mode réel = passer ceci à `false`, par un commit nommé.
 */
export const MODE_TEST_SEULEMENT = true

export type IssueAvis =
  | { readonly issue: 'enregistre' | 'deja_enregistre'; readonly app: string }
  /** Avis de test, vérifié de bout en bout, JAMAIS écrit : voici ce qui l'aurait été. */
  | { readonly issue: 'test_verifie'; readonly app: string; readonly serait: Readonly<Record<string, unknown>>; readonly ventilation: { readonly abonnement: number; readonly frais: number } }
  | { readonly issue: 'ignore'; readonly raison: string }
  /** Signé mais incohérent (montant, devise) : rien n'est écrit, et on le dit fort. */
  | { readonly issue: 'refuse'; readonly raison: string }
  | { readonly issue: 'erreur'; readonly raison: string }

/** Un avis VÉRIFIÉ → le registre (ou, en test, le journal seul). Ne lève pas : l'issue se dit. */
export async function traiterAvis(
  avis: AvisVerifie,
  fournisseur: string,
  o: { readonly modeTestSeulement?: boolean; readonly tarif?: () => ReturnType<typeof lireTarifMobileMoney> } = {},
): Promise<IssueAvis> {
  const testSeulement = o.modeTestSeulement ?? MODE_TEST_SEULEMENT
  if (avis.type !== 'encaissement_reussi') return { issue: 'ignore', raison: `type ${avis.type}` }
  const e = avis.encaissement
  if (e === null) return { issue: 'ignore', raison: 'avis sans encaissement' }
  if (e.etat !== 'reussi') return { issue: 'ignore', raison: `état ${e.etat}` }
  // Un avis réel tant que seul le test est autorisé : refusé, rien n'est lu de plus.
  if (!e.test && testSeulement) return { issue: 'ignore', raison: 'avis réel refusé : mode test seulement' }
  const r = e.rattachement
  if (r === null) return { issue: 'ignore', raison: 'encaissement sans rattachement Deribfy' }
  if (e.devise !== 'XAF') return { issue: 'refuse', raison: `devise ${e.devise}` }
  // LE MONTANT ATTENDU EST RECALCULÉ (2026-11-21) depuis les réglages du
  // moment et l'opérateur de l'avis — jamais lu dans les métadonnées de la
  // demande. Règle : l'avis doit porter AU MOINS ce montant (payer plus ne fait
  // jamais passer le net sous le prix ; payer moins, si). Réglages illisibles :
  // `erreur` → 500 → le prestataire redonne l'avis plus tard.
  const t = await (o.tarif ?? lireTarifMobileMoney)()
  if (!t.ok) return { issue: 'erreur', raison: `frais non réglés : ${t.manque.join(', ')}` }
  const attendu = e.operateur === null ? null : prixPour(t.tarif, e.operateur)
  if (attendu === null) return { issue: 'refuse', raison: `opérateur sans frais réglés : ${String(e.operateur)}` }
  if (!Number.isInteger(e.montant) || e.montant < attendu.total) {
    return { issue: 'refuse', raison: `montant ${String(e.montant)} < attendu ${String(attendu.total)} (${String(attendu.prix)} + ${String(attendu.frais)} de frais, ${String(e.operateur)})` }
  }
  const ecriture = {
    p_source: 'automatique', p_fournisseur: fournisseur, p_reference: e.id,
    p_app: r.app, p_owner: r.proprietaire, p_objet: 'abonnement',
    p_montant: e.montant, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: fournisseur,
    // La part FRAIS (2026-11-21, colonne `app_paiements.frais`) : ce qui dépasse le prix.
    p_frais: e.montant - attendu.prix,
  } as const
  // OPTION A (2026-11-21) : un avis de TEST, vérifié de bout en bout, n'écrit
  // RIEN — il dit seulement ce qu'il aurait écrit.
  if (e.test) return { issue: 'test_verifie', app: r.app, serait: ecriture, ventilation: { abonnement: attendu.prix, frais: ecriture.p_frais } }
  const res = await supabaseAdmin.rpc('enregistrer_paiement', ecriture)
  if (res.error !== null) return { issue: 'erreur', raison: res.error.message }
  const statut = (res.data as { statut?: string } | null)?.statut
  return { issue: statut === 'deja_enregistre' ? 'deja_enregistre' : 'enregistre', app: r.app }
}
