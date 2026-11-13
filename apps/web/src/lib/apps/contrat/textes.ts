/**
 * APPELÉ PAR LES TESTS, PAR CONSTRUCTION — jusqu’à l’étape 4 (EP-365) : branché par l’étape 4.
 *
 * LES CLÉS DE TEXTE SONT À DERIBFY.
 *
 * Le modèle écrit chaque texte EN CLAIR, dans la langue principale. Deribfy
 * en fabrique la clé — DÉTERMINISTE, depuis la route de l'écran et
 * l'emplacement du texte dans l'écran — et le dictionnaire. Une clé mal
 * formée ne peut donc plus exister : mesuré au jeu aveugle (A1), 16 écrans
 * sur 24 étaient refusés pour des clés, sans aucun défaut d'écran derrière.
 *
 *   route `ecran-public`, texte à `corps[2].enfants[0].libelle`
 *     → `ecranPublic.corps2.enfants0.libelle`
 *
 * Limite, dite : la clé suit l'EMPLACEMENT. Insérer un composant avant un
 * texte en change la clé ; la traduction de l'ancienne clé devient orpheline
 * et la nouvelle est réclamée (TRADUCTION_MANQUANTE). C'est le prix d'une
 * clé que personne n'écrit.
 */
import { COMPOSANTS, MOTIF, PROPS_COMMUNES } from './catalogue'

const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Un segment de clé : une lettre minuscule d'abord, puis lettres et chiffres. */
function segment(x: string): string {
  const parts = x.normalize('NFD').replace(/[̀-ͯ]/gu, '').split(/[^A-Za-z0-9]+/u).filter((p) => p !== '')
  const camel = parts.map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1))).join('')
  if (camel === '') return 'x'
  return /^[a-z]/u.test(camel) ? camel : `e${camel}`
}

/** La clé d'un texte : la route, puis le chemin de l'emplacement (`corps[2].libelle` → `corps2.libelle`). */
export function cleDe(route: string, chemin: string): string {
  const morceaux = chemin.replace(/\[(\d+)\]/gu, '$1').split('.').filter((m) => m !== '')
  const cle = [segment(route), ...morceaux.map(segment)].join('.')
  if (!MOTIF.cle.test(cle)) throw new Error(`clé fabriquée invalide : ${cle}`)
  return cle
}

export type TexteDeSpec = { readonly cle: string; readonly chemin: string; readonly texte: string }

/** Les props de genre « texte », par composant (lues dans le catalogue). */
const PROPS_TEXTE = new Map(Object.entries(COMPOSANTS).map(([nom, def]) => [nom, Object.entries({ ...def.props, ...PROPS_COMMUNES }).filter(([, d]) => d.genre.g === 'texte').map(([k]) => k)]))

/** Tous les textes d'un écran, avec leur clé fabriquée. Les emplacements non textuels ne sont pas lus. */
export function textesDe(ecran: unknown): TexteDeSpec[] {
  if (!estObjet(ecran)) return []
  const route = typeof ecran.route === 'string' ? ecran.route : 'ecran'
  const r: TexteDeSpec[] = []
  const noter = (chemin: string, v: unknown) => { if (typeof v === 'string') r.push({ cle: cleDe(route, chemin), chemin, texte: v }) }
  noter('titre', ecran.titre)
  const parcourir = (n: unknown, chemin: string) => {
    if (!estObjet(n)) return
    for (const k of PROPS_TEXTE.get(String(n.composant)) ?? []) noter(`${chemin}.${k}`, n[k])
    if (Array.isArray(n.choix)) n.choix.forEach((o, i) => { if (estObjet(o)) noter(`${chemin}.choix[${String(i)}].libelle`, o.libelle) })
    for (const k of ['enfants', 'modele']) if (Array.isArray(n[k])) (n[k] as unknown[]).forEach((m, i) => { parcourir(m, `${chemin}.${k}[${String(i)}]`) })
  }
  if (Array.isArray(ecran.corps)) ecran.corps.forEach((n, i) => { parcourir(n, `corps[${String(i)}]`) })
  return r
}

/** Le dictionnaire de la langue principale : clé → texte. */
export function dictionnaire(ecrans: readonly unknown[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const e of ecrans) for (const t of textesDe(e)) m.set(t.cle, t.texte)
  return m
}
