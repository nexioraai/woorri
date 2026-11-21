/**
 * LES FRAIS MOBILE MONEY, PAYÉS PAR LE CLIENT (2026-11-21).
 *
 * Décision du propriétaire : il ne reçoit JAMAIS moins que le prix mensuel net
 * (12 000 FCFA). Le client paie les frais du prestataire — à l'encaissement
 * (retranchés par MoneRails : solde = montant − frais) ET au reversement
 * (ajoutés : solde débité = reversé + frais). D'où :
 *
 *   total = arrondi au `arrondi_frais_xaf` SUPÉRIEUR de
 *           prix × (1 + reversement) ÷ (1 − encaissement)
 *
 * Taux mesurés par le propriétaire dans le tableau de bord MoneRails, MODE
 * TEST, le 2026-11-21 : encaissement Airtel 7 %, Moov 5 %, reversement 3,5 %.
 * Ils vivent dans `quota_reglages` (historisés), jamais ici.
 *
 * Calcul en ENTIERS (points de base) : aucun flottant ne peut arrondir vers le
 * bas. Fichier pur, sans import serveur : l'écran peut s'en servir.
 */

export const CLE_PRIX = 'prix_mensuel_xaf'
export const CLE_FRAIS_AIRTEL = 'frais_encaissement_airtel_pct'
export const CLE_FRAIS_MOOV = 'frais_encaissement_moov_pct'
export const CLE_FRAIS_REVERSEMENT = 'frais_reversement_pct'
export const CLE_ARRONDI = 'arrondi_frais_xaf'
export const CLES_TARIF = [CLE_PRIX, CLE_FRAIS_AIRTEL, CLE_FRAIS_MOOV, CLE_FRAIS_REVERSEMENT, CLE_ARRONDI] as const

export const PHRASE_FRAIS_NON_REGLES =
  'Le paiement mobile money est indisponible pour le moment : son prix ou ses frais ne sont pas réglés. Aucun montant n’est demandé.'

/** Les taux, en points de base (7 % = 700), et le prix net à garantir. */
export type Tarif = {
  readonly prix: number
  readonly airtelBp: number
  readonly moovBp: number
  readonly reversementBp: number
  readonly arrondi: number
}

/** Ce que le client voit pour un opérateur, avant de payer. */
export type Prix = { readonly prix: number; readonly frais: number; readonly total: number }

/** « 7 », « 3.5 », « 3,5 » → points de base ; vide, négatif, ≥ 100 ou illisible → null. */
export function pointsDeBase(v: string | undefined): number | null {
  const s = (v ?? '').trim().replace(',', '.')
  const m = /^([0-9]{1,2})(?:\.([0-9]{1,2}))?$/u.exec(s)
  if (m === null) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

/**
 * Les réglages lus → un tarif, ou la liste de ce qui manque. TOUT ou RIEN :
 * un seul réglage vide ou illisible, et aucun paiement n'est proposé — jamais
 * un montant sans frais.
 */
export function tarifDepuisReglages(v: Readonly<Record<string, string | undefined>>): { ok: true; tarif: Tarif } | { ok: false; manque: string[] } {
  const prix = /^[0-9]+$/u.test((v[CLE_PRIX] ?? '').trim()) ? Number((v[CLE_PRIX] ?? '').trim()) : 0
  const arrondi = /^[0-9]+$/u.test((v[CLE_ARRONDI] ?? '').trim()) ? Number((v[CLE_ARRONDI] ?? '').trim()) : 0
  const airtelBp = pointsDeBase(v[CLE_FRAIS_AIRTEL])
  const moovBp = pointsDeBase(v[CLE_FRAIS_MOOV])
  const reversementBp = pointsDeBase(v[CLE_FRAIS_REVERSEMENT])
  const manque = [
    prix > 0 ? null : CLE_PRIX,
    airtelBp === null ? CLE_FRAIS_AIRTEL : null,
    moovBp === null ? CLE_FRAIS_MOOV : null,
    reversementBp === null ? CLE_FRAIS_REVERSEMENT : null,
    arrondi >= 1 && arrondi <= 10_000 ? null : CLE_ARRONDI,
  ].filter((c): c is string => c !== null)
  if (manque.length > 0 || airtelBp === null || moovBp === null || reversementBp === null) return { ok: false, manque }
  return { ok: true, tarif: { prix, airtelBp, moovBp, reversementBp, arrondi } }
}

/**
 * total = ⌈ prix × (10 000 + reversement) ÷ ((10 000 − encaissement) × arrondi) ⌉ × arrondi
 * En entiers : l'arrondi va TOUJOURS vers le haut, le net ne passe jamais sous le prix.
 */
export function totalAvecFrais(prix: number, encaissementBp: number, reversementBp: number, arrondi: number): number {
  const numerateur = prix * (10_000 + reversementBp)
  const diviseur = (10_000 - encaissementBp) * arrondi
  // Division entière arrondie vers le haut, exacte (tout est entier, < 2^53).
  return Math.floor((numerateur + diviseur - 1) / diviseur) * arrondi
}

/** Le taux d'encaissement d'un opérateur, reconnu par son code (« AIRTEL », « MOOV »…). */
export function encaissementBp(t: Tarif, operateur: string): number | null {
  if (/AIRTEL/iu.test(operateur)) return t.airtelBp
  if (/MOOV/iu.test(operateur)) return t.moovBp
  return null
}

/** Prix, frais et total pour un opérateur ; `null` = opérateur sans taux réglé (pas proposé). */
export function prixPour(t: Tarif, operateur: string): Prix | null {
  const bp = encaissementBp(t, operateur)
  if (bp === null) return null
  const total = totalAvecFrais(t.prix, bp, t.reversementBp, t.arrondi)
  return { prix: t.prix, frais: total - t.prix, total }
}
