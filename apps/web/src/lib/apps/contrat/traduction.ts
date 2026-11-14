/**
 * V4 · BLOC 2 — B3 : LA TRADUCTION, UN APPEL PAR LANGUE LUE.
 *
 * Les textes sont écrits en clair dans la langue principale (la première lue) ;
 * leurs clés sont FABRIQUÉES par Deribfy (`textes.ts`). Pour chaque autre
 * langue lue : UN appel, réflexion coupée, qui reçoit `{ clé: texte }` et rend
 * `{ clé: traduction }` avec les MÊMES clés.
 *
 * Ce que Deribfy traduit lui-même ne part pas au modèle : les libellés des
 * gabarits et du repli, dont il porte les versions fr / en / ar.
 *
 * Une clé absente, vide ou hors contrat (HTML, plus de 600 signes) après
 * l'appel garde le texte principal ET EST COMPTÉE : la ligne dit combien de
 * textes ne sont pas traduits, et lesquels. Aucune relance : un appel par langue.
 */
import { MOTIF, type Spec } from './catalogue'
import { libellesDuGabarit } from './archetypes'
import { textesDuRepli, type AppelModele, type JetonsAppel, type PrixJetons } from './deux-passes'
import { textesDe } from './textes'

/** Plafond de sortie d'une traduction : mesuré à venir (bloc 3) ; Hayine porte quelques centaines de textes. */
export const MAX_JETONS_TRADUCTION = 32_000

export type LigneLangue = {
  readonly langue: string
  readonly cles: number
  /** Traduits par Deribfy (gabarits, repli), sans appel. */
  readonly parDeribfy: number
  readonly envoyes: number
  /** Gardés dans la langue principale : absents, vides ou hors contrat après l'appel. */
  readonly nonTraduits: readonly string[]
  readonly tronquee: boolean
  readonly jetons: JetonsAppel
  readonly cout: number
}

const NOMS_LANGUES: Readonly<Record<string, string>> = { fr: 'français', en: 'anglais', ar: 'arabe', es: 'espagnol', pt: 'portugais', de: 'allemand', it: 'italien', sw: 'swahili', ha: 'haoussa', wo: 'wolof', tr: 'turc', ru: 'russe', zh: 'chinois' }

/** Les textes de Deribfy dans la langue principale → leur version dans `cible`, quand Deribfy la porte. */
function connusDeDeribfy(principale: string, cible: string): Map<string, string> {
  const m = new Map<string, string>()
  const paires: [Readonly<Record<string, string>>, Readonly<Record<string, string>>][] = [
    [libellesDuGabarit(principale), libellesDuGabarit(cible)],
    [textesDuRepli(principale), textesDuRepli(cible)],
  ]
  // Une langue que Deribfy ne porte pas retomberait sur l'anglais : ce ne serait pas une traduction.
  if (!['fr', 'en', 'ar'].includes(cible) || !['fr', 'en', 'ar'].includes(principale)) return m
  for (const [de, vers] of paires) for (const [k, v] of Object.entries(de)) if (vers[k] !== undefined) m.set(v, vers[k])
  return m
}

export function consigneTraduction(cible: string, textes: Readonly<Record<string, string>>): { system: string; user: string } {
  return {
    system: [
      `Tu traduis les textes d’une application vers le ${NOMS_LANGUES[cible] ?? cible} (code ${cible}).`,
      'Rends UNIQUEMENT un objet JSON { "<clé>": "<traduction>" }, avec EXACTEMENT les mêmes clés, sans texte autour.',
      'Une traduction est courte, naturelle, sans HTML ; les noms propres, les noms de marque et les moyens de paiement restent tels quels ; aucun montant ajouté.',
    ].join('\n'),
    user: JSON.stringify(textes),
  }
}

export async function traduire(o: {
  readonly ecrans: readonly unknown[]
  /** Les langues lues ; la première est la principale. */
  readonly langues: readonly string[]
  readonly appeler: AppelModele
  readonly prix: PrixJetons
}): Promise<{ readonly traductions: NonNullable<Spec['traductions']>; readonly lignes: readonly LigneLangue[] }> {
  const principale = o.langues[0] ?? 'fr'
  const textes = new Map<string, string>()
  for (const e of o.ecrans) for (const t of textesDe(e)) if (!textes.has(t.cle)) textes.set(t.cle, t.texte)
  // Les langues sont INDÉPENDANTES : leurs appels partent ensemble ; l'ordre du résultat suit l'ordre lu.
  const parLangue = await Promise.all(o.langues.slice(1).map(async (cible) => {
    const connus = connusDeDeribfy(principale, cible)
    const resultat = new Map<string, string>()
    const aEnvoyer: Record<string, string> = {}
    for (const [k, v] of textes) { const c = connus.get(v); if (c !== undefined) resultat.set(k, c); else aEnvoyer[k] = v }
    const parDeribfy = resultat.size
    let jetons: JetonsAppel = { entree: 0, sortie: 0, reflexion: 0 }
    let tronquee = false
    if (Object.keys(aEnvoyer).length > 0) {
      const c = consigneTraduction(cible, aEnvoyer)
      const r = await o.appeler(c.system, [{ role: 'user', content: c.user }], { reflexion: false, maxJetons: MAX_JETONS_TRADUCTION })
      jetons = r.usage
      tronquee = r.tronquee
      let lu: unknown = null
      const d = r.texte.indexOf('{')
      const f = r.texte.lastIndexOf('}')
      try { lu = d >= 0 && f > d ? JSON.parse(r.texte.slice(d, f + 1)) : null } catch { lu = null }
      const rendu = typeof lu === 'object' && lu !== null && !Array.isArray(lu) ? (lu as Record<string, unknown>) : {}
      for (const k of Object.keys(aEnvoyer)) {
        const v = rendu[k]
        if (typeof v === 'string' && MOTIF.texte.test(v.trim())) resultat.set(k, v.trim())
      }
    }
    const nonTraduits = [...textes.keys()].filter((k) => !resultat.has(k))
    for (const k of nonTraduits) resultat.set(k, textes.get(k)!)
    const traduction = { langue: cible, textes: [...textes.keys()].map((cle) => ({ cle, texte: resultat.get(cle)! })) }
    const ligne: LigneLangue = { langue: cible, cles: textes.size, parDeribfy, envoyes: Object.keys(aEnvoyer).length, nonTraduits, tronquee, jetons, cout: (jetons.entree * o.prix.entree + jetons.sortie * o.prix.sortie) / 1_000_000 }
    return { traduction, ligne }
  }))
  const traductions = parLangue.map((x) => x.traduction)
  const lignes = parLangue.map((x) => x.ligne)
  return { traductions, lignes }
}
