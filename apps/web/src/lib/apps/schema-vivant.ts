/**
 * LE SCHÉMA VIVANT CONFRONTÉ AU DDL DU DÉPÔT — colonnes, types, nullabilité,
 * défauts et contraintes. Les deux tables.
 *
 * ── LE DÉFAUT QUI A COMMANDÉ CE LOT (2026-11-01).
 *
 * Une suppression a échoué devant le propriétaire : la contrainte
 * `app_generations_statut_valide` n'acceptait pas le statut « supprimee ».
 * Le DDL du dépôt, lui, était cohérent avec lui-même. Rien, nulle part, ne
 * comparait LE DÉPÔT À LA BASE EN LIGNE. C'est la classe « vert en local,
 * mort en ligne » — celle du traçage amputé du 31 octobre — appliquée au
 * schéma.
 *
 * ── LA FORME GÉNÉRALE DU DÉFAUT, ET ELLE VAUT POUR TOUT CE FICHIER.
 *
 * « LE SECOND SENS EST CELUI QU'ON OUBLIE TOUJOURS : la base refusait ce
 * qu'elle devait accepter. » Un contrôle qui ne vérifie qu'un sens laisse
 * passer la moitié des écarts. D'où, partout ici : la colonne manquante ET
 * la colonne non déclarée ; la contrainte absente ET la contrainte trop
 * étroite ; le type trop large ET le type trop strict.
 *
 * ── ET UN SECOND DÉFAUT, TROUVÉ EN ÉCRIVANT CELUI-CI.
 *
 * `publication_slug` est écrit par quatre routes et n'était déclaré nulle
 * part dans `sqlPour`. La vraie table ne le portait que parce qu'il y avait
 * été ajouté à la main, un jour, dans une console. Toute base reconstruite
 * depuis le dépôt naissait SANS la colonne qui tient la quarantaine des
 * noms — un défaut qui ne se voit que le jour où l'on reconstruit, c'est-à-
 * dire le pire jour possible.
 *
 * ── POURQUOI LES CONTRAINTES SE MESURENT EN LES EXERÇANT.
 *
 * PostgREST expose les colonnes (son OpenAPI porte le type, la nullabilité
 * et le défaut de chacune) mais AUCUNE contrainte CHECK. On ne peut donc pas
 * les lire : on les EXERCE, par une ligne qui doit être refusée et une qui
 * doit être acceptée.
 *
 * ── ET POURQUOI ON NE LES EXERCE PLUS SUR LA TABLE DES VRAIS CLIENTS.
 *
 * Exercer, c'est écrire. La première version posait des témoins dans
 * `app_generations` à chaque déploiement. Décision du propriétaire du
 * 2026-11-01 : la jumelle existe pour ça. Production en LECTURE SEULE,
 * écritures fictives sur `app_generations_test` uniquement.
 *
 * LE COÛT EST RÉEL ET IL EST ÉCRIT : les contraintes de PRODUCTION ne sont
 * plus exercées. La jumelle prouve que le DDL est APPLICABLE, pas que la
 * production l'APPLIQUE. Le défaut du jour vivait précisément sur la
 * contrainte de production — cette version ne l'aurait pas attrapé par
 * l'exercice, seulement par les colonnes. `parDecision` porte cette phrase
 * dans CHAQUE rapport, pour que personne ne lise un vert plus large qu'il
 * n'est.
 */

/** Ce que l'OpenAPI de PostgREST dit d'une colonne vivante. */
export type ColonneVivante = {
  /** Le type SQL tel que PostgREST le nomme : text, jsonb, numeric, text[]… */
  readonly format: string
  /** `required` dans l'OpenAPI = NOT NULL (défaut ou pas). */
  readonly notNull: boolean
  /** Le défaut, tel quel. `undefined` = aucun. */
  readonly defaut?: unknown
}

/** Ce que le DDL du dépôt déclare d'une colonne. */
export type ColonneDeclaree = {
  readonly type: string
  readonly notNull: boolean
  readonly defaut?: string
}

