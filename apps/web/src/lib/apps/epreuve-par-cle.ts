import 'server-only'
/**
 * L'ÉPREUVE DE LA PAGE DE SUIVI — UN VISITEUR FRAPPE, PAR LA VRAIE API (É1, 2026-11-27).
 *
 * ── CE QU'ELLE PROUVE, ET PAR OÙ.
 *
 * Le SQL est prouvé sur base jetable (É0). Ce qui ne l'était pas : que l'API
 * publique — PostgREST, avec la clé publiable et AUCUNE session, exactement ce
 * qu'a un visiteur — tienne la même porte. Pour chaque table lue par clé :
 *
 *   ① sans clé, le visiteur LISTE la table → il doit recevoir 0 ligne ;
 *   ② avec une clé réelle (lue côté serveur, jamais rendue), il reçoit SA ligne ;
 *   ③ avec une clé inventée, il ne reçoit rien.
 *
 * ── UNE TABLE VIDE NE PROUVE RIEN, ET ÇA SE DIT.
 *
 * « 0 ligne listée » sur une table vide est vrai et sans valeur. Le verdict est
 * alors « non éprouvée », jamais « tenue » : on rééprouve après le premier colis.
 */
import { randomBytes } from 'node:crypto'
import { lectureParCleLue, nomTable, type EntiteDeclaree } from './entites-declarees'

export type VerdictParCle = 'tenue' | 'fuite' | 'non-eprouvee'

export type EpreuveTable = {
  readonly table: string
  readonly verdict: VerdictParCle
  /** Ce qui a été mesuré, en clair — aucune valeur de clé, aucune donnée. */
  readonly phrase: string
}

/** Lit en base, côté serveur (connexion de la plateforme, transaction en lecture seule). */
export type LireEnBase = (sql: string) => Promise<readonly Record<string, unknown>[]>

const IDENT = /^[a-z_][a-z0-9_]*$/u

export async function eprouverParCle(o: {
  readonly url: string
  readonly clePubliable: string
  readonly schema: string
  readonly entites: readonly EntiteDeclaree[]
  readonly lire: LireEnBase
  readonly frapper?: typeof fetch
}): Promise<readonly EpreuveTable[]> {
  const frapper = o.frapper ?? fetch
  if (!IDENT.test(o.schema)) throw new Error(`schéma au nom inattendu : ${o.schema}`)
  const entetes = (profil: 'Accept-Profile' | 'Content-Profile') => ({
    apikey: o.clePubliable,
    Authorization: `Bearer ${o.clePubliable}`,
    [profil]: o.schema,
    'Content-Type': 'application/json',
  })
  const sortie: EpreuveTable[] = []
  for (const e of o.entites) {
    if (e.lectureParCle === undefined) continue
    const t = nomTable(e)
    const lue = lectureParCleLue(e)
    if (!lue.ok || !IDENT.test(t)) {
      sortie.push({ table: t, verdict: 'non-eprouvee', phrase: `${t} : la lecture par clé ne s’ouvre pas (${lue.ok ? 'nom de table' : lue.motif}).` })
      continue
    }
    try {
      const base = await o.lire(
        `select count(*)::int as n, (select ${lue.cle} from ${o.schema}.${t} where ${lue.cle} is not null limit 1) as k from ${o.schema}.${t}`,
      )
      const n = Number(base[0]?.n ?? 0)
      const k = typeof base[0]?.k === 'string' ? (base[0].k as string) : null
      // ① LA LISTE
      const liste = await frapper(`${o.url}/rest/v1/${t}?select=${lue.colonnes.join(',')}`, {
        headers: entetes('Accept-Profile'),
        signal: AbortSignal.timeout(15_000),
      })
      const corpsListe: unknown = liste.status === 200 ? await liste.json() : null
      const listees = Array.isArray(corpsListe) ? corpsListe.length : null
      // ③ LA FAUSSE CLÉ
      const fausse = await frapper(`${o.url}/rest/v1/rpc/${t}_par_cle`, {
        method: 'POST',
        headers: entetes('Content-Profile'),
        body: JSON.stringify({ p_cle: `FAUX${randomBytes(6).toString('hex').toUpperCase()}` }),
        signal: AbortSignal.timeout(15_000),
      })
      const corpsFausse: unknown = fausse.status === 200 ? await fausse.json() : undefined
      // ② LA VRAIE CLÉ
      let vraie: 'lue' | 'absente' | 'echec' = 'absente'
      if (k !== null) {
        const r = await frapper(`${o.url}/rest/v1/rpc/${t}_par_cle`, {
          method: 'POST',
          headers: entetes('Content-Profile'),
          body: JSON.stringify({ p_cle: k }),
          signal: AbortSignal.timeout(15_000),
        })
        const c = r.status === 200 ? ((await r.json()) as Record<string, unknown> | null) : null
        vraie = c !== null && typeof c === 'object' && c[lue.cle] === k ? 'lue' : 'echec'
      }
      if ((listees ?? 0) > 0 || (corpsFausse !== null && corpsFausse !== undefined)) {
        sortie.push({ table: t, verdict: 'fuite', phrase: `${t} : FUITE — ${String(n)} en base, un visiteur sans numéro en liste ${String(listees)}${corpsFausse !== null && corpsFausse !== undefined ? ', et un faux numéro lui rend une ligne' : ''}.` })
      } else if (listees === null || corpsFausse === undefined) {
        sortie.push({ table: t, verdict: 'non-eprouvee', phrase: `${t} : l’API n’a pas répondu comme attendu (liste HTTP ${String(liste.status)}, faux numéro HTTP ${String(fausse.status)}) — rien n’est prouvé.` })
      } else if (n === 0) {
        sortie.push({ table: t, verdict: 'non-eprouvee', phrase: `${t} : vide — rien à cacher encore. Ajoutez une ligne, puis rééprouvez.` })
      } else if (vraie !== 'lue') {
        sortie.push({ table: t, verdict: 'non-eprouvee', phrase: `${t} : la liste est fermée (${String(n)} en base, 0 listée), mais un vrai numéro ne rend pas sa ligne — la page de suivi ne marcherait pas.` })
      } else {
        sortie.push({ table: t, verdict: 'tenue', phrase: `${t} : ${String(n)} en base · un visiteur sans numéro en liste 0 · avec un vrai numéro il lit sa ligne · avec un faux, rien.` })
      }
    } catch (err) {
      sortie.push({ table: t, verdict: 'non-eprouvee', phrase: `${t} : l’épreuve n’a pas abouti (${err instanceof Error ? err.message.slice(0, 120) : String(err)}).` })
    }
  }
  return sortie
}
