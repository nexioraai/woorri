/**
 * NON BRANCHÉ DANS LA BOUCLE de génération — il garde la RETOUCHE
 * (`app/api/generateur/retoucher/route.ts`, parmi les juges avant/après),
 * pas la première génération. Le corpus montre qu'une génération peut
 * écrire dans une table non déclarée (`horaire.*`, f1b753a6) : l'y brancher
 * est une décision à part, pas faite ici.
 *
 * LE JUGE DES COLONNES — le code n'écrit que dans des colonnes qui existent
 * (2026-11-18, défaut A : docs/elite-protocol/RAPPORT_RETOUCHE_PHARMA.md).
 *
 * ── LE DÉFAUT QU'IL FERME, MESURÉ EN PRODUCTION.
 *
 * Une retouche de la pharmacie (pharma.deribfy.app, version 4) a ajouté
 * `emplacement` à l'objet écrit par l'ajout ET la modification d'un produit.
 * La colonne n'a jamais été déclarée, donc jamais créée : PostgREST refuse
 * toute écriture (`PGRST204 Could not find the 'emplacement' column`), et
 * l'application a perdu deux fonctions qui marchaient. Six juges avaient
 * laissé passer : la persistance regarde les TABLES, l'exécution monte sans
 * base — aucun ne comparait les CHAMPS ÉCRITS aux COLONNES.
 *
 * ── CE QU'IL LIT.
 *
 * Chaque `.from('table')` suivi de `.insert(…)`, `.update(…)` ou
 * `.upsert(…)`, dans les fichiers de l'application (pas `systeme/`). L'objet
 * écrit est résolu s'il est littéral, ou s'il est une constante du même
 * fichier (`const donnees = { … }`), décomposition comprise.
 *
 * ── LES COLONNES, PAR LA MÊME RÈGLE QUE LE SCHÉMA ÉMIS.
 *
 * `id`, plus `champsConserves` du compilateur : un champ dérivé ou sensible
 * n'est PAS une colonne, l'écrire échouerait de la même façon.
 *
 * ── CE QU'IL NE VOIT PAS, DIT PLUTÔT QUE CACHÉ.
 *
 * Un objet construit ailleurs (paramètre de fonction, autre fichier, valeur
 * calculée) n'est pas résolu : il est compté dans `nonResolus`, jamais
 * deviné. Un nom de table passé par une variable n'est pas lu.
 */
import { champsConserves, nomColonne, nomTable, type EntiteDonnees } from '@deribfy/compiler'

export type ColonneInconnue = {
  readonly fichier: string
  readonly table: string
  /** La colonne écrite qui n'existe pas — ou `*` quand la TABLE n'est pas déclarée. */
  readonly colonne: string
  readonly geste: 'insert' | 'update' | 'upsert'
}

export type VerdictColonnes = {
  readonly inconnues: readonly ColonneInconnue[]
  readonly nonResolus: readonly { readonly fichier: string; readonly table: string; readonly geste: string; readonly expression: string }[]
}

/**
 * Les colonnes réellement créées, table par table : `id` + champs conservés.
 * Les NOMS viennent des fonctions mêmes du compilateur (`nomTable`,
 * `nomColonne` : l'identifiant sans `ent_` / `fld_`, pas le `name`) — le
 * contrôle colle ainsi au schéma émis, sans en recopier la règle.
 */
export function colonnesEmises(entites: readonly EntiteDonnees[]): ReadonlyMap<string, ReadonlySet<string>> {
  const carte = new Map<string, Set<string>>()
  for (const e of entites) {
    carte.set(nomTable(e), new Set(['id', ...champsConserves(e).map((f) => nomColonne(f))]))
  }
  return carte
}

const GESTES = new Set(['insert', 'update', 'upsert'])