export type EcartSchema = {
  readonly table: string
  /** Déclarées dans le dépôt, ABSENTES de la base : à appliquer. */
  readonly colonnesManquantes: readonly string[]
  /** Présentes dans la base, déclarées NULLE PART : le dépôt est incomplet. */
  readonly colonnesNonDeclarees: readonly string[]
  /** Présentes des deux côtés, mais pas de la même forme. */
  readonly colonnesEnEcart: readonly { readonly colonne: string; readonly constat: string }[]
  readonly contraintesEnEcart: readonly { readonly nom: string; readonly constat: string }[]
  /** Contraintes déclarées qu'aucune sonde n'exerce — trou de couverture. */
  readonly contraintesSansSonde: readonly string[]
  /** Ce qui n'a pas pu être mesuré. Un écart : on ne conclut pas sans mesure. */
  readonly nonMesure: readonly string[]
  /** Ce qu'on a DÉCIDÉ de ne pas mesurer, et pourquoi. Imprimé, pas rouge. */
  readonly parDecision: readonly string[]
}

const SANS_COMMENTAIRES = (ddl: string) => ddl.replace(/^\s*--.*$/gmu, '')

/**
 * LES COLONNES DÉCLARÉES, avec leur type, leur nullabilité et leur défaut.
 *
 * LES COMMENTAIRES SONT RETIRÉS D'ABORD, et ce n'est pas un détail de forme :
 * un premier cliquet de cette série est resté VERT parce qu'il trouvait le
 * nom d'une colonne dans un commentaire qui racontait le défaut. Un contrôle
 * qui se satisfait de sa propre prose ne mesure rien.
 */
export function declarationsDeDdl(ddl: string): ReadonlyMap<string, ColonneDeclaree> {
  const propre = SANS_COMMENTAIRES(ddl)
  const sortie = new Map<string, ColonneDeclaree>()
  const lire = (nom: string, reste: string) => {
    const type = /^\s*([a-z]+(?:\[\])?(?:\(\d+(?:,\d+)?\))?)/u.exec(reste)?.[1] ?? ''
    // ── `primary key` IMPLIQUE `not null`, et l'ignorer accusait la base.
    // Première version : « id — la base la veut NOT NULL, le dépôt non ».
    // C'était vrai du littéral et faux de Postgres.
    const notNull = /\bnot null\b/u.test(reste) || /\bprimary key\b/u.test(reste)
    const defaut = /\bdefault\s+([^,;\n]+)/u.exec(reste)?.[1].trim()
    sortie.set(nom, { type, notNull, ...(defaut === undefined ? {} : { defaut }) })
  }
  for (const m of propre.matchAll(/add column if not exists\s+([a-z_]+)([^;]*);/gu)) lire(m[1], m[2])
  // ── LA PRÉCISION SE LIT AVANT LA VIRGULE DE FIN DE COLONNE.
  //
  // `numeric(10,4) not null default 0` : un `[^,\n]*` naïf s'arrête à la
  // virgule INTERNE au type, et la ligne devient « numeric(10 » — donc ni
  // `not null` ni défaut. Le contrôle accusait alors la base de ce que son
  // propre analyseur n'avait pas su lire.
  for (const m of propre.matchAll(
    /^\s{2,}([a-z_]+)\s+((?:uuid|text|jsonb|boolean|integer|numeric|timestamptz)(?:\[\])?(?:\(\d+(?:,\d+)?\))?[^,\n]*)/gmu,
  )) {
    if (!sortie.has(m[1])) lire(m[1], m[2])
  }
  // ── LES `alter column` VIENNENT APRÈS ET PRIMENT.
  //
  // `sqlPour` pose d'abord la colonne, puis la resserre (`alter column statut
  // set not null`, `set default 'en_attente'`). Lire la seule déclaration
  // initiale ferait croire le dépôt plus permissif qu'il n'est, et le
  // contrôle accuserait la base d'un `not null` qu'on a bien demandé.
  for (const m of propre.matchAll(/alter column\s+([a-z_]+)\s+set\s+(not null|default\s+([^;\n]+))/gu)) {
    const avant = sortie.get(m[1])
    if (avant === undefined) continue
    sortie.set(m[1], m[2] === 'not null'
      ? { ...avant, notNull: true }
      : { ...avant, defaut: (m[3] ?? '').trim() })
  }
  return sortie
}

