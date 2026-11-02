/**
 * LES VERSIONS D'UNE ŒUVRE — ce qui permet de revenir en arrière.
 *
 * ── POURQUOI CE MODULE EXISTE (2026-11-01).
 *
 * « Avant de laisser modifier, il faut pouvoir annuler. » Aujourd'hui une
 * application générée est imposée telle quelle : chaque génération crée une
 * LIGNE NEUVE, et une œuvre livrée n'a qu'un état — son `document` courant.
 * Il n'y a rien vers quoi revenir.
 *
 * ── CE QUI EXISTAIT DÉJÀ, ET CE QUI MANQUAIT. MESURÉ AVANT D'ÉCRIRE.
 *
 * `app_generation_versions` existe depuis le pipeline AIR :
 *   id · generation_id · rang · etape · cout_usd · etat (jsonb) · cree_le
 *   unique (generation_id, rang) · index (generation_id, rang desc) · RLS
 *
 * Mais son `etat` ne porte PAS les fichiers — mesuré sur les dix lignes
 * existantes : `phase, tours, acquis, jetons, modele, coutUsd, niveaux,
 * tirages, premierePasse, defautsRestants, tentativesReparation`. C'est
 * l'état interne d'un pipeline, utile pour REPRENDRE une génération
 * interrompue, inutile pour revenir en arrière. **Une version qui ne
 * contient pas les fichiers n'est pas une version.**
 *
 * Et le moteur DIRECT — le seul en service — n'en écrivait aucune : les deux
 * œuvres livrées avaient zéro version.
 *
 * ── CE QU'ON STOCKE, ET POURQUOI ICI.
 *
 * Les fichiers, dans `etat`, dans la même table. Trois mesures le
 * justifient : la colonne est déjà `jsonb`, elle n'est JAMAIS sélectionnée
 * par la lecture d'état (`select('rang, etape, cree_le')`) donc le coût de
 * lecture reste nul, et la RLS y est déjà posée.
 *
 * LE POIDS, MESURÉ : une œuvre pèse 57 à 75 Ko de JSON (une quinzaine de
 * fichiers TSX) — pas les ~560 Ko d'un HTML de vitrine rendu. Dix versions
 * par œuvre bornent à ~750 Ko, et 43 œuvres à ~32 Mo.
 *
 * ── `forme` : LA COLONNE NE DOIT JAMAIS MENTIR.
 *
 * Deux usages cohabitent dans cette table. Sans cette clef, tout lecteur
 * devrait connaître la règle implicite « absente veut dire pipeline », et
 * cette règle se perdrait. Les dix lignes d'origine ont été rattrapées le
 * 2026-11-01 : `{"pipeline": 10}`, aucune sans forme.
 */

/** Ce qu'une version du moteur direct porte : de quoi REVENIR, rien de plus. */
export type VersionDocument = {
  readonly forme: 'document'
  readonly fichiers: Record<string, string>
  readonly nom: string | null
  /** Ce que CETTE version a coûté. Sert à annoncer un prix avant de dépenser. */
  readonly coutUsd: number
}

/** L'état interne du pipeline AIR. Ne permet PAS de revenir en arrière. */
export type VersionPipeline = { readonly forme: 'pipeline' } & Record<string, unknown>

export type EtatVersion = VersionDocument | VersionPipeline

/** Une version telle que l'écran la liste. Jamais le document : il est lourd. */
export type VersionListee = {
  readonly rang: number
  readonly etape: string | null
  readonly creeIl: string
  /** Faux pour les versions de pipeline : on ne peut pas y revenir. */
  readonly restaurable: boolean
}

/**
 * COMBIEN DE VERSIONS ON GARDE, ET L'EXCEPTION QUI NE COÛTE RIEN.
 *
 * Dix par œuvre. Mais **le rang 1 ne se purge JAMAIS** : c'est la livraison
 * d'origine, et c'est précisément celle qu'on veut souvent retrouver. Un
 * utilisateur qui régénère dix fois perdrait sinon l'application qu'il avait
 * au départ.
 *
 * C'est d'autant plus nécessaire que « revenir » consomme lui aussi un rang :
 * quelqu'un qui hésite brûle ses places sans faire une seule vraie
 * génération. Coût de l'exception : 75 Ko par œuvre, à vie.
 */
export const VERSIONS_GARDEES = 10

/**
 * Les rangs à purger, le rang 1 toujours épargné.
 *
 * Rend les rangs à SUPPRIMER, pas ceux à garder : l'appelant ne doit pas
 * avoir à inverser une liste pour comprendre ce qui disparaît.
 */
export function rangsAPurger(rangs: readonly number[]): readonly number[] {
  const tries = [...rangs].sort((a, b) => b - a)
  const gardes = new Set(tries.slice(0, VERSIONS_GARDEES))
  // LE RANG 1 EST GARDÉ MÊME S'IL EST TOMBÉ HORS DES DIX DERNIERS.
  gardes.add(1)
  return tries.filter((r) => !gardes.has(r)).sort((a, b) => a - b)
}

/** Une version du pipeline ne porte pas de fichiers : on n'y revient pas. */
export function estRestaurable(etat: unknown): boolean {
  const e = etat as { forme?: unknown; fichiers?: unknown } | null
  return (
    e !== null &&
    typeof e === 'object' &&
    e.forme === 'document' &&
    typeof e.fichiers === 'object' &&
    e.fichiers !== null &&
    Object.keys(e.fichiers as Record<string, unknown>).length > 0
  )
}

/**
 * LE PRIX ANNONCÉ AVANT DE DÉPENSER — et c'est une ESTIMATION, pas un prix.
 *
 * « Annoncer 0,13 et prélever 0,20 abîme la confiance plus que l'écart
 * lui-même. » Le mot « environ » n'est donc pas une précaution de style :
 * il dit ce que le chiffre est. Rend `null` quand aucune version n'a de coût
 * — on ne devine pas un prix.
 */
export function prixEstime(couts: readonly number[]): string | null {
  const reels = couts.filter((c) => c > 0)
  if (reels.length === 0) return null
  const moyen = reels.reduce((a, b) => a + b, 0) / reels.length
  return `environ ${moyen.toFixed(2)} $`
}