/** Lit un bloc équilibré à partir de `debut` (qui pointe sur l'ouvrante). Rend l'index de la fermante. */
function finDuBloc(t: string, debut: number): number {
  const paires: Record<string, string> = { '(': ')', '{': '}', '[': ']' }
  const pile: string[] = []
  for (let i = debut; i < t.length; i++) {
    const c = t[i]!
    if (c === '"' || c === "'" || c === '`') {
      // Une chaîne : on saute jusqu'à sa fermeture (les échappements compris).
      for (i++; i < t.length && t[i] !== c; i++) if (t[i] === '\\') i++
      continue
    }
    if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue }
    if (c === '/' && t[i + 1] === '*') { i = t.indexOf('*/', i + 2); if (i < 0) return -1; i++; continue }
    if (c in paires) pile.push(paires[c]!)
    else if (c === ')' || c === '}' || c === ']') {
      if (pile.pop() !== c) return -1
      if (pile.length === 0) return i
    }
  }
  return -1
}

/** Coupe un texte au premier niveau, sur les virgules. */
function morceaux(t: string): string[] {
  const out: string[] = []
  let profondeur = 0
  let debut = 0
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!
    if (c === '"' || c === "'" || c === '`') { for (i++; i < t.length && t[i] !== c; i++) if (t[i] === '\\') i++; continue }
    if ('({['.includes(c)) profondeur++
    else if (')}]'.includes(c)) profondeur--
    else if (c === ',' && profondeur === 0) { out.push(t.slice(debut, i)); debut = i + 1 }
  }
  out.push(t.slice(debut))
  return out.map((m) => m.trim()).filter((m) => m !== '')
}

