/**
 * LE JUGE DE DEVISE — l'argent parle la devise du client, aucune autre.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-31 (tir eb7b62b5).
 *
 * Plateforme à base tchadienne, devise demandée au pré-vol, validée par
 * EP-293 — et le code livré affichait 10× EUR, 8× €, zéro FCFA. EP-296 a
 * cousu la configuration jusqu'au modèle ; ce juge VÉRIFIE que le code
 * produit l'a entendue. Une instruction sans contrôle est un vœu.
 *
 * ── CE QU'IL JUGE : les MARQUES monétaires visibles (symboles collés à des
 * nombres, codes ISO en mot entier, noms de monnaie courants). Il ne juge
 * que si une devise est CONFIGURÉE — sans configuration, rien à exiger.
 * Le `$` n'est compté qu'adjacent à un chiffre : `${...}` est du gabarit
 * TypeScript, pas un prix.
 */

export type DefautDevise = {
  readonly fichier: string
  readonly marque: string
  readonly occurrences: number
}

/** Ce qu'une devise configurée AUTORISE à l'écran : son code et ses noms. */
const MARQUES_PAR_DEVISE: Readonly<Record<string, readonly string[]>> = {
  XAF: ['XAF', 'FCFA', 'F CFA'],
  XOF: ['XOF', 'FCFA', 'F CFA'],
  EUR: ['EUR', '€'],
  USD: ['USD', '$'],
  GBP: ['GBP', '£'],
  NGN: ['NGN', '₦'],
  MAD: ['MAD', 'DH'],
}

/** Les marques étrangères qu'on sait reconnaître dans un texte rendu. */
const DETECTEURS: readonly (readonly [string, RegExp])[] = [
  ['€', /€/gu],
  ['£', /£/gu],
  ['₦', /₦/gu],
  ['$', /(?:\d\s?\$|\$\s?\d)/gu],
  ['EUR', /\bEUR\b/gu],
  ['USD', /\bUSD\b/gu],
  ['GBP', /\bGBP\b/gu],
  ['FCFA', /\bF\s?CFA\b/gu],
  ['XAF', /\bXAF\b/gu],
  ['XOF', /\bXOF\b/gu],
]

export function jugerDevise(
  fichiers: ReadonlyMap<string, string>,
  deviseConfiguree: string | undefined,
): DefautDevise[] {
  const devise = (deviseConfiguree ?? '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(devise)) return []
  const permises = new Set(
    [devise, ...(MARQUES_PAR_DEVISE[devise] ?? [])].map((m) => m.toUpperCase()),
  )
  const defauts: DefautDevise[] = []
  for (const [fichier, source] of fichiers) {
    if (!/\.(tsx|ts|jsx|md)$/u.test(fichier)) continue
    // Le préfixe systeme/ est à Deribfy et PURGÉ des écrits du modèle par la
    // boucle : nos gabarits (« 0 ${ESPACE.m}px ») ne sont pas des prix.
    if (fichier.startsWith('systeme/')) continue
    for (const [marque, motif] of DETECTEURS) {
      if (permises.has(marque.toUpperCase())) continue
      motif.lastIndex = 0
      let n = 0
      while (motif.exec(source) !== null) n += 1
      if (n > 0) defauts.push({ fichier, marque, occurrences: n })
    }
  }
  return defauts
}

/** La marque à afficher pour une devise — ce que le reproche recommande. */
export function marqueRecommandee(devise: string): string {
  return MARQUES_PAR_DEVISE[devise.toUpperCase()]?.[1] ?? devise.toUpperCase()
}
