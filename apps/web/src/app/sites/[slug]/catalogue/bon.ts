// ============================================================================
// LE BON DE COMMANDE EN PRÉPARATION (CPA, 2026-11-20).
//
// Comme sur les portails des centrales qui servent des centaines de structures
// (KEMSA au Kenya : le centre de santé remplit un bon de PLUSIEURS lignes, puis
// l'envoie une fois), le visiteur ajoute des produits depuis le catalogue et
// les fiches ; le bon se garde dans CE navigateur seulement, puis s'envoie
// depuis « Mes commandes » où toutes les lignes arrivent déjà remplies.
//
// Ce n'est PAS une commande : rien ne part tant que le client connecté ne l'a
// pas envoyé. Aucun prix, aucun paiement. Le stockage du navigateur peut être
// refusé (navigation privée) : chaque accès est protégé, et la page marche
// sans lui — seul le bon ne se garde pas.
// ============================================================================

export type LigneBon = { reference: string; designation: string; quantite: number; unite: string }

const MAX_LIGNES = 50
const MAX_QTE = 1_000_000
const EVT = 'bon-commande-change'
const cle = (slug: string) => `bon-commande:${slug}`

function propre(v: unknown): LigneBon[] {
  if (!Array.isArray(v)) return []
  const out: LigneBon[] = []
  for (const x of v) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const designation = typeof o.designation === 'string' ? o.designation.trim().slice(0, 300) : ''
    const reference = typeof o.reference === 'string' ? o.reference.slice(0, 80) : ''
    const quantite = Math.floor(Number(o.quantite))
    const unite = typeof o.unite === 'string' ? o.unite.trim().slice(0, 40) : ''
    if (!designation || !Number.isFinite(quantite) || quantite < 1) continue
    out.push({ reference, designation, quantite: Math.min(MAX_QTE, quantite), unite })
    if (out.length >= MAX_LIGNES) break
  }
  return out
}

/** La valeur brute (chaîne) : stable entre deux lectures, donc utilisable
 *  telle quelle comme instantané de `useSyncExternalStore`. */
export function lireBrut(slug: string): string {
  try { return window.localStorage.getItem(cle(slug)) ?? '[]' } catch { return '[]' }
}

export function lignesDe(brut: string): LigneBon[] {
  try { return propre(JSON.parse(brut)) } catch { return [] }
}

function ecrire(slug: string, lignes: LigneBon[]) {
  try {
    if (lignes.length === 0) window.localStorage.removeItem(cle(slug))
    else window.localStorage.setItem(cle(slug), JSON.stringify(propre(lignes)))
  } catch { /* stockage refusé : le bon ne se garde pas, la page continue */ }
  try { window.dispatchEvent(new Event(EVT)) } catch { /* rien */ }
}

export function abonner(rappel: () => void): () => void {
  window.addEventListener(EVT, rappel)
  window.addEventListener('storage', rappel)
  return () => { window.removeEventListener(EVT, rappel); window.removeEventListener('storage', rappel) }
}

/** Ajoute (ou cumule, si la référence y est déjà). */
export function ajouter(slug: string, l: LigneBon) {
  const lignes = lignesDe(lireBrut(slug))
  const i = lignes.findIndex((x) => (l.reference ? x.reference === l.reference : x.designation === l.designation))
  if (i >= 0) lignes[i] = { ...lignes[i], quantite: Math.min(MAX_QTE, lignes[i].quantite + l.quantite) }
  else lignes.push(l)
  ecrire(slug, lignes)
}

export function changerQuantite(slug: string, reference: string, quantite: number) {
  const q = Math.max(1, Math.min(MAX_QTE, Math.floor(quantite) || 1))
  ecrire(slug, lignesDe(lireBrut(slug)).map((x) => (x.reference === reference ? { ...x, quantite: q } : x)))
}

export function retirer(slug: string, reference: string) {
  ecrire(slug, lignesDe(lireBrut(slug)).filter((x) => x.reference !== reference))
}

export function vider(slug: string) { ecrire(slug, []) }

/** L'adresse de « Mes commandes » avec toutes les lignes : `?l=désignation|qté|unité`. */
export function lienEnvoi(base: string, lignes: LigneBon[]): string {
  const q = new URLSearchParams()
  for (const l of lignes) q.append('l', `${l.designation.replace(/\|/g, '/')}|${l.quantite}|${l.unite.replace(/\|/g, '/')}`)
  q.set('depuis', 'bon')
  return `${base}/mes-commandes?${q}#nouvelle`
}

/** Lecture côté serveur de `?l=` (même format), bornée. */
export function lireLignesAdresse(v: string | string[] | undefined): { designation: string; quantite: string; unite: string }[] {
  const brut = Array.isArray(v) ? v : typeof v === 'string' ? [v] : []
  const out: { designation: string; quantite: string; unite: string }[] = []
  for (const s of brut.slice(0, MAX_LIGNES)) {
    const [d = '', q = '', u = ''] = s.split('|')
    const designation = d.trim().slice(0, 300)
    if (!designation) continue
    out.push({ designation, quantite: /^\d{1,7}$/.test(q) ? q : '', unite: u.trim().slice(0, 40) })
  }
  return out
}

/** L'unité de commande déduite du conditionnement (« Boîte de 100… » → « boîtes »). */
export function uniteDe(conditionnement: string | null | undefined): string {
  const u = (conditionnement ?? '').toLowerCase().match(/^(bo[iî]te|flacon|carton|ampoule|sachet|plaquette|tube|poche|kit|unit[ée])s?/)?.[1] ?? 'unités'
  return /s$|é$/.test(u) ? u : `${u}s`
}