/** Les contraintes et index uniques déclarés, par leur SUFFIXE de nom. */
export function contraintesDeclarees(ddl: string, table: string): ReadonlySet<string> {
  const propre = SANS_COMMENTAIRES(ddl)
  const suffixe = (nom: string) => (nom.startsWith(`${table}_`) ? nom.slice(table.length + 1) : nom)
  return new Set([
    ...[...propre.matchAll(/add constraint\s+([a-z_0-9]+)/gu)].map((m) => suffixe(m[1])),
    ...[...propre.matchAll(/create unique index\s+([a-z_0-9]+)/gu)].map((m) => suffixe(m[1])),
  ])
}

/**
 * LE TYPE DU DÉPÔT, DIT COMME POSTGREST LE DIT.
 *
 * Deux vocabulaires pour la même chose : `timestamptz` ici, « timestamp with
 * time zone » là-bas. Une correspondance INCONNUE ne se devine pas — elle
 * remonte en `nonMesure`, parce qu'un type qu'on ne sait pas traduire est un
 * type qu'on ne compare pas, et le dire vaut mieux que de passer.
 */
const EQUIVALENCES: Readonly<Record<string, string>> = {
  text: 'text',
  uuid: 'uuid',
  jsonb: 'jsonb',
  boolean: 'boolean',
  integer: 'integer',
  numeric: 'numeric',
  timestamptz: 'timestamp with time zone',
  'text[]': 'text[]',
}

function typeAttendu(declare: string): string | null {
  const nu = declare.replace(/\(\d+(?:,\d+)?\)/u, '').trim()
  return EQUIVALENCES[nu] ?? null
}

