/**
 * LE JUGE DU CONTRAT DES COMPOSANTS — les réglages qu'un composant fourni
 * ne connaît pas, et les listes données en texte.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-12 SUR LA PHARMACIE DU PROPRIÉTAIRE.
 *
 * Le modèle a employé les bonnes pièces, avec des réglages INVENTÉS :
 *   <Courbe data={…}>                 → la pièce lit points/donnees : vide
 *   <CoqueGestion activeSection onSelect> → les clics ne faisaient rien
 *   <EnTeteDeSection libelle legende> → le titre disparaissait
 *   <CarteDeChiffre serie="30 derniers jours"> → serie.map : l'espace de
 *                                        gestion PLANTAIT, écran blanc
 * Aucun juge ne le voyait avant l'exécution — et l'exécution ne le voit
 * que s'il plante, au tour où il plante. Ce tour-là était le dernier :
 * l'œuvre est partie telle quelle.
 *
 * La veille, j'avais rendu les pièces TOLÉRANTES aux noms d'UNE génération.
 * Le modèle en a inventé d'autres. Tolérer un cas n'est pas fermer une
 * classe : un nom inventé est une PROPRIÉTÉ de la sortie d'un modèle, pas
 * un accident.
 *
 * ── CE QUI FERME LA CLASSE.
 *
 * Le vocabulaire n'est écrit NULLE PART à la main : il est LU dans la
 * bibliothèque injectée, signature par signature. Une pièce ajoutée demain
 * est jugée sans toucher ce fichier ; un alias ajouté à une pièce devient
 * aussitôt licite. Le reproche nomme les réglages acceptés : le modèle se
 * corrige au tour suivant, sans exécution.
 *
 * ── CE QU'IL NE VOIT PAS (et ce qui le voit).
 *
 * Il lit le JSX, pas les types : une valeur calculée de mauvais type
 * (`serie={uneChaine}`) lui échappe — le juge d'exécution la voit si elle
 * plante. Une pièce dont la signature n'est pas une déstructuration, ou qui
 * transmet `...reste`, n'est pas jugée sur ses noms : elle les accepte
 * tous, et le dire ici vaut mieux qu'un faux reproche.
 */

const PREFIXE = 'systeme/'
/** Toujours licites sur n'importe quel élément React. */
const UNIVERSELS = new Set(['key', 'ref', 'children'])

export type Signature = {
  /** Réglages acceptés, ou null si la pièce accepte tout (…reste). */
  readonly acceptes: readonly string[] | null
  /** Réglages typés comme des LISTES. */
  readonly listes: readonly string[]
}

export type DefautContrat = {
  readonly fichier: string
  readonly piece: string
  readonly reglage: string
  readonly nature: 'inconnu' | 'liste-en-texte'
  readonly acceptes: readonly string[]
}

/** Lit un bloc équilibré qui commence à `debut` (sur `{`), chaînes comprises. */
function bloc(source: string, debut: number): number {
  let prof = 0
  for (let i = debut; i < source.length; i += 1) {
    const c = source[i]!
    if (c === '"' || c === "'" || c === '`') {
      i += 1
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\') i += 1
        i += 1
      }
      continue
    }
    if (c === '{' || c === '(' || c === '[') prof += 1
    else if (c === '}' || c === ')' || c === ']') {
      prof -= 1
      if (prof === 0) return i
    }
  }
  return -1
}

/** Coupe aux virgules de premier niveau. */
function auxVirgules(texte: string): string[] {
  const parts: string[] = []
  let prof = 0
  let courant = ''
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i]!
    if (c === '"' || c === "'" || c === '`') {
      const fin = texte.indexOf(c, i + 1)
      courant += texte.slice(i, fin === -1 ? texte.length : fin + 1)
      i = fin === -1 ? texte.length : fin
      continue
    }
    if (c === '{' || c === '(' || c === '[' || c === '<') prof += 1
    // `=>` n'est pas un chevron fermant : sans ce garde, un défaut
    // `onClick = () => {}` désalignait toutes les virgules suivantes.
    if (c === '}' || c === ')' || c === ']' || (c === '>' && texte[i - 1] !== '=')) prof -= 1
    if (c === ',' && prof === 0) {
      parts.push(courant)
      courant = ''
    } else courant += c
  }
  if (courant.trim() !== '') parts.push(courant)
  return parts
}

