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
import { CLES_TARIF, PHRASE_FRAIS_NON_REGLES, operateurPropose, prixMobileMoney, tarifDepuisReglages, type Tarif } from './frais'
import { decideRegime, type RegimeMobileMoney } from './regime'
import { ErreurFournisseur, type AvisVerifie, type Encaissement, type EncaissementOuvert, type FournisseurMobileMoney, type ObjetPaiement } from './types'
import { registreDemandes, type EtatDemande, type RegistreDemandes } from './demandes'
import { alerter } from '@/lib/alertes'

/** Le tarif du moment (prix + frais), lu en une requête ; ce qui manque est nommé. */
export async function lireTarifMobileMoney(): Promise<{ ok: true; tarif: Tarif } | { ok: false; manque: string[] }> {
  const v = await lireReglagesTexte(CLES_TARIF)
  if (v === null) return { ok: false, manque: ['quota_reglages illisible'] }
  return tarifDepuisReglages(v)
}

export const PHRASE_MOBILE_MONEY_FERME = 'Le paiement par mobile money n’est pas encore ouvert.'

/**
 * LE LOT DE MODIFICATIONS PAR MOBILE MONEY (2026-11-24). Son prix NET est le
 * réglage `lot_prix_xaf` ; le prix payé suit la MÊME formule que l'abonnement
 * (retrait, reversement, encaissement le plus haut, centaine supérieure) :
 * 3 000 net → 3 500 FCFA. Illisible ou nul → `null` : rien n'est proposé.
 */
export async function lireLotXaf(): Promise<number | null> {
  const v = await lireReglagesTexte(['lot_prix_xaf'])
  const n = Number((v?.lot_prix_xaf ?? '').trim())
  return Number.isInteger(n) && n > 0 ? n : null
}

export const PHRASE_LOT_NON_REGLE = 'Le prix du lot de modifications n’est pas réglé : rien n’est demandé.'

/** Le prix NET de ce qu'on paie : le mois d'abonnement, ou le lot. */
async function prixNetDe(objet: ObjetPaiement, t: Tarif, lot: () => Promise<number | null>): Promise<number | null> {
  return objet === 'lot' ? lot() : t.prix
}

/** L'interrupteur `mobile_money` (réglage, éteint par défaut). */
export function mobileMoneyOuvert(proprietaire: string, email: string | null): Promise<boolean> {
  return interrupteurOuvert('mobile_money', proprietaire, email)
}

/**
 * LE MODE DE CE COMPTE (lot L3, 2026-11-23) — `mode.ts` décide ; ici on lit le
 * réglage `mobile_money` et la présence de la clé live. Réglage illisible → TEST.
 */
export async function regimeDuCompte(email: string | null): Promise<RegimeMobileMoney> {
  if (email === null) return 'test'
  const v = await lireReglagesTexte(['mobile_money'])
  return decideRegime({ email, cleLive: process.env.MONERAILS_CLE_LIVE, reglage: v?.mobile_money ?? null })
}

/**
 * Un avis RÉEL pour ce propriétaire est-il permis ? Son courriel est relu par
 * son identifiant (jamais pris dans l'avis) ; illisible → non.
 */