/** `'air'`, `0`, `false`, `'{}'::jsonb` et "air", 0, false, "{}" sont la même chose. */
function memeDefaut(declare: string, vivant: unknown): boolean {
  const g = declare.replace(/::[a-z ]+(\[\])?$/u, '').replace(/^'|'$/gu, '').trim().toLowerCase()
  const d = String(vivant ?? '').trim().toLowerCase()
  if (g === d) return true
  // Les fonctions (`now()`, `gen_random_uuid()`) et les littéraux de tableau
  // (`'{}'` ↔ `{}`) survivent au même aplatissement.
  return g.replace(/[{}'"]/gu, '') === d.replace(/[{}'"]/gu, '')
}

/**
 * Une valeur relue, dite comme le DDL la dirait.
 *
 * Un `jsonb` revient en OBJET : `String({})` donne « [object Object] », et la
 * comparaison accusait la base d'un défaut qu'elle applique parfaitement. Un
 * tableau revient en tableau ; le DDL l'écrit `'{}'`.
 */
function aplatirValeur(v: unknown): string {
  if (Array.isArray(v)) return `{${v.join(',')}}`
  if (typeof v === 'object' && v !== null) return JSON.stringify(v)
  return String(v ?? '')
}

export type SondeContrainte = {
  readonly refuse?: Record<string, unknown>
  readonly accepte?: readonly Record<string, unknown>[]
  readonly pourquoi: string
}

/** Un document minimal mais VRAI : les contraintes « a_document » l'exigent. */
export const DOCUMENT_TEMOIN = { fichiers: { 'index.tsx': '// témoin de schéma\n' } }

/**
 * LES SONDES, UNE PAR CONTRAINTE DÉCLARÉE.
 *
 * Les statuts éprouvés ne sont PAS recopiés ici : ils sont lus dans le DDL.
 * Recopier la liste qu'on vient de corriger reproduirait la faute qu'on ferme.
 */
export function sondesPour(ddl: string): Readonly<Record<string, SondeContrainte>> {
  const statuts = [
    ...(/check \(statut in \(([^)]*)\)\)/u.exec(SANS_COMMENTAIRES(ddl))?.[1] ?? '').matchAll(/'([a-z_]+)'/gu),
  ].map((m) => m[1])
  return {
    statut_valide: {
      pourquoi: 'tout statut déclaré est accepté, et un statut inconnu est refusé',
      refuse: { statut: 'statut_qui_nexiste_pas', document: DOCUMENT_TEMOIN },
      // `en_cours` porte sa propre contrainte (battement + jeton) : sans les
      // lui donner, on mesurerait `en_cours_verrouillee` en croyant mesurer
      // celle-ci.
      accepte: statuts.map((s) => ({
        statut: s,
        document: DOCUMENT_TEMOIN,
        ...(s === 'en_cours'
          ? { battement: new Date().toISOString(), jeton_travailleur: '00000000-0000-0000-0000-00000000000e' }
          : {}),
      })),
    },
    livree_a_document: {
      pourquoi: 'une ligne livrée sans document est refusée',
      refuse: { statut: 'livree', document: null },
      accepte: [{ statut: 'livree', document: DOCUMENT_TEMOIN }],
    },
    publie_a_document: {
      pourquoi: 'un jeton de publication sans document est refusé',
      refuse: { statut: 'refusee', document: null, publication_jeton: 'sonde-schema-sans-document' },
    },
    en_cours_verrouillee: {
      pourquoi: 'une ligne en cours sans battement ni jeton de travailleur est refusée',
      refuse: { statut: 'en_cours', document: DOCUMENT_TEMOIN, battement: null, jeton_travailleur: null },
    },
    publication_jeton_unique: {
      pourquoi: 'deux lignes ne peuvent pas partager un jeton de publication',
      // Le doublon demande DEUX lignes : traité nommément plus bas.
    },
  }
}

/**
 * LES TYPES DONT L'OPENAPI NE DIT PAS LE DÉFAUT. MESURÉ, PAS SUPPOSÉ.
 *
 * Le 2026-11-01, la première version de ce contrôle accusait la base de deux
 * défauts manquants (`sections_acquises jsonb default '{}'::jsonb` et
 * `diagnostics text[] default '{}'`). DIAGNOSTIC DISCRIMINANT : une ligne
 * posée sans ces colonnes est relue `{}` et `[]` — la base APPLIQUE bien
 * les défauts, c'est l'OpenAPI qui ne les publie pas pour ces types. Le
 * contrôle aurait été rouge en permanence, pour rien.
 *
 * On ne les compare donc pas par lecture — on les EXERCE sur la jumelle
 * (`defautsExerces`), ce qui est de toute façon plus vrai qu'une lecture.
 */
export const TYPES_SANS_DEFAUT_LISIBLE: ReadonlySet<string> = new Set(['jsonb', 'text[]'])

/**
 * LES CONTRAINTES VIVANTES, LUES — la troisième voie.
 *
 * Exercer les contraintes exigeait d'écrire ; ne pas les exercer rendait
 * aveugle sur la production. `pg_get_constraintdef`, exposé en RPC
 * (`contraintes_vivantes`, versionnée dans `sqlPour`), les REND : production
 * en lecture seule ET contraintes de production vérifiées.
 *
 * ── SUR QUOI ON COMPARE, ET POURQUOI PAS SUR LE TEXTE ENTIER.
 *
 * Postgres réécrit ce qu'on lui donne : `statut in ('a','b')` revient en
 * `CHECK (statut = ANY (ARRAY['a'::text, 'b'::text]))`. Comparer les deux
 * textes ferait rougir en permanence — et j'ai déjà produit quatre faux
 * positifs aujourd'hui en accusant la base de ce que mon analyseur lisait
 * mal. On compare donc DEUX AXES robustes à la réécriture :
 *
 *   ① LA PRÉSENCE : une contrainte déclarée et absente en base est l'écart
 *     le plus grave (la base n'applique plus rien).
 *   ② L'ENSEMBLE DES LITTÉRAUX : c'est exactement ce qui a échoué le
 *     2026-11-01 — une contrainte PRÉSENTE dont la liste de valeurs était
 *     plus courte que celle du dépôt. Les ensembles survivent à la
 *     réécriture, le texte non.
 *
 * Le reste du texte n'est pas comparé, il est RENDU : le rapport porte la
 * définition vivante, l'humain lit. Prétendre comparer des expressions SQL
 * arbitraires serait promettre une mesure qu'on ne sait pas faire.
 */
export type ContrainteVivante = {
  readonly nom: string
  readonly definition: string
  /**
   * `convalidated` : la contrainte s'applique-t-elle aux lignes DÉJÀ là ?
   *
   * Une contrainte posée NOT VALID existe, rend une définition parfaite, et
   * ne vérifie que les écritures futures. La lire sans ce champ ferait dire
   * au rapport « la base déclare » là où le lecteur comprendrait « la base
   * applique ». Absent (`undefined`) ⇒ la RPC est d'une version qui ne le
   * rend pas, et ÇA SE DIT plutôt que de se supposer valide.
   */
  readonly validee?: boolean
}

/** Les littéraux entre apostrophes d'une expression, en ensemble. */
function litteraux(expression: string): ReadonlySet<string> {
  return new Set([...expression.matchAll(/'([^']*)'/gu)].map((m) => m[1]))
}

/** Le texte du `check (...)` déclaré pour une contrainte, lu dans le DDL. */
export function checksDeclares(ddl: string, table: string): ReadonlyMap<string, string> {
  const propre = SANS_COMMENTAIRES(ddl)
  const sortie = new Map<string, string>()
  for (const m of propre.matchAll(/add constraint\s+([a-z_0-9]+)\s*check \(([\s\S]*?)\);/gu)) {
    const nom = m[1].startsWith(`${table}_`) ? m[1].slice(table.length + 1) : m[1]
    sortie.set(nom, m[2])
  }
  return sortie
}

/**
 * Confronte les contraintes DÉCLARÉES aux contraintes VIVANTES.
 *
 * Rend les écarts, et `rendues` pour que le rapport porte les définitions
 * réelles — un humain doit pouvoir lire ce que la base applique vraiment.
 */
export function comparerContraintesLues(o: {
  readonly ddl: string
  readonly table: string
  readonly vivantes: readonly ContrainteVivante[]
}): readonly { readonly nom: string; readonly constat: string }[] {
  const ecarts: { nom: string; constat: string }[] = []
  const parNom = new Map(
    o.vivantes.map((c) => [
      c.nom.startsWith(`${o.table}_`) ? c.nom.slice(o.table.length + 1) : c.nom,
      c,
    ]),
  )
  for (const [nom, expression] of checksDeclares(o.ddl, o.table)) {
    const vivante = parNom.get(nom)
    if (vivante === undefined) {
      ecarts.push({ nom, constat: 'DÉCLARÉE au dépôt, ABSENTE de la base — la base n’applique plus cette règle' })
      continue
    }
    // ── NON VALIDÉE = ÉCART. « Déclarée » n'est pas « appliquée ».
    if (vivante.validee === false) {
      ecarts.push({
        nom,
        constat:
          'présente mais NOT VALID : elle ne vérifie que les écritures futures, ' +
          'pas les lignes déjà en base. « Déclarée » n’est pas « appliquée ».',
      })
    } else if (vivante.validee === undefined) {
      ecarts.push({
        nom,
        constat:
          'validité inconnue : la fonction `contraintes_vivantes` ne rend pas ' +
          '`validee` — reposez-la depuis `sqlPour` (journal.ts). On ne suppose ' +
          'pas qu’une contrainte s’applique.',
      })
    }

    const attendus = litteraux(expression)
    const reels = litteraux(vivante.definition)
    const manquants = [...attendus].filter((v) => !reels.has(v))
    const enTrop = [...reels].filter((v) => !attendus.has(v))
    if (manquants.length > 0) {
      ecarts.push({
        nom,
        constat:
          `la base REFUSE ${String(manquants.length)} valeur(s) que le dépôt autorise ` +
          `(${manquants.join(', ')}) — c'est le défaut du 2026-11-01. Vivante : ${vivante.definition}`,
      })
    }
    if (enTrop.length > 0) {
      ecarts.push({
        nom,
        constat: `la base autorise ${String(enTrop.length)} valeur(s) que le dépôt ne déclare pas (${enTrop.join(', ')})`,
      })
    }
  }
  // ── ET LES UNIQUES, qui ne sont pas des CHECK.
  //
  // « publication_jeton_unique » est posé par « create unique index » : il
  // n'a pas d'expression à comparer, mais son ABSENCE serait grave — deux
  // lignes partageraient un jeton de publication, et la route publique
  // n'aurait aucun moyen de choisir laquelle servir. On exige donc sa
  // présence et sa validité, pas son texte.
  const checks = checksDeclares(o.ddl, o.table)
  for (const nom of contraintesDeclarees(o.ddl, o.table)) {
    if (checks.has(nom)) continue
    const vivante = parNom.get(nom)
    if (vivante === undefined) {
      ecarts.push({
        nom,
        constat: 'unicité DÉCLARÉE au dépôt, ABSENTE de la base — deux lignes pourraient partager cette valeur',
      })
    } else if (vivante.validee === false) {
      ecarts.push({ nom, constat: 'unicité présente mais INVALIDE — le planificateur ne s’en sert pas' })
    } else if (vivante.validee === undefined) {
      ecarts.push({
        nom,
        constat: 'validité d’unicité inconnue : la fonction `contraintes_vivantes` ne rend pas `validee`',
      })
    }
  }

  return ecarts
}

export type ReponsePose =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly code: string; readonly message: string }

/** La phrase que porte tout rapport d'une table dont on n'exerce rien. */
export const CONTRAINTES_NON_EXERCEES =
  'contraintes NON exercées sur cette table (décision du 2026-11-01 : aucune ' +
  'écriture fictive dans la table des vrais clients). La jumelle prouve que le ' +
  'DDL est applicable, PAS que cette table l’applique.'

/**
 * LA COMPARAISON. Les entrées/sorties sont INJECTÉES : le moteur se mesure
 * sans base, et la base ne se mesure pas sans moteur.
 */
export async function comparerSchema(o: {
  readonly table: string
  readonly ddl: string
  readonly colonnesVivantes: ReadonlyMap<string, ColonneVivante>
  /** Faux ⇒ lecture seule : on compare les colonnes, on n'écrit rien. */
  readonly exercerContraintes: boolean
  readonly poser?: (champs: Record<string, unknown>) => Promise<ReponsePose>
  readonly retirer?: (id: string) => Promise<void>
  /** Relit un témoin posé : c'est ce qui permet d'EXERCER les défauts. */
  readonly relire?: (id: string) => Promise<Record<string, unknown> | null>
  /**
   * Les contraintes vivantes, LUES par la RPC. `null` = RPC indisponible,
   * et c'est un ÉCART : on ne conclut pas « conforme » sans mesure.
   */
  readonly contraintesVivantes?: readonly ContrainteVivante[] | null
}): Promise<EcartSchema> {
  const declarees = declarationsDeDdl(o.ddl)
  const colonnesManquantes = [...declarees.keys()].filter((c) => !o.colonnesVivantes.has(c)).sort()
  const colonnesNonDeclarees = [...o.colonnesVivantes.keys()].filter((c) => !declarees.has(c)).sort()
  const colonnesEnEcart: { colonne: string; constat: string }[] = []
  const nonMesure: string[] = []
  const parDecision: string[] = []
  const defautsNonLus: string[] = []

  // ── ④ TYPE, NULLABILITÉ, DÉFAUT — la même classe de défaut, sous une
  // autre forme : une colonne déclarée `text not null` et vivante en
  // nullable passerait pour conforme si l'on ne comparait que les noms.
  for (const [nom, d] of declarees) {
    const v = o.colonnesVivantes.get(nom)
    if (v === undefined) continue
    const attendu = typeAttendu(d.type)
    if (attendu === null) {
      nonMesure.push(`type « ${d.type} » (colonne ${nom}) : aucune équivalence connue, non comparé`)
    } else if (attendu !== v.format) {
      colonnesEnEcart.push({ colonne: nom, constat: `type : dépôt « ${d.type} » → base « ${v.format} »` })
    }
    if (d.notNull !== v.notNull) {
      colonnesEnEcart.push({
        colonne: nom,
        constat: d.notNull ? 'le dépôt la veut NOT NULL, la base l’accepte nulle' : 'la base la veut NOT NULL, le dépôt non',
      })
    }
    if (TYPES_SANS_DEFAUT_LISIBLE.has(v.format)) {
      // Mesuré : l'OpenAPI n'en dit rien. La jumelle l'exerce pour de vrai.
      if (d.defaut !== undefined) defautsNonLus.push(nom)
    } else if (d.defaut === undefined && v.defaut !== undefined) {
      colonnesEnEcart.push({ colonne: nom, constat: `défaut « ${String(v.defaut)} » en base, aucun au dépôt` })
    } else if (d.defaut !== undefined && v.defaut === undefined) {
      colonnesEnEcart.push({ colonne: nom, constat: `défaut « ${d.defaut} » au dépôt, aucun en base` })
    } else if (d.defaut !== undefined && v.defaut !== undefined && !memeDefaut(d.defaut, v.defaut)) {
      colonnesEnEcart.push({ colonne: nom, constat: `défaut : dépôt « ${d.defaut} » → base « ${String(v.defaut)} »` })
    }
  }

  if (defautsNonLus.length > 0) {
    parDecision.push(
      `défauts non lisibles dans l'OpenAPI pour ${String(defautsNonLus.length)} colonne(s) ` +
        `de type jsonb/tableau (${defautsNonLus.join(', ')}) — mesuré le 2026-11-01 ; ` +
        'ils sont EXERCÉS sur la jumelle au lieu d’être lus',
    )
  }

  const sondes = sondesPour(o.ddl)
  const contraintes = contraintesDeclarees(o.ddl, o.table)
  const contraintesSansSonde = [...contraintes].filter((n) => sondes[n] === undefined).sort()
  const enEcart: { nom: string; constat: string }[] = []

  const rendre = (): EcartSchema => ({
    table: o.table,
    colonnesManquantes,
    colonnesNonDeclarees,
    colonnesEnEcart,
    contraintesEnEcart: enEcart,
    contraintesSansSonde,
    nonMesure,
    parDecision,
  })

  // ── LES CONTRAINTES LUES : elles valent pour TOUTE table, écrite ou non.
  //
  // C'est ce qui fait disparaître l'angle mort au lieu de le facturer. Sans
  // la RPC, on ne sait rien — et ne rien savoir est rouge.
  if (o.contraintesVivantes === null) {
    nonMesure.push(
      'contraintes vivantes illisibles : la fonction `contraintes_vivantes` ' +
        'n’est pas posée en base (voir `sqlPour` dans journal.ts). Sans elle, ' +
        'la contrainte de production n’est pas mesurée.',
    )
  } else if (o.contraintesVivantes !== undefined) {
    enEcart.push(...comparerContraintesLues({ ddl: o.ddl, table: o.table, vivantes: o.contraintesVivantes }))
  }

  // ── L'EXERCICE, LUI, RESTE RÉSERVÉ À LA JUMELLE.
  //
  // La lecture dit ce que la base DÉCLARE appliquer ; l'exercice prouve
  // qu'elle l'applique. Les deux ne se remplacent pas — mais la lecture
  // suffit à voir le défaut du jour, et elle n'écrit rien.
  if (!o.exercerContraintes || o.poser === undefined || o.retirer === undefined) {
    parDecision.push(CONTRAINTES_NON_EXERCEES)
    return rendre()
  }
  const poser = o.poser
  const retirer = o.retirer

  // ── UNE COLONNE MANQUANTE REND TOUTE SONDE NON MESURABLE, ET ON LE DIT.
  //
  // Sur une table en retard, chaque pose échouerait pour une raison qui
  // n'est PAS la contrainte visée. Conclure « contrainte absente » serait un
  // faux positif ; se taire serait un faux vert.
  if (colonnesManquantes.length > 0) {
    nonMesure.push(
      `contraintes non exercées : ${String(colonnesManquantes.length)} colonne(s) manquante(s) ` +
        `(${colonnesManquantes.join(', ')}) feraient échouer chaque pose pour la mauvaise raison`,
    )
    return rendre()
  }

  // ── LES DÉFAUTS, EXERCÉS : on pose le minimum et on relit.
  //
  // Plus vrai qu'une lecture d'OpenAPI, et seul moyen pour jsonb et les
  // tableaux. Un défaut de FONCTION (`now()`, `gen_random_uuid()`) ne se
  // compare pas littéralement : on exige seulement qu'une valeur existe.
  if (o.relire !== undefined) {
    const minimal = await poser({ statut: 'refusee', document: DOCUMENT_TEMOIN })
    if (!minimal.ok) {
      nonMesure.push(`défauts non exercés : la pose minimale a échoué (${minimal.code} ${minimal.message})`)
    } else {
      const lu = await o.relire(minimal.id)
      if (lu === null) {
        nonMesure.push('défauts non exercés : la relecture du témoin a échoué')
      } else {
        for (const [nom, d] of declarees) {
          if (d.defaut === undefined || nom === 'statut' || nom === 'document') continue
          const valeur = lu[nom]
          if (/^[a-z_]+\(\)$/u.test(d.defaut)) {
            if (valeur === null || valeur === undefined) {
              colonnesEnEcart.push({ colonne: nom, constat: `défaut « ${d.defaut} » non appliqué : la base rend vide` })
            }
          } else if (!memeDefaut(d.defaut, aplatirValeur(valeur))) {
            colonnesEnEcart.push({
              colonne: nom,
              constat: `défaut exercé : dépôt « ${d.defaut} », la base applique « ${JSON.stringify(valeur)} »`,
            })
          }
        }
      }
      await retirer(minimal.id)
    }
  }

  const essayer = async (champs: Record<string, unknown>): Promise<ReponsePose> => {
    const r = await poser(champs)
    if (r.ok) await retirer(r.id)
    return r
  }

  for (const [nom, sonde] of Object.entries(sondes)) {
    if (!contraintes.has(nom)) continue
    if (sonde.refuse !== undefined) {
      const r = await essayer(sonde.refuse)
      if (r.ok) enEcart.push({ nom, constat: `la base a ACCEPTÉ ce qu'elle doit refuser — ${sonde.pourquoi}` })
    }
    for (const bon of sonde.accepte ?? []) {
      const r = await essayer(bon)
      if (!r.ok) {
        enEcart.push({
          nom,
          constat:
            `la base a REFUSÉ ce qu'elle doit accepter (${r.code}) : ` +
            `${JSON.stringify(bon).slice(0, 90)} — ${sonde.pourquoi}`,
        })
      }
    }
  }

  if (contraintes.has('publication_jeton_unique')) {
    const jeton = `sonde-schema-unicite-${o.table}`
    const un = await poser({ statut: 'refusee', document: DOCUMENT_TEMOIN, publication_jeton: jeton })
    if (!un.ok) {
      nonMesure.push(`unicité du jeton non mesurée : la première pose a échoué (${un.code})`)
    } else {
      const deux = await poser({ statut: 'refusee', document: DOCUMENT_TEMOIN, publication_jeton: jeton })
      if (deux.ok) {
        enEcart.push({
          nom: 'publication_jeton_unique',
          constat: 'DEUX lignes partagent un jeton — l’index unique est absent',
        })
        await retirer(deux.id)
      }
      await retirer(un.id)
    }
  }

  return rendre()
}

/**
 * Y a-t-il de quoi rougir ? Un seul endroit décide, pour tous les appelants.
 *
 * `parDecision` n'y entre PAS : c'est un choix assumé et imprimé, pas une
 * mesure manquante. `nonMesure`, lui, est rouge — on ne conclut jamais
 * « conforme » sur ce qu'on n'a pas pu mesurer.
 */
export function ecartExiste(e: EcartSchema): boolean {
  return (
    e.colonnesManquantes.length > 0 ||
    e.colonnesNonDeclarees.length > 0 ||
    e.colonnesEnEcart.length > 0 ||
    e.contraintesEnEcart.length > 0 ||
    e.contraintesSansSonde.length > 0 ||
    e.nonMesure.length > 0
  )
}
