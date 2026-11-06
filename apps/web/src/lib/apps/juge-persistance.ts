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

/**
 * CE QUI PROUVE QU'UNE APPLICATION VOULAIT SE SOUVENIR — et n'a pas de table.
 *
 * `fichier` nomme l'endroit ; `quoi` dit ce qui a été vu.
 */
export type PreuveMemoire = {
  readonly fichier: string
  readonly quoi: string
}

/**
 * LES MOTS QUI DÉSIGNENT UN ÉCRAN DONT LE MÉTIER EST DE SE SOUVENIR.
 *
 * ── POURQUOI UN NOM DE FICHIER, ET PAS UNE OCCURRENCE DANS LE TEXTE.
 *
 * « historique » apparaît dans n'importe quel commentaire. Un COMPOSANT
 * qui s'appelle `Historique.tsx` est une décision d'architecture : le
 * modèle a dessiné un écran dont le travail entier est de remontrer ce qui
 * a été saisi avant. Sans table, cet écran est un mensonge.
 *
 * La liste est volontairement courte et sans « liste » : une liste d'options
 * fixes est légitime et n'a rien à conserver. On ne retient que les mots qui
 * ne se comprennent que par le passé.
 */
const MOTS_DE_MEMOIRE = [
  'historique',
  'journal',
  'archive',
  'releves',
  'enregistrements',
  'antecedents',
] as const

/** Les appels qui ÉCRIVENT dans le navigateur — la preuve matérielle. */
const RANGEMENTS_NAVIGATEUR = ['localStorage', 'sessionStorage', 'indexedDB'] as const

/** Sans accents ni casse : `Relevés.tsx` doit se lire comme `releves`. */
function aplati(x: string): string {
  return x
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
}

/**
 * UNE ŒUVRE SANS TABLE A-T-ELLE QUAND MÊME VOULU CONSERVER QUELQUE CHOSE ?
 *
 * ── LE DÉFAUT QUE CE CONTRÔLE FERME, MESURÉ LE 2026-11-04.
 *
 * Une application livrée en production : `-- AUCUNE DONNÉE DÉCLARÉE`, et
 * dans les fichiers un `composants/Historique.tsx` plus QUATRE appels à
 * `localStorage` dans `App.tsx`. Le juge de persistance l'a trouvée
 * PARFAITE — avec `entites: []` il n'avait rien à comparer.
 *
 *   « Une garde qui se tait précisément quand ce qu'elle garde échoue est
 *     pire qu'une garde absente : son vert se lit comme une preuve. »
 *
 * C'est la garde silencieuse nommée deux jours plus tôt, et elle venait de
 * laisser passer une vraie application. Zéro table n'est pas un cas sans
 * objet : c'est une affirmation — « cette application n'a rien à
 * conserver » — et elle se vérifie comme les autres.
 */
