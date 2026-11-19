// ============================================================================
// LES CHIFFRES DU TABLEAU DE BORD (CPA, 2026-11-19) — calculs purs.
//
// Tout se calcule à partir des commandes que la route a rendues (celles du
// client, ou toutes pour la Division DDM). Aucun chiffre n'est inventé : un
// mois sans commande vaut 0, et l'écran le montre.
// ============================================================================

export type LigneStat = { designation: string; quantite: number; unite?: string | null }
export type CommandeStat = {
  id: string; reference: string; etat: string; cree_le: string
  lignes: LigneStat[]
  client?: { organisation: string | null; nom?: string | null; type_client?: string | null } | null
}

/** Les `n` derniers mois, du plus ancien au mois courant : clé AAAA-MM. */
export function derniersMois(n: number, maintenant: Date = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

const moisDe = (iso: string) => iso.slice(0, 7)

/** Combien de commandes par mois (sur les mois demandés). */
export function commandesParMois(cs: CommandeStat[], mois: string[]): number[] {
  return mois.map((m) => cs.filter((c) => moisDe(c.cree_le) === m).length)
}

/** Combien d'unités commandées par mois (somme des quantités). */
export function unitesParMois(cs: CommandeStat[], mois: string[]): number[] {
  return mois.map((m) => cs.filter((c) => moisDe(c.cree_le) === m)
    .reduce((t, c) => t + c.lignes.reduce((s, l) => s + (Number(l.quantite) || 0), 0), 0))
}

export const ORDRE_ETATS = ['recue', 'en_cours', 'validee', 'livree', 'annulee'] as const
export const TEINTES_ETAT: Record<string, string> = {
  recue: '#d97706', en_cours: '#2563eb', validee: '#7c3aed', livree: '#16a34a', annulee: '#9ca3af',
}

/** Le nombre de commandes par état, dans l'ordre du parcours ; les états vides sont omis. */
export function repartitionEtats(cs: CommandeStat[]): { etat: string; n: number }[] {
  return ORDRE_ETATS.map((etat) => ({ etat, n: cs.filter((c) => c.etat === etat).length })).filter((x) => x.n > 0)
}

/** Les produits les plus demandés (par quantité totale), désignations rapprochées sans casse ni espaces doublés. */
export function produitsLesPlusCommandes(cs: CommandeStat[], n = 5): { nom: string; quantite: number; unite: string | null }[] {
  const m = new Map<string, { nom: string; quantite: number; unite: string | null }>()
  for (const c of cs) {
    if (c.etat === 'annulee') continue
    for (const l of c.lignes) {
      const cle = l.designation.trim().replace(/\s+/g, ' ').toLowerCase()
      const e = m.get(cle) ?? { nom: l.designation.trim(), quantite: 0, unite: l.unite ?? null }
      e.quantite += Number(l.quantite) || 0
      m.set(cle, e)
    }
  }
  return [...m.values()].sort((a, b) => b.quantite - a.quantite).slice(0, n)
}

/** Les clients qui commandent le plus (vue DDM). */
export function clientsLesPlusActifs(cs: CommandeStat[], n = 5): { nom: string; commandes: number }[] {
  const m = new Map<string, number>()
  for (const c of cs) {
    const nom = c.client?.organisation || c.client?.nom || '—'
    m.set(nom, (m.get(nom) ?? 0) + 1)
  }
  return [...m.entries()].map(([nom, commandes]) => ({ nom, commandes })).sort((a, b) => b.commandes - a.commandes).slice(0, n)
}

export const EN_COURS = new Set(['recue', 'en_cours', 'validee'])