/** Les signatures des pièces exportées par la bibliothèque, LUES dans sa source. */
export function signaturesDe(systeme: ReadonlyMap<string, string>): Map<string, Signature> {
  const sig = new Map<string, Signature>()
  for (const [chemin, source] of systeme) {
    if (!/\.tsx$/u.test(chemin)) continue
    for (const m of source.matchAll(/export function ([A-Z][\w$]*)\s*\(\s*\{/gu)) {
      const ouvre = m.index + m[0].length - 1
      const ferme = bloc(source, ouvre)
      if (ferme === -1) continue
      const entrees = auxVirgules(source.slice(ouvre + 1, ferme)).map((e) => e.trim()).filter(Boolean)
      const reste = entrees.some((e) => e.startsWith('...'))
      const acceptes = entrees
        .filter((e) => !e.startsWith('...'))
        .map((e) => /^([A-Za-z_$][\w$]*)/u.exec(e)?.[1])
        .filter((n): n is string => n !== undefined)
      // Le type littéral qui suit `}:` — pour reconnaître les listes.
      const listes: string[] = []
      const apres = source.slice(ferme + 1).match(/^\s*:\s*\{/u)
      if (apres !== null) {
        const ouvreType = ferme + 1 + apres[0].length - 1
        const fermeType = bloc(source, ouvreType)
        if (fermeType !== -1) {
          const type = source.slice(ouvreType + 1, fermeType)
          for (const t of type.matchAll(/([A-Za-z_$][\w$]*)\??\s*:\s*([^;\n]*)/gu)) {
            if (/\[\]|Array</u.test(t[2]!) && !/=>/u.test(t[2]!)) listes.push(t[1]!)
          }
        }
      }
      sig.set(m[1]!, { acceptes: reste ? null : acceptes, listes })
    }
  }
  return sig
}

type Attribut = { nom: string; valeur: string | null }

/** Les attributs d'une balise ouvrante, à partir de `i` (juste après le nom). */
function attributs(source: string, i: number): Attribut[] {
  const res: Attribut[] = []
  while (i < source.length) {
    while (/\s/u.test(source[i] ?? '')) i += 1
    const c = source[i]
    if (c === undefined || c === '>' || (c === '/' && source[i + 1] === '>')) break
    if (c === '{') {
      const f = bloc(source, i) // {...props}
      if (f === -1) break
      i = f + 1
      continue
    }
    const nom = /^[A-Za-z_$][\w$:-]*/u.exec(source.slice(i))?.[0]
    if (nom === undefined) break
    i += nom.length
    while (/\s/u.test(source[i] ?? '')) i += 1
    if (source[i] !== '=') {
      res.push({ nom, valeur: null })
      continue
    }
    i += 1
    while (/\s/u.test(source[i] ?? '')) i += 1
    const q = source[i]
    if (q === '"' || q === "'") {
      const f = source.indexOf(q, i + 1)
      if (f === -1) break
      res.push({ nom, valeur: source.slice(i, f + 1) })
      i = f + 1
    } else if (q === '{') {
      const f = bloc(source, i)
      if (f === -1) break
      res.push({ nom, valeur: source.slice(i, f + 1) })
      i = f + 1
    } else break
  }
  return res
}

/** Une valeur qui est un TEXTE ou un NOMBRE écrit tel quel — jamais une liste. */
function estScalaireLitteral(valeur: string): boolean {
  const v = valeur.trim().replace(/^\{\s*|\s*\}$/gu, '').trim()
  return /^(["'`])[\s\S]*\1$/u.test(v) || /^-?\d+(\.\d+)?$/u.test(v)
}

/** Les commentaires ôtés, pour ne pas juger un exemple commenté. */
function sansCommentaires(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/[^\n]*/gu, '$1')
}

export function jugerContrat(
  fichiers: ReadonlyMap<string, string>,
  systeme: ReadonlyMap<string, string>,
): DefautContrat[] {
  const signatures = signaturesDe(systeme)
  const defauts: DefautContrat[] = []
  const vus = new Set<string>()
  for (const [fichier, brut] of fichiers) {
    if (fichier.startsWith(PREFIXE) || !/\.(tsx|jsx)$/u.test(fichier)) continue
    const source = sansCommentaires(brut)
    for (const [piece, s] of signatures) {
      // Une pièce du même nom déclarée par le modèle est LA SIENNE.
      if (new RegExp(`(function|const|let|class)\\s+${piece}\\b`, 'u').test(source)) continue
      for (const m of source.matchAll(new RegExp(`<(?:[A-Za-z_$][\\w$]*\\.)?${piece}(?=[\\s/>])`, 'gu'))) {
        for (const a of attributs(source, m.index + m[0].length)) {
          let nature: DefautContrat['nature'] | null = null
          if (s.acceptes !== null && !UNIVERSELS.has(a.nom) && !s.acceptes.includes(a.nom)) nature = 'inconnu'
          else if (s.listes.includes(a.nom) && a.valeur !== null && estScalaireLitteral(a.valeur)) nature = 'liste-en-texte'
          if (nature === null) continue
          const clef = `${fichier}|${piece}|${a.nom}|${nature}`
          if (vus.has(clef)) continue
          vus.add(clef)
          defauts.push({ fichier, piece, reglage: a.nom, nature, acceptes: s.acceptes ?? [] })
        }
      }
    }
  }
  return defauts
}

/** Le reproche adressé au modèle — null quand le contrat est tenu. */
export function reprocheContrat(defauts: readonly DefautContrat[]): string | null {
  if (defauts.length === 0) return null
  return (
    'DES RÉGLAGES QUE LES COMPOSANTS FOURNIS NE CONNAISSENT PAS — ignorés en silence (graphique vide, ' +
    'menu qui ne répond pas, titre disparu) ou fatals (une liste donnée en texte fait planter l’écran) :\n' +
    defauts
      .slice(0, 20)
      .map((d) =>
        d.nature === 'inconnu'
          ? `- ${d.fichier} : <${d.piece} ${d.reglage}=…> — ${d.piece} n’a pas « ${d.reglage} ». Ses réglages : ${d.acceptes.join(', ')}`
          : `- ${d.fichier} : <${d.piece} ${d.reglage}=…> — « ${d.reglage} » attend une LISTE (tableau), pas un texte ni un nombre`,
      )
      .join('\n') +
    '\nEmploie EXACTEMENT les réglages listés, aucun autre.'
  )
}