export function preuvesDeMemoire(
  fichiers: ReadonlyMap<string, string>,
): readonly PreuveMemoire[] {
  const preuves: PreuveMemoire[] = []
  for (const [chemin, contenu] of fichiers) {
    // `systeme/` est NOTRE bibliothèque, pas le travail du modèle : un
    // rangement qui y vivrait serait notre décision, pas la sienne.
    if (chemin.startsWith('systeme/')) continue
    const nom = aplati(chemin.split('/').pop() ?? '')
    for (const mot of MOTS_DE_MEMOIRE) {
      if (nom.includes(mot)) {
        preuves.push({ fichier: chemin, quoi: `un écran « ${mot} »` })
        break
      }
    }
    for (const rangement of RANGEMENTS_NAVIGATEUR) {
      const n = contenu.split(rangement).length - 1
      if (n > 0) {
        preuves.push({
          fichier: chemin,
          quoi: `${String(n)} appel(s) à ${rangement}`,
        })
      }
    }
  }
  return preuves
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
/**
 * QUELLES MÉTHODES TOUCHENT QUELLE TABLE — extrait pour être PARTAGÉ.
 *
 * ── POURQUOI UNE FONCTION, ET PAS UNE SECONDE LECTURE.
 *
 * `jugerGestion` a besoin exactement de ça : savoir si une table reçoit un
 * `update` et un `delete`. Le relire de son côté donnerait deux analyseurs
 * du même source, qui divergeraient au premier cas tordu — une variable
 * qui porte un nom de table, un `.from()` sur plusieurs lignes.
 *
 * Une duplication qu'on PEUT éviter doit l'être : les deux juges lisent
 * désormais la même carte, et aucun des deux ne peut voir ce que l'autre
 * ne voit pas.
 */
export function methodesParTable(
  fichiers: ReadonlyMap<string, string>,
): ReadonlyMap<string, ReadonlySet<string>> {
  const src = [...fichiers.values()].join('\n')
  const variables = tablesParVariable(src)
  const carte = new Map<string, Set<string>>()
  for (const t of src.matchAll(/\.from\s*\(/gu)) {
    const ouvrante = (t.index ?? 0) + t[0].length - 1
    const fin = finDArgument(src, ouvrante)
    const brut = src.slice(ouvrante + 1, fin - 1).trim()
    const litteral = /^['"`]([^'"`]*)['"`]$/u.exec(brut)
    const table = litteral !== null ? (litteral[1] ?? '') : (variables.get(brut) ?? '')
    if (table === '') continue
    const vues = carte.get(table) ?? new Set<string>()
    for (const methode of methodesChainees(src, fin)) vues.add(methode)
    carte.set(table, vues)
  }
  return carte
}

export function jugerPersistance(
  entites: readonly EntiteDeclaree[],
  fichiers: ReadonlyMap<string, string>,
): readonly DefautPersistance[] {
  // ── ZÉRO TABLE N'EST PAS UN CAS SANS OBJET.
  //
  // C'est l'affirmation « cette application n'a rien à conserver ». Elle se
  // vérifie : si le code livré porte un écran de mémoire ou range quelque
  // chose dans le navigateur, l'affirmation est fausse — et c'est au
  // CONSTRUCTEUR de déclarer la table dont il a besoin, puisque c'est lui
  // qui a décidé de l'écran.
  if (entites.length === 0) {
    return preuvesDeMemoire(fichiers).length === 0
      ? []
      : [{ table: '', lue: false, ecrite: false }]
  }
  const parTable = methodesParTable(fichiers)
  const lues = new Set<string>()
  const ecrites = new Set<string>()
  for (const [table, methodes] of parTable) {
    for (const m of methodes) {
      if (LECTURE.has(m)) lues.add(table)
      if (ECRITURE.has(m)) ecrites.add(table)
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
export function reprochePersistance(
  defauts: readonly DefautPersistance[],
  preuves: readonly PreuveMemoire[] = [],
  dernierAppel = false,
): string {
  // ── LE CAS « AUCUNE TABLE », ET IL NE SE DIT PAS COMME LES AUTRES.
  //
  // Reprocher « la table X n'est pas lue » quand il n'y a AUCUNE table
  // n'apprend rien. Ici le reproche demande une DÉCLARATION, pas une
  // requête — et c'est ce qui le rend satisfaisable : le constructeur
  // déclare les tables dont il a besoin dans le même geste que le code.
  if (defauts.length === 1 && defauts[0]?.table === '') {
    return (
      (dernierAppel ? 'DERNIER TOUR. ' : '') +
      'CETTE APPLICATION VEUT SE SOUVENIR ET N’A AUCUNE TABLE — ce qui y est ' +
      'saisi DISPARAÎT, sans message :\n' +
      preuves.map((p) => `- ${p.fichier} : ${p.quoi}`).join('\n') +
      '\nUn rangement du navigateur N’EST PAS une base : il ne suit ni un autre ' +
      'appareil, ni un vidage de cache, et il se perd sans prévenir.\n' +
      // ── DEUX ISSUES, ET LA SECONDE EST AUSSI BONNE QUE LA PREMIÈRE.
      //
      // MESURÉ SUR L'ŒUVRE 60bf2c40 (2026-11-04) : le modèle a reçu DEUX
      // FOIS « déclare la table », a refusé deux fois, et l'œuvre est
      // partie amnésique. Un reproche à issue unique qu'on refuse deux
      // fois est probablement un reproche MAL POSÉ.
      //
      // Le vrai défaut était en amont : il avait INVENTÉ un écran
      // « historique » pour une demande qui n'en voulait pas — « calculer
      // ma facture d'électricité SNE », rien de plus. Lui redire une
      // troisième fois de déclarer une table ne lui donne toujours qu'une
      // sortie, et c'est celle qu'il n'a pas prise.
      (dernierAppel
        ? 'DEUX SORTIES, ET LES DEUX SONT BONNES :\n' +
          '① DÉCLARE la table que cet écran exige, en tête de ta réponse, et ' +
          'emploie-la ;\n' +
          '② ou RETIRE cet écran — regarde la demande : si elle ne réclamait ' +
          'pas de conserver quoi que ce soit, l’écran est de trop.\n' +
          'Livrer un écran qui promet de se souvenir et ne conserve rien n’est ' +
          'PAS une troisième sortie.'
        : 'DÉCLARE LES TABLES DONT TU AS BESOIN, en tête de ta réponse, puis ' +
          'emploie-les — ou bien retire l’écran qui promet de se souvenir. Les ' +
          'deux se valent ; une promesse non tenue, non.')
    )
  }
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
