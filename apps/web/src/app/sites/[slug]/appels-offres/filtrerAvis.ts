import { etatVisible, type EtatVisible, type AvisCycle } from './cycleDeVie'

// ============================================================
// LOT 5 — LE FILTRE DES AVIS.
//
// POURQUOI IL EST SÉPARÉ DE L'ÉCRAN. Le filtre se décide sur l'état
// VISIBLE, pas sur `etat` en base : un avis « ouvert » dont l'échéance est
// passée doit se ranger dans « clos », sinon un fournisseur croit pouvoir
// encore répondre. Filtrer sur la colonne brute aurait l'air de marcher et
// mentirait exactement sur le cas qui compte.
//
// ET IL N'INVENTE AUCUN ÉTAT. Un état inconnu de la base n'est pas avalé :
// il reste dans « tous » et paraît tel quel. Si la base gagnait un cinquième
// état, l'écran le montrerait au lieu de le faire disparaître.
// ============================================================

export const FILTRES = ['tous', 'ouvert', 'clos', 'attribue', 'preparation'] as const
export type Filtre = (typeof FILTRES)[number]

/** Lit le paramètre d'adresse. Tout ce qui n'est pas un filtre connu → `tous`. */
export function lireFiltre(brut: unknown): Filtre {
  const v = typeof brut === 'string' ? brut : Array.isArray(brut) ? brut[0] : undefined
  return (FILTRES as readonly string[]).includes(v ?? '') ? (v as Filtre) : 'tous'
}

/** Combien d'avis dans chaque case, états VISIBLES. Les comptes ne mentent pas à zéro. */
export function compter<T extends AvisCycle>(avis: T[], maintenant: Date): Record<Filtre, number> {
  const n: Record<Filtre, number> = { tous: avis.length, ouvert: 0, clos: 0, attribue: 0, preparation: 0 }
  for (const a of avis) {
    const e = etatVisible(a, maintenant) as EtatVisible
    if (e in n) n[e as Exclude<Filtre, 'tous'>] += 1
  }
  return n
}

/** Les avis à montrer. `tous` rend TOUT, y compris un état inconnu. */
export function filtrer<T extends AvisCycle>(avis: T[], filtre: Filtre, maintenant: Date): T[] {
  if (filtre === 'tous') return avis
  return avis.filter((a) => etatVisible(a, maintenant) === filtre)
}
