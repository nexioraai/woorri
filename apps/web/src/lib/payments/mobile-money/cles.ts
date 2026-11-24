/**
 * LES CLÉS MONERAILS, VUES PAR LEUR PRÉFIXE SEUL (2026-11-24).
 *
 * Vercel ne rend jamais la valeur d'une variable « Secret » (la CLI tire un
 * marqueur commun) : le seul endroit où l'on peut savoir si la bonne clé est
 * posée, c'est le serveur qui la lit. `etatDesCles` ne renvoie QUE deux
 * booléens — jamais une longueur, jamais un caractère de la clé — et la route
 * qui les expose est réservée au fondateur.
 *
 * Ce module ne lit pas `process.env` lui-même : l'environnement lui est passé,
 * pour que la page (côté client) puisse importer `ligneCle` sans rien embarquer.
 */
export const PREFIXE_CLE = { test: 'mr_test_', live: 'mr_live_' } as const
export const VARIABLE_CLE_PAR_COTE = { test: 'MONERAILS_CLE_TEST', live: 'MONERAILS_CLE_LIVE' } as const

export type EtatDesCles = { readonly test: boolean; readonly live: boolean }

const porte = (valeur: string | undefined, prefixe: string): boolean => {
  const v = (valeur ?? '').trim()
  return v.length > prefixe.length && v.startsWith(prefixe)
}

export function etatDesCles(env: Readonly<Record<string, string | undefined>>): EtatDesCles {
  return {
    test: porte(env[VARIABLE_CLE_PAR_COTE.test], PREFIXE_CLE.test),
    live: porte(env[VARIABLE_CLE_PAR_COTE.live], PREFIXE_CLE.live),
  }
}

/** « clé test : préfixe mr_test_ ✓ » — la ligne affichée dans /admin/mobile-money. */
export function ligneCle(cote: keyof typeof PREFIXE_CLE, ok: boolean): string {
  return `clé ${cote} : préfixe ${PREFIXE_CLE[cote]} ${ok ? '✓' : '✗'}`
}
