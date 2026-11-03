/**
 * LE JUGE DE LA PERSISTANCE — chaque table déclarée se lit ET s'écrit.
 *
 * ── LE DÉFAUT QU'IL FERME, ET IL EST HYBRIDE, PAS BINAIRE.
 *
 * Le danger n'est pas qu'une application ignore la base : ça, le premier
 * rechargement le dit. Le danger est l'application MOITIÉ BRANCHÉE — qui
 * lit `membre` depuis la base et garde `cotisation` dans un `useState`.
 *
 * Elle marche. Elle se montre. Elle passe l'exécution, la vivacité, la
 * couverture — tous les juges existants sont contents, parce qu'un écran
 * alimenté par un tableau en mémoire est un écran qui vit. Et le travail
 * saisi dans la moitié amnésique disparaît au rechargement, sans un mot.
 *
 * C'est le pire profil de défaut du dépôt : invisible à la livraison,
 * destructeur à l'usage, et découvert par la personne qui perd son travail.
 *
 * ── POURQUOI « LUE ET ÉCRITE », ET PAS « MENTIONNÉE ».
 *
 * Une table lue mais jamais écrite est un écran qui montre toujours une
 * liste vide — l'application a l'air cassée. Une table écrite mais jamais
 * lue est pire : la saisie réussit, la donnée part en base, et personne ne
 * la revoit jamais. Les deux sens comptent, et ils manquent séparément.
 *
 * `jugerCouverture` a déjà appris cette leçon sur les exigences : « le code
 * en PARLE mais aucun écran ne la porte — une mention n'est pas une
 * couverture ». Ici c'est la même règle appliquée aux données.
 *
 * ── ON MARCHE LA CHAÎNE, ON NE FENÊTRE PAS LE TEXTE.
 *
 * Ma première forme cherchait un verbe dans les 400 signes suivant
 * `.from('membre')`. Elle aurait crédité le `.insert` de la requête
 * SUIVANTE — donc déclaré `membre` écrite parce que `cotisation` l'était,
 * exactement le défaut qu'on cherche. On lit donc les `.méthode(…)` qui
 * suivent réellement le `.from(…)`, parenthèses équilibrées, chaînes
 * comprises.
 *
 * ── LA LIMITE, ÉNONCÉE PLUTÔT QUE CACHÉE.
 *
 * Un nom de table passé par une variable (`const T = 'membre'`) est résolu
 * à UN niveau. Au-delà — un tableau de noms, une interpolation, une
 * fonction qui rend le nom — le juge ne voit rien et REPROCHE à tort. Ce
 * reproche coûte un tour de modèle, pas une donnée perdue : c'est le bon
 * sens de l'erreur. Et la consigne demande les noms « exactement », donc
 * l'indirection n'est pas l'idiome attendu.
 */
import { nomTable, type EntiteDeclaree } from './entites-declarees'

/** Les verbes de PostgREST qui lisent, et ceux qui écrivent. */
const LECTURE = new Set(['select'])
const ECRITURE = new Set(['insert', 'update', 'upsert', 'delete'])

export type DefautPersistance = {
  readonly table: string
  readonly lue: boolean
  readonly ecrite: boolean
}

/** Saute une parenthèse ouvrante et son contenu, chaînes comprises. */
function finDArgument(src: string, debut: number): number {
  let i = debut
  let profondeur = 0
  let guillemet = ''
  while (i < src.length) {
    const c = src[i]
    if (guillemet !== '') {
      if (c === '\\') i += 1
      else if (c === guillemet) guillemet = ''
    } else if (c === "'" || c === '"' || c === '`') {
      guillemet = c
    } else if (c === '(') {
      profondeur += 1
    } else if (c === ')') {
      profondeur -= 1
      if (profondeur === 0) return i + 1
    }
    i += 1
  }
  return src.length
}

/**
 * LES MÉTHODES RÉELLEMENT CHAÎNÉES APRÈS CETTE POSITION.
 *
 * On s'arrête au premier caractère qui n'est ni un espace ni un point —
 * c'est ce qui empêche de créditer la requête suivante.
 */
