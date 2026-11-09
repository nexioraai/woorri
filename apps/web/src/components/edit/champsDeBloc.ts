import type { Bloc } from '../../app/sites/[slug]/pages/blocs'

// ============================================================================
// LOT 15.7 — QUELS CHAMPS UN BLOC OFFRE, ET LESQUELS PORTENT UN FICHIER.
//
// ── POURQUOI CES RÈGLES SONT HORS DE L'ÉCRAN.
//
// Ce sont des règles, pas du rendu. Les laisser dans `EditeurBlocs.tsx`
// obligeait le cliquet à LIRE LA SOURCE et à reconnaître une expression
// littérale — un instrument qui mesure l'orthographe du code, pas son
// comportement. Ici elles s'appellent, donc elles se prouvent.
// ============================================================================

export type Chemin = (string | number)[]

/**
 * QUELS CHAMPS PORTENT UN FICHIER, par type de bloc.
 *
 * FERMÉE, et lue dans les deux sens par le cliquet. DEUX DÉFAUTS MESURÉS le
 * 2026-11-09 sur le bloc « partenaires », tous deux causés par une règle qui
 * ne regardait que le NOM du champ :
 *
 *  · son `logo` — un vrai fichier — n'avait aucun téléverseur, donc le client
 *    devait l'héberger ailleurs, c'est-à-dire renoncer ;
 *  · son `url` — l'adresse du site du partenaire, CHEZ LE PARTENAIRE — s'en
 *    voyait proposer un, ce qui lui faisait croire qu'il devait nous confier
 *    le site d'autrui.
 *
 * Le type du bloc décide avec le nom du champ.
 */
const CHAMPS_FICHIER: Record<string, readonly string[]> = {
  documents: ['url'],
  image: ['url'],
  galerie: ['url'],
  partenaires: ['logo'],
}

export function champEstUnFichier(typeDeBloc: string, champ: unknown): boolean {
  if (typeof champ !== 'string') return false
  return (CHAMPS_FICHIER[typeDeBloc] ?? []).includes(champ)
}

/**
 * LES CHAMPS FACULTATIFS QU'ON PROPOSE QUAND MÊME, par type de bloc.
 *
 * `champs()` ne marche que sur les clés QUI EXISTENT — c'est juste pour lire,
 * et faux pour écrire : un partenaire créé sans logo n'avait aucun champ
 * « logo », donc aucun moyen d'en déposer un. Le client voyait un bloc
 * modifiable et une fonction inatteignable.
 *
 * On les propose VIDES. Rien n'est écrit tant que personne ne tape : ces
 * entrées servent l'affichage, pas les données.
 */
const CHAMPS_FACULTATIFS: Record<string, readonly string[]> = {
  partenaires: ['logo', 'url'],
}

/** Tout ce qui est une chaîne dans un bloc, avec son chemin. */
export function champs(v: unknown, base: Chemin = []): { chemin: Chemin; valeur: string }[] {
  if (typeof v === 'string') return [{ chemin: base, valeur: v }]
  if (Array.isArray(v)) return v.flatMap((e, i) => champs(e, [...base, i]))
  if (v && typeof v === 'object')
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => k !== 'type')
      .flatMap(([k, e]) => champs(e, [...base, k]))
  return []
}

/** Les champs d'un bloc : ceux qui existent, plus ceux qu'on sait manquants. */
export function champsDuBloc(b: Bloc): { chemin: Chemin; valeur: string }[] {
  const vus = champs(b)
  const facultatifs = CHAMPS_FACULTATIFS[(b as { type: string }).type] ?? []
  if (facultatifs.length === 0) return vus

  const items = (b as unknown as { items?: unknown[] }).items
  if (!Array.isArray(items)) return vus

  const manquants: { chemin: Chemin; valeur: string }[] = []
  items.forEach((it, i) => {
    for (const f of facultatifs) {
      if (it && typeof it === 'object' && !(f in (it as object))) {
        manquants.push({ chemin: ['items', i, f], valeur: '' })
      }
    }
  })
  // On les place APRÈS les champs remplis : un champ vide en tête d'un bloc
  // déjà rempli se lit comme une erreur de chargement.
  return [...vus, ...manquants]
}

/** Écrit une valeur au bout d'un chemin, en créant la clé si elle manque. */
export function poser(obj: unknown, chemin: Chemin, valeur: string): unknown {
  if (chemin.length === 0) return valeur
  const [t, ...reste] = chemin
  if (Array.isArray(obj)) {
    const c = [...obj]; c[t as number] = poser(c[t as number], reste, valeur); return c
  }
  return { ...(obj as object), [t as string]: poser((obj as Record<string, unknown>)[t as string], reste, valeur) }
}
