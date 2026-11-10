// ============================================================================
// LOT 16 — CE QUE L'ASSISTANT A LE DROIT DE LIRE.
//
// ── UNIQUEMENT LE CONTENU PUBLIÉ.
//
// Les pages (`site_pages_public`) et les avis (`appels_offres_public`) : deux
// VUES PUBLIQUES, lues avec la clé anonyme. L'assistant ne voit rien de ce
// qu'un visiteur ne verrait pas déjà — ni offres, ni comptes, ni demandes.
// Lire avec la clé de service aurait mis un secret à portée d'une question
// bien tournée.
//
// ── UN BUDGET, PAS TOUT LE SITE.
//
// Chiffré avant d'écrire : 8 000 jetons d'entrée au plus. Mesuré le
// 2026-11-10 : les 32 pages de la CPA pèsent ≈ 12 700 jetons en brut. On
// classe les pages par proximité avec la question et on s'arrête au budget.
// ============================================================================

export type Fragment = { chemin: string; titre: string; texte: string }

/** ≈ 4 caractères par jeton : 8 000 jetons, moins la marge des consignes. */
export const BUDGET_CARACTERES = 26_000

/** Tout le texte lisible d'une valeur JSON — jamais les adresses ni les clés techniques. */
export function texteDe(v: unknown): string {
  if (typeof v === 'string') return /^(https?:|\/|data:)/.test(v) ? '' : v
  if (Array.isArray(v)) return v.map(texteDe).filter(Boolean).join(' ')
  if (v && typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !['type', 'url', 'src', 'logo', 'image', 'position', 'cle'].includes(k))
      .map(([, x]) => texteDe(x)).filter(Boolean).join(' ')
  }
  return ''
}

const mots = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/[a-z0-9]{3,}/g) ?? []

/**
 * Les fragments les plus proches de la question, dans le budget.
 *
 * Une proximité grossière — des mots en commun — et c'est voulu : elle se
 * relit, elle se teste, et elle ne coûte rien. Le modèle fait le reste.
 */
export function choisir(fragments: Fragment[], question: string, budget = BUDGET_CARACTERES): Fragment[] {
  const q = new Set(mots(question))
  const notes = fragments.map((f, i) => {
    const m = mots(`${f.titre} ${f.texte}`)
    let n = 0
    for (const x of m) if (q.has(x)) n++
    // Un mot de la question dans le TITRE compte triple.
    for (const x of mots(f.titre)) if (q.has(x)) n += 2
    return { f, n, i }
  })
  notes.sort((a, b) => b.n - a.n || a.i - b.i)
  const out: Fragment[] = []
  let total = 0
  for (const { f } of notes) {
    const cout = f.titre.length + f.texte.length + f.chemin.length + 20
    if (total + cout > budget) continue
    out.push(f); total += cout
  }
  return out
}