/** Les clés d'une expression d'objet, ou `null` si on ne sait pas la résoudre. */
function clesDe(expr: string, source: string, avant: number, profondeur = 0): string[] | null {
  const e = expr.trim().replace(/\s+as\s+[\w<>[\]., |]+$/u, '').trim()
  if (profondeur > 4) return null
  if (e.startsWith('{')) {
    const fin = finDuBloc(e, 0)
    if (fin < 0) return null
    const cles: string[] = []
    for (const m of morceaux(e.slice(1, fin))) {
      if (m.startsWith('...')) {
        const sous = clesDe(m.slice(3), source, avant, profondeur + 1)
        if (sous === null) return null
        cles.push(...sous)
        continue
      }
      const deuxPoints = /^(?:(['"])([^'"]+)\1|([A-Za-z_$][\w$]*))\s*:/u.exec(m)
      if (deuxPoints !== null) { cles.push(deuxPoints[2] ?? deuxPoints[3]!); continue }
      const raccourci = /^([A-Za-z_$][\w$]*)$/u.exec(m)
      if (raccourci !== null) { cles.push(raccourci[1]!); continue }
      return null
    }
    return cles
  }
  if (e.startsWith('[')) {
    const fin = finDuBloc(e, 0)
    if (fin < 0) return null
    const toutes: string[] = []
    for (const m of morceaux(e.slice(1, fin))) {
      const sous = clesDe(m, source, avant, profondeur + 1)
      if (sous === null) return null
      toutes.push(...sous)
    }
    return toutes
  }
  const nom = /^([A-Za-z_$][\w$]*)$/u.exec(e)?.[1]
  if (nom === undefined) return null
  // ── LA SOURCE DE CE NOM : la plus PROCHE avant l'appel, parmi trois formes.
  //   ① const donnees = { … }            → l'objet littéral
  //   ② const [form, setForm] = useState<T>({ … })  → la valeur initiale, sinon T
  //   ③ (objet: Omit<Client, 'id'>) =>    → le TYPE du paramètre
  type Source = { pos: number; resoudre: () => string[] | null }
  const sources: Source[] = []
  for (const m of source.matchAll(new RegExp(`(?:const|let|var)\\s+${nom}\\s*(?::[^=]+)?=\\s*`, 'gu'))) {
    const debut = m.index! + m[0].length
    if (m.index! >= avant) continue
    sources.push({ pos: m.index!, resoudre: () => {
      const o = source[debut]
      if (o !== '{' && o !== '[') return null
      const fin = finDuBloc(source, debut)
      return fin < 0 ? null : clesDe(source.slice(debut, fin + 1), source, debut, profondeur + 1)
    } })
  }
  for (const m of source.matchAll(new RegExp(`(?:const|let)\\s*\\[\\s*${nom}\\s*,[^\\]]*\\]\\s*=\\s*useState\\s*(<)?`, 'gu'))) {
    if (m.index! >= avant) continue
    sources.push({ pos: m.index!, resoudre: () => {
      let i = m.index! + m[0].length
      let type: string | null = null
      if (m[1] === '<') { const f = finChevrons(source, i - 1); if (f < 0) return null; type = source.slice(i, f); i = f + 1 }
      const ouv = source.indexOf('(', i)
      const ferm = ouv < 0 ? -1 : finDuBloc(source, ouv)
      const init = ferm < 0 ? '' : (morceaux(source.slice(ouv + 1, ferm))[0] ?? '')
      if (init.startsWith('{') || init.startsWith('[')) { const k = clesDe(init, source, ouv, profondeur + 1); if (k !== null) return k }
      return type === null ? null : clesDuType(type, source, profondeur + 1)
    } })
  }
  for (const m of source.matchAll(new RegExp(`[(,]\\s*${nom}\\s*\\??\\s*:\\s*`, 'gu'))) {
    if (m.index! >= avant) continue
    sources.push({ pos: m.index!, resoudre: () => {
      const debut = m.index! + m[0].length
      const type = typeJusquA(source, debut)
      return type === null ? null : clesDuType(type, source, profondeur + 1)
    } })
  }
  if (sources.length === 0) return null
  sources.sort((a, b) => b.pos - a.pos)
  return sources[0]!.resoudre()
}

/** L'index du `>` qui ferme le `<` situé en `debut`. */
function finChevrons(t: string, debut: number): number {
  let n = 0
  for (let i = debut; i < t.length; i++) {
    if (t[i] === '<') n++
    else if (t[i] === '>' && t[i - 1] !== '=') { n--; if (n === 0) return i }
    else if (t[i] === '{' || t[i] === '(' || t[i] === '[') { const f = finDuBloc(t, i); if (f < 0) return -1; i = f }
  }
  return -1
}

/** Le texte d'un type de paramètre : jusqu'à la virgule, la parenthèse ou le `=` de premier niveau. */
function typeJusquA(t: string, debut: number): string | null {
  for (let i = debut; i < t.length; i++) {
    const c = t[i]!
    if (c === '<') { const f = finChevrons(t, i); if (f < 0) return null; i = f; continue }
    if (c === '{' || c === '[' || c === '(') { const f = finDuBloc(t, i); if (f < 0) return null; i = f; continue }
    if (c === ',' || c === ')' || c === '=') return t.slice(debut, i).trim()
  }
  return null
}

/** Les noms de champs d'un type TypeScript — ou `null` si on ne sait pas le lire. */
function clesDuType(type: string, source: string, profondeur: number): string[] | null {
  if (profondeur > 6) return null
  const t = type.trim().replace(/\[\]$/u, '').trim()
  if (t.includes('&')) {
    const parts = t.split('&').map((x) => clesDuType(x, source, profondeur + 1))
    return parts.some((x) => x === null) ? null : parts.flat() as string[]
  }
  if (t.startsWith('{')) {
    const fin = finDuBloc(t, 0)
    if (fin < 0) return null
    const cles: string[] = []
    for (const membre of t.slice(1, fin).split(/[;,\n]/u)) {
      const k = /^\s*(?:readonly\s+)?(['"]?)([A-Za-z_$][\w$]*)\1\s*\??\s*:/u.exec(membre)
      if (k !== null) cles.push(k[2]!)
    }
    return cles
  }
  const gen = /^(Omit|Pick|Partial|Required|Readonly)\s*</u.exec(t)
  if (gen !== null) {
    const ouv = t.indexOf('<')
    const f = finChevrons(t, ouv)
    if (f < 0) return null
    const [base, liste] = morceaux(t.slice(ouv + 1, f))
    const cles = base === undefined ? null : clesDuType(base, source, profondeur + 1)
    if (cles === null) return null
    const noms = (liste ?? '').match(/['"]([^'"]+)['"]/gu)?.map((x) => x.slice(1, -1)) ?? []
    if (gen[1] === 'Omit') return cles.filter((c) => !noms.includes(c))
    if (gen[1] === 'Pick') return noms
    return cles
  }
  const id = /^([A-Za-z_$][\w$]*)$/u.exec(t)?.[1]
  if (id === undefined) return null
  const alias = new RegExp(`type\\s+${id}\\s*=\\s*`, 'u').exec(source)
  if (alias !== null) {
    const debut = alias.index + alias[0].length
    const fin = source[debut] === '{' ? finDuBloc(source, debut) : source.indexOf(';', debut) - 1
    if (fin < debut) return null
    return clesDuType(source.slice(debut, fin + 1), source, profondeur + 1)
  }
  const inter = new RegExp(`interface\\s+${id}\\s*(?:extends\\s+([\\w\\s,<>'"|]+?))?\\s*\\{`, 'u').exec(source)
  if (inter !== null) {
    const ouv = inter.index + inter[0].length - 1
    const propres = clesDuType(source.slice(ouv, finDuBloc(source, ouv) + 1), source, profondeur + 1)
    if (propres === null) return null
    if (inter[1] === undefined) return propres
    const parents = inter[1].split(',').map((p) => clesDuType(p, source, profondeur + 1))
    return parents.some((p) => p === null) ? null : [...propres, ...(parents.flat() as string[])]
  }
  return null
}

export function jugerColonnes(
  fichiers: ReadonlyMap<string, string>,
  entites: readonly EntiteDonnees[],
): VerdictColonnes {
  const colonnes = colonnesEmises(entites)
  const inconnues: ColonneInconnue[] = []
  const nonResolus: { fichier: string; table: string; geste: string; expression: string }[] = []
  for (const [fichier, source] of fichiers) {
    if (fichier.startsWith('systeme/') || !/\.(?:tsx?|jsx?)$/u.test(fichier)) continue
    for (const m of source.matchAll(/\.from\(\s*(['"`])([A-Za-z_][\w]*)\1\s*\)/gu)) {
      const table = m[2]!
      let i = m.index! + m[0].length
      // On suit la chaîne : .insert(…), .update(…), .upsert(…) — et on s'arrête au reste.
      for (;;) {
        const suite = /^\s*\.\s*([A-Za-z_]\w*)\s*\(/u.exec(source.slice(i))
        if (suite === null) break
        const geste = suite[1]!
        const ouvrante = i + suite[0].length - 1
        const fermante = finDuBloc(source, ouvrante)
        if (fermante < 0) break
        if (GESTES.has(geste)) {
          const premier = morceaux(source.slice(ouvrante + 1, fermante))[0] ?? ''
          const cles = clesDe(premier, source, m.index!)
          const g = geste as ColonneInconnue['geste']
          if (cles === null) nonResolus.push({ fichier, table, geste, expression: premier.slice(0, 80) })
          else {
            const connues = colonnes.get(table)
            if (connues === undefined) inconnues.push({ fichier, table, colonne: '*', geste: g })
            else for (const c of new Set(cles)) if (!connues.has(c)) inconnues.push({ fichier, table, colonne: c, geste: g })
          }
        }
        i = fermante + 1
      }
    }
  }
  return { inconnues, nonResolus }
}

/** La phrase, dans les mots du commerçant : quelle donnée, dans quelle liste. */
export function phraseColonnes(inconnues: readonly ColonneInconnue[]): string {
  const vus = [...new Set(inconnues.map((x) => (x.colonne === '*' ? `la liste « ${x.table} »` : `« ${x.colonne} » dans « ${x.table} »`)))]
  return `elle écrirait ${vus.join(', ')}, qui n’existe pas dans la base de votre application`
}

/**
 * Ce que la retouche AJOUTE : les écarts d'après absents d'avant (même table,
 * même colonne). Une appli déjà cassée ne fait pas accuser la retouche de ce
 * qu'elle n'a pas fait. Si l'écart neuf est un doublon d'un ancien (même
 * colonne écrite une fois de plus), on rend tout l'après : mieux vaut nommer
 * trop que rien.
 */
export function colonnesNouvelles(
  avant: ReadonlyMap<string, string>,
  entitesAvant: readonly EntiteDonnees[],
  apres: ReadonlyMap<string, string>,
  entitesApres: readonly EntiteDonnees[],
): readonly ColonneInconnue[] {
  const cle = (x: ColonneInconnue) => `${x.table}\u0000${x.colonne}`
  const deja = new Set(jugerColonnes(avant, entitesAvant).inconnues.map(cle))
  const toutes = jugerColonnes(apres, entitesApres).inconnues
  const neuves = toutes.filter((x) => !deja.has(cle(x)))
  return neuves.length > 0 ? neuves : toutes
}
