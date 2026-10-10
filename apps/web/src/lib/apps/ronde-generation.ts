/**
 * LE RUNNER HEBERGE — SA CADENCE, PURE ET PROUVABLE SANS RIEN LANCER.
 *
 * Arbitrage du 2026-10-10 : l'appel ecrans est UN appel indivisible de
 * 15-30 min — le serverless ne le portera jamais (300-800 s, beta 1800 s
 * trop juste). Le porteur reel est un petit service heberge qui boucle
 * `tourner()` avec le code EXISTANT. Ici ne vivent que ses DECISIONS :
 * combien dormir, quand s'arreter, quels secrets exiger — injectables,
 * donc prouvees a 0 $. La garantie de depense reste `tournerUneTranche`
 * (GO_EMISSION_IA verifie AVANT tout, preuve par comptage existante).
 */
import type { RapportTranche } from './travailleur'

export type IssueRonde = { desarme: boolean; rapports: readonly RapportTranche[] }

/** Desarme : on dort LONG (60 s) — zero appel, zero lecture. Rien a saisir :
 *  court (15 s). Du travail vient d'etre fait : on enchaine SANS dormir —
 *  la ligne suspendue est a reprendre tout de suite. */
export function prochaineAttenteMs(r: IssueRonde): number {
  if (r.desarme) return 60_000
  const premier = r.rapports[0]
  if (premier === undefined || premier.issue === 'rien') return 15_000
  return 0
}

/** Les secrets exiges au DEMARRAGE — absents, le runner refuse en les
 *  NOMMANT (fail-closed, jamais un crash-loop muet). GO_EMISSION_IA n'en
 *  fait pas partie : absent = desarme, c'est l'etat de livraison. */
export function secretsManquants(env: Record<string, string | undefined>): string[] {
  return ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY'].filter(
    (n) => env[n] === undefined || env[n] === '',
  )
}

/**
 * La boucle, tout injecte : `tranche` fait UNE ronde (le vrai runner y met
 * tournerUneTranche), `dormir` attend, `continuer` decide (SIGTERM la rend
 * fausse — l'arret est TOUJOURS entre deux tranches ; un kill en pleine
 * tranche retombe sur le chemin de reprise concu : battement perime,
 * re-saisie, rien de perdu).
 */
export async function executerRondes({
  tranche,
  dormir,
  continuer,
}: {
  tranche: () => Promise<IssueRonde>
  dormir: (ms: number) => Promise<void>
  continuer: () => boolean
}): Promise<number> {
  let rondes = 0
  while (continuer()) {
    const r = await tranche()
    rondes += 1
    const ms = prochaineAttenteMs(r)
    if (ms > 0 && continuer()) await dormir(ms)
  }
  return rondes
}

/**
 * LE PLAFOND DE DÉPENSE D'UNE LIGNE — borné À TRAVERS LES TRANCHES.
 *
 * ── LE TROU QUE CECI FERME, trouvé AVANT de dépenser (2026-10-10).
 *
 * Le cœur scellé porte DEUX gardes éprouvées : `assertPeutAppeler` refuse
 * AVANT un appel dont le coût maximal estimé franchirait le plafond, et
 * `assertNonDepasse` recompte APRÈS. Mais `creerMoteur` reçoit ce plafond
 * par `plafondUsd`, dont le défaut est `Infinity` — et le runner ne le
 * passait pas. Un runner sans frein de coût, c'est exactement ce qu'on ne
 * veut pas.
 *
 * ── POURQUOI UN CALCUL, ET PAS UNE CONSTANTE.
 *
 * `etatDepense` est PAR PROCESSUS, et le runner crée un moteur neuf à
 * chaque tranche : un plafond constant de 12 $ laisserait passer trois
 * tranches de 5 $. Le plafond de la TRANCHE est donc ce qui RESTE à la
 * ligne — et le coût déjà dépensé voyage déjà dans `etat.coutUsd`, donc
 * aucune plomberie nouvelle. À zéro restant, le plafond vaut 0 : la garde
 * du cœur refuse le premier appel, avant de le payer.
 */
export function plafondDeLaTranche(
  plafondLigne: number,
  etat: unknown,
): number {
  const dejaDepense = Number(
    (etat as { coutUsd?: unknown } | null | undefined)?.coutUsd ?? 0,
  )
  const reste = plafondLigne - (Number.isFinite(dejaDepense) ? dejaDepense : 0)
  return reste > 0 ? reste : 0
}

/** Le plafond par ligne, lu de l'environnement. ABSENT = AUCUN plafond —
 *  et c'est dit, jamais supposé : un réglage manquant ne doit pas se
 *  déguiser en garantie. */
export function plafondParLigne(env: Record<string, string | undefined>): number {
  const brut = env.PLAFOND_USD_PAR_LIGNE
  if (brut === undefined || brut.trim() === '') return Number.POSITIVE_INFINITY
  const n = Number(brut)
  return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY
}
