/**
 * M4 (a) · RETROUVER LA DÉCLARATION D'UNE ŒUVRE QUI N'EN A PAS GARDÉ.
 *
 * ── LE PIÈGE, ÉNONCÉ DANS M1 ET DEVENU VIVANT ICI.
 *
 *   « La déclaration NOUVELLE doit être écrite par un modèle à qui l'on a
 *     montré l'ANCIENNE. Sans ça il réinvente ses identifiants à chaque
 *     tour, toutes les tables paraissent abandonnées, et la migration
 *     s'arrête systématiquement : garde étanche, produit inutilisable. »
 *
 * Il ne casse rien — il rend simplement toute modification impossible.
 *
 * ── MESURÉ AVANT D'ÉCRIRE : LA DÉCLARATION N'EST STOCKÉE NULLE PART.
 *
 * Les six dernières œuvres portent un document à TROIS clés :
 *
 *     ['fichiers', 'politiques', 'schema']
 *
 * Le SQL émis, jamais les entités qui l'ont produit. `sections_acquises`
 * porte les verdicts des juges, pas la déclaration. Il n'y a donc rien à
 * montrer au modèle.
 *
 * ── MAIS LE SQL EST EXACTEMENT RECONSTRUCTIBLE, et c'est mesurable.
 *
 * `emettreSchemaSql` écrit les noms depuis `id` sans préfixe. Le chemin
 * inverse recolle le préfixe. L'IDENTITÉ — la seule chose dont M1 a
 * besoin — survit intacte à l'aller-retour.
 *
 * CE QUI NE SURVIT PAS, et il faut le dire : le TYPE DÉCLARÉ. `date` et
 * `text` sortent tous deux en `text` ; `number` sort en `numeric`. On
 * rend donc le type SQL, pas le type d'origine. M1 compare des types
 * entre deux déclarations reconstruites de la même façon — la
 * comparaison reste juste, c'est l'affichage qui perd une nuance.
 *
 * ── POUR LES ŒUVRES NEUVES, CE MODULE NE SERT À RIEN.
 *
 * La déclaration y est stockée telle quelle. Celui-ci est le pont vers
 * les œuvres d'avant — sans lui, aucune d'elles ne pourrait jamais être
 * modifiée.
 */
import type { EntiteDeclaree } from './entites-declarees'

/** Le type SQL → le type déclaré le plus proche. Une seule direction. */
const TYPE_DECLARE: Readonly<Record<string, string>> = {
  text: 'text',
  numeric: 'number',
  boolean: 'boolean',
}

/**
 * LIT LE SQL ÉMIS ET REND LES ENTITÉS QUI L'ONT PRODUIT.
 *
 * Rend un tableau VIDE quand il n'y a pas de table — ce qui est la
 * vérité d'une œuvre sans données, pas un échec de lecture.
 */
export function declarationDepuisSchema(schemaSql: string): readonly EntiteDeclaree[] {
  const entites: EntiteDeclaree[] = []
  // `[^)]*` suffit : le corps émis ne contient qu'une parenthèse, celle
  // de `gen_random_uuid()`, et elle est sur la ligne de la clé primaire
  // qu'on saute. Un corps plus riche ne sort pas de notre émetteur.
  const table = /create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/gu
  for (const t of schemaSql.matchAll(table)) {
    const nom = t[1] ?? ''
    const corps = t[2] ?? ''
    const champs: EntiteDeclaree['fields'][number][] = []
    for (const ligne of corps.split('\n')) {
      const l = ligne.trim().replace(/^,\s*/u, '')
      // La clé primaire n'est pas un champ déclaré : l'émetteur l'ajoute.
      if (l === '' || l.startsWith('id text primary key')) continue
      const m = /^(\w+)\s+(text|numeric|boolean)(\s+unique)?$/u.exec(l)
      if (m === null) continue
      champs.push({
        id: `fld_${m[1] ?? ''}`,
        name: m[1] ?? '',
        type: TYPE_DECLARE[m[2] ?? 'text'] ?? 'text',
        // ── CE `false` EST UNE ÉCRITURE DE NOTRE PART, PAS UNE LECTURE.
        //
        // Le SQL émis ne porte AUCUNE obligation — l'émetteur n'écrit
        // jamais `not null`. On met donc la valeur que le type exige, et
        // on MARQUE l'entité pour que la comparaison ne s'y trompe pas.
        required: false,
        ...(m[3] === undefined ? {} : { unique: true }),
      })
    }
    // ── LE JOURNAL SE LIT DANS LE COMMENTAIRE, et c'est voulu.
    //
    // `emettrePolitiquesSql` change de politiques selon `appendOnly` :
    // le perdre à la relecture ferait reposer une porte ouverte sur une
    // table qui n'accepte que des ajouts. Le commentaire émis le porte,
    // et il est écrit par nous — pas par le modèle.
    const entete = new RegExp(`« ${nom} »[^\\n]*`, 'u').exec(schemaSql)?.[0] ?? ''
    entites.push({
      id: `ent_${nom}`,
      name: nom,
      fields: champs,
      // L'OBLIGATION N'EST PAS RÉCUPÉRABLE DEPUIS LE SQL. On le DIT,
      // plutôt que de prétendre l'avoir lue.
      obligationInconnue: true,
      ...(entete.includes('JOURNAL') ? { appendOnly: true } : {}),
    })
  }
  return entites
}

/**
 * LA DÉCLARATION D'UNE ŒUVRE — stockée si elle l'est, relue sinon.
 *
 * ── UN SEUL ENDROIT OÙ POSER LA QUESTION.
 *
 * Deux appelants qui choisiraient différemment entre le champ stocké et
 * la relecture compareraient des déclarations de provenances
 * différentes — et M1 verrait des abandons là où il n'y a qu'un écart de
 * lecture.
 */
export function declarationDe(document: unknown): readonly EntiteDeclaree[] {
  const d = document as { entites?: unknown; schema?: unknown } | null
  if (Array.isArray(d?.entites)) return d.entites as readonly EntiteDeclaree[]
  return declarationDepuisSchema(typeof d?.schema === 'string' ? d.schema : '')
}
