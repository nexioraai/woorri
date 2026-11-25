// ============================================================================
// LE FIL DE MESSAGES CLIENT ↔ DDM (CPA, 2026-11-19) — règles partagées.
// ============================================================================

export const MAX_MESSAGE = 4000

export type Message = { id: string; de: 'client' | 'centrale'; auteur: string | null; texte: string; cree_le: string; lu_le: string | null }

/** Le texte d'un message : non vide, borné. */
export function lireTexte(brut: unknown): { texte: string } | { erreur: string } {
  if (typeof brut !== 'string') return { erreur: 'Message illisible.' }
  const t = brut.trim()
  if (!t) return { erreur: 'Écrivez un message.' }
  if (t.length > MAX_MESSAGE) return { erreur: `Un message fait au plus ${MAX_MESSAGE} caractères.` }
  return { texte: t }
}

export const VU_MESSAGE = 'id,de,auteur,texte,cree_le,lu_le'
/** CE QUE LE CLIENT REÇOIT : sans `auteur`. L'auteur côté Centrale est
 *  l'adresse de l'agent qui a répondu ; le client parle à « la Centrale »,
 *  jamais à une personne ni à un service nommé (CPA, 2026-11-25). */
export const VU_MESSAGE_CLIENT = 'id,de,texte,cree_le,lu_le'

/** Résume les fils pour la liste de la DDM : dernier message et non-lus (venus du client). */
export function resumerFils(ms: { compte_id: string; de: string; texte: string; cree_le: string; lu_le: string | null }[]) {
  const r = new Map<string, { dernier: string; dernierLe: string; dernierDe: string; nonLus: number }>()
  for (const m of ms) {
    const e = r.get(m.compte_id) ?? { dernier: '', dernierLe: '', dernierDe: '', nonLus: 0 }
    if (m.cree_le >= e.dernierLe) { e.dernier = m.texte; e.dernierLe = m.cree_le; e.dernierDe = m.de }
    if (m.de === 'client' && !m.lu_le) e.nonLus++
    r.set(m.compte_id, e)
  }
  return r
}
