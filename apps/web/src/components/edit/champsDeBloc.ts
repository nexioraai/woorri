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
  // Le portrait du « mot d'un responsable » : un vrai fichier, téléversable.
  citation: ['photo'],
  // Le parcours au défilement : une image par étape, téléversable.
  etapes: ['image'],
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
  // Une boîte d'organigramme peut devenir CLIQUABLE (`lien` : le chemin d'une
  // page du site) et prendre une COULEUR (bleu, orange, vert). Sans ces cases,
  // le client ne pourrait ni ouvrir une fiche ni recolorer un poste.
  organigramme: ['nom', 'lien', 'couleur'],
  // Une citation peut porter un PORTRAIT et un titre : elle devient alors le
  // « mot » d'un responsable, photo à gauche.
  citation: ['photo', 'titre'],
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

// ── LOT 4c — AJOUTER ET RETIRER UNE LIGNE D'UN BLOC.
//
// L'éditeur ne savait que MODIFIER les textes existants : un organigramme semé
// avec une seule boîte ne pouvait jamais en recevoir une seconde, un tableau
// jamais une ligne de plus. « Modifiable dans l'éditeur » était faux.
//
// Une ligne neuve reprend la FORME de la dernière : ses textes deviennent
// « À compléter » — jamais vides, car `lireBlocs` écarte un bloc dont une ligne
// est vide (il disparaîtrait de la page ET de l'éditeur avant d'être rempli) ;
// jamais recopiés, car on n'invente rien. Les champs facultatifs du type ne
// sont pas repris ; une adresse obligatoire garde celle du modèle, à remplacer. Les cases « À compléter » ne sont jamais
// montrées aux visiteurs d'une institution (`institutionVisiteur.ts`).
// Organigramme : une clé neuve et unique, rattachée à la racine par défaut
// (le client change « parent » pour la placer ailleurs).

/** Le tableau de lignes d'un bloc : `items`, ou `lignes` pour un tableau. */
function cleDesLignes(b: Bloc): 'items' | 'lignes' | null {
  const o = b as unknown as Record<string, unknown>
  if (Array.isArray(o.items)) return 'items'
  if (b.type === 'tableau' && Array.isArray(o.lignes)) return 'lignes'
  return null
}

const A_REMPLIR = 'À compléter'
/**
 * Les champs FACULTATIFS, par type de bloc : non repris dans une ligne neuve.
 * Un champ obligatoire (le nom d'un document, d'un partenaire) reçoit
 * « À compléter » — c'est lui qui rend la ligne invisible aux visiteurs.
 * L'adresse d'un document ou d'une photo, obligatoire, garde celle du modèle ;
 * celle du SITE d'un partenaire est facultative et n'est jamais recopiée.
 */
const FACULTATIFS: Record<string, readonly string[]> = {
  documents: ['format', 'poids'],
  partenaires: ['logo', 'url'],
  galerie: ['legende'],
  etapes: ['texte', 'image', 'libelle'],
  frise: ['texte'],
}
const GARDES: Record<string, readonly string[]> = { documents: ['url'], galerie: ['url'], liens: ['chemin'] }

const vider = (v: unknown, type = ''): unknown => {
  if (typeof v === 'string') return A_REMPLIR
  if (Array.isArray(v)) return v.map((x) => vider(x, type))
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !(FACULTATIFS[type] ?? []).includes(k))
      .map(([k, x]) => [k, (GARDES[type] ?? []).includes(k) ? x : vider(x)]))
  }
  return v
}

/** Le nombre de lignes du bloc, ou `null` s'il n'en a pas. */
export function nombreDeLignes(b: Bloc): number | null {
  const k = cleDesLignes(b)
  return k === null ? null : ((b as unknown as Record<string, unknown[]>)[k]).length
}

export function ajouterLigne(b: Bloc): Bloc {
  const k = cleDesLignes(b)
  if (k === null) return b
  const lignes = (b as unknown as Record<string, unknown[]>)[k]
  const modele = lignes[lignes.length - 1]
  let neuve: unknown = modele === undefined ? (k === 'lignes' ? ((b as { entetes?: string[] }).entetes ?? ['']).map(() => A_REMPLIR) : A_REMPLIR) : vider(modele, b.type)
  if (b.type === 'organigramme') {
    const cles = new Set(lignes.map((l) => (l as { cle?: string }).cle))
    let n = lignes.length + 1
    while (cles.has(`poste-${n}`)) n += 1
    const racine = (lignes as { cle?: string; parent?: string | null }[]).find((l) => !l.parent)?.cle
    neuve = { cle: `poste-${n}`, fonction: A_REMPLIR, ...(racine ? { parent: racine } : {}) }
  }
  return { ...b, [k]: [...lignes, neuve] } as Bloc
}

export function retirerLigne(b: Bloc, i: number): Bloc {
  const k = cleDesLignes(b)
  if (k === null) return b
  const lignes = (b as unknown as Record<string, unknown[]>)[k]
  if (lignes.length <= 1 || i < 0 || i >= lignes.length) return b
  return { ...b, [k]: lignes.filter((_, j) => j !== i) } as Bloc
}