export async function reelPermisPourProprietaire(proprietaire: string): Promise<boolean> {
  const u = await supabaseAdmin.auth.admin.getUserById(proprietaire).catch(() => null)
  const email = u?.data.user?.email ?? null
  return (await regimeDuCompte(email)) === 'reel'
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

/**
 * Deux clics dans les dix minutes = la même clé = un seul encaissement.
 *
 * LE MONTANT ENTRE DANS LA CLÉ (2026-11-23). MoneRails refuse la même clé avec
 * un corps différent (`422 idempotency_key_reused`, docs : idempotency) : un prix
 * changé dans la fenêtre rendait la demande impossible pendant dix minutes.
 */
export function cleIdempotence(app: string, telephone: string, operateur: string, montant: number, maintenantMs: number): string {
  const fenetre = Math.floor(maintenantMs / 600_000)
  return createHash('sha256').update(`${app}|${telephone}|${operateur}|${String(montant)}|${String(fenetre)}`).digest('hex').slice(0, 48)
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
  /** Un mois d'abonnement (défaut) ou un lot de modifications (2026-11-24). */
  readonly objet?: ObjetPaiement
}

export async function ouvrirEncaissement(
  d: DemandePaiement,
  f: FournisseurMobileMoney = fournisseurMobileMoney(),
  maintenantMs: number = Date.now(),
  registre: RegistreDemandes = registreDemandes,
): Promise<Encaissement> {
  // UN SEUL PRIX (2026-11-23), le même pour tout opérateur, lu MAINTENANT.
  const t = await lireTarifMobileMoney()
  if (!t.ok) throw new ErreurFournisseur(PHRASE_FRAIS_NON_REGLES, 409, 'tarif_non_regle')
  if (!operateurPropose(d.operateur)) throw new ErreurFournisseur('Choisissez Airtel Money ou Moov Money.', 400, 'operateur_inconnu')
  const objet: ObjetPaiement = d.objet ?? 'abonnement'
  const net = await prixNetDe(objet, t.tarif, lireLotXaf)
  if (net === null) throw new ErreurFournisseur(PHRASE_LOT_NON_REGLE, 409, 'lot_non_regle')
  const p = prixMobileMoney(t.tarif, net)
  const tel = telephoneTchad(d.telephone)
  if (tel === null) throw new ErreurFournisseur('Numéro non reconnu : 8 chiffres, ou +235 suivi de 8 chiffres.', 400, 'telephone')
  const nom = d.nomClient.trim()
  if (nom.length < 2 || nom.length > 80) throw new ErreurFournisseur('Indiquez le nom du titulaire du compte (2 à 80 signes).', 400, 'nom')
  // ── ① LE VERROU EN BASE (2026-11-23) : une seule demande ouverte par appli,
  // tenue par un index unique. Deux demandes VRAIMENT simultanées — deux
  // numéros, deux onglets — ne passent plus : la base refuse la seconde.
  // Illisible = refus (on ne prend pas le risque d'un second débit).
  let verrou: Awaited<ReturnType<RegistreDemandes['ouvrir']>>
  try {
    verrou = await registre.ouvrir({
      fournisseur: f.nom, app: d.app, proprietaire: d.proprietaire, operateur: d.operateur,
      // Le NUMÉRO ENTIER va au registre, qui le MASQUE lui-même avant d'écrire (2026-11-23).
      telephone: tel, montant: p.total, prix: p.prix, frais: p.frais, attenteS: ATTENTE_MAX_MS / 1000,
    })
  } catch (e) {
    throw new ErreurFournisseur(PHRASE_VERIFICATION_IMPOSSIBLE, 503, 'verrou_illisible', String(e))
  }
  if (verrou.issue === 'deja_ouverte') {
    const age = verrou.creeLe === null ? 0 : maintenantMs - Date.parse(verrou.creeLe)
    throw new ErreurFournisseur(phraseDemandeEnCours(ATTENTE_MAX_MS - Math.max(0, age)), 409, 'paiement_en_cours', { demande: verrou.id })
  }
  const idDemande = verrou.id
  // ② ET LA LISTE DU PRESTATAIRE, gardée en second rempart : une demande
  // ouverte AVANT cette table n'y figure pas.
  try {
    let ouverts: EncaissementOuvert[]
    try { ouverts = await f.encaissementsDe(d.app) } catch (e) {
      throw new ErreurFournisseur(PHRASE_VERIFICATION_IMPOSSIBLE, 503, 'verification_en_cours', e instanceof ErreurFournisseur ? { status: e.status, code: e.code, brut: e.brut } : String(e))
    }
    const enCours = demandeEnCours(ouverts, maintenantMs)
    if (enCours !== null) throw new ErreurFournisseur(phraseDemandeEnCours(enCours.resteMs), 409, 'paiement_en_cours', { encaissement: enCours.id })
    const e = await f.encaisser({
    montant: p.total,
    devise: 'XAF',
    pays: 'TD',
    operateur: d.operateur,
    telephone: tel,
    nomClient: nom,
    description: objet === 'lot' ? 'Deribfy — lot de modifications' : 'Deribfy — abonnement d’un mois',
    rattachement: { app: d.app, proprietaire: d.proprietaire, objet, montantInscrit: p.total },
    ventilation: { prix: p.prix, frais: p.frais },
    cle: cleIdempotence(d.app, tel, d.operateur, p.total, maintenantMs),
    })
    await registre.noterReference(idDemande, e.id, e.test)
    return e
  } catch (e) {
    // La demande n'a pas pu partir : le verrou se libère, la raison reste écrite.
    await registre.abandonner(idDemande, e instanceof ErreurFournisseur ? `${e.code ?? 'erreur'} : ${e.message}` : String(e)).catch(() => undefined)
    throw e
  }
}

/**
 * LE RÉEL, POUR LE SEUL COMPTE DU PROPRIÉTAIRE (lot L3, 2026-11-23 ; jusque-là
 * `MODE_TEST_SEULEMENT = true`, tout avis réel refusé). Un avis RÉEL n'écrit
 * au registre que si son propriétaire passe `mode.ts` (son compte, la clé live,
 * le réglage qui le nomme) ; sinon il est refusé — et, payé, il alerte.
 * Un avis de TEST est vérifié puis seulement JOURNALISÉ (option A, inchangée) :
 * rien n'atteint `app_paiements`.
 */

export type IssueAvis =
  | { readonly issue: 'enregistre' | 'deja_enregistre'; readonly app: string; readonly proprietaire: string; readonly objet: ObjetPaiement }
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
  o: { readonly reelPermis?: (proprietaire: string) => Promise<boolean>; readonly tarif?: () => ReturnType<typeof lireTarifMobileMoney>; readonly lot?: () => Promise<number | null> } = {},
): Promise<IssueAvis> {
  if (avis.type !== 'encaissement_reussi') return { issue: 'ignore', raison: `type ${avis.type}` }
  const e = avis.encaissement
  if (e === null) return { issue: 'ignore', raison: 'avis sans encaissement' }
  if (e.etat !== 'reussi') return { issue: 'ignore', raison: `état ${e.etat}` }
  const r = e.rattachement
  // PAYÉ MAIS SANS APPLI À ACTIVER (2026-11-23) : un refus, pas un « ignoré » —
  // l'argent est arrivé, l'alerte part et l'activation à la main devient possible.
  if (r === null) return { issue: 'refuse', raison: 'appli introuvable : encaissement sans rattachement Deribfy' }
  // UN AVIS RÉEL pour un compte qui n'a pas le réel : refusé (et, payé, alerte).
  if (!e.test && !(await (o.reelPermis ?? reelPermisPourProprietaire)(r.proprietaire).catch(() => false))) {
    return { issue: 'refuse', raison: 'avis réel pour un compte sans le mode réel' }
  }
  if (e.devise !== 'XAF') return { issue: 'refuse', raison: `devise ${e.devise}` }
  // LE MONTANT ATTENDU EST RECALCULÉ (2026-11-21) depuis les réglages du
  // moment et l'opérateur de l'avis — jamais lu dans les métadonnées de la
  // demande. Règle : l'avis doit porter AU MOINS ce montant (payer plus ne fait
  // jamais passer le net sous le prix ; payer moins, si). Réglages illisibles :
  // `erreur` → 500 → le prestataire redonne l'avis plus tard.
  const t = await (o.tarif ?? lireTarifMobileMoney)()
  if (!t.ok) return { issue: 'erreur', raison: `frais non réglés : ${t.manque.join(', ')}` }
  if (e.operateur === null || !operateurPropose(e.operateur)) return { issue: 'refuse', raison: `opérateur non proposé : ${String(e.operateur)}` }
  // UN SEUL PRIX (2026-11-23) : le même attendu quel que soit l'opérateur ;
  // celui du LOT pour un lot (2026-11-24). Prix du lot illisible → erreur (redonné).
  const net = await prixNetDe(r.objet, t.tarif, o.lot ?? lireLotXaf)
  if (net === null) return { issue: 'erreur', raison: 'prix du lot non réglé (lot_prix_xaf)' }
  const attendu = prixMobileMoney(t.tarif, net)
  if (!Number.isInteger(e.montant) || e.montant < attendu.total) {
    return { issue: 'refuse', raison: `montant ${String(e.montant)} < attendu ${String(attendu.total)} (${String(attendu.prix)} + ${String(attendu.frais)} de frais, ${String(e.operateur)})` }
  }
  const ecriture = {
    p_source: 'automatique', p_fournisseur: fournisseur, p_reference: e.id,
    p_app: r.app, p_owner: r.proprietaire, p_objet: r.objet,
    p_montant: e.montant, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: fournisseur,
    // La part FRAIS (2026-11-21, colonne `app_paiements.frais`) : ce qui dépasse le prix.
    p_frais: e.montant - attendu.prix,
  } as const
  // OPTION A (2026-11-21) : un avis de TEST, vérifié de bout en bout, n'écrit
  // RIEN — il dit seulement ce qu'il aurait écrit.
  if (e.test) return { issue: 'test_verifie', app: r.app, serait: ecriture, ventilation: { abonnement: attendu.prix, frais: ecriture.p_frais } }
  const res = await supabaseAdmin.rpc('enregistrer_paiement', ecriture)
  // L'appli n'existe pas, ou pas pour ce compte : refus DÉFINITIF (redonner
  // l'avis 8 fois n'y changerait rien), donc alerte et activation à la main.
  if (res.error !== null && res.error.message.includes('PAIEMENT_APPLI_ETRANGERE')) {
    return { issue: 'refuse', raison: `appli introuvable pour ce compte (${r.app})` }
  }
  if (res.error !== null) return { issue: 'erreur', raison: res.error.message }
  const statut = (res.data as { statut?: string } | null)?.statut
  return { issue: statut === 'deja_enregistre' ? 'deja_enregistre' : 'enregistre', app: r.app, proprietaire: r.proprietaire, objet: r.objet }
}

