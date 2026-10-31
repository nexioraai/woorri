/**
 * LE JUGE DES JETONS — un nom qui n'existe pas ne part plus en production,
 * et rien n'a besoin de s'exécuter pour l'attraper.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-31 SUR L'ÉCRAN DU PROPRIÉTAIRE.
 *
 * Le tir 88c94164 a passé les trois juges, et l'application est MORTE AU
 * DÉMARRAGE : « Cannot read properties of undefined (reading 'fontSize') ».
 * Le modèle avait écrit `TYPO.corps`, `TYPO.petit`, `TYPO.h1` — l'échelle
 * n'a que quatre niveaux. L'assembleur ne vérifie pas les types (mesuré et
 * écrit le 2026-10-18) ; la vivacité atteste la liaison, pas l'exécution.
 *
 * ── CE QU'IL FERME : LA FAMILLE ENTIÈRE, pas l'exemplaire du jour.
 *
 * Tout membre inexistant d'un espace de noms de la bibliothèque, tout import
 * d'un nom qu'elle n'exporte pas, toute icône hors du jeu fourni. Arbitrage
 * du propriétaire : ce contrôle vient AVANT le juge d'exécution — zéro
 * risque, zéro bac à sable, microsecondes.
 *
 * ── LA LISTE SE DÉRIVE DES FICHIERS ÉMIS, ELLE NE SE RECOPIE JAMAIS.
 *
 * Une liste écrite ici divergerait de la bibliothèque au premier jeton
 * ajouté — et ce dépôt traite précisément cette maladie : une liste écrite
 * d'avance à la place de la source. Le juge LIT donc `systeme/*` et en
 * extrait ce qui existe.
 */

export type DefautJeton = {
  readonly fichier: string
  /** `TYPO.corps`, `ui:Tableau`, `Icone nom="fusee"` — ce qui n'existe pas. */
  readonly reference: string
  /** Ce qui existe, pour que le modèle ne devine pas au tour suivant. */
  readonly connus: readonly string[]
}

/** Le préfixe réservé à la bibliothèque — elle est la source, pas un justiciable. */
const PREFIXE = 'systeme/'

const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')

/**
 * Les membres d'un `export const NOM = { … } as const`, lus par équilibre
 * d'accolades : un `{` imbriqué (TYPO porte des objets) ne doit pas couper
 * la lecture, et seules les clés de PREMIER niveau sont des membres.
 */
function membresDeLObjet(source: string, nom: string): string[] | null {
  const debut = new RegExp(`export const ${nom}\\s*(?::[^=]+)?=\\s*\\{`, 'u').exec(source)
  if (debut === null) return null
  let i = debut.index + debut[0].length
  let profondeur = 1
  const membres: string[] = []
  let attendClef = true
  for (; i < source.length && profondeur > 0; i += 1) {
    const c = source[i]!
    if (c === '{' || c === '[') profondeur += 1
    else if (c === '}' || c === ']') profondeur -= 1
    else if (c === ',' && profondeur === 1) attendClef = true
    else if (attendClef && profondeur === 1 && /[A-Za-z_$]/u.test(c)) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/u.exec(source.slice(i))
      if (m !== null) membres.push(m[1]!)
      attendClef = false
    }
  }
  return membres
}

/** Ce que la bibliothèque offre réellement, lu dans les fichiers émis. */
export function vocabulaireDe(systeme: ReadonlyMap<string, string>): {
  espaces: Map<string, string[]>
  exports: Map<string, string[]>
  icones: string[]
} {
  const espaces = new Map<string, string[]>()
  const exports = new Map<string, string[]>()
  let icones: string[] = []

  for (const [chemin, brut] of systeme) {
    const source = sansCommentaires(brut)
    const court = chemin.replace(/^systeme\//u, '').replace(/\.(tsx|ts)$/u, '')
    const noms = [
      ...[...source.matchAll(/export const ([A-Za-z_$][\w$]*)/gu)].map((m) => m[1]!),
      ...[...source.matchAll(/export function ([A-Za-z_$][\w$]*)/gu)].map((m) => m[1]!),
    ]
    exports.set(court, noms)
    // Seuls les espaces de noms EN MAJUSCULES portent des membres (TYPO…).
    for (const nom of noms) {
      if (!/^[A-Z][A-Z_]*$/u.test(nom)) continue
      const membres = membresDeLObjet(source, nom)
      if (membres !== null && membres.length > 0) espaces.set(nom, membres)
    }
    // Le jeu d'icônes : les clés de la table des tracés.
    const traces = /const TRACES[^=]*=\s*\{/u.exec(source)
    if (traces !== null) {
      const fin = source.indexOf('\n}', traces.index)
      icones = [...source.slice(traces.index, fin).matchAll(/^\s{2}([A-Za-z_$][\w$]*):/gmu)].map(
        (m) => m[1]!,
      )
    }
  }
  return { espaces, exports, icones }
}

/**
 * Juge les fichiers du modèle contre le vocabulaire réel de la bibliothèque.
 * Rend la liste des références mortes — vide quand tout existe.
 */
export function jugerJetons(
  fichiers: ReadonlyMap<string, string>,
  systeme: ReadonlyMap<string, string>,
): DefautJeton[] {
  const { espaces, exports, icones } = vocabulaireDe(systeme)
  const defauts: DefautJeton[] = []
  const vus = new Set<string>()
  const noter = (fichier: string, reference: string, connus: readonly string[]) => {
    const clef = `${fichier}|${reference}`
    if (vus.has(clef)) return
    vus.add(clef)
    defauts.push({ fichier, reference, connus })
  }

  for (const [fichier, brut] of fichiers) {
    if (fichier.startsWith(PREFIXE)) continue
    if (!/\.(tsx|ts|jsx)$/u.test(fichier)) continue
    const source = sansCommentaires(brut)

    // ── ① LES MEMBRES D'UN ESPACE DE NOMS : TYPO.corps n'existe pas.
    for (const [espace, membres] of espaces) {
      const motif = new RegExp(`\\b${espace}\\.([A-Za-z_$][\\w$]*)`, 'gu')
      for (const m of source.matchAll(motif)) {
        const membre = m[1]!
        if (!membres.includes(membre)) noter(fichier, `${espace}.${membre}`, membres)
      }
    }

    // ── ② LES NOMS IMPORTÉS : ce que la bibliothèque n'exporte pas.
    for (const imp of source.matchAll(
      /import\s*\{([^}]*)\}\s*from\s*['"]\.{1,2}\/(?:\.\.\/)*systeme\/([\w-]+)['"]/gu,
    )) {
      const offerts = exports.get(imp[2]!) ?? []
      for (const brutNom of imp[1]!.split(',')) {
        const nom = brutNom.split(' as ')[0]!.trim()
        if (nom === '' || nom.startsWith('type ')) continue
        if (!offerts.includes(nom)) noter(fichier, `${imp[2]!}:${nom}`, offerts)
      }
    }

    // ── ③ LES ICÔNES : une icône absente rend un glyphe par défaut muet.
    for (const m of source.matchAll(/<Icone[^>]*?\snom=["']([^"']+)["']/gu)) {
      if (!icones.includes(m[1]!)) noter(fichier, `Icone nom="${m[1]!}"`, icones)
    }
  }
  return defauts
}
