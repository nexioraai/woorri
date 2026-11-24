/**
 * LES FRAIS MOBILE MONEY, PAYÉS PAR LE CLIENT (2026-11-21 ; UN SEUL PRIX le 2026-11-23).
 *
 * ── UN SEUL PRIX (décision du propriétaire, 2026-11-23). Le même pour Airtel
 * et Moov, calculé avec le taux d'encaissement le PLUS ÉLEVÉ des deux, et
 * un RETRAIT (sortie de l'argent du solde MoneRails, 4 %) en plus :
 *
 *   prix ÷ (1 − retrait) × (1 + reversement) ÷ (1 − encaissement le plus haut),
 *   arrondi à la centaine SUPÉRIEURE.
 *
 *   12 000 → 14 000 · 9 000 → 10 500 · 6 000 → 7 000 (Airtel 7 %, reversement
 *   3,5 %, retrait 4 %). Le client ne voit qu'UN montant : ni « frais », ni
 *   pourcentage, ni différence entre opérateurs (ce fichier ne rend rien
 *   d'autre à l'écran que `total`).
 *
 * Décision du propriétaire : il ne reçoit JAMAIS moins que le prix mensuel net
 * (12 000 FCFA). Le client paie les frais du prestataire — à l'encaissement
 * (retranchés par MoneRails : solde = montant − frais) ET au reversement
 * (ajoutés : solde débité = reversé + frais) ET au retrait (2026-11-23).
 * Jusqu'au 2026-11-23, un total PAR opérateur (13 400 Airtel, 13 100 Moov),
 * sans le retrait : remplacé par le prix unique ci-dessus.
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
export const CLE_FRAIS_RETRAIT = 'frais_retrait_pct'
export const CLE_ARRONDI = 'arrondi_frais_xaf'
export const CLES_TARIF = [CLE_PRIX, CLE_FRAIS_AIRTEL, CLE_FRAIS_MOOV, CLE_FRAIS_REVERSEMENT, CLE_FRAIS_RETRAIT, CLE_ARRONDI] as const

/** Dite au client : un seul prix, donc jamais le mot « frais » (2026-11-23). */
export const PHRASE_FRAIS_NON_REGLES =
  'Le paiement mobile money est indisponible pour le moment. Aucun montant n’est demandé.'

/** Les taux, en points de base (7 % = 700), et le prix net à garantir. */
export type Tarif = {
  readonly prix: number
  readonly airtelBp: number
  readonly moovBp: number
  readonly reversementBp: number
  readonly retraitBp: number
  readonly arrondi: number
}

/**
 * Le prix, et sa part frais — pour le REGISTRE et l'admin seulement. Le
 * client ne reçoit que `total` (voir `prixClient`).
 */
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
  const retraitBp = pointsDeBase(v[CLE_FRAIS_RETRAIT])
  const manque = [
    prix > 0 ? null : CLE_PRIX,
    airtelBp === null ? CLE_FRAIS_AIRTEL : null,
    moovBp === null ? CLE_FRAIS_MOOV : null,
    reversementBp === null ? CLE_FRAIS_REVERSEMENT : null,
    retraitBp === null ? CLE_FRAIS_RETRAIT : null,
    arrondi >= 1 && arrondi <= 10_000 ? null : CLE_ARRONDI,
  ].filter((c): c is string => c !== null)
  if (manque.length > 0 || airtelBp === null || moovBp === null || reversementBp === null || retraitBp === null) return { ok: false, manque }
  return { ok: true, tarif: { prix, airtelBp, moovBp, reversementBp, retraitBp, arrondi } }
}

/**
 * total = ⌈ prix × 10 000 × (10 000 + reversement) ÷ ((10 000 − retrait) × (10 000 − encaissement) × arrondi) ⌉ × arrondi
 * En ENTIERS : l'arrondi va TOUJOURS vers le haut ; ce qui reste après
 * l'encaissement, le reversement et le retrait ne passe jamais sous le prix.
 */
export function totalUnique(prix: number, encaissementBp: number, reversementBp: number, retraitBp: number, arrondi: number): number {
  const numerateur = prix * 10_000 * (10_000 + reversementBp)
  const diviseur = (10_000 - retraitBp) * (10_000 - encaissementBp) * arrondi
  // < 2^53 : prix ≤ 10^7 → numérateur ≤ 2·10^15.
  return Math.floor((numerateur + diviseur - 1) / diviseur) * arrondi
}

/** Le taux d'encaissement retenu : le PLUS ÉLEVÉ des opérateurs proposés. */
export function encaissementRetenuBp(t: Tarif): number {
  return Math.max(t.airtelBp, t.moovBp)
}

/** Un opérateur proposé ? Seuls ceux dont le taux est réglé (Airtel, Moov). */
export function operateurPropose(operateur: string): boolean {
  return /AIRTEL|MOOV/iu.test(operateur)
}

/**
 * LE prix mobile money, le même pour tout opérateur. `prixNet` : le prix du
 * produit (par défaut, le mois d'application `prix_mensuel_xaf`).
 */
export function prixMobileMoney(t: Tarif, prixNet: number = t.prix): Prix {
  const total = totalUnique(prixNet, encaissementRetenuBp(t), t.reversementBp, t.retraitBp, t.arrondi)
  return { prix: prixNet, frais: total - prixNet, total }
}