/**
 * L'AVIS, TRAITÉ PUIS ÉCRIT AU JOURNAL (2026-11-23) — demande, avis reçu,
 * décision, raison, lisibles dans /admin. Un avis PAYÉ mais refusé chez nous
 * (prix monté, montant insuffisant, appli introuvable) déclenche une alerte —
 * trace ET courriel au fondateur — et devient activable à la main.
 *
 * Le journal ne décide RIEN : un journal illisible n'empêche ni n'annule une
 * activation, il se dit dans les journaux du serveur.
 */
export async function traiterEtNoterAvis(
  avis: AvisVerifie,
  fournisseur: string,
  o: { readonly registre?: RegistreDemandes; readonly alerte?: typeof alerter; readonly reelPermis?: (proprietaire: string) => Promise<boolean>; readonly tarif?: () => ReturnType<typeof lireTarifMobileMoney> } = {},
): Promise<IssueAvis> {
  const issue = await traiterAvis(avis, fournisseur, o)
  const e = avis.encaissement
  if (e === null) return issue
  const etat: EtatDemande | null =
    issue.issue === 'refuse' ? 'refusee'
      : issue.issue === 'erreur' ? null // le prestataire redonnera l'avis : rien n'est clos
        : e.etat === 'reussi' ? 'reussie'
          : e.etat === 'echoue' ? 'echouee'
            : e.etat === 'expire' ? 'expiree' : null
  const raison = 'raison' in issue ? issue.raison : null
  if (etat !== null) {
    await (o.registre ?? registreDemandes).noterAvis({
      fournisseur, reference: e.id, etat, decision: issue.issue, raison, test: e.test,
      ...(e.rattachement === null ? {} : { connu: { app: e.rattachement.app, proprietaire: e.rattachement.proprietaire, operateur: e.operateur ?? '?', montant: e.montant } }),
    }).catch((x: unknown) => { console.error('[mobile-money] journal non écrit', e.id, x instanceof Error ? x.message : x) })
  }
  if (issue.issue === 'refuse' && e.etat === 'reussi') {
    await (o.alerte ?? alerter)({
      sujet: 'oeuvre', sujetId: e.rattachement?.app ?? null, etape: 'paiement',
      motif: `Paiement mobile money REÇU mais non activé : ${issue.raison}`,
      detail: `${fournisseur} ${e.id} · ${String(e.montant)} ${e.devise} · ${e.test ? 'TEST' : 'RÉEL'} — à activer à la main dans /admin/mobile-money si le paiement est bon.`,
    }).catch(() => undefined)
  }
  return issue
}