function methodesChainees(src: string, depuis: number): string[] {
  const trouvees: string[] = []
  let i = depuis
  for (;;) {
    while (i < src.length && /[\s]/u.test(src[i] ?? '')) i += 1
    if (src[i] !== '.') return trouvees
    i += 1
    const m = /^[A-Za-z_$][\w$]*/u.exec(src.slice(i))
    if (m === null) return trouvees
    trouvees.push(m[0])
    i += m[0].length
    while (i < src.length && /[\s]/u.test(src[i] ?? '')) i += 1
    if (src[i] === '(') i = finDArgument(src, i)
  }
}

/** Les noms de tables qu'une variable porte — un seul niveau. */
function tablesParVariable(src: string): Map<string, string> {
  const m = new Map<string, string>()
  for (const t of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]([^'"`\n]+)['"`]/gu)) {
    m.set(t[1] ?? '', t[2] ?? '')
  }
  return m
}

/**
 * CHAQUE TABLE DÉCLARÉE EST-ELLE LUE ET ÉCRITE DANS LE CODE LIVRÉ ?
 *
 * Rend un défaut par table incomplète, avec le sens qui manque. Une œuvre
 * sans entité déclarée n'a rien à prouver : la liste est vide.
 */
export function jugerPersistance(
  entites: readonly EntiteDeclaree[],
  fichiers: ReadonlyMap<string, string>,
): readonly DefautPersistance[] {
  if (entites.length === 0) return []
  const src = [...fichiers.values()].join('\n')
  const variables = tablesParVariable(src)

  const lues = new Set<string>()
  const ecrites = new Set<string>()
  for (const t of src.matchAll(/\.from\s*\(/gu)) {
    const ouvrante = (t.index ?? 0) + t[0].length - 1
    const fin = finDArgument(src, ouvrante)
    const brut = src.slice(ouvrante + 1, fin - 1).trim()
    const litteral = /^['"`]([^'"`]*)['"`]$/u.exec(brut)
    const table = litteral !== null ? (litteral[1] ?? '') : (variables.get(brut) ?? '')
    if (table === '') continue
    for (const methode of methodesChainees(src, fin)) {
      if (LECTURE.has(methode)) lues.add(table)
      if (ECRITURE.has(methode)) ecrites.add(table)
    }
  }

  const defauts: DefautPersistance[] = []
  for (const e of entites) {
    const t = nomTable(e)
    const lue = lues.has(t)
    const ecrite = ecrites.has(t)
    if (!lue || !ecrite) defauts.push({ table: t, lue, ecrite })
  }
  return defauts
}

/**
 * LE REPROCHE — il dit le SENS qui manque, pas « branche la base ».
 *
 * Un reproche vague fait recommencer au hasard. Celui-ci nomme la table et
 * ce qu'il faut écrire : une requête de lecture, une d'écriture, ou les deux.
 */
export function reprochePersistance(defauts: readonly DefautPersistance[]): string {
  return (
    'DES DONNÉES VIVENT EN MÉMOIRE AU LIEU DE LA BASE — ce qui y est saisi ' +
    'DISPARAÎT au rechargement, sans message :\n' +
    defauts
      .map((d) =>
        d.lue
          ? `- ${d.table} : lue, jamais écrite — la saisie ne part nulle part, et personne ne le voit`
          : d.ecrite
            ? `- ${d.table} : écrite, jamais lue — la donnée arrive en base et aucun écran ne la remontre`
            : `- ${d.table} : ni lue ni écrite — cette table n’existe que dans le schéma`,
      )
      .join('\n') +
    '\nChaque table passe par `base.from(\'…\')` avec un `.select(…)` ET un ' +
    '`.insert(…)` (ou `.update`/`.upsert`/`.delete`). Aucun `useState` ne ' +
    'tient lieu de base : il est vide au rechargement suivant.'
  )
}
